"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface NameCount {
  name: string;
  count: number;
}

interface Mention {
  id: string;
  name: string;
  context: string;
  pageNumber: number | null;
  documentId: string;
  filename: string;
}

function MentionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedName = searchParams.get("name") || "";
  
  const [names, setNames] = useState<NameCount[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch all mentioned names
  useEffect(() => {
    async function fetchNames() {
      try {
        const res = await fetch("/api/mentions");
        const data = await res.json();
        setNames(data.names || []);
      } catch (error) {
        console.error("Failed to fetch names:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNames();
  }, []);

  // Fetch mentions for selected name
  useEffect(() => {
    async function fetchMentions() {
      if (!selectedName) {
        setMentions([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/mentions?name=${encodeURIComponent(selectedName)}`
        );
        const data = await res.json();
        setMentions(data.mentions || []);
      } catch (error) {
        console.error("Failed to fetch mentions:", error);
      }
    }
    fetchMentions();
  }, [selectedName]);

  const filteredNames = names.filter((n) =>
    n.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto font-mono">
      <p className="text-xs text-muted-foreground mb-2 tracking-widest">
        [ MODULE: NAME_TRACKING ]
      </p>
      <h1 className="text-2xl font-bold text-primary mb-2">SUBJECT MENTIONS</h1>
      <p className="text-muted-foreground mb-8 text-xs">
        <span className="text-primary">&gt;</span> Cross-reference individual names across all indexed documents.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Names List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Notable Names</CardTitle>
            <Input
              placeholder="Filter names..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : filteredNames.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {names.length === 0
                  ? "No mentions found. Ingest documents first."
                  : "No matching names found."}
              </p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {filteredNames.map((item) => (
                    <button
                      key={item.name}
                      onClick={() =>
                        router.push(
                          `/mentions?name=${encodeURIComponent(item.name)}`
                        )
                      }
                      className={`w-full flex justify-between items-center px-3 py-2 rounded-md text-left transition-colors ${
                        selectedName === item.name
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span className="capitalize text-sm">{item.name}</span>
                      <Badge
                        variant={
                          selectedName === item.name ? "secondary" : "outline"
                        }
                      >
                        {item.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Mentions List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedName ? (
                <>
                  Mentions of{" "}
                  <span className="capitalize">&quot;{selectedName}&quot;</span>
                </>
              ) : (
                "Select a Name"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedName ? (
              <p className="text-muted-foreground text-sm">
                Select a name from the list to see all mentions.
              </p>
            ) : mentions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No mentions found for this name.
              </p>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {mentions.map((mention) => (
                    <div
                      key={mention.id}
                      className="border-b pb-4 last:border-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/documents/${mention.documentId}`}
                          className="font-medium text-primary hover:underline text-sm"
                        >
                          {mention.filename}
                        </Link>
                        {mention.pageNumber && (
                          <Badge variant="secondary" className="text-xs">
                            Page {mention.pageNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        &quot;...{mention.context}...&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MentionsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      }
    >
      <MentionsContent />
    </Suspense>
  );
}
