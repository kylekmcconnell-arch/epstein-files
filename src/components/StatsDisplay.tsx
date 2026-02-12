"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Key people with mention counts from Epstein files
const KEY_PEOPLE = [
  { name: "Jeffrey Epstein", count: 3247 },
  { name: "Ghislaine Maxwell", count: 1892 },
  { name: "Virginia Giuffre", count: 1453 },
  { name: "Prince Andrew", count: 892 },
  { name: "Bill Clinton", count: 743 },
  { name: "Donald Trump", count: 612 },
  { name: "Alan Dershowitz", count: 534 },
  { name: "Alexander Acosta", count: 487 },
  { name: "Sarah Kellen", count: 423 },
  { name: "Jean-Luc Brunel", count: 389 },
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

      {/* Key People */}
      <div className="mb-10">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
          Key People in the Files
        </p>
        <div className="space-y-2">
          {KEY_PEOPLE.map((person) => (
            <Link
              key={person.name}
              href={`/search?q=${encodeURIComponent(person.name)}`}
              className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors group"
            >
              <span className="text-sm">{person.name}</span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-2 bg-primary/30 rounded"
                  style={{ width: `${Math.round((person.count / KEY_PEOPLE[0].count) * 100)}px` }}
                />
                <Badge
                  variant="secondary"
                  className="text-xs min-w-[60px] justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  {person.count.toLocaleString()}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        <Link 
          href="/mentions" 
          className="block text-center text-sm text-primary hover:underline mt-4"
        >
          Explore More →
        </Link>
      </div>
    </>
  );
}
