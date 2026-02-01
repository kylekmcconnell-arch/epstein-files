"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Source {
  documentId: string;
  filename: string;
  title: string | null;
  pageNumber: number | null;
  excerpt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error processing your question.",
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center font-mono">
            <p className="text-xs text-muted-foreground mb-4 tracking-widest">
              [ AI ANALYSIS MODULE ]
            </p>
            <h2 className="text-xl font-bold text-primary mb-2">QUERY INTERFACE</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-xs">
              Submit natural language queries. System will analyze documents
              and return findings with source citations.
            </p>
            <div className="grid gap-2 text-xs text-left w-full max-w-md">
              <p className="text-muted-foreground mb-1">&gt; EXAMPLE QUERIES:</p>
              <button
                className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
                onClick={() => setInput("Where is Bill Gates mentioned in the files?")}
              >
                <span className="text-primary">$</span> Where is Bill Gates mentioned in the files?
              </button>
              <button
                className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
                onClick={() => setInput("What meetings took place at the island?")}
              >
                <span className="text-primary">$</span> What meetings took place at the island?
              </button>
              <button
                className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
                onClick={() => setInput("Who visited Epstein's New York residence?")}
              >
                <span className="text-primary">$</span> Who visited Epstein&apos;s New York residence?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2">Sources:</p>
                      <div className="space-y-2">
                        {message.sources.map((source, i) => (
                          <Link
                            key={i}
                            href={`/documents/${source.documentId}`}
                            className="block text-xs bg-background/50 rounded p-2 hover:bg-background transition-colors"
                          >
                            <span className="font-medium">{source.filename}</span>
                            {source.pageNumber && (
                              <span className="text-muted-foreground">
                                {" "}(Page {source.pageNumber})
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Card className="max-w-[80%]">
                  <CardContent className="py-4">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter query..."
          className="min-h-[60px] resize-none font-mono text-sm bg-background border-border"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="font-mono text-xs"
        >
          {isLoading ? "PROCESSING..." : "SUBMIT"}
        </Button>
      </form>
    </div>
  );
}
