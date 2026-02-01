"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/documents", label: "Documents" },
  { href: "/search", label: "Search" },
  { href: "/mentions", label: "Mentions" },
  { href: "/ask", label: "Ask AI" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1 group font-mono">
            <span className="text-primary text-xl font-light">[</span>
            <span className="text-sm font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
              EPSTEIN_FILES
            </span>
            <span className="text-primary text-xl font-light">]</span>
          </Link>
          <div className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors rounded-md",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
