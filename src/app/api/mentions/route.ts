import { NextRequest, NextResponse } from "next/server";
import { searchMentions, getMentionedNames } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // If a name is provided, search for that name's mentions
    if (name) {
      const mentions = await searchMentions(name, limit);
      return NextResponse.json({
        name,
        count: mentions.length,
        mentions,
      });
    }

    // Otherwise, return list of all mentioned names with counts
    const names = await getMentionedNames();
    
    return NextResponse.json({
      count: names.length,
      names,
    });
  } catch (error) {
    console.error("Mentions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mentions" },
      { status: 500 }
    );
  }
}
