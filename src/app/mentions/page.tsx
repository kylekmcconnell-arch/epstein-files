"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// Notable names from the Epstein case
const NOTABLE_NAMES = [
  { name: "Jeffrey Epstein", category: "Principal" },
  { name: "Ghislaine Maxwell", category: "Principal" },
  { name: "Virginia Giuffre", category: "Victim/Witness" },
  { name: "Virginia Roberts", category: "Victim/Witness" },
  { name: "Sarah Kellen", category: "Associate" },
  { name: "Nadia Marcinkova", category: "Associate" },
  { name: "Jean-Luc Brunel", category: "Associate" },
  { name: "Bill Clinton", category: "Public Figure" },
  { name: "Donald Trump", category: "Public Figure" },
  { name: "Prince Andrew", category: "Public Figure" },
  { name: "Bill Gates", category: "Public Figure" },
  { name: "Alan Dershowitz", category: "Legal" },
  { name: "Les Wexner", category: "Business" },
  { name: "Leon Black", category: "Business" },
  { name: "Kevin Spacey", category: "Celebrity" },
  { name: "Chris Tucker", category: "Celebrity" },
  { name: "Naomi Campbell", category: "Celebrity" },
  { name: "Stephen Hawking", category: "Academic" },
  { name: "Marvin Minsky", category: "Academic" },
  { name: "Larry Summers", category: "Academic" },
  { name: "Glenn Dubin", category: "Business" },
  { name: "Eva Dubin", category: "Business" },
  { name: "Ehud Barak", category: "Political" },
  { name: "George Mitchell", category: "Political" },
  { name: "Reid Hoffman", category: "Business" },
];

const LOCATIONS = [
  { name: "Palm Beach", category: "Location" },
  { name: "Little St. James", category: "Location" },
  { name: "Zorro Ranch", category: "Location" },
  { name: "New York", category: "Location" },
  { name: "Paris", category: "Location" },
];

const ALL_ITEMS = [...NOTABLE_NAMES, ...LOCATIONS];

export default function MentionsPage() {
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");

  const filteredItems = ALL_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const categories = [...new Set(ALL_ITEMS.map(item => item.category))];

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
                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Search →
                        </Badge>
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
