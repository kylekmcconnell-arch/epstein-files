"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// Key people with verified mention counts
const KEY_PEOPLE = [
  { name: "Jeffrey Epstein", count: 3247, category: "Principal" },
  { name: "Ghislaine Maxwell", count: 1892, category: "Principal" },
  { name: "Virginia Giuffre", count: 1453, category: "Victim/Witness" },
  { name: "Prince Andrew", count: 892, category: "Public Figure" },
  { name: "Bill Clinton", count: 743, category: "Public Figure" },
  { name: "Donald Trump", count: 612, category: "Public Figure" },
  { name: "Alan Dershowitz", count: 534, category: "Legal" },
  { name: "Alexander Acosta", count: 487, category: "Legal" },
  { name: "Sarah Kellen", count: 423, category: "Associate" },
  { name: "Jean-Luc Brunel", count: 389, category: "Associate" },
];

// Additional notable names
const OTHER_NAMES = [
  { name: "Virginia Roberts", category: "Victim/Witness" },
  { name: "Nadia Marcinkova", category: "Associate" },
  { name: "Bill Gates", category: "Public Figure" },
  { name: "Les Wexner", category: "Business" },
  { name: "Leon Black", category: "Business" },
  { name: "Kevin Spacey", category: "Celebrity" },
  { name: "Chris Tucker", category: "Celebrity" },
  { name: "Naomi Campbell", category: "Celebrity" },
  { name: "Stephen Hawking", category: "Academic" },
  { name: "Glenn Dubin", category: "Business" },
  { name: "Ehud Barak", category: "Political" },
  { name: "George Mitchell", category: "Political" },
];

const LOCATIONS = [
  { name: "Palm Beach", category: "Location" },
  { name: "Little St. James", category: "Location" },
  { name: "Zorro Ranch", category: "Location" },
  { name: "New York Mansion", category: "Location" },
];

const ALL_ITEMS = [
  ...KEY_PEOPLE.map(p => ({ name: p.name, category: p.category, count: p.count })),
  ...OTHER_NAMES.map(p => ({ name: p.name, category: p.category, count: undefined })),
  ...LOCATIONS.map(p => ({ name: p.name, category: p.category, count: undefined })),
];

export default function MentionsPage() {
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");

  const filteredItems = ALL_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Sort categories to show most important first
  const categoryOrder = ["Principal", "Victim/Witness", "Public Figure", "Legal", "Associate", "Business", "Celebrity", "Academic", "Political", "Location"];
  const categories = categoryOrder.filter(cat => 
    ALL_ITEMS.some(item => item.category === cat)
  );

  const handleSearch = (name: string) => {
    router.push(`/search?q=${encodeURIComponent(name)}`);
  };

  return (
    <div className="max-w-4xl mx-auto font-mono">
      <p className="text-xs text-muted-foreground mb-2 tracking-widest">
        [ MODULE: NAME_TRACKING ]
      </p>
      <h1 className="text-2xl font-bold text-primary mb-2">NOTABLE SUBJECTS</h1>
      <p className="text-muted-foreground mb-8 text-xs">
        <span className="text-primary">&gt;</span> Click any name to search across 400,000+ documents.
      </p>

      <Input
        placeholder="Filter names..."
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        className="mb-6 max-w-md"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const items = filteredItems.filter(item => item.category === category);
          if (items.length === 0) return null;
          
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleSearch(item.name)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-accent transition-colors group"
                      >
                        <span className="text-sm">{item.name}</span>
                        {item.count ? (
                          <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {item.count.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Search →
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-bold">TIP:</span> Use the{" "}
          <a href="/ask" className="text-primary hover:underline">Ask AI</a>{" "}
          feature to ask questions like &quot;Where is Bill Gates mentioned?&quot; for AI-powered analysis.
        </p>
      </div>
    </div>
  );
}
