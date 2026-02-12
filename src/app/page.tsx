import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { StatsDisplay } from "@/components/StatsDisplay";
import { AskInput } from "@/components/AskInput";
import { SupportBanner } from "@/components/SupportBanner";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto font-mono">
      {/* Hero Section */}
      <div className="relative py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Title and Ask */}
          <div>
            <div className="mb-8">
              <p className="text-xs text-muted-foreground mb-3 tracking-widest uppercase">
                AI-Powered Document Analysis
              </p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Epstein Files
              </h1>
              <p className="text-base text-muted-foreground mt-3 max-w-md">
                Ask questions about 400,000+ court documents and get AI-powered answers with citations.
              </p>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground mb-8">
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Ask anything about the Epstein case
              </p>
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                AI searches 400,000+ documents instantly
              </p>
              <p className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                Get answers with source citations
              </p>
            </div>

            <AskInput />
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

      {/* Stats - Client Side Component */}
      <StatsDisplay />

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

      {/* Support */}
      <div className="mb-6">
        <SupportBanner />
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
