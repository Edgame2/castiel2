/**
 * UploadDropZone Component
 * Drag & drop file upload area
 */

'use client';

import React, { useCallback, useState } from 'react';
import { CloudUpload, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
}

export function UploadDropZone({
  onFilesSelected,
  acceptedTypes = ['*/*'],
  maxSize = 104857600, // 100MB default
  maxFiles = 100,
}: UploadDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string>();

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];

      if (fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return [];
      }

      for (const file of fileArray) {
        // Check file size
        if (file.size > maxSize) {
          setError(`File "${file.name}" exceeds maximum size of ${formatBytes(maxSize)}`);
          continue;
        }

        // Check file type
        const types = Array.isArray(acceptedTypes) ? acceptedTypes : [];
        if (types.length > 0 && types[0] !== '*/*') {
          const isAccepted = types.some((type) => {
            if (type.endsWith('/*')) {
              const [category] = type.split('/' as any);
              return file.type.startsWith(category);
            }
            return file.type === type || file.name.endsWith(type.replace('.', ''));
          });

          if (!isAccepted) {
            setError(`File type "${file.type}" not accepted`);
            continue;
          }
        }

        validFiles.push(file);
      }

      return validFiles;
    },
    [maxSize, maxFiles, acceptedTypes]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(undefined);

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      setError(undefined);

      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(undefined);
      const files = validateFiles(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input
      e.target.value = '';
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/10 shadow-md'
            : 'border-muted-foreground/25 bg-muted/50 hover:bg-muted hover:border-muted-foreground/50'
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleInputChange}
          accept={acceptedTypes?.join(',')}
          className="hidden"
          id="file-input"
        />

        <label htmlFor="file-input" className="cursor-pointer block">
          <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">
            {isDragActive ? 'Drop files here' : 'Drag files here or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {acceptedTypes && acceptedTypes[0] !== '*/*'
              ? `Supported: ${acceptedTypes.join(', ')}`
              : 'All file types supported'}
            {' • '}
            Max {formatBytes(maxSize)} per file
          </p>
        </label>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
