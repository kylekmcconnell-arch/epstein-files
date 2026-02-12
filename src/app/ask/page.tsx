import { ChatInterface } from "@/components/ChatInterface";

export default function AskPage() {
  return (
    <div className="fixed inset-0 top-16 flex flex-col font-mono bg-background">
      <div className="px-4 py-3 flex-shrink-0 border-b border-border">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest">
          [ MODULE: AI_ANALYSIS ]
        </p>
        <h1 className="text-lg font-bold text-primary">DOCUMENT QUERY SYSTEM</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
