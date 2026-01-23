'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentCountWidgetProps {
  documents?: Document[];
  previousCount?: number;
}

/**
 * Dashboard widget showing total document count with trend
 */
export function DocumentCountWidget({
  documents = [],
  previousCount,
}: DocumentCountWidgetProps) {
  const stats = useMemo(() => {
    const current = documents.length;
    const change = previousCount ? current - previousCount : 0;
    const percentChange =
      previousCount && previousCount > 0
        ? ((change / previousCount) * 100).toFixed(1)
        : null;

    return {
      current,
      change,
      percentChange,
      isIncrease: change > 0,
      isDecrease: change < 0,
    };
  }, [documents, previousCount]);

  // Count by category
  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      const cat = doc.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [documents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Total Documents
        </CardTitle>
        <CardDescription>All documents in your workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main count */}
        <div className="flex items-end gap-3">
          <div className="text-4xl font-bold text-gray-900">
            {stats.current.toLocaleString()}
          </div>
          {stats.percentChange && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                stats.isIncrease && 'text-green-600',
                stats.isDecrease && 'text-red-600'
              )}
            >
              {stats.isIncrease ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {stats.percentChange}%
            </div>
          )}
        </div>

        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-gray-500">
              Top Categories
            </div>
            <div className="space-y-2">
              {byCategory.map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{category}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
