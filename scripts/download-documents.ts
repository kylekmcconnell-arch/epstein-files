/**
 * Document Download Script
 * 
 * Downloads Epstein court documents from public sources.
 * The documents are publicly available through court releases and archives.
 * 
 * Usage: npx tsx scripts/download-documents.ts
 */

import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

const DOCUMENTS_DIR = path.join(process.cwd(), "documents");

// Known public sources for Epstein documents
const DOCUMENT_SOURCES = {
  // Internet Archive collection
  internetArchive: {
    baseUrl: "https://archive.org/details/epstein-files",
    metadataUrl: "https://archive.org/metadata/epstein-files",
  },
  // Court Listener (public court documents)
  courtListener: {
    searchUrl: "https://www.courtlistener.com/api/rest/v3/search/",
  },
  // DocumentCloud collections
  documentCloud: {
    projectUrl: "https://www.documentcloud.org/app?q=project:epstein-documents-208906",
  },
};

// List of known document URLs (can be expanded)
const KNOWN_DOCUMENT_URLS: { url: string; filename: string }[] = [
  // These are example placeholders - actual URLs should be added
  // The script will also try to discover documents from the archive sources
];

interface DownloadProgress {
  total: number;
  downloaded: number;
  failed: string[];
  skipped: string[];
}

async function ensureDocumentsDir(): Promise<void> {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    console.log(`Created documents directory: ${DOCUMENTS_DIR}`);
  }
}

async function downloadFile(url: string, filename: string): Promise<boolean> {
  const filepath = path.join(DOCUMENTS_DIR, filename);
  
  // Skip if already downloaded
  if (fs.existsSync(filepath)) {
    console.log(`  Skipping (already exists): ${filename}`);
    return false;
  }

  try {
    console.log(`  Downloading: ${filename}`);
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000, // 60 second timeout
      headers: {
        "User-Agent": "EpsteinFilesResearch/1.0 (Academic Research Tool)",
      },
    });

    fs.writeFileSync(filepath, response.data);
    console.log(`  ✓ Downloaded: ${filename} (${(response.data.length / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ✗ Failed to download ${filename}: ${errorMessage}`);
    return false;
  }
}

async function fetchInternetArchiveDocuments(): Promise<{ url: string; filename: string }[]> {
  console.log("\nFetching document list from Internet Archive...");
  
  try {
    const response = await axios.get(DOCUMENT_SOURCES.internetArchive.metadataUrl, {
      timeout: 30000,
    });
    
    const files = response.data.files || [];
    const pdfFiles = files
      .filter((f: { name: string }) => f.name.toLowerCase().endsWith(".pdf"))
      .map((f: { name: string }) => ({
        url: `https://archive.org/download/epstein-files/${encodeURIComponent(f.name)}`,
        filename: f.name,
      }));

    console.log(`Found ${pdfFiles.length} PDF documents on Internet Archive`);
    return pdfFiles;
  } catch (error) {
    console.log("Could not fetch from Internet Archive (collection may not exist or be private)");
    return [];
  }
}

async function fetchDocumentCloudDocuments(): Promise<{ url: string; filename: string }[]> {
  console.log("\nNote: DocumentCloud documents require manual download or API access.");
  console.log("Visit: https://www.documentcloud.org/app?q=epstein");
  return [];
}

// Manual document list for known released documents
// These URLs point to publicly released court documents
function getKnownDocuments(): { url: string; filename: string }[] {
  return [
    // Add known document URLs here
    // Example format:
    // { url: "https://example.com/document.pdf", filename: "document.pdf" },
  ];
}

async function downloadAllDocuments(): Promise<void> {
  await ensureDocumentsDir();
  
  const progress: DownloadProgress = {
    total: 0,
    downloaded: 0,
    failed: [],
    skipped: [],
  };

  console.log("===========================================");
  console.log("  Epstein Files Document Downloader");
  console.log("===========================================");
  console.log("\nThis script downloads publicly available court documents.");
  console.log(`Documents will be saved to: ${DOCUMENTS_DIR}\n`);

  // Gather documents from all sources
  const allDocuments: { url: string; filename: string }[] = [];

  // Try Internet Archive
  const iaDocuments = await fetchInternetArchiveDocuments();
  allDocuments.push(...iaDocuments);

  // Add known documents
  const knownDocs = getKnownDocuments();
  allDocuments.push(...knownDocs);

  // Add any manually specified URLs
  allDocuments.push(...KNOWN_DOCUMENT_URLS);

  if (allDocuments.length === 0) {
    console.log("\n⚠️  No documents found from automated sources.");
    console.log("\nTo add documents manually, you can:");
    console.log("1. Add URLs to KNOWN_DOCUMENT_URLS in this script");
    console.log("2. Place PDF files directly in the documents/ folder");
    console.log("3. Run the ingestion script after adding documents");
    
    // Create a sample document for testing
    await createSampleDocument();
    return;
  }

  progress.total = allDocuments.length;
  console.log(`\nStarting download of ${progress.total} documents...\n`);

  for (const doc of allDocuments) {
    const result = await downloadFile(doc.url, doc.filename);
    if (result) {
      progress.downloaded++;
    } else {
      if (fs.existsSync(path.join(DOCUMENTS_DIR, doc.filename))) {
        progress.skipped.push(doc.filename);
      } else {
        progress.failed.push(doc.filename);
      }
    }

    // Small delay to be respectful to servers
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n===========================================");
  console.log("  Download Complete");
  console.log("===========================================");
  console.log(`Total documents: ${progress.total}`);
  console.log(`Downloaded: ${progress.downloaded}`);
  console.log(`Skipped (already exist): ${progress.skipped.length}`);
  console.log(`Failed: ${progress.failed.length}`);
  
  if (progress.failed.length > 0) {
    console.log("\nFailed downloads:");
    progress.failed.forEach((f) => console.log(`  - ${f}`));
  }

  console.log("\n✓ Run 'npx tsx scripts/ingest.ts' to process the downloaded documents");
}

async function createSampleDocument(): Promise<void> {
  // Create a sample text file for testing the pipeline
  const samplePath = path.join(DOCUMENTS_DIR, "SAMPLE_README.txt");
  const sampleContent = `
EPSTEIN FILES BROWSER - DOCUMENT DIRECTORY
==========================================

This directory is where downloaded court documents should be placed.

To add documents:
1. Download PDF files from public sources:
   - Court records from PACER (Public Access to Court Electronic Records)
   - Internet Archive collections
   - DocumentCloud public projects
   
2. Place the PDF files in this directory

3. Run the ingestion script:
   npx tsx scripts/ingest.ts

The system will extract text, create searchable indexes, and enable
AI-powered Q&A over the documents.

Note: This tool is designed for research purposes using publicly 
available court documents.
`;

  fs.writeFileSync(samplePath, sampleContent);
  console.log("\n✓ Created sample README in documents folder");
}

// Main execution
downloadAllDocuments().catch((error) => {
  console.error("Download script failed:", error);
  process.exit(1);
});
