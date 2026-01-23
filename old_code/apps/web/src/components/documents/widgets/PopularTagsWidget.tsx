'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag as TagIcon } from 'lucide-react';

interface PopularTagsWidgetProps {
  documents?: Document[];
  limit?: number;
}

/**
 * Dashboard widget showing most used document tags
 */
export function PopularTagsWidget({
  documents = [],
  limit = 10,
}: PopularTagsWidgetProps) {
  const tags = useMemo(() => {
    const tagCounts: Record<string, number> = {};

    documents.forEach((doc) => {
      doc.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [documents, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TagIcon className="h-5 w-5" />
          Popular Tags
        </CardTitle>
        <CardDescription>Most frequently used tags</CardDescription>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-gray-500">No tags yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(({ tag, count }) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 text-sm"
              >
                {tag}
                <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium">
                  {count}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
