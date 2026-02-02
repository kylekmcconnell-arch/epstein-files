"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Stats {
  documents: number;
  chunks: number;
  mentions: number;
  topMentions: { name: string; count: number }[];
}

export function StatsDisplay() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(true);
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documents</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "..." : error ? "—" : stats?.documents?.toLocaleString() || "0"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Indexed Chunks</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "..." : error ? "—" : stats?.chunks?.toLocaleString() || "0"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name Mentions</p>
          <p className="text-3xl font-bold text-foreground">
            {loading ? "..." : error ? "—" : stats?.mentions?.toLocaleString() || "0"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
          <p className="text-3xl font-bold text-primary">Online</p>
        </div>
      </div>

      {/* Top Mentions */}
      {!error && stats?.topMentions && stats.topMentions.length > 0 && (
        <div className="mb-10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
            Most Referenced Names
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topMentions.map((mention) => (
              <Link
                key={mention.name}
                href={`/mentions?name=${encodeURIComponent(mention.name)}`}
              >
                <Badge
                  variant="secondary"
                  className="text-sm py-1.5 px-4 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {mention.name} <span className="text-muted-foreground ml-1">({mention.count})</span>
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
