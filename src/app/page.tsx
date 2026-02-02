import { SearchBar } from "@/components/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

async function getStats() {
  try {
    // Use VERCEL_URL in production, localhost in dev
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/stats`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="max-w-6xl mx-auto font-mono">
      {/* Hero Section */}
      <div className="relative py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Title and Search */}
          <div>
            <div className="mb-8">
              <p className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">
                Document Analysis System
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Epstein Files
              </h1>
              <p className="text-base text-muted-foreground mt-3 max-w-md">
                Search and analyze publicly released court documents with AI-powered insights.
              </p>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground mb-8">
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Full-text search across all documents
              </p>
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                AI-powered semantic analysis
              </p>
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Name mention tracking & extraction
              </p>
            </div>

            <SearchBar
              size="large"
              placeholder="Search documents..."
              className="max-w-xl"
            />
          </div>

          {/* Right side - ASCII Art Image */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative w-96 h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl"></div>
              <Image
                src="/epstein-ascii.png"
                alt="Database Subject"
                fill
                className="object-contain mix-blend-lighten opacity-90 hover:opacity-100 transition-opacity"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documents</p>
          <p className="text-3xl font-bold text-foreground">
            {stats?.documents?.toLocaleString() || "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Indexed Chunks</p>
          <p className="text-3xl font-bold text-foreground">
            {stats?.chunks?.toLocaleString() || "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name Mentions</p>
          <p className="text-3xl font-bold text-foreground">
            {stats?.mentions?.toLocaleString() || "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
          <p className="text-3xl font-bold text-primary">Online</p>
        </div>
      </div>

      {/* Top Mentions */}
      {stats?.topMentions && stats.topMentions.length > 0 && (
        <div className="mb-10">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">
            Most Referenced Names
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topMentions.map(
              (mention: { name: string; count: number }) => (
                <Link
                  key={mention.name}
                  href={`/mentions?name=${encodeURIComponent(mention.name)}`}
                >
                  <Badge
                    variant="secondary"
                    className="text-sm py-1.5 px-4 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {mention.name} <span className="text-muted-foreground ml-1">({mention.count})</span>
                  </Badge>
                </Link>
              )
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link href="/documents">
          <Card className="border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Browse all indexed document files with extracted content and metadata.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mentions">
          <Card className="border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                Name Mentions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Track and cross-reference individual names across all documents.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ask">
          <Card className="border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer h-full group">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Ask questions in natural language and get AI-powered answers with citations.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="border border-border rounded-lg bg-card/50 p-5 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Disclaimer:</span> This system provides access to publicly released court documents for research 
          and journalistic purposes. All documents are sourced from public records. 
          The presence of a name in these documents does not imply wrongdoing.
        </p>
      </div>
    </div>
  );
}
