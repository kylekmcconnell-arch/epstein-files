"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Check for pending question from homepage
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const pendingQuestion = sessionStorage.getItem("pendingQuestion");
    if (pendingQuestion) {
      sessionStorage.removeItem("pendingQuestion");
      submitQuestion(pendingQuestion);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center text-center font-mono px-4">
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
              onClick={() => setInput("Who is Virginia Giuffre?")}
            >
              <span className="text-primary">$</span> Who is Virginia Giuffre?
            </button>
          </div>
        </div>

        <div className="border-t border-border p-4 bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the Epstein documents..."
              className="flex-1 h-12 px-4 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-12 px-6"
            >
              Ask
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Chat with citations layout
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Messages */}
        <div className="flex-1 overflow-y-auto p-4 pb-8">
          <div className="max-w-3xl space-y-4 pb-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" ? (
                  <div className="flex justify-end mb-4">
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[85%]">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-4 max-w-full">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
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
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right: Citations panel */}
        <div className="w-80 flex-shrink-0 border-l border-border overflow-y-auto hidden lg:block">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3 sticky top-0 bg-background py-2">
              Citations ({activeSources.length})
            </h3>
            <div className="space-y-3">
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
                        {source.excerpt.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile citations */}
      {activeSources.length > 0 && (
        <div className="lg:hidden border-t border-border p-3 bg-card">
          <p className="text-xs font-medium mb-2">Citations ({activeSources.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeSources.slice(0, 6).map((source, i) => (
              <a
                key={i}
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 border border-border rounded px-3 py-1.5 text-xs hover:border-primary/50 flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {source.filename.slice(0, 15)}...
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Input area - fixed at bottom */}
      <div className="border-t border-border p-4 bg-background flex-shrink-0 z-10">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask another question..."
            className="flex-1 h-12 px-4 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="h-12 px-6"
          >
            Ask
          </Button>
        </form>
      </div>
    </div>
  );
}
