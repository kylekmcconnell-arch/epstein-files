import prisma from "./db";
import { createEmbedding } from "./openai";

export interface SearchResult {
  documentId: string;
  filename: string;
  title: string | null;
  content: string;
  pageNumber: number | null;
  score: number;
}

export interface MentionResult {
  id: string;
  name: string;
  context: string;
  pageNumber: number | null;
  documentId: string;
  filename: string;
}

// Full-text keyword search using PostgreSQL
export async function keywordSearch(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const searchTerms = query
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .join(" & ");

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT 
      d.id as "documentId",
      d.filename,
      d.title,
      ts_headline('english', d.content, plainto_tsquery('english', ${query}), 
        'MaxWords=50, MinWords=25, StartSel=<mark>, StopSel=</mark>') as content,
      NULL as "pageNumber",
      ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', ${query})) as score
    FROM "Document" d
    WHERE to_tsvector('english', d.content) @@ plainto_tsquery('english', ${query})
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  return results;
}

// Semantic search using vector similarity
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const embedding = await createEmbedding(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT 
      c."documentId",
      d.filename,
      d.title,
      c.content,
      c."pageNumber",
      1 - (c.embedding <=> ${embeddingStr}::vector) as score
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

// Hybrid search combining keyword and semantic
export async function hybridSearch(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(query, limit),
    semanticSearch(query, Math.ceil(limit / 2)),
  ]);

  // Merge and deduplicate results, preferring semantic matches
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  // Add semantic results first (higher relevance)
  for (const result of semanticResults) {
    if (!seen.has(result.documentId)) {
      seen.add(result.documentId);
      merged.push({ ...result, score: result.score * 1.5 }); // Boost semantic scores
    }
  }

  // Add keyword results
  for (const result of keywordResults) {
    if (!seen.has(result.documentId)) {
      seen.add(result.documentId);
      merged.push(result);
    }
  }

  return merged.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Search for mentions of a specific person
export async function searchMentions(
  name: string,
  limit: number = 50
): Promise<MentionResult[]> {
  const normalizedName = name.toLowerCase().trim();

  const results = await prisma.$queryRaw<MentionResult[]>`
    SELECT 
      m.id,
      m.name,
      m.context,
      m."pageNumber",
      m."documentId",
      d.filename
    FROM "Mention" m
    JOIN "Document" d ON d.id = m."documentId"
    WHERE m."normalizedName" ILIKE ${'%' + normalizedName + '%'}
    ORDER BY d.filename, m."pageNumber"
    LIMIT ${limit}
  `;

  return results;
}

// Get all unique mentioned names with counts
export async function getMentionedNames(): Promise<
  { name: string; count: number }[]
> {
  const results = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
    SELECT "normalizedName" as name, COUNT(*) as count
    FROM "Mention"
    GROUP BY "normalizedName"
    ORDER BY count DESC
    LIMIT 100
  `;

  return results.map((r) => ({ name: r.name, count: Number(r.count) }));
}

// Get chunks for RAG context
export async function getRelevantChunks(
  query: string,
  limit: number = 5
): Promise<{ content: string; documentId: string; pageNumber: number | null }[]> {
  const embedding = await createEmbedding(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<
    { content: string; documentId: string; pageNumber: number | null }[]
  >`
    SELECT 
      c.content,
      c."documentId",
      c."pageNumber"
    FROM "Chunk" c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}
