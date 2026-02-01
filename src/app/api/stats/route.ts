import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [documentCount, chunkCount, mentionCount, topMentions] = await Promise.all([
      prisma.document.count(),
      prisma.chunk.count(),
      prisma.mention.count(),
      prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT "normalizedName" as name, COUNT(*) as count
        FROM "Mention"
        GROUP BY "normalizedName"
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return NextResponse.json({
      documents: documentCount,
      chunks: chunkCount,
      mentions: mentionCount,
      topMentions: topMentions.map((m) => ({
        name: m.name,
        count: Number(m.count),
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
