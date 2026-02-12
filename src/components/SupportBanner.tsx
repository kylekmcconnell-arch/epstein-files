"use client";

import { useState } from "react";
import { Heart, ExternalLink, Coins, Copy, Check } from "lucide-react";

const CONTRACT_ADDRESS = "HTjWG7e27nHY5xamcUrG6pK4LybjGz2zscVC9BD5MS1o";

export function SupportBanner() {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-lg bg-card/50 p-6 font-mono">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground tracking-wide">SUPPORT THIS PROJECT</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
        100% of funds go toward document OCR processing, server costs, AI API usage, and keeping this archive free and accessible. 
        Transparency is the mission.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ko-fi */}
        <a
          href="https://ko-fi.com/epsteinfiles"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-[#FF5E5B]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">☕</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
              Tip on Ko-fi
              <ExternalLink className="w-3 h-3 opacity-50" />
            </p>
            <p className="text-xs text-muted-foreground">One-time or recurring support</p>
          </div>
        </a>

        {/* Solana Token */}
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#9945FF]/10 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-[#9945FF]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                $AISTEIN Token
                <span className="text-[10px] px-1.5 py-0.5 bg-[#9945FF]/20 text-[#9945FF] rounded font-bold tracking-wider">
                  LIVE
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Solana SPL Token</p>
            </div>
          </div>
          <a
            href="https://dexscreener.com/solana/891jkj3cf14ccwolllabb9gncttw9mnt48adgvc4jddz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-[#9945FF] hover:underline mb-3"
          >
            View on DexScreener <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-background border border-border rounded px-2.5 py-1.5 text-muted-foreground truncate">
              {CONTRACT_ADDRESS}
            </code>
            <button
              onClick={copyAddress}
              className="flex-shrink-0 p-1.5 border border-border rounded hover:border-primary/50 hover:bg-primary/5 transition-all"
              title="Copy contract address"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        All contributions are voluntary. Funds are used exclusively for document processing, hosting, AI costs, and maintaining public access to the archive.
      </p>
    </div>
  );
}
