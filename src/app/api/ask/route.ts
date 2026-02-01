import { NextRequest, NextResponse } from "next/server";
import { getRelevantChunks } from "@/lib/search";
import { askQuestion } from "@/lib/openai";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Get relevant chunks for context
    const chunks = await getRelevantChunks(question, 8);

    if (chunks.length === 0) {
      return NextResponse.json({
        question,
        answer: "I couldn't find any relevant information in the documents to answer your question.",
        sources: [],
      });
    }

    // Get document details for citations
    const documentIds = [...new Set(chunks.map((c) => c.documentId))];
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, filename: true, title: true },
    });

    const docMap = new Map(documents.map((d) => [d.id, d]));

    // Generate answer using GPT
    const answer = await askQuestion(question, chunks);

    // Format sources
    const sources = chunks.map((chunk) => {
      const doc = docMap.get(chunk.documentId);
      return {
        documentId: chunk.documentId,
        filename: doc?.filename || "Unknown",
        title: doc?.title || null,
        pageNumber: chunk.pageNumber,
        excerpt: chunk.content.substring(0, 200) + "...",
      };
    });

    return NextResponse.json({
      question,
      answer,
      sources,
    });
  } catch (error) {
    console.error("Ask error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
