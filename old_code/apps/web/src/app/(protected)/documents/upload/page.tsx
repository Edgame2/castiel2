'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DocumentMetadata } from '@/types/documents';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadDropZone } from '@/components/documents/UploadDropZone';
import { UploadFilesList } from '@/components/documents/UploadFilesList';
import { UploadBatchSettings } from '@/components/documents/UploadBatchSettings';
import { UploadSummary } from '@/components/documents/UploadSummary';
import { ArrowLeft, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Validation schema
const batchMetadataSchema = z.object({
  category: z.string().optional(),
  visibility: z.enum(['public', 'internal', 'confidential']).default('internal' as any),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});

type BatchMetadataFormData = z.infer<typeof batchMetadataSchema>;

/**
 * Bulk upload page
 * Dedicated page for uploading multiple documents with batch settings
 */
export default function DocumentUploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  // Use upload hook
  const {
    selectedFiles,
    uploadProgress,
    addFiles,
    removeFile,
    cancelUpload,
    startUpload,
    clearAll,
  } = useDocumentUpload();

  // Form for batch metadata
  const form = useForm<BatchMetadataFormData>({
    resolver: zodResolver(batchMetadataSchema) as any,
    defaultValues: {
      visibility: 'internal',
      tags: [],
    },
  });

  // Handle file selection
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      addFiles(files);
    },
    [addFiles]
  );

  // Handle upload start
  const handleStartUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      const result = await startUpload();

      if (result && result.uploadedDocs.length > 0) {
        // Navigate back to documents list after successful upload
        setTimeout(() => {
          router.push('/documents');
        }, 1500);
      }
    } finally {
      setIsUploading(false);
    }
  }, [startUpload, router]);

  // Handle clear
  const handleClear = useCallback(() => {
    const confirmed = confirm('Clear all files? This cannot be undone.');
    if (confirmed) {
      clearAll();
      form.reset();
    }
  }, [clearAll, form]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (selectedFiles.length > 0) {
      const confirmed = confirm(
        'Leave without uploading? All selected files will be lost.'
      );
      if (!confirmed) return;
    }
    router.back();
  }, [selectedFiles.length, router]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-3">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
            <p className="text-sm text-gray-500">
              Upload multiple documents with batch settings
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Upload and files */}
          <div className="space-y-6 lg:col-span-2">
            {/* Drop zone */}
            <Card>
              <CardHeader>
                <CardTitle>Select Files</CardTitle>
                <CardDescription>
                  Drag and drop files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadDropZone
                  onFilesSelected={handleFilesSelected}
                  acceptedTypes={['*/*']}
                  maxSize={100 * 1024 * 1024} // 100MB
                  maxFiles={100}
                />
              </CardContent>
            </Card>

            {/* Files list */}
            {selectedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Files</CardTitle>
                  <CardDescription>
                    Review and manage files before uploading
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadFilesList
                    files={selectedFiles}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                    onRemoveFile={removeFile}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Settings and summary */}
          <div className="space-y-6">
            {/* Batch settings */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Settings</CardTitle>
                <CardDescription>
                  Applied to all uploaded documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadBatchSettings
                  control={form.control}
                  onClear={() => form.reset()}
                />
              </CardContent>
            </Card>

            {/* Upload summary */}
            {selectedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>
                    Upload progress and actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadSummary
                    files={selectedFiles}
                    uploadProgress={uploadProgress}
                    onStartUpload={handleStartUpload}
                    onClear={handleClear}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}
