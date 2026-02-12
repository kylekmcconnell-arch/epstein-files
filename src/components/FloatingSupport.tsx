"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, X, ExternalLink, Coins, Copy, Check } from "lucide-react";

const CONTRACT_ADDRESS = "HTjWG7e27nHY5xamcUrG6pK4LybjGz2zscVC9BD5MS1o";

export function FloatingSupport() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hide on Ask page to avoid overlapping the input
  if (pathname === "/ask") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 font-mono">
      {/* Popup */}
      {open && (
        <div className="mb-3 w-72 border border-border rounded-lg bg-background shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold tracking-wide">SUPPORT THE ARCHIVE</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
            Funds go to OCR processing, AI costs, hosting, and keeping the archive free.
          </p>
          <div className="space-y-2">
            <a
              href="https://ko-fi.com/epsteinfiles"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 border border-border rounded-md hover:border-primary/50 hover:bg-primary/5 transition-all group text-xs"
            >
              <span>☕</span>
              <span className="group-hover:text-primary transition-colors">Tip on Ko-fi</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50 ml-auto" />
            </a>
            <div className="p-2.5 border border-border rounded-md bg-muted/30 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <Coins className="w-3.5 h-3.5 text-[#9945FF]" />
                <span>$AISTEIN Token</span>
                <span className="text-[9px] px-1 py-0.5 bg-[#9945FF]/20 text-[#9945FF] rounded font-bold ml-auto">LIVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 text-[9px] bg-background border border-border rounded px-1.5 py-1 text-muted-foreground truncate">
                  {CONTRACT_ADDRESS}
                </code>
                <button
                  onClick={copyAddress}
                  className="flex-shrink-0 p-1 border border-border rounded hover:border-primary/50 transition-all"
                  title="Copy CA"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label="Support this project"
      >
        <Heart className="w-4 h-4" />
      </button>
    </div>
  );
}
