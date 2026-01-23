'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

interface CategoryDistributionWidgetProps {
  documents?: Document[];
}

/**
 * Dashboard widget showing document distribution by category
 */
export function CategoryDistributionWidget({
  documents = [],
}: CategoryDistributionWidgetProps) {
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    const total = documents.length;

    documents.forEach((doc) => {
      const cat = doc.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [documents]);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-gray-500',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Category Distribution
        </CardTitle>
        <CardDescription>Documents by category</CardDescription>
      </CardHeader>
      <CardContent>
        {distribution.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-gray-500">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {distribution.map((item, index) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-sm ${
                        colors[index % colors.length]
                      }`}
                    />
                    <span className="font-medium text-gray-700">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {item.count} ({item.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
