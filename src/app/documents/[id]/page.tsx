"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

interface MentionDetail {
  name: string;
  context: string;
  pageNumber: number | null;
}

interface Document {
  id: string;
  filename: string;
  title: string | null;
  content: string;
  pageCount: number | null;
  fileSize: number | null;
  mentions: Record<string, { count: number; pages: number[] }>;
  mentionDetails: MentionDetail[];
}

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (!res.ok) {
          throw new Error("Document not found");
        }
        const data = await res.json();
        setDocument(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Document Not Found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/documents" className="text-primary hover:underline">
          Back to Documents
        </Link>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const mentionNames = Object.keys(document.mentions);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/documents"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Documents
        </Link>
        <h1 className="text-3xl font-bold mb-2">
          {document.title || document.filename}
        </h1>
        <div className="flex flex-wrap gap-2">
          {document.pageCount && (
            <Badge variant="secondary">{document.pageCount} pages</Badge>
          )}
          {document.fileSize && (
            <Badge variant="secondary">
              {formatFileSize(document.fileSize)}
            </Badge>
          )}
          {mentionNames.length > 0 && (
            <Badge variant="outline">
              {mentionNames.length} people mentioned
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {document.content}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Tabs defaultValue="mentions">
            <TabsList className="w-full">
              <TabsTrigger value="mentions" className="flex-1">
                Mentions
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1">
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentions">
              <Card>
                <CardContent className="pt-6">
                  {mentionNames.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No notable name mentions found in this document.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {mentionNames.map((name) => (
                        <div key={name} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <Link
                              href={`/mentions?name=${encodeURIComponent(name)}`}
                              className="font-medium capitalize hover:text-primary"
                            >
                              {name}
                            </Link>
                            <Badge variant="secondary">
                              {document.mentions[name].count}x
                            </Badge>
                          </div>
                          {document.mentions[name].pages.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Pages:{" "}
                              {document.mentions[name].pages.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Filename</p>
                    <p className="font-medium">{document.filename}</p>
                  </div>
                  {document.pageCount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Pages</p>
                      <p className="font-medium">{document.pageCount}</p>
                    </div>
                  )}
                  {document.fileSize && (
                    <div>
                      <p className="text-sm text-muted-foreground">File Size</p>
                      <p className="font-medium">
                        {formatFileSize(document.fileSize)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Content Length
                    </p>
                    <p className="font-medium">
                      {document.content.length.toLocaleString()} characters
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mention Contexts */}
          {document.mentionDetails.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Mention Contexts</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {document.mentionDetails.slice(0, 20).map((mention, i) => (
                      <div
                        key={i}
                        className="text-sm border-b pb-3 last:border-0"
                      >
                        <p className="font-medium text-primary mb-1">
                          {mention.name}
                          {mention.pageNumber && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              (p. {mention.pageNumber})
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          &quot;...{mention.context}...&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
