/**
 * UploadFileRow Component
 * Individual file upload with progress tracking
 */

'use client';

import React from 'react';
import { X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadProgress } from '@/types/documents';
import { getMimeTypeIcon, formatBytes, formatTime } from '@/lib/document-utils';
import { cn } from '@/lib/utils';

interface UploadFileRowProps {
  file: File;
  progress?: UploadProgress;
  onCancel: () => void;
  onRemove: () => void;
}

export function UploadFileRow({
  file,
  progress,
  onCancel,
  onRemove,
}: UploadFileRowProps) {
  const Icon = getMimeTypeIcon(file.type);
  const isComplete = progress?.status === 'completed';
  const isError = progress?.status === 'error';
  const isUploading = progress?.status === 'uploading';
  const isPending = !progress || progress?.status === 'pending';

  return (
    <div className={cn(
      'border rounded-lg p-4 space-y-3 transition-colors',
      isError ? 'bg-destructive/5 border-destructive/20' : isComplete ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border'
    )}>
      {/* File Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            'p-2 rounded flex-shrink-0',
            isError ? 'bg-destructive/10' : isComplete ? 'bg-green-500/10' : 'bg-muted'
          )}>
            {isComplete ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : isError ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <Icon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatBytes(file.size)}
              {' • '}
              <span className="capitalize">{progress?.status || 'pending'}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          {isUploading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-8 w-8 p-0"
              title="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {!isUploading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-8 w-8 p-0"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(isUploading || !isComplete) && progress ? (
        <div className="space-y-1">
          <Progress value={progress.percent || 0} className="h-2" />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {progress.percent || 0}%
            </span>
            <div className="flex items-center gap-3 text-muted-foreground">
              {isUploading && progress.speed && (
                <>
                  <span>{formatBytes(progress.speed)}/s</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(progress.estimatedTime || 0)} remaining
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {isError && progress?.error && (
        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
          <p className="text-xs text-destructive">{progress.status === 'error'}</p>
        </div>
      )}
    </div>
  );
}
