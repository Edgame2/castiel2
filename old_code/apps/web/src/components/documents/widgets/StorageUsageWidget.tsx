'use client';

import { useMemo } from 'react';
import { StorageStats } from '@/types/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/document-utils';
import { Database, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageUsageWidgetProps {
  stats?: StorageStats;
}

/**
 * Dashboard widget showing storage usage statistics
 */
export function StorageUsageWidget({ stats }: StorageUsageWidgetProps) {
  const usageData = useMemo(() => {
    if (!stats) {
      return {
        used: 0,
        total: 107374182400, // 100GB default
        percentage: 0,
        isWarning: false,
        isCritical: false,
      };
    }

    const percentage = (stats.usedBytes / stats.quotaBytes) * 100;

    return {
      used: stats.usedBytes,
      total: stats.quotaBytes,
      percentage,
      isWarning: percentage >= 75,
      isCritical: percentage >= 90,
    };
  }, [stats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage Usage
        </CardTitle>
        <CardDescription>Document storage consumption</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              {formatBytes(usageData.used)}
            </span>
            <span className="text-gray-500">
              of {formatBytes(usageData.total)}
            </span>
          </div>
          <Progress
            value={usageData.percentage}
            className={cn(
              'h-3',
              usageData.isCritical && '[&>div]:bg-red-500',
              usageData.isWarning &&
                !usageData.isCritical &&
                '[&>div]:bg-amber-500'
            )}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {usageData.percentage.toFixed(1)}% used
            </span>
            {usageData.isWarning && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {usageData.isCritical ? 'Critical' : 'Warning'}
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Available</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {formatBytes(usageData.total - usageData.used)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Documents</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {stats?.documentCount || 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
