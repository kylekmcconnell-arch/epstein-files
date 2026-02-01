"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { DocumentCard } from "@/components/DocumentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SearchResult {
  documentId: string;
  filename: string;
  title: string | null;
  content: string;
  pageNumber: number | null;
  score: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hybrid");

  useEffect(() => {
    async function search() {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&mode=${mode}`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [query, mode]);

  return (
    <div className="max-w-4xl mx-auto font-mono">
      <p className="text-xs text-muted-foreground mb-2 tracking-widest">
        [ MODULE: SEARCH_ENGINE ]
      </p>
      <h1 className="text-2xl font-bold text-primary mb-6">DOCUMENT SEARCH</h1>

      <SearchBar defaultValue={query} className="mb-6" />

      <div className="flex items-center justify-between mb-6">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
            <TabsTrigger value="keyword">Keyword</TabsTrigger>
            <TabsTrigger value="semantic">Semantic</TabsTrigger>
          </TabsList>
        </Tabs>

        {query && !loading && (
          <p className="text-sm text-muted-foreground">
            {results.length} results for &quot;{query}&quot;
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !query ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Enter a search query to find documents
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
          <p className="text-muted-foreground">
            Try different keywords or use semantic search for more flexible
            matching.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, i) => (
            <DocumentCard
              key={`${result.documentId}-${i}`}
              id={result.documentId}
              filename={result.filename}
              title={result.title}
              excerpt={result.content}
            />
          ))}
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
