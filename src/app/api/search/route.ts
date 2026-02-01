import { NextRequest, NextResponse } from "next/server";
import { keywordSearch, semanticSearch, hybridSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const mode = searchParams.get("mode") || "hybrid"; // keyword, semantic, hybrid
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    let results;
    switch (mode) {
      case "keyword":
        results = await keywordSearch(query, limit);
        break;
      case "semantic":
        results = await semanticSearch(query, limit);
        break;
      case "hybrid":
      default:
        results = await hybridSearch(query, limit);
        break;
    }

    return NextResponse.json({
      query,
      mode,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
