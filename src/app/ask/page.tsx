import { ChatInterface } from "@/components/ChatInterface";

export default function AskPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col font-mono">
      <div className="px-4 pb-4 flex-shrink-0">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest">
          [ MODULE: AI_ANALYSIS ]
        </p>
        <h1 className="text-xl font-bold text-primary">DOCUMENT QUERY SYSTEM</h1>
        <p className="text-muted-foreground text-xs">
          <span className="text-primary">&gt;</span> Ask questions about 400,000+ Epstein case documents
        </p>
      </div>
      <div className="flex-1 min-h-0 border-t border-border">
        <ChatInterface />
      </div>
    </div>
  );
}
