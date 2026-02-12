/**
 * FAST Document Ingestion Script - NO OCR
 * 
 * Processes only PDFs with extractable text (skips image-based PDFs)
 * Run this concurrently with the OCR script in a separate terminal
 * 
 * Usage: npx tsx scripts/ingest-fast.ts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as pdfParse from "pdf-parse";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const pdf = (pdfParse as unknown as { default?: typeof pdfParse }).default || pdfParse;

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Folder locations
const DOWNLOADS_DIR = path.join(process.env.HOME || "", "Downloads");

// Patterns to find document folders
const FOLDER_PATTERNS = [
  /^DataSet \d+$/,
  /^VOL\d+$/i,
  /^dataset\d+/i,
];

// Settings - FAST MODE
const PARALLEL_WORKERS = 10;    // Higher parallelism since no OCR
const MIN_TEXT_LENGTH = 50;
const MIN_WORD_RATIO = 0.2;
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBEDDING_BATCH_SIZE = 50;  // Larger batches for speed

// Common English words for quality check
const COMMON_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "is", "was", "are", "been", "has", "had", "were", "said", "did", "made",
]);

const NOTABLE_NAMES = [
  "Bill Gates", "Donald Trump", "Bill Clinton", "Hillary Clinton",
  "Prince Andrew", "Alan Dershowitz", "Ghislaine Maxwell", "Les Wexner",
  "Stephen Hawking", "Elon Musk", "Kevin Spacey", "Chris Tucker",
  "Naomi Campbell", "Jean-Luc Brunel", "Ehud Barak", "Larry Summers",
  "Leon Black", "Marvin Minsky", "Reid Hoffman", "George Mitchell",
  "Glenn Dubin", "Eva Dubin", "Sarah Kellen", "Nadia Marcinkova",
  "Virginia Giuffre", "Virginia Roberts", "Jeffrey Epstein",
  "Palm Beach", "Little St. James", "Zorro Ranch",
];

interface ProcessingStats {
  documentsProcessed: number;
  documentsSkipped: number;
  needsOCR: number;
  chunksCreated: number;
  embeddingsCreated: number;
  mentionsExtracted: number;
  startTime: number;
}

function isReadableText(text: string): boolean {
  if (!text || text.length < MIN_TEXT_LENGTH) return false;
  
  const words = text.toLowerCase().match(/[a-z]{2,}/g) || [];
  if (words.length < 5) return false;
  
  const commonCount = words.filter(w => COMMON_WORDS.has(w)).length;
  const ratio = commonCount / words.length;
  
  const alphaNumeric = text.match(/[a-zA-Z0-9]/g) || [];
  const alphaRatio = alphaNumeric.length / text.length;
  
  return ratio >= MIN_WORD_RATIO && alphaRatio >= 0.4;
}

function findDocumentFolders(): string[] {
  const folders: string[] = [];
  
  try {
    const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        for (const pattern of FOLDER_PATTERNS) {
          if (pattern.test(entry.name)) {
            folders.push(path.join(DOWNLOADS_DIR, entry.name));
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error scanning Downloads:", err);
  }
  
  return folders.sort();
}

function findPDFs(folderPath: string): string[] {
  const pdfs: string[] = [];
  const dirsToScan: string[] = [folderPath];
  
  // Iterative instead of recursive to avoid stack overflow
  while (dirsToScan.length > 0) {
    const dir = dirsToScan.pop()!;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirsToScan.push(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
          pdfs.push(fullPath);
        }
      }
    } catch (err) {}
  }
  
  return pdfs;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);
    
    if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP / 2));
      currentChunk = overlapWords.join(" ") + " " + sentence;
      currentTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter((c) => c.length > 50);
}

function findMentions(text: string): { name: string; normalizedName: string; context: string }[] {
  const mentions: { name: string; normalizedName: string; context: string }[] = [];
  const textLower = text.toLowerCase();
  
  for (const name of NOTABLE_NAMES) {
    const nameLower = name.toLowerCase();
    let idx = 0;
    while ((idx = textLower.indexOf(nameLower, idx)) !== -1) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(text.length, idx + name.length + 100);
      mentions.push({
        name,
        normalizedName: nameLower,
        context: text.substring(start, end).trim(),
      });
      idx++;
    }
  }
  return mentions;
}

async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batch,
      });
      embeddings.push(...response.data.map((d) => d.embedding));
    } catch (error) {
      // On rate limit, wait and retry
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
        });
        embeddings.push(...response.data.map((d) => d.embedding));
      } catch {
        embeddings.push(...batch.map(() => []));
      }
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  return embeddings;
}

async function processDocument(
  filepath: string, 
  stats: ProcessingStats,
  processedFilenames: Set<string>
): Promise<"success" | "needs_ocr" | "skipped" | "error"> {
  const filename = path.basename(filepath);
  
  // Double-check not already processed (another script might have done it)
  if (processedFilenames.has(filename)) {
    return "skipped";
  }
  
  try {
    const dataBuffer = fs.readFileSync(filepath);
    let text = "";
    let pageCount: number | undefined;
    
    // Try regular PDF extraction only - NO OCR
    try {
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text || "";
      pageCount = pdfData.numpages;
    } catch (e) {
      text = "";
    }
    
    // Check if text is readable
    if (!isReadableText(text)) {
      stats.needsOCR++;
      return "needs_ocr";  // Skip - let OCR script handle it
    }
    
    // Check DB again before inserting (avoid race condition with OCR script)
    const existing = await prisma.document.findFirst({
      where: { filename },
      select: { id: true }
    });
    if (existing) {
      processedFilenames.add(filename);
      return "skipped";
    }
    
    // Save to database
    const document = await prisma.document.create({
      data: {
        filename,
        title: filename.replace(/\.[^/.]+$/, ""),
        content: text.slice(0, 100000),
        pageCount,
        fileSize: dataBuffer.length,
        sourceUrl: filepath,
      },
    });
    
    // Create chunks and embeddings
    const chunks = chunkText(text);
    if (chunks.length > 0) {
      const embeddings = await createEmbeddings(chunks);
      
      for (let i = 0; i < chunks.length; i++) {
        const embedding = embeddings[i];
        
        if (embedding && embedding.length > 0) {
          const embeddingStr = `[${embedding.join(",")}]`;
          await prisma.$executeRaw`
            INSERT INTO "Chunk" (id, "documentId", content, "pageNumber", "chunkIndex", embedding, "createdAt")
            VALUES (${`chunk_${document.id}_${i}`}, ${document.id}, ${chunks[i]}, ${1}, ${i}, ${embeddingStr}::vector, NOW())
          `;
          stats.embeddingsCreated++;
        } else {
          await prisma.chunk.create({
            data: { id: `chunk_${document.id}_${i}`, documentId: document.id, content: chunks[i], pageNumber: 1, chunkIndex: i },
          });
        }
        stats.chunksCreated++;
      }
    }
    
    // Extract mentions
    const mentions = findMentions(text).slice(0, 50);
    if (mentions.length > 0) {
      await prisma.mention.createMany({
        data: mentions.map((m) => ({
          documentId: document.id,
          name: m.name,
          normalizedName: m.normalizedName,
          context: m.context,
        })),
      });
      stats.mentionsExtracted += mentions.length;
    }
    
    stats.documentsProcessed++;
    processedFilenames.add(filename);
    return "success";
    
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Duplicate - already processed by other script
      processedFilenames.add(filename);
      return "skipped";
    }
    return "error";
  }
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  EPSTEIN FILES - FAST INGESTION (NO OCR)              ║");
  console.log("║  Text-extractable PDFs only | 10 parallel workers     ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  OpenAI API key not configured!");
    process.exit(1);
  }
  
  // Find all document folders
  const folders = findDocumentFolders();
  console.log(`Found ${folders.length} document folders:\n`);
  
  // Get already processed first
  const existing = await prisma.document.findMany({ select: { filename: true } });
  const processedFilenames = new Set(existing.map(e => e.filename));
  
  let totalPDFs = 0;
  const toProcess: string[] = [];
  
  for (const folder of folders) {
    const pdfs = findPDFs(folder);
    console.log(`  ${path.basename(folder)}: ${pdfs.length.toLocaleString()} PDFs`);
    totalPDFs += pdfs.length;
    
    // Filter as we go to avoid massive arrays
    for (const pdfPath of pdfs) {
      if (!processedFilenames.has(path.basename(pdfPath))) {
        toProcess.push(pdfPath);
      }
    }
  }
  
  console.log(`\n  TOTAL: ${totalPDFs.toLocaleString()} PDFs`);
  console.log(`Already in database: ${processedFilenames.size.toLocaleString()}`);
  console.log(`To check: ${toProcess.length.toLocaleString()}\n`);
  
  if (toProcess.length === 0) {
    console.log("All files already processed!");
    return;
  }
  
  const stats: ProcessingStats = {
    documentsProcessed: 0,
    documentsSkipped: 0,
    needsOCR: 0,
    chunksCreated: 0,
    embeddingsCreated: 0,
    mentionsExtracted: 0,
    startTime: Date.now(),
  };
  
  console.log("Processing with", PARALLEL_WORKERS, "parallel workers...\n");
  
  // Process in batches
  let processed = 0;
  
  for (let i = 0; i < toProcess.length; i += PARALLEL_WORKERS) {
    const batch = toProcess.slice(i, i + PARALLEL_WORKERS);
    
    const results = await Promise.all(
      batch.map(filepath => processDocument(filepath, stats, processedFilenames))
    );
    
    processed += batch.length;
    
    // Count results
    const success = results.filter(r => r === "success").length;
    const needsOcr = results.filter(r => r === "needs_ocr").length;
    
    // Progress update
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = toProcess.length - processed;
    const eta = remaining / rate;
    
    // Clear line and print progress
    process.stdout.write(`\r  [${processed.toLocaleString()}/${toProcess.length.toLocaleString()}] ` +
      `✓ ${stats.documentsProcessed} saved | ` +
      `⏭ ${stats.needsOCR} need OCR | ` +
      `${rate.toFixed(0)}/sec | ` +
      `ETA: ${formatTime(eta)}    `);
    
    // Detailed update every 500 files
    if (processed % 500 === 0) {
      console.log(`\n  └─ ${stats.documentsProcessed} docs, ${stats.chunksCreated} chunks, ${stats.mentionsExtracted} mentions`);
    }
  }
  
  // Final stats
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log("\n\n╔═══════════════════════════════════════════════════════╗");
  console.log("║  FAST INGESTION COMPLETE                              ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`✓ Saved: ${stats.documentsProcessed.toLocaleString()}`);
  console.log(`⏭ Need OCR: ${stats.needsOCR.toLocaleString()}`);
  console.log(`📄 Chunks: ${stats.chunksCreated.toLocaleString()}`);
  console.log(`👤 Mentions: ${stats.mentionsExtracted.toLocaleString()}`);
  console.log(`⏱ Time: ${formatTime(elapsed)}`);
  console.log(`📊 Rate: ${(stats.documentsProcessed / elapsed * 60).toFixed(0)} docs/min`);
}

process.on('SIGINT', async () => {
  console.log("\n\nShutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
