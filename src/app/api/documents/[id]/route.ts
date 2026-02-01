import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        mentions: {
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Group mentions by name
    const mentionsByName: Record<string, { count: number; pages: number[] }> = {};
    for (const mention of document.mentions) {
      const name = mention.normalizedName;
      if (!mentionsByName[name]) {
        mentionsByName[name] = { count: 0, pages: [] };
      }
      mentionsByName[name].count++;
      if (mention.pageNumber && !mentionsByName[name].pages.includes(mention.pageNumber)) {
        mentionsByName[name].pages.push(mention.pageNumber);
      }
    }

    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      title: document.title,
      content: document.content,
      pageCount: document.pageCount,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
      mentions: mentionsByName,
      mentionDetails: document.mentions.map((m) => ({
        name: m.name,
        context: m.context,
        pageNumber: m.pageNumber,
      })),
    });
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
