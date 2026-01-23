'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface RecentActivityWidgetProps {
  documents?: Document[];
  limit?: number;
}

/**
 * Dashboard widget showing recent document activity
 */
export function RecentActivityWidget({
  documents = [],
  limit = 8,
}: RecentActivityWidgetProps) {
  const activities = useMemo(() => {
    return [...documents]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit)
      .map((doc) => {
        const isNew =
          new Date(doc.createdAt).getTime() === new Date(doc.updatedAt).getTime();
        return {
          id: doc.id,
          action: isNew ? 'uploaded' : 'updated',
          documentName: doc.name,
          user: doc.createdBy,
          timestamp: doc.updatedAt,
          category: doc.category,
        };
      });
  }, [documents, limit]);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest document changes</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 text-sm"
              >
                <div
                  className={`mt-1 h-2 w-2 rounded-full ${
                    activity.action === 'uploaded'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div className="flex-1 space-y-1">
                  <p className="text-gray-900">
                    <span className="font-medium">{activity.user}</span>{' '}
                    {activity.action}{' '}
                    <span className="font-medium">{activity.documentName}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(typeof activity.timestamp === 'string' ? activity.timestamp : activity.timestamp.toISOString())}
                    </span>
                    {activity.category && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
