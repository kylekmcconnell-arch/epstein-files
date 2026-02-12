"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Static stats - using Apify's database
const NOTABLE_NAMES = [
  "Jeffrey Epstein",
  "Ghislaine Maxwell",
  "Bill Clinton",
  "Donald Trump",
  "Prince Andrew",
  "Bill Gates",
  "Alan Dershowitz",
  "Les Wexner",
  "Kevin Spacey",
  "Virginia Giuffre",
];

export function StatsDisplay() {
  return (
    <>
      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documents</p>
          <p className="text-3xl font-bold text-foreground">400,000+</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Data Sets</p>
          <p className="text-3xl font-bold text-foreground">12</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pages</p>
          <p className="text-3xl font-bold text-foreground">3.5M+</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
          <p className="text-3xl font-bold text-primary">Online</p>
        </div>
      </div>

      {/* Search suggestions */}
      <div className="mb-10">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
          Popular Searches
        </p>
        <div className="flex flex-wrap gap-2">
          {NOTABLE_NAMES.map((name) => (
            <Link
              key={name}
              href={`/search?q=${encodeURIComponent(name)}`}
            >
              <Badge
                variant="secondary"
                className="text-sm py-1.5 px-4 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
