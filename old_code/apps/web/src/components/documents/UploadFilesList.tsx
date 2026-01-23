'use client';

import { useMemo } from 'react';
import { UploadProgress } from '@/types/documents';
import { UploadFileRow } from './UploadFileRow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface UploadFilesListProps {
  files: File[];
  uploadProgress: Map<string, UploadProgress>;
  onCancelUpload: (fileName: string) => void;
  onRemoveFile: (fileName: string) => void;
  maxHeight?: string;
  className?: string;
}

/**
 * List component for displaying uploaded files and their progress
 * Shows individual UploadFileRow for each file with progress tracking
 */
export function UploadFilesList({
  files,
  uploadProgress,
  onCancelUpload,
  onRemoveFile,
  maxHeight = 'max-h-96',
  className,
}: UploadFilesListProps) {
  // Memoize file list to prevent unnecessary re-renders
  const memoizedFiles = useMemo(() => files, [files]);

  // Check if there are any errors
  const hasErrors = useMemo(
    () =>
      Array.from(uploadProgress.values()).some(
        (progress) => progress.status === 'error'
      ),
    [uploadProgress]
  );

  // Count completed, uploading, and errored files
  const stats = useMemo(() => {
    const completed = Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'completed'
    ).length;
    const uploading = Array.from(uploadProgress.values()).filter(
      (p) => p.status !== 'completed' && p.status !== 'error' && p.status !== 'cancelled'
    ).length;
    const errored = Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'error'
    ).length;

    return { completed, uploading, errored };
  }, [uploadProgress]);

  if (memoizedFiles.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-gray-50 p-8', className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-sm text-gray-500">
            No files selected yet
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Drop files above or click to select files to upload
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary stats */}
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <div>
          <span className="font-medium">{memoizedFiles.length}</span> file{memoizedFiles.length !== 1 ? 's' : ''}
        </div>
        {stats.completed > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{stats.completed} completed</span>
          </div>
        )}
        {stats.uploading > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>{stats.uploading} uploading</span>
          </div>
        )}
        {stats.errored > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>{stats.errored} error</span>
          </div>
        )}
      </div>

      {/* Error alert */}
      {hasErrors && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some files failed to upload. Check details below and retry.
          </AlertDescription>
        </Alert>
      )}

      {/* Files list in scroll area */}
      <ScrollArea className={cn('rounded-lg border border-gray-200 bg-white', maxHeight)}>
        <div className="space-y-2 p-4">
          {memoizedFiles.map((file) => {
            const progress = uploadProgress.get(file.name);

            return (
              <UploadFileRow
                key={file.name}
                file={file}
                progress={progress}
                onCancel={() => onCancelUpload(file.name)}
                onRemove={() => onRemoveFile(file.name)}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer info */}
      <div className="text-xs text-gray-500">
        <p>
          Click the X button to remove a file from the queue before uploading
        </p>
      </div>
    </div>
  );
}
