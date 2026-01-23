'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, getMimeTypeIcon } from '@/lib/document-utils';
import { FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecentUploadsWidgetProps {
  documents?: Document[];
  limit?: number;
}

/**
 * Dashboard widget showing recently uploaded documents
 */
export function RecentUploadsWidget({
  documents = [],
  limit = 5,
}: RecentUploadsWidgetProps) {
  const router = useRouter();

  // Sort by creation date and limit
  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit),
    [documents, limit]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>Latest uploaded documents</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/documents')}
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentDocuments.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-gray-500">No recent uploads</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDocuments.map((doc) => {
              const Icon = getMimeTypeIcon(doc.mimeType);
              return (
                <div
                  key={doc.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                  onClick={() => router.push(`/documents/${doc.id}`)}
                >
                  <div className="rounded bg-gray-100 p-2">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(doc.createdAt)}
                    </p>
                  </div>
                  {doc.category && (
                    <Badge variant="secondary" className="text-xs">
                      {doc.category}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
