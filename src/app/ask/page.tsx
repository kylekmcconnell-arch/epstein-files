import { ChatInterface } from "@/components/ChatInterface";

export default function AskPage() {
  return (
    <div className="max-w-4xl mx-auto font-mono">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-2 tracking-widest">
          [ MODULE: AI_ANALYSIS ]
        </p>
        <h1 className="text-2xl font-bold text-primary">DOCUMENT QUERY SYSTEM</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          <span className="text-primary">&gt;</span> Natural language processing enabled. Submit queries for AI-powered document analysis.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
