'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Document, DocumentMetadata } from '@/types/documents';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { UploadDropZone } from './UploadDropZone';
import { UploadFilesList } from './UploadFilesList';
import { UploadBatchSettings } from './UploadBatchSettings';
import { UploadSummary } from './UploadSummary';

// Validation schema for batch metadata
const batchMetadataSchema = z.object({
  category: z.string().optional(),
  visibility: z.enum(['public', 'internal', 'confidential']).default('internal' as any),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});



interface DocumentUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: (uploadedDocs: Document[]) => void;
  categories?: string[];
  acceptedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  projectId?: string;
}

/**
 * Modal component for document upload
 * Provides quick upload dialog with drag & drop, batch settings, and progress tracking
 */
export function DocumentUploadModal({
  isOpen,
  onOpenChange,
  onUploadSuccess,
  categories,
  acceptedTypes = ['*/*'],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 100,
  projectId,
}: DocumentUploadModalProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);

  // Use upload hook for state management
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
  const form = useForm<DocumentMetadata>({
    resolver: zodResolver(batchMetadataSchema) as any,
    defaultValues: {
      visibility: 'internal',
      tags: [],
    },
  });

  // Handle drop zone file selection
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      addFiles(files);
      setActiveTab('files');
    },
    [addFiles]
  );

  // Handle upload start
  const handleStartUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      const formValues = form.getValues();
      const result = await startUpload({
        ...formValues,
        projectId,
      });

      if (result && result.uploadedDocs.length > 0) {
        onUploadSuccess?.(result.uploadedDocs);

        // Clear after successful upload
        setTimeout(() => {
          clearAll();
          form.reset();
          setActiveTab('upload');
          onOpenChange(false);
        }, 1500);
      }
    } finally {
      setIsUploading(false);
    }
  }, [startUpload, onUploadSuccess, clearAll, form, onOpenChange]);

  // Handle modal close
  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        if (selectedFiles.length > 0) {
          // Simple confirmation via browser native for now, or just allow close?
          // The previous "confirm" was annoying. Let's just allow close but maybe
          // we should rely on the user knowing what they are doing.
          // Or we could check if uploads are IN PROGRESS?
          const isInProgress = Array.from(uploadProgress.values()).some(p => p.status === 'uploading');
          if (isInProgress) {
            const confirmClose = confirm('Uploads are in progress. Are you sure you want to close?');
            if (!confirmClose) return;
          }
        }
        clearAll();
        form.reset();
        setActiveTab('upload');
      }
      onOpenChange(open);
    },
    [selectedFiles.length, uploadProgress, clearAll, form, onOpenChange]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl sm:max-w-[700px] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Add documents to your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
          <Form {...form}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-6 py-2 border-b bg-muted/20">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">
                    Upload
                    {selectedFiles.length > 0 && activeTab !== 'upload' && (
                      <span className="ml-2 text-xs font-medium text-primary bg-primary/10 px-1.5 rounded-full">
                        {selectedFiles.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="files" disabled={selectedFiles.length === 0}>
                    Files needed
                  </TabsTrigger>
                  <TabsTrigger value="settings" disabled={selectedFiles.length === 0}>
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="upload" className="h-full m-0 p-6">
                  <UploadDropZone
                    onFilesSelected={handleFilesSelected}
                    acceptedTypes={acceptedTypes}
                    maxSize={maxFileSize}
                    maxFiles={maxFiles}
                  />
                </TabsContent>

                <TabsContent value="files" className="h-full m-0 p-6">
                  <UploadFilesList
                    files={selectedFiles}
                    uploadProgress={uploadProgress}
                    onCancelUpload={cancelUpload}
                    onRemoveFile={removeFile}
                  />
                </TabsContent>

                <TabsContent value="settings" className="h-full m-0 p-6">
                  <UploadBatchSettings
                    control={form.control}
                    categories={categories}
                    onClear={() => form.reset()}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </Form>
        </div>

        <div className="border-t bg-muted/20 px-6 py-4">
          <UploadSummary
            files={selectedFiles}
            uploadProgress={uploadProgress}
            onStartUpload={handleStartUpload}
            onClear={() => {
              clearAll();
              form.reset();
            }}
            isUploading={isUploading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
