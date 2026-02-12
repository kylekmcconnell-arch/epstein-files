"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, FolderOpen } from "lucide-react";

// Official DOJ data sets
const DATA_SETS = [
  {
    name: "Data Set 1",
    description: "Initial document release",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-1-files",
    count: "6,300+",
  },
  {
    name: "Data Set 2",
    description: "Second batch of documents",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-2-files",
    count: "574+",
  },
  {
    name: "Data Set 3",
    description: "Third document release",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-3-files",
    count: "67+",
  },
  {
    name: "Data Set 4",
    description: "Fourth document batch",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-4-files",
    count: "152+",
  },
  {
    name: "Data Set 5",
    description: "Fifth document release",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-5-files",
    count: "120+",
  },
  {
    name: "Data Set 6",
    description: "Sixth document batch",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-6-files",
    count: "13+",
  },
  {
    name: "Data Set 7",
    description: "Seventh document release",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-7-files",
    count: "17+",
  },
  {
    name: "Data Set 8",
    description: "Eighth document batch",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-8-files",
    count: "10,500+",
  },
  {
    name: "Data Set 9",
    description: "Ninth document release",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-9-files",
    count: "~100,000+",
  },
  {
    name: "Data Set 10",
    description: "Tenth document batch (VOL00010)",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-10-files",
    count: "500,000+",
  },
  {
    name: "Data Set 11",
    description: "Eleventh document release (VOL00011)",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-11-files",
    count: "330,000+",
  },
  {
    name: "Data Set 12",
    description: "Twelfth document batch (VOL00012)",
    url: "https://www.justice.gov/epstein/doj-disclosures/data-set-12-files",
    count: "152+",
  },
];

export default function DocumentsPage() {
  return (
    <div className="max-w-4xl mx-auto font-mono">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-2 tracking-widest">
          [ MODULE: DOCUMENT_BROWSER ]
        </p>
        <h1 className="text-2xl font-bold text-primary">DOCUMENT ARCHIVE</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          <span className="text-primary">&gt;</span> Access to 400,000+ official DOJ documents
        </p>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">How to use this archive</p>
            <p className="text-xs text-muted-foreground">
              Use the <a href="/search" className="text-primary hover:underline">Search</a> or{" "}
              <a href="/ask" className="text-primary hover:underline">Ask AI</a> features to find specific 
              documents. Click on any result to view the original PDF from the Department of Justice.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_SETS.map((dataset) => (
          <a
            key={dataset.name}
            href={dataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="h-full hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    {dataset.name}
                  </CardTitle>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  {dataset.description}
                </p>
                <Badge variant="secondary">
                  {dataset.count} files
                </Badge>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="mt-8 text-center">
        <a
          href="https://www.justice.gov/epstein/doj-disclosures"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          View all documents on DOJ website
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
