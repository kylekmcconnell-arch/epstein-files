"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function AskInput() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Store the question in sessionStorage so Ask page can pick it up
      sessionStorage.setItem("pendingQuestion", query.trim());
      router.push("/ask");
    }
  };

  const exampleQuestions = [
    "Who visited the island?",
    "Where is Bill Clinton mentioned?",
    "What did Virginia Giuffre testify?",
  ];

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about the Epstein files..."
              className="w-full h-14 pl-12 pr-4 bg-background border border-border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <Button 
            type="submit" 
            size="lg"
            className="h-14 px-8 font-medium"
            disabled={!query.trim()}
          >
            Ask AI
          </Button>
        </div>
      </form>
      
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Try:</span>
        {exampleQuestions.map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className="text-xs text-primary hover:underline"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
