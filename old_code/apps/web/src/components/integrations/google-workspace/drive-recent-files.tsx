'use client';

import { useDriveFiles } from '@/hooks/use-google-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, File, ExternalLink, RefreshCw, Loader2, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface DriveRecentFilesProps {
  integrationId: string;
  limit?: number;
}

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File;
  if (mimeType.includes('folder')) return Folder;
  if (mimeType.includes('image')) return File;
  if (mimeType.includes('pdf')) return File;
  if (mimeType.includes('spreadsheet')) return File;
  if (mimeType.includes('document')) return File;
  return File;
};

const formatFileSize = (size?: string) => {
  if (!size) return '';
  const bytes = parseInt(size, 10);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function DriveRecentFiles({ integrationId, limit = 10 }: DriveRecentFilesProps) {
  const { data, isLoading, error, refetch, isRefetching } = useDriveFiles(integrationId, {
    limit,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Recent Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Recent Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load Drive files
          </div>
        </CardContent>
      </Card>
    );
  }

  const files = data?.files || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            <CardTitle>Recent Files</CardTitle>
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {files.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Recently modified files from Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recent files
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              const modifiedDate = file.modifiedTime
                ? new Date(file.modifiedTime)
                : null;

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {file.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {file.size && <span>{formatFileSize(file.size)}</span>}
                      {modifiedDate && (
                        <span>
                          {formatDistanceToNow(modifiedDate, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {file.webViewLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link
              href="https://drive.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Drive
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link
              href="https://drive.google.com/drive/u/0/my-drive"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







