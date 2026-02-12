import { NextRequest, NextResponse } from "next/server";
import { searchApify, ApifyDocument } from "@/lib/apify";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Apify runs

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 50 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json(
        { error: "Apify API not configured" },
        { status: 500 }
      );
    }

    const results = await searchApify([query.trim()], maxResults);

    // Group by document for better display
    const documentMap = new Map<string, {
      filename: string;
      sourceUrl: string;
      chunks: { text: string; highlight: string[] }[];
    }>();

    for (const doc of results) {
      const existing = documentMap.get(doc.originFileName);
      if (existing) {
        existing.chunks.push({
          text: doc.extractedText,
          highlight: doc.highlight,
        });
      } else {
        documentMap.set(doc.originFileName, {
          filename: doc.originFileName,
          sourceUrl: doc.originFileUri,
          chunks: [{
            text: doc.extractedText,
            highlight: doc.highlight,
          }],
        });
      }
    }

    const documents = Array.from(documentMap.values());

    return NextResponse.json({
      query,
      totalResults: results.length,
      documents,
    });
  } catch (error: any) {
    console.error("Apify search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
