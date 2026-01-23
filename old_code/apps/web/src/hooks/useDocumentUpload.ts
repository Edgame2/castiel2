/**
 * useDocumentUpload Hook
 * Manages document upload state and operations
 */

'use client';

import { useCallback, useState } from 'react';
import { Document, DocumentMetadata, UploadProgress } from '@/types/documents';
import { env } from '@/lib/env';
import { getCachedToken } from '@/lib/api-client';

export function useDocumentUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(
    new Map()
  );
  const [batchMetadata, setBatchMetadata] = useState<DocumentMetadata>({
    tags: [],
    visibility: 'internal',
  });

  const addFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  }, []);

  const updateProgress = useCallback(
    (fileName: string, progress: UploadProgress) => {
      setUploadProgress((prev) => new Map(prev).set(fileName, progress));
    },
    []
  );

  const cancelUpload = useCallback((fileName: string) => {
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(fileName);
      if (current) {
        newMap.set(fileName, { ...current, status: 'cancelled' });
      }
      return newMap;
    });
  }, []);

  const startUpload = useCallback(
    async (
      overrides: Partial<DocumentMetadata> = {},
      onSuccess?: (docs: Document[]) => void
    ) => {
      // Handle case where first arg is the callback (backwards compatibility if needed, 
      // but strictly we control all call sites so we can just update them)
      if (typeof overrides === 'function') {
        onSuccess = overrides;
        overrides = {};
      }

      const currentMetadata = { ...batchMetadata, ...overrides };
      const uploadedDocs: Document[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];

      for (const file of selectedFiles) {
        const fileKey = file.name;

        // Check if cancelled
        if (uploadProgress.get(fileKey)?.status === 'cancelled') {
          continue;
        }

        try {
          updateProgress(fileKey, {
            fileId: fileKey,
            fileName: file.name,
            loaded: 0,
            total: file.size,
            percent: 0,
            status: 'uploading',
            startTime: Date.now(),
          });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name);
          if (currentMetadata.category) {
            formData.append('category', currentMetadata.category);
          }
          formData.append('tags', JSON.stringify(currentMetadata.tags));
          formData.append('visibility', currentMetadata.visibility);
          if (currentMetadata.description) {
            formData.append('description', currentMetadata.description);
          }
          if (currentMetadata.projectId) {
            formData.append('projectId', currentMetadata.projectId);
          }

          const xhr = new XMLHttpRequest();
          const startTime = uploadProgress.get(fileKey)?.startTime || Date.now();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = e.loaded / elapsed;
              const estimatedTime = (e.total - e.loaded) / speed;

              updateProgress(fileKey, {
                fileId: fileKey,
                fileName: file.name,
                loaded: e.loaded,
                total: e.total,
                percent,
                status: 'uploading',
                speed,
                estimatedTime,
                startTime,
              });
            }
          });

          const response = await new Promise<Document>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status === 200 || xhr.status === 201 || xhr.status === 202) {
                const response = JSON.parse(xhr.responseText);
                // Unwrap the data property if it exists, otherwise use the response itself
                resolve(response.data || response);
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));

            // Use full API URL
            const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
            xhr.open('POST', `${apiBaseUrl}/api/v1/documents/upload`);
            xhr.timeout = 300000; // 5 minutes
            xhr.setRequestHeader('Accept', 'application/json');

            // Add authentication token if available
            const token = getCachedToken();
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            // Add tenant ID if available
            const tenantId = localStorage.getItem('tenantId');
            if (tenantId) {
              xhr.setRequestHeader('X-Tenant-ID', tenantId);
            }

            xhr.send(formData);
          });

          uploadedDocs.push(response);
          updateProgress(fileKey, {
            fileId: fileKey,
            fileName: file.name,
            loaded: file.size,
            total: file.size,
            percent: 100,
            status: 'completed',
            startTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ fileName: file.name, error: errorMessage });
          updateProgress(fileKey, {
            fileId: fileKey,
            fileName: file.name,
            loaded: uploadProgress.get(fileKey)?.loaded || 0,
            total: file.size,
            percent: uploadProgress.get(fileKey)?.percent || 0,
            status: 'error',
            error: errorMessage,
            startTime: uploadProgress.get(fileKey)?.startTime || Date.now(),
          });
        }
      }

      onSuccess?.(uploadedDocs);
      return { uploadedDocs, errors };
    },
    [selectedFiles, batchMetadata, uploadProgress, updateProgress]
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setUploadProgress(new Map());
  }, []);

  const getTotalSize = useCallback(() => {
    return selectedFiles.reduce((sum, f) => sum + f.size, 0);
  }, [selectedFiles]);

  const getCompletedCount = useCallback(() => {
    return Array.from(uploadProgress.values()).filter(
      (p) => p.status === 'completed'
    ).length;
  }, [uploadProgress]);

  const hasErrors = useCallback(() => {
    return Array.from(uploadProgress.values()).some((p) => p.status === 'error');
  }, [uploadProgress]);

  return {
    selectedFiles,
    uploadProgress,
    batchMetadata,
    setBatchMetadata,
    addFiles,
    removeFile,
    updateProgress,
    cancelUpload,
    startUpload,
    clearAll,
    getTotalSize,
    getCompletedCount,
    hasErrors,
  };
}
