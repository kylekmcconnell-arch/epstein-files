"use client";

import { useEffect, useState } from "react";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Document {
  id: string;
  filename: string;
  title: string | null;
  pageCount: number | null;
  fileSize: number | null;
  mentionCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents?page=${page}&limit=20`);
        const data = await res.json();
        setDocuments(data.documents);
        setPagination(data.pagination);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [page]);

  return (
    <div className="font-mono">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs text-muted-foreground mb-2 tracking-widest">
            [ MODULE: DOCUMENT_BROWSER ]
          </p>
          <h1 className="text-2xl font-bold text-primary">FILE INDEX</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            <span className="text-primary">&gt;</span> {pagination
              ? `${pagination.total} documents indexed`
              : "Loading..."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Documents Found</h2>
          <p className="text-muted-foreground mb-4">
            Documents haven&apos;t been ingested yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Run the ingestion script to add documents:
            <code className="block mt-2 p-2 bg-muted rounded">
              npx tsx scripts/ingest.ts
            </code>
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                filename={doc.filename}
                title={doc.title}
                pageCount={doc.pageCount}
                fileSize={doc.fileSize}
                mentionCount={doc.mentionCount}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
