/**
 * Document Ingestion Script for Epstein Files
 * 
 * Runs CONTINUOUSLY until all documents are processed
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

// Settings
const DOWNLOADS_DIR = path.join(process.env.HOME || "", "Downloads");
const DATASET_PATTERN = /^DataSet \d+$/; // ALL datasets
const TEMP_DIR = path.join(os.tmpdir(), "epstein-ocr");

const PARALLEL_WORKERS = 5;
const MIN_TEXT_LENGTH = 50;
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBEDDING_BATCH_SIZE = 20;
const PROGRESS_INTERVAL = 100; // Log progress every N documents

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
  chunksCreated: number;
  embeddingsCreated: number;
  mentionsExtracted: number;
  errors: number;
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

function pdfToImage(pdfPath: string, outputPrefix: string): string | null {
  try {
    const outputPath = path.join(TEMP_DIR, outputPrefix);
    execSync(`pdftoppm -png -f 1 -l 1 -r 150 "${pdfPath}" "${outputPath}"`, {
      timeout: 30000,
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

function findDataSetFolders(): string[] {
  const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && DATASET_PATTERN.test(e.name))
    .map((e) => path.join(DOWNLOADS_DIR, e.name))
    .sort((a, b) => {
      const numA = parseInt(path.basename(a).match(/\d+/)?.[0] || "0");
      const numB = parseInt(path.basename(b).match(/\d+/)?.[0] || "0");
      return numA - numB;
    });
}

function findPDFsInDataSet(datasetPath: string): string[] {
  const pdfs: string[] = [];
  
  function scanDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
          pdfs.push(fullPath);
        }
      }
    } catch (err) {}
  }
  
  scanDir(datasetPath);
  return pdfs;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP / 2));
      currentChunk = overlapWords.join(" ") + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
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

async function extractDocument(filepath: string): Promise<{
  filename: string;
  text: string;
  pageCount?: number;
  fileSize: number;
  filepath: string;
} | null> {
  const filename = path.basename(filepath);
  const filePrefix = filename.replace(/[^a-zA-Z0-9]/g, "_");
  
  try {
    const dataBuffer = fs.readFileSync(filepath);
    let text = "";
    let pageCount: number | undefined;
    
    try {
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text || "";
      pageCount = pdfData.numpages;
    } catch (e) {
      text = "";
    }
    
    if (text.trim().length < MIN_TEXT_LENGTH) {
      const imagePath = pdfToImage(filepath, filePrefix);
      if (imagePath) {
        text = await ocrImage(imagePath);
        cleanupTempFiles(filePrefix);
      }
    }
    
    if (!text || text.trim().length < 50) {
      return null;
    }
    
    return {
      filename,
      text,
      pageCount,
      fileSize: dataBuffer.length,
      filepath,
    };
  } catch (error) {
    cleanupTempFiles(filePrefix);
    return null;
  }
}

async function saveDocument(
  data: { filename: string; text: string; pageCount?: number; fileSize: number; filepath: string },
  stats: ProcessingStats
): Promise<boolean> {
  try {
    const document = await prisma.document.create({
      data: {
        filename: data.filename,
        title: data.filename.replace(/\.[^/.]+$/, ""),
        content: data.text,
        pageCount: data.pageCount,
        fileSize: data.fileSize,
        sourceUrl: data.filepath,
      },
    });
    
    const chunks = chunkText(data.text);
    
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
    
    const mentions = findMentions(data.text).slice(0, 50);
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
    return true;
  } catch (error) {
    stats.errors++;
    return false;
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

function printProgress(stats: ProcessingStats, total: number, remaining: number) {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rate = stats.documentsProcessed / elapsed;
  const eta = remaining / rate;
  
  console.log(`\n========== PROGRESS ==========`);
  console.log(`Processed: ${stats.documentsProcessed} / ${total}`);
  console.log(`Remaining: ${remaining}`);
  console.log(`Rate: ${rate.toFixed(1)} docs/sec`);
  console.log(`Elapsed: ${formatTime(elapsed)}`);
  console.log(`ETA: ${formatTime(eta)}`);
  console.log(`Chunks: ${stats.chunksCreated} | Embeddings: ${stats.embeddingsCreated}`);
  console.log(`Mentions: ${stats.mentionsExtracted} | Errors: ${stats.errors}`);
  console.log(`==============================\n`);
}

async function ingestDocuments(): Promise<void> {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  EPSTEIN FILES - CONTINUOUS INGESTION     ║");
  console.log("║  Press Ctrl+C to stop                     ║");
  console.log("╚═══════════════════════════════════════════╝\n");
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes("your")) {
    console.error("⚠️  OpenAI API key not configured!");
    process.exit(1);
  }
  
  try { execSync("which pdftoppm", { stdio: 'pipe' }); } catch {
    console.error("⚠️  pdftoppm not found. Run: brew install poppler");
    process.exit(1);
  }
  
  ensureTempDir();
  
  // Find all datasets
  const datasets = findDataSetFolders();
  console.log(`Found ${datasets.length} DataSet folders:\n`);
  
  const allPDFs: string[] = [];
  for (const ds of datasets) {
    const pdfs = findPDFsInDataSet(ds);
    console.log(`  ${path.basename(ds)}: ${pdfs.length.toLocaleString()} PDFs`);
    allPDFs.push(...pdfs);
  }
  
  console.log(`\n  TOTAL: ${allPDFs.length.toLocaleString()} PDFs\n`);
  
  // Get already processed
  const existing = await prisma.document.findMany({ select: { filename: true } });
  const processedFilenames = new Set(existing.map(e => e.filename));
  console.log(`Already processed: ${processedFilenames.size.toLocaleString()}`);
  
  // Filter to unprocessed
  const toProcess = allPDFs.filter(p => !processedFilenames.has(path.basename(p)));
  console.log(`To process: ${toProcess.length.toLocaleString()}\n`);
  
  if (toProcess.length === 0) {
    console.log("✓ All documents already processed!");
    return;
  }
  
  const stats: ProcessingStats = {
    documentsProcessed: 0,
    documentsSkipped: processedFilenames.size,
    chunksCreated: 0,
    embeddingsCreated: 0,
    mentionsExtracted: 0,
    errors: 0,
    startTime: Date.now(),
  };
  
  console.log("Starting continuous processing...\n");
  
  let index = 0;
  while (index < toProcess.length) {
    // Process batch in parallel
    const batch = toProcess.slice(index, index + PARALLEL_WORKERS);
    const extractPromises = batch.map(extractDocument);
    const results = await Promise.all(extractPromises);
    
    // Save results
    for (const result of results) {
      if (result) {
        const saved = await saveDocument(result, stats);
        if (saved) {
          console.log(`  ✓ ${result.filename} (${result.text.length} chars)`);
        }
      }
    }
    
    index += PARALLEL_WORKERS;
    
    // Progress update
    if (stats.documentsProcessed > 0 && stats.documentsProcessed % PROGRESS_INTERVAL === 0) {
      printProgress(stats, allPDFs.length, toProcess.length - index);
    }
  }
  
  // Final stats
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║  INGESTION COMPLETE                       ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log(`Total processed: ${stats.documentsProcessed.toLocaleString()}`);
  console.log(`Total time: ${formatTime(elapsed)}`);
  console.log(`Chunks: ${stats.chunksCreated.toLocaleString()}`);
  console.log(`Embeddings: ${stats.embeddingsCreated.toLocaleString()}`);
  console.log(`Mentions: ${stats.mentionsExtracted.toLocaleString()}`);
  if (stats.errors > 0) console.log(`Errors: ${stats.errors}`);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log("\n\nShutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

ingestDocuments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
