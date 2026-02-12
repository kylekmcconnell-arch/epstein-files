"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface Source {
  filename: string;
  sourceUrl: string;
  excerpt: string;
  highlight?: string[];
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
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Check for pending question from homepage
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const pendingQuestion = sessionStorage.getItem("pendingQuestion");
    if (pendingQuestion) {
      sessionStorage.removeItem("pendingQuestion");
      // Auto-submit the question
      submitQuestion(pendingQuestion);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Update active sources to show the latest assistant message's sources
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.sources);
    if (lastAssistant?.sources) {
      setActiveSources(lastAssistant.sources);
    }
  }, [messages]);

  const submitQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);
    setActiveSources([]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
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
            content: data.error || "Sorry, I encountered an error processing your question.",
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const question = input.trim();
    setInput("");
    submitQuestion(question);
  };

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center font-mono">
          <p className="text-xs text-muted-foreground mb-4 tracking-widest">
            [ AI ANALYSIS MODULE ]
          </p>
          <h2 className="text-xl font-bold text-primary mb-2">QUERY INTERFACE</h2>
          <p className="text-muted-foreground max-w-md mb-8 text-xs">
            Ask questions about the Epstein documents. AI will search and analyze
            400,000+ files to provide answers with citations.
          </p>
          <div className="grid gap-2 text-xs text-left w-full max-w-md">
            <p className="text-muted-foreground mb-1">&gt; EXAMPLE QUERIES:</p>
            <button
              className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
              onClick={() => setInput("Where is Bill Clinton mentioned in the files?")}
            >
              <span className="text-primary">$</span> Where is Bill Clinton mentioned in the files?
            </button>
            <button
              className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
              onClick={() => setInput("What locations are mentioned most frequently?")}
            >
              <span className="text-primary">$</span> What locations are mentioned most frequently?
            </button>
            <button
              className="text-left px-4 py-2 border border-border hover:border-primary hover:text-primary transition-colors"
              onClick={() => setInput("Who is Virginia Giuffre and what did she testify?")}
            >
              <span className="text-primary">$</span> Who is Virginia Giuffre and what did she testify?
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the Epstein documents..."
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
            className="font-mono text-xs px-6"
          >
            Ask
          </Button>
        </form>
      </div>
    );
  }

  // Chat with citations layout
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Two-column layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Chat messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="space-y-4 py-4 pr-4">
              {messages.map((message, index) => (
                <div key={index}>
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-4">
                      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[90%]">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <div>
                      <p className="text-sm">Searching documents...</p>
                      <p className="text-xs text-muted-foreground">
                        This may take 30-60 seconds
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Citations panel */}
        <div className="w-72 flex-shrink-0 border-l border-border pl-6 hidden lg:block">
          <div className="sticky top-0">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Citations ({activeSources.length})
            </h3>
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <div className="space-y-3 pr-4">
                {activeSources.length === 0 && !isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Citations will appear here after you ask a question.
                  </p>
                )}
                {isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Loading citations...
                  </p>
                )}
                {activeSources.map((source, i) => (
                  <a
                    key={i}
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-border rounded-lg p-3 hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                          {source.filename}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {source.excerpt.slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Mobile citations (shown below on small screens) */}
      {activeSources.length > 0 && (
        <div className="lg:hidden border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-medium mb-2">Citations ({activeSources.length})</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activeSources.slice(0, 5).map((source, i) => (
              <a
                key={i}
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 border border-border rounded px-3 py-2 text-xs hover:border-primary/50"
              >
                <FileText className="w-3 h-3 inline mr-1" />
                {source.filename}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border mt-auto">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the Epstein documents..."
          className="min-h-[50px] resize-none font-mono text-sm bg-background border-border"
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
          className="font-mono text-xs px-6"
        >
          Ask
        </Button>
      </form>
    </div>
  );
}
