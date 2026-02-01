import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DocumentCardProps {
  id: string;
  filename: string;
  title?: string | null;
  pageCount?: number | null;
  fileSize?: number | null;
  mentionCount?: number;
  excerpt?: string;
}

export function DocumentCard({
  id,
  filename,
  title,
  pageCount,
  fileSize,
  mentionCount,
  excerpt,
}: DocumentCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Link href={`/documents/${id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium line-clamp-2">
            {title || filename}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {pageCount && (
              <Badge variant="secondary">{pageCount} pages</Badge>
            )}
            {fileSize && (
              <Badge variant="secondary">{formatFileSize(fileSize)}</Badge>
            )}
            {mentionCount !== undefined && mentionCount > 0 && (
              <Badge variant="outline">{mentionCount} mentions</Badge>
            )}
          </div>
          {excerpt && (
            <p
              className="text-sm text-muted-foreground line-clamp-3"
              dangerouslySetInnerHTML={{ __html: excerpt }}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
