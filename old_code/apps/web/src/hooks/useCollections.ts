'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Collection } from '@/types/documents';

/**
 * Hook for fetching and managing collections
 */
export function useCollections() {
  const queryClient = useQueryClient();

  // Fetch all collections
  const {
    data: collections = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await fetch('/api/v1/collections', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      return response.json() as Promise<Collection[]>;
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      parentCollectionId?: string;
      collectionType?: 'folder' | 'tag' | 'smart';
    }) => {
      const response = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({
      collectionId,
      data,
    }: {
      collectionId: string;
      data: Partial<Collection>;
    }) => {
      const response = await fetch(`/api/v1/collections/${collectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await fetch(`/api/v1/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Add document to collection mutation
  const addDocumentToCollectionMutation = useMutation({
    mutationFn: async ({
      collectionId,
      documentId,
    }: {
      collectionId: string;
      documentId: string;
    }) => {
      const response = await fetch(
        `/api/v1/collections/${collectionId}/documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add document to collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Remove document from collection mutation
  const removeDocumentFromCollectionMutation = useMutation({
    mutationFn: async ({
      collectionId,
      documentId,
    }: {
      collectionId: string;
      documentId: string;
    }) => {
      const response = await fetch(
        `/api/v1/collections/${collectionId}/documents/${documentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove document from collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  return {
    collections,
    isLoading,
    error,
    refetch,
    createCollection: createCollectionMutation.mutate,
    updateCollection: updateCollectionMutation.mutate,
    deleteCollection: deleteCollectionMutation.mutate,
    addDocumentToCollection: addDocumentToCollectionMutation.mutate,
    removeDocumentFromCollection: removeDocumentFromCollectionMutation.mutate,
    isCreatingCollection: createCollectionMutation.isPending,
    isUpdatingCollection: updateCollectionMutation.isPending,
    isDeletingCollection: deleteCollectionMutation.isPending,
  };
}

/**
 * Hook for fetching a single collection by ID
 */
export function useCollection(collectionId: string) {
  const {
    data: collection,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/collections/${collectionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      return response.json() as Promise<Collection>;
    },
    enabled: !!collectionId,
  });

  return {
    collection,
    isLoading,
    error,
    refetch,
  };
}
