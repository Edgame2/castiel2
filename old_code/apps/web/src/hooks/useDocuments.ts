'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Document, DocumentFilters } from '@/types/documents';
import { apiClient } from '@/lib/api-client';

/**
 * Transform Shard object to Document object
 */
function transformShardToDocument(shard: any): Document {
  const structuredData = shard.structuredData || {};
  
  return {
    id: shard.id,
    name: structuredData.name || 'Unknown',
    description: structuredData.description,
    documentType: structuredData.documentType,
    mimeType: structuredData.mimeType || 'application/octet-stream',
    fileSize: typeof structuredData.fileSize === 'number' ? structuredData.fileSize : 0,
    category: structuredData.category,
    tags: structuredData.tags || [],
    visibility: structuredData.visibility || 'internal',
    storagePath: structuredData.storagePath || '',
    blobUrl: structuredData.blobUrl,
    previewPath: structuredData.previewPath,
    thumbnailPath: structuredData.thumbnailPath,
    status: structuredData.status || 'active',
    version: structuredData.version || '1',
    createdAt: shard.createdAt || new Date().toISOString(),
    updatedAt: shard.updatedAt || new Date().toISOString(),
    createdBy: shard.userId || structuredData.uploadedBy || '',
    collectionIds: structuredData.collectionIds,
    retentionPolicyId: structuredData.retentionPolicyId,
  };
}

/**
 * Hook for fetching and managing documents
 */
export function useDocuments(filters?: DocumentFilters) {
  const queryClient = useQueryClient();

  // Fetch documents with filters
  const {
    data: rawDocuments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.searchQuery) params.append('search', filters.searchQuery);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.visibility) {
        if (Array.isArray(filters.visibility)) {
          filters.visibility.forEach((v) => params.append('visibility', v));
        } else {
          params.append('visibility', filters.visibility);
        }
      }
      if (filters?.status) {
        filters.status.forEach((s) => params.append('status', s));
      }
      if (filters?.tags) {
        filters.tags.forEach((t) => params.append('tags', t));
      }
      // Date filters should be strings if they are coming from the filter panel
      if (filters?.dateFrom) params.append('dateFrom', String(filters.dateFrom));
      if (filters?.dateTo) params.append('dateTo', String(filters.dateTo));

      const response = await apiClient.get<{ data: any[] }>(`/api/v1/documents?${params.toString()}`);
      // Transform shards to documents
      return (response.data.data || []).map(transformShardToDocument);
    },
  });

  // Use transformed documents
  const documents = rawDocuments as Document[];

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiClient.delete<{ data: any }>(`/api/v1/documents/${documentId}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Update document metadata mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({
      documentId,
      metadata,
    }: {
      documentId: string;
      metadata: Partial<Document>;
    }) => {
      const response = await apiClient.patch<{ data: any }>(`/api/v1/documents/${documentId}`, metadata);
      return transformShardToDocument(response.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return {
    documents,
    isLoading,
    error,
    refetch,
    deleteDocument: deleteDocumentMutation.mutate,
    updateDocument: updateDocumentMutation.mutate,
    isDeletingDocument: deleteDocumentMutation.isPending,
    isUpdatingDocument: updateDocumentMutation.isPending,
  };
}

/**
 * Hook for fetching a single document by ID
 */
export function useDocument(documentId: string) {
  const queryClient = useQueryClient();

  const {
    data: fetchedDocumentRaw,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any }>(`/api/v1/documents/${documentId}`);
      return transformShardToDocument(response.data.data);
    },
    enabled: !!documentId,
  });

  const fetchedDocument = fetchedDocumentRaw as Document | undefined;

  // Download document mutation
  const downloadDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { downloadUrl: string; fileName?: string; expiresAt?: string } 
      }>(`/api/v1/documents/${documentId}/download`);
      
      if (!response.data.success || !response.data.data?.downloadUrl) {
        throw new Error('Invalid download response');
      }

      const { downloadUrl, fileName } = response.data.data;
      const finalFileName = fileName || fetchedDocument?.name || 'download';

      // Open download URL in new window/tab
      // SAS URLs from Azure Blob Storage will trigger download
      const link = document.createElement('a' as any);
      link.href = downloadUrl;
      link.download = finalFileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { downloadUrl, fileName: finalFileName };
    },
  });

  const downloadDocument = downloadDocumentMutation.mutate;

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{ success: boolean; data: any }>(`/api/v1/documents/${documentId}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });

  return {
    document: fetchedDocument,
    isLoading,
    error,
    refetch,
    downloadDocument,
    isDownloading: downloadDocumentMutation.isPending,
    deleteDocument: deleteDocumentMutation.mutate,
    isDeleting: deleteDocumentMutation.isPending,
  };
}
