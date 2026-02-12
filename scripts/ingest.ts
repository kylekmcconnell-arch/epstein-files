/**
 * Document Ingestion Script for Epstein Files
 * 
 * Improved OCR with higher resolution and quality filtering
 * 
 * Usage: npx tsx scripts/ingest.ts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as pdfParse from "pdf-parse";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { execSync } from "child_process";
import Tesseract from "tesseract.js";
import * as os from "os";

const pdf = (pdfParse as unknown as { default?: typeof pdfParse }).default || pdfParse;

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Folder locations
const DOWNLOADS_DIR = path.join(process.env.HOME || "", "Downloads");
const TEMP_DIR = path.join(os.tmpdir(), "epstein-ocr");

// Patterns to find document folders
const FOLDER_PATTERNS = [
  /^DataSet \d+$/,      // DataSet 1, DataSet 2, etc.
  /^VOL\d+$/i,          // VOL00010, VOL00011, VOL00012
  /^dataset\d+/i,       // dataset9-more-complete
];

// OCR Settings - IMPROVED
const OCR_DPI = 300;            // Higher resolution for better accuracy (was 150)
const PARALLEL_WORKERS = 3;     // Reduced for OCR quality
const MIN_TEXT_LENGTH = 50;     // Minimum text to consider valid (lowered from 100)
const MIN_WORD_RATIO = 0.2;     // At least 20% should be real words (lowered from 30%)
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBEDDING_BATCH_SIZE = 20;
const PROGRESS_INTERVAL = 50;

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
  ocrUsed: number;
  ocrFailed: number;
  chunksCreated: number;
  embeddingsCreated: number;
  mentionsExtracted: number;
  startTime: number;
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanupTempFiles(prefix: string) {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      if (file.startsWith(prefix)) {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      }
    }
  } catch (e) {}
}

// Check if text is readable (not garbage)
function isReadableText(text: string): boolean {
  if (!text || text.length < MIN_TEXT_LENGTH) return false;
  
  // Split into words
  const words = text.toLowerCase().match(/[a-z]{2,}/g) || [];
  if (words.length < 5) return false;  // Lowered from 10
  
  // Check ratio of common words
  const commonCount = words.filter(w => COMMON_WORDS.has(w)).length;
  const ratio = commonCount / words.length;
  
  // Also check for excessive special characters
  const alphaNumeric = text.match(/[a-zA-Z0-9]/g) || [];
  const alphaRatio = alphaNumeric.length / text.length;
  
  return ratio >= MIN_WORD_RATIO && alphaRatio >= 0.4;  // Lowered from 0.5
}

// Convert PDF to image using pdftoppm with higher DPI
function pdfToImage(pdfPath: string, outputPrefix: string): string | null {
  try {
    const outputPath = path.join(TEMP_DIR, outputPrefix);
    execSync(`pdftoppm -png -f 1 -l 1 -r ${OCR_DPI} "${pdfPath}" "${outputPath}"`, {
      timeout: 60000,
      stdio: 'pipe'
    });
    
    const expectedFile = `${outputPath}-1.png`;
    if (fs.existsSync(expectedFile)) return expectedFile;
    
    const altFile = `${outputPath}.png`;
    if (fs.existsSync(altFile)) return altFile;
    
    return null;
  } catch (error) {
    return null;
  }
}

async function ocrImage(imagePath: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(imagePath, "eng", {
      logger: () => {},
    });
    return result.data.text || "";
  } catch (error) {
    return "";
  }
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
      embeddings.push(...batch.map(() => []));
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return embeddings;
}

async function processDocument(filepath: string, stats: ProcessingStats): Promise<boolean> {
  const filename = path.basename(filepath);
  const filePrefix = filename.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  
  // Show we're working on this file
  process.stdout.write(`  ${filename.slice(0, 40).padEnd(40)} `);
  
  try {
    const dataBuffer = fs.readFileSync(filepath);
    let text = "";
    let pageCount: number | undefined;
    let usedOCR = false;
    
    // Try regular PDF extraction first
    try {
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text || "";
      pageCount = pdfData.numpages;
    } catch (e) {
      text = "";
    }
    
    // If not enough text, try OCR
    if (!isReadableText(text)) {
      const imagePath = pdfToImage(filepath, filePrefix);
      if (imagePath) {
        const ocrText = await ocrImage(imagePath);
        cleanupTempFiles(filePrefix);
        
        if (isReadableText(ocrText)) {
          text = ocrText;
          usedOCR = true;
          stats.ocrUsed++;
        } else {
          stats.ocrFailed++;
          console.log("✗ unreadable (OCR failed quality check)");
          return false;
        }
      } else {
        stats.ocrFailed++;
        console.log("✗ OCR conversion failed");
        return false;
      }
    }
    
    // Final quality check
    if (!isReadableText(text)) {
      stats.documentsSkipped++;
      console.log("✗ skipped (not readable)");
      return false;
    }
    
    // Save to database
    const document = await prisma.document.create({
      data: {
        filename,
        title: filename.replace(/\.[^/.]+$/, ""),
        content: text.slice(0, 100000), // Limit content size
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
    console.log(`✓ ${text.length} chars${usedOCR ? " (OCR)" : ""}`);
    return true;
    
  } catch (error: any) {
    cleanupTempFiles(filePrefix);
    console.log(`✗ error: ${error.message?.slice(0, 50) || "unknown"}`);
    return false;
  }
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║  EPSTEIN FILES - IMPROVED OCR INGESTION       ║");
  console.log("║  OCR: 300 DPI | Quality filtering enabled     ║");
  console.log("╚═══════════════════════════════════════════════╝\n");
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  OpenAI API key not configured!");
    process.exit(1);
  }
  
  try { execSync("which pdftoppm", { stdio: 'pipe' }); } catch {
    console.error("⚠️  pdftoppm not found. Run: brew install poppler");
    process.exit(1);
  }
  
  ensureTempDir();
  
  // Find all document folders
  const folders = findDocumentFolders();
  console.log(`Found ${folders.length} document folders:\n`);
  
  let totalPDFs = 0;
  const folderCounts: { folder: string; count: number }[] = [];
  
  for (const folder of folders) {
    const pdfs = findPDFs(folder);
    console.log(`  ${path.basename(folder)}: ${pdfs.length.toLocaleString()} PDFs`);
    folderCounts.push({ folder, count: pdfs.length });
    totalPDFs += pdfs.length;
  }
  
  console.log(`\n  TOTAL: ${totalPDFs.toLocaleString()} PDFs\n`);
  
  // Get already processed
  const existing = await prisma.document.findMany({ select: { filename: true } });
  const processedFilenames = new Set(existing.map(e => e.filename));
  console.log(`Already processed: ${processedFilenames.size.toLocaleString()}`);
  
  const stats: ProcessingStats = {
    documentsProcessed: 0,
    documentsSkipped: 0,
    ocrUsed: 0,
    ocrFailed: 0,
    chunksCreated: 0,
    embeddingsCreated: 0,
    mentionsExtracted: 0,
    startTime: Date.now(),
  };
  
  console.log("\nProcessing...\n");
  
  // Process each folder
  let totalAttempted = 0;
  
  for (const folder of folders) {
    console.log(`\n📁 ${path.basename(folder)}`);
    const pdfs = findPDFs(folder);
    let folderSkipped = 0;
    
    for (const pdfPath of pdfs) {
      const filename = path.basename(pdfPath);
      
      // Skip if already processed
      if (processedFilenames.has(filename)) {
        folderSkipped++;
        continue;
      }
      
      totalAttempted++;
      await processDocument(pdfPath, stats);
      processedFilenames.add(filename);
      
      // Progress update every 10 attempts
      if (totalAttempted % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const successRate = stats.documentsProcessed / totalAttempted * 100;
        console.log(`\n  [${totalAttempted} tried | ${stats.documentsProcessed} saved | ${successRate.toFixed(0)}% success | ${formatTime(elapsed)} elapsed]\n`);
      }
    }
    
    if (folderSkipped > 0) {
      console.log(`  (${folderSkipped} already in database)`);
    }
  }
  
  // Final stats
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║  INGESTION COMPLETE                           ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`Processed: ${stats.documentsProcessed.toLocaleString()}`);
  console.log(`Skipped (unreadable): ${stats.documentsSkipped.toLocaleString()}`);
  console.log(`OCR used: ${stats.ocrUsed.toLocaleString()}`);
  console.log(`OCR failed: ${stats.ocrFailed.toLocaleString()}`);
  console.log(`Time: ${formatTime(elapsed)}`);
}

process.on('SIGINT', async () => {
  console.log("\n\nShutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
