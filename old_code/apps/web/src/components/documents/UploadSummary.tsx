'use client';

import { useMemo } from 'react';
import { UploadProgress } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/document-utils';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadSummaryProps {
  files: File[];
  uploadProgress: Map<string, UploadProgress>;
  onStartUpload: () => void;
  onClear: () => void;
  isUploading?: boolean;
  className?: string;
}

/**
 * Summary component showing upload progress and action buttons
 * Displays overall statistics and controls start/clear actions
 */
export function UploadSummary({
  files,
  uploadProgress,
  onStartUpload,
  onClear,
  isUploading = false,
  className,
}: UploadSummaryProps) {
  // Calculate upload statistics
  const stats = useMemo(() => {
    const total = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const completed = Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'completed'
    ).length;
    const uploading = Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'uploading'
    ).length;
    const errored = Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'error'
    ).length;

    // Calculate overall progress percentage
    const overallProgress =
      total > 0 ? Math.round(((completed + errored) / total) * 100) : 0;

    return {
      total,
      totalSize,
      completed,
      uploading,
      errored,
      overallProgress,
    };
  }, [files, uploadProgress]);

  const hasErrors = stats.errored > 0;
  const isComplete = stats.completed === stats.total && stats.total > 0;
  const canStart = stats.total > 0 && !isUploading && stats.uploading === 0;

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Upload Summary</h3>
          <p className="text-xs text-muted-foreground">
            {stats.total} file{stats.total !== 1 ? 's' : ''} ({formatBytes(stats.totalSize)})
          </p>
        </div>
        {isComplete && !hasErrors && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-medium">Complete</span>
          </div>
        )}
        {hasErrors && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs font-medium">Review Required</span>
          </div>
        )}
        {isUploading && (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">In Progress</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {stats.completed} of {stats.total} uploaded
          </span>
          <span className="font-medium">{stats.overallProgress}%</span>
        </div>
        <Progress value={stats.overallProgress} className="h-2" />
      </div>

      {/* Statistics grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="Completed"
          value={stats.completed}
          color="green"
          icon="check"
        />
        <StatBox
          label="Uploading"
          value={stats.uploading}
          color="blue"
          icon="upload"
        />
        <StatBox label="Errors" value={stats.errored} color="red" icon="alert" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onStartUpload}
          disabled={!canStart}
          className="flex-1 gap-2"
          size="sm"
        >
          <Upload className="h-4 w-4" />
          Start Upload
        </Button>
        <Button
          onClick={onClear}
          variant="outline"
          className="flex-1 gap-2"
          size="sm"
          disabled={isUploading}
        >
          <RotateCcw className="h-4 w-4" />
          Clear All
        </Button>
      </div>

      {/* Info messages */}
      {!canStart && stats.total > 0 && (
        <div className="rounded bg-primary/10 p-3 text-xs text-primary">
          {isUploading
            ? 'Upload in progress. Please wait for completion.'
            : 'Upload is complete.'}
        </div>
      )}

      {hasErrors && (
        <div className="rounded bg-destructive/10 p-3 text-xs text-destructive">
          Some files failed. Please review errors above and retry failed uploads.
        </div>
      )}
    </div>
  );
}

/**
 * Statistics box component
 */
interface StatBoxProps {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'red';
  icon: 'check' | 'upload' | 'alert';
}

function StatBox({ label, value, color, icon }: StatBoxProps) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    red: 'bg-destructive/10 text-destructive',
  };

  const iconComponent = {
    check: <CheckCircle2 className="h-4 w-4" />,
    upload: <Upload className="h-4 w-4" />,
    alert: <AlertTriangle className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        'space-y-1 rounded-lg p-3 text-center transition-colors',
        colorClasses[color]
      )}
    >
      <div className="flex justify-center">{iconComponent[icon]}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}
