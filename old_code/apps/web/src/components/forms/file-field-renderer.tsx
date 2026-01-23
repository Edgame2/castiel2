/**
 * File/Image Field Renderer
 * Handles file and image upload fields in forms
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useFormContext, Controller, FieldValues, Path } from 'react-hook-form';
import { Upload, X, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { env } from '@/lib/env';
import { getCachedToken } from '@/lib/api-client';
import type { RichFieldDefinition, FileFieldConfig, ImageFieldConfig } from '@castiel/shared-types';

interface FileFieldRendererProps<T extends FieldValues> {
  field: RichFieldDefinition;
  name: Path<T>;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FileFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: FileFieldRendererProps<T>) {
  const { control } = useFormContext<T>();
  const config = (field.config || {}) as FileFieldConfig | ImageFieldConfig;
  const isImage = field.type === 'image';
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [dragActive, setDragActive] = useState(false);

  const maxSize = config.maxSize || (isImage ? 10 * 1024 * 1024 : 10 * 1024 * 1024); // 10MB default
  const allowedTypes = isImage 
    ? (config as ImageFieldConfig).allowedFormats?.map(f => `image/${f}`) || ['image/*']
    : config.allowedTypes || ['*/*'];
  const multiple = config.multiple || false;

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('visibility', 'internal'); // Default for form uploads

    const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const token = getCachedToken();
    const tenantId = localStorage.getItem('tenantId');

    const response = await fetch(`${apiBaseUrl}/api/v1/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(tenantId && { 'X-Tenant-ID': tenantId }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    // Return document ID (form field stores document ID, not file object)
    return data.document?.id || data.id || data.data?.id;
  }, []);

  const handleFileSelect = useCallback(
    async (files: File[], onChange: (value: string) => void) => {
      if (files.length === 0) return;

      const file = files[0]; // For now, handle single file (can extend to multiple later)
      
      // Validate file size
      if (file.size > maxSize) {
        setUploadError(`File size exceeds maximum of ${formatBytes(maxSize)}`);
        return;
      }

      // Validate file type
      if (allowedTypes.length > 0 && allowedTypes[0] !== '*/*') {
        const isAccepted = allowedTypes.some((type) => {
          if (type.endsWith('/*')) {
            const [category] = type.split('/');
            return file.type.startsWith(category);
          }
          return file.type === type;
        });

        if (!isAccepted) {
          setUploadError(`File type "${file.type}" not accepted`);
          return;
        }
      }

      setUploadError(undefined);
      setUploading(true);

      try {
        const documentId = await uploadFile(file);
        // Update form field value with document ID
        onChange(documentId);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [maxSize, allowedTypes, uploadFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadError(undefined);

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, onChange: (value: string) => void) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      setUploadError(undefined);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files, onChange);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
      setUploadError(undefined);
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFileSelect(files, onChange);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFileSelect]
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => {
        const hasValue = !!formField.value;

        return (
          <FormItem>
            <FormControl>
              <div className="space-y-3">
                {!hasValue ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, formField.onChange)}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200',
                      dragActive
                        ? 'border-primary bg-primary/10'
                        : 'border-muted-foreground/25 bg-muted/50 hover:bg-muted',
                      disabled || readOnly || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleInputChange(e, formField.onChange)}
                      accept={allowedTypes.join(',')}
                      className="hidden"
                      id={`file-input-${name}`}
                      disabled={disabled || readOnly || uploading}
                      multiple={multiple}
                    />

                    <label
                      htmlFor={`file-input-${name}`}
                      className={cn(
                        'cursor-pointer block',
                        (disabled || readOnly || uploading) && 'cursor-not-allowed'
                      )}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mx-auto h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          {isImage ? (
                            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          ) : (
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          )}
                          <p className="text-sm font-medium text-foreground">
                            {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Max {formatBytes(maxSize)}
                            {allowedTypes[0] !== '*/*' && ` • ${allowedTypes.join(', ')}`}
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    {isImage ? (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {formField.value} {/* Document ID - could fetch and show name */}
                      </p>
                      <p className="text-xs text-muted-foreground">Document uploaded</p>
                    </div>
                    {!disabled && !readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          formField.onChange(null);
                          setUploadError(undefined);
                        }}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {uploadError}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
