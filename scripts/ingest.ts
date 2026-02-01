/**
 * Document Ingestion Script for Epstein Files
 * 
 * Processes DataSet folders containing litigation-format documents:
 * - Scans DataSet folders in Downloads
 * - Extracts text from PDFs
 * - Creates embeddings and indexes for search
 * 
 * Usage: npx tsx scripts/ingest.ts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as pdfParse from "pdf-parse";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import Tesseract from "tesseract.js";

// Handle both ESM and CJS exports
const pdf = (pdfParse as unknown as { default?: typeof pdfParse }).default || pdfParse;

// OCR settings
const USE_OCR = true; // Enable OCR for image-based PDFs
const MIN_TEXT_LENGTH = 100; // Minimum characters before trying OCR

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// DataSet locations
const DOWNLOADS_DIR = path.join(process.env.HOME || "", "Downloads");
const DATASET_PATTERN = /^DataSet \d+$/;

const CHUNK_SIZE = 500; // tokens (approximate)
const CHUNK_OVERLAP = 50; // tokens overlap between chunks
const EMBEDDING_BATCH_SIZE = 20; // Process embeddings in batches
const MAX_DOCUMENTS_PER_RUN = 500; // Limit per run to manage costs

// Notable names to extract mentions for
const NOTABLE_NAMES = [
  "Bill Gates",
  "Donald Trump",
  "Bill Clinton",
  "Hillary Clinton",
  "Prince Andrew",
  "Alan Dershowitz",
  "Ghislaine Maxwell",
  "Les Wexner",
  "Stephen Hawking",
  "Elon Musk",
  "Kevin Spacey",
  "Chris Tucker",
  "Naomi Campbell",
  "Jean-Luc Brunel",
  "Ehud Barak",
  "Larry Summers",
  "Leon Black",
  "Marvin Minsky",
  "Reid Hoffman",
  "George Mitchell",
  "Glenn Dubin",
  "Eva Dubin",
  "Sarah Kellen",
  "Nadia Marcinkova",
  "Virginia Giuffre",
  "Virginia Roberts",
  "Jeffrey Epstein",
  "Palm Beach",
  "Little St. James",
  "Zorro Ranch",
];

interface ProcessingStats {
  documentsProcessed: number;
  documentsSkipped: number;
  chunksCreated: number;
  embeddingsCreated: number;
  mentionsExtracted: number;
  errors: string[];
}

// Find all DataSet folders
function findDataSetFolders(): string[] {
  const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  const datasets = entries
    .filter((e) => e.isDirectory() && DATASET_PATTERN.test(e.name))
    .map((e) => path.join(DOWNLOADS_DIR, e.name))
    .sort();
  
  console.log(`Found ${datasets.length} DataSet folders`);
  return datasets;
}

// Find all PDFs in a DataSet folder
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
    } catch (err) {
      // Skip inaccessible directories
    }
  }
  
  scanDir(datasetPath);
  return pdfs;
}

// Approximate token count (rough estimate: 4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split text into chunks with overlap
function chunkText(text: string, maxTokens: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Keep overlap from previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 2));
      currentChunk = overlapWords.join(" ") + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter((c) => c.length > 50); // Filter out very short chunks
}

// Find mentions of notable names in text
function findMentions(text: string): { name: string; normalizedName: string; context: string }[] {
  const mentions: { name: string; normalizedName: string; context: string }[] = [];
  const textLower = text.toLowerCase();
  
  for (const name of NOTABLE_NAMES) {
    const nameLower = name.toLowerCase();
    let searchIndex = 0;
    
    while (true) {
      const index = textLower.indexOf(nameLower, searchIndex);
      if (index === -1) break;
      
      // Extract context around the mention
      const start = Math.max(0, index - 100);
      const end = Math.min(text.length, index + name.length + 100);
      const context = text.substring(start, end).trim();
      
      mentions.push({
        name: name,
        normalizedName: nameLower,
        context: context,
      });
      
      searchIndex = index + 1;
    }
  }
  
  return mentions;
}

// Create embeddings for chunks in batches
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
      
      // Progress indicator
      process.stdout.write(`\r    Embeddings: ${embeddings.length}/${texts.length}`);
    } catch (error) {
      console.error(`\n    Error creating embeddings for batch ${i}:`, error);
      // Add empty embeddings for failed batch
      embeddings.push(...batch.map(() => []));
    }
    
    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  console.log(); // New line after progress
  return embeddings;
}

// Process a single PDF file
async function processDocument(filepath: string, stats: ProcessingStats): Promise<boolean> {
  const filename = path.basename(filepath);
  
  try {
    // Check if already processed
    const existing = await prisma.document.findUnique({
      where: { filename },
    });
    
    if (existing) {
      stats.documentsSkipped++;
      return false;
    }
    
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filepath);
    
    let text: string = "";
    let pageCount: number | undefined;
    let usedOCR = false;
    
    try {
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text || "";
      pageCount = pdfData.numpages;
    } catch (pdfError) {
      // PDF parsing failed, will try OCR if enabled
      text = "";
    }
    
    // If we got very little text and OCR is enabled, try OCR
    if (text.trim().length < MIN_TEXT_LENGTH && USE_OCR) {
      try {
        console.log(`    Attempting OCR for: ${filename}`);
        const ocrResult = await Tesseract.recognize(filepath, "eng", {
          logger: () => {}, // Suppress progress logs
        });
        text = ocrResult.data.text || "";
        usedOCR = true;
        if (text.trim().length > MIN_TEXT_LENGTH) {
          console.log(`    OCR successful: extracted ${text.length} chars`);
        }
      } catch (ocrError) {
        // OCR failed, continue with whatever text we have
        console.log(`    OCR failed for ${filename}`);
      }
    }
    
    if (!text || text.trim().length < 50) {
      // Skip documents with very little text even after OCR
      return false;
    }
    
    console.log(`  Processing: ${filename} (${text.length} chars${usedOCR ? ", via OCR" : ""})`);
    
    // Create document record
    const document = await prisma.document.create({
      data: {
        filename,
        title: filename.replace(/\.[^/.]+$/, ""),
        content: text,
        pageCount,
        fileSize: dataBuffer.length,
        sourceUrl: filepath,
      },
    });
    
    // Chunk the text
    const chunks = chunkText(text);
    
    if (chunks.length > 0) {
      // Create embeddings
      const embeddings = await createEmbeddings(chunks);
      
      // Store chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const embedding = embeddings[i];
        
        if (embedding && embedding.length > 0) {
          // Use raw SQL to insert with vector
          const embeddingStr = `[${embedding.join(",")}]`;
          await prisma.$executeRaw`
            INSERT INTO "Chunk" (id, "documentId", content, "pageNumber", "chunkIndex", embedding, "createdAt")
            VALUES (
              ${`chunk_${document.id}_${i}`},
              ${document.id},
              ${chunks[i]},
              ${1},
              ${i},
              ${embeddingStr}::vector,
              NOW()
            )
          `;
        } else {
          await prisma.chunk.create({
            data: {
              id: `chunk_${document.id}_${i}`,
              documentId: document.id,
              content: chunks[i],
              pageNumber: 1,
              chunkIndex: i,
            },
          });
        }
        
        stats.chunksCreated++;
        if (embedding && embedding.length > 0) stats.embeddingsCreated++;
      }
    }
    
    // Extract and store mentions
    const mentions = findMentions(text);
    if (mentions.length > 0) {
      // Limit to first 50 mentions per document
      const limitedMentions = mentions.slice(0, 50);
      await prisma.mention.createMany({
        data: limitedMentions.map((m) => ({
          documentId: document.id,
          name: m.name,
          normalizedName: m.normalizedName,
          context: m.context,
        })),
      });
      stats.mentionsExtracted += limitedMentions.length;
    }
    
    stats.documentsProcessed++;
    return true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`${filename}: ${errorMessage}`);
    return false;
  }
}

// Main ingestion function
async function ingestDocuments(): Promise<void> {
  console.log("===========================================");
  console.log("  Epstein Files Document Ingestion");
  console.log("===========================================\n");
  
  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    console.error("⚠️  OpenAI API key not configured!");
    console.error("Please set OPENAI_API_KEY in your .env file");
    console.error("\nEdit: /Users/kyle/Documents/Nahla.Chat/epstein-files/.env");
    process.exit(1);
  }
  
  // Find all DataSet folders
  const datasets = findDataSetFolders();
  
  if (datasets.length === 0) {
    console.error("⚠️  No DataSet folders found in Downloads");
    process.exit(1);
  }
  
  // Collect all PDFs
  console.log("\nScanning for PDF files...");
  const allPDFs: string[] = [];
  
  for (const dataset of datasets) {
    const pdfs = findPDFsInDataSet(dataset);
    console.log(`  ${path.basename(dataset)}: ${pdfs.length} PDFs`);
    allPDFs.push(...pdfs);
  }
  
  console.log(`\nTotal PDFs found: ${allPDFs.length}`);
  
  // Check how many are already processed
  const existingCount = await prisma.document.count();
  console.log(`Already processed: ${existingCount}`);
  
  const toProcess = Math.min(allPDFs.length, MAX_DOCUMENTS_PER_RUN);
  console.log(`Will process up to: ${toProcess} documents this run\n`);
  
  const stats: ProcessingStats = {
    documentsProcessed: 0,
    documentsSkipped: 0,
    chunksCreated: 0,
    embeddingsCreated: 0,
    mentionsExtracted: 0,
    errors: [],
  };
  
  // Process documents
  let processed = 0;
  for (const pdfPath of allPDFs) {
    if (stats.documentsProcessed >= MAX_DOCUMENTS_PER_RUN) {
      console.log(`\nReached limit of ${MAX_DOCUMENTS_PER_RUN} documents per run.`);
      console.log("Run the script again to process more.");
      break;
    }
    
    const wasProcessed = await processDocument(pdfPath, stats);
    processed++;
    
    // Progress update every 50 files
    if (processed % 50 === 0) {
      console.log(`\n--- Progress: ${processed}/${allPDFs.length} files checked ---\n`);
    }
  }
  
  console.log("\n===========================================");
  console.log("  Ingestion Complete");
  console.log("===========================================");
  console.log(`Documents processed: ${stats.documentsProcessed}`);
  console.log(`Documents skipped (already done): ${stats.documentsSkipped}`);
  console.log(`Chunks created: ${stats.chunksCreated}`);
  console.log(`Embeddings created: ${stats.embeddingsCreated}`);
  console.log(`Mentions extracted: ${stats.mentionsExtracted}`);
  
  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }
  
  const remaining = allPDFs.length - stats.documentsProcessed - stats.documentsSkipped;
  if (remaining > 0) {
    console.log(`\n⚠️  ${remaining} documents remaining. Run the script again to continue.`);
  } else {
    console.log("\n✓ All documents processed!");
  }
  
  console.log("\nStart the app with 'npm run dev' to browse and search.");
}

// Run ingestion
ingestDocuments()
  .catch((error) => {
    console.error("Ingestion failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
