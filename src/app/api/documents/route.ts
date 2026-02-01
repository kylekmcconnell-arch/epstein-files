import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("Documents API called");
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        select: {
          id: true,
          filename: true,
          title: true,
          pageCount: true,
          fileSize: true,
          createdAt: true,
          _count: {
            select: {
              chunks: true,
              mentions: true,
            },
          },
        },
        orderBy: { filename: "asc" },
        skip,
        take: limit,
      }),
      prisma.document.count(),
    ]);

    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        title: d.title,
        pageCount: d.pageCount,
        fileSize: d.fileSize,
        createdAt: d.createdAt,
        chunkCount: d._count.chunks,
        mentionCount: d._count.mentions,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
