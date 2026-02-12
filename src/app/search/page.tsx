"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Clock } from "lucide-react";

interface ApifyResult {
  filename: string;
  sourceUrl: string;
  chunks: { text: string; highlight: string[] }[];
}

// Strip HTML tags and clean up text
function cleanText(text: string): string {
  return text
    .replace(/<\/?em>/gi, '') // Remove <em> tags
    .replace(/<[^>]*>/g, '') // Remove any other HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<ApifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  useEffect(() => {
    async function search() {
      if (!query) {
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      const startTime = Date.now();
      
      try {
        const res = await fetch("/api/apify-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, maxResults: 100 }),
        });
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          setResults([]);
        } else {
          setResults(data.documents || []);
          setSearchTime((Date.now() - startTime) / 1000);
        }
      } catch (err) {
        console.error("Search failed:", err);
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto font-mono">
      <p className="text-xs text-muted-foreground mb-2 tracking-widest">
        [ MODULE: SEARCH_ENGINE ]
      </p>
      <h1 className="text-2xl font-bold text-primary mb-6">DOCUMENT SEARCH</h1>

      <SearchBar defaultValue={query} className="mb-6" />

      {query && !loading && !error && (
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span>{results.length} documents found</span>
          {searchTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {searchTime.toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">
              Searching Epstein files database...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This may take 30-60 seconds
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-destructive/50 rounded-lg bg-destructive/10">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Search Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : !query ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Enter a search query to find documents across 400,000+ Epstein case files
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
          <p className="text-muted-foreground">
            Try different keywords or check your spelling.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, i) => {
            // Combine and clean all chunk text for this document
            const fullText = result.chunks
              .map(c => cleanText(c.text))
              .join(' ')
              .slice(0, 600);
            
            return (
              <div
                key={`${result.filename}-${i}`}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm">{result.filename}</span>
                  </div>
                  <a
                    href={result.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                  >
                    View Original <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {fullText}
                  {fullText.length >= 600 && "..."}
                </p>
                
                {result.chunks.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                    {result.chunks.length} matching sections in this document
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
