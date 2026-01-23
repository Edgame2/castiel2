'use client';

import { use, useCallback, useState, useEffect } from 'react';
import { Collection, Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentDataTable } from '@/components/documents/DocumentDataTable';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Folder,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/document-utils';
import { Badge } from '@/components/ui/badge';
import { useCollection, useCollections } from '@/hooks/useCollections';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CollectionDetailPageProps {
  params: Promise<{ collectionId: string }>;
}

/**
 * Collection detail page
 * Displays collection information and documents within the collection
 */
export default function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { collectionId } = use(params);
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'table'>('grid');

  // Fetch collection and documents using hooks
  const { collection, isLoading: isLoadingCollection } = useCollection(collectionId);
  const { deleteCollection, removeDocumentFromCollection } = useCollections();
  
  // Fetch collection documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Load documents when collectionId changes
  useEffect(() => {
    if (collectionId) {
      setIsLoadingDocuments(true);
      apiClient.get<{ success: boolean; data: Document[] }>(`/api/v1/collections/${collectionId}/documents`)
        .then((response) => {
          if (response.data.success) {
            setDocuments(response.data.data || []);
          }
        })
        .catch((error) => {
          const errorObj = error instanceof Error ? error : new Error(String(error))
          trackException(errorObj, 3)
          trackTrace('Failed to load collection documents', 3, {
            errorMessage: errorObj.message,
            collectionId,
          })
          toast.error('Failed to load collection documents');
        })
        .finally(() => {
          setIsLoadingDocuments(false);
        });
    }
  }, [collectionId]);

  const isLoading = isLoadingCollection || isLoadingDocuments;

  // Action handlers
  const handleEdit = useCallback(() => {
    // TODO: Implement edit collection dialog
    trackTrace('Edit collection', 1, {
      collectionId,
    })
  }, [collectionId]);

  const handleDelete = useCallback(() => {
    const confirmed = confirm(
      'Delete this collection? Documents will not be deleted.'
    );
    if (!confirmed) return;

    deleteCollection(collectionId, {
      onSuccess: () => {
        toast.success('Collection deleted successfully');
        router.push('/collections');
      },
      onError: (error) => {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Delete collection error', 3, {
          errorMessage: errorObj.message,
          collectionId,
        })
        toast.error('Failed to delete collection');
      },
    });
  }, [collectionId, router, deleteCollection]);

  const handleAddDocuments = useCallback(() => {
    // TODO: Implement add documents dialog
    trackTrace('Add documents to collection', 1, {
      collectionId,
    })
  }, [collectionId]);

  // Document action handlers
  const handleViewDocument = useCallback(
    (doc: Document) => {
      router.push(`/documents/${doc.id}`);
    },
    [router]
  );

  const handleDownloadDocument = useCallback((doc: Document) => {
    // TODO: Implement download
    trackTrace('Download document', 1, {
      documentId: doc.id,
      collectionId,
    })
  }, [collectionId]);

  const handleShareDocument = useCallback((doc: Document) => {
    // TODO: Implement share dialog
    trackTrace('Share document', 1, {
      documentId: doc.id,
      collectionId,
    })
  }, [collectionId]);

  const handleEditDocument = useCallback((doc: Document) => {
    // TODO: Implement edit metadata dialog
    trackTrace('Edit document', 1, {
      documentId: doc.id,
      collectionId,
    })
  }, [collectionId]);

  const handleDeleteDocument = useCallback((doc: Document) => {
    // TODO: Implement delete with confirmation
    trackTrace('Delete document', 1, {
      documentId: doc.id,
      collectionId,
    })
  }, [collectionId]);

  const handleRemoveFromCollection = useCallback(
    (doc: Document) => {
      const confirmed = confirm('Remove document from this collection?');
      if (!confirmed) return;

      removeDocumentFromCollection(
        {
          collectionId,
          documentId: doc.id,
        },
        {
          onSuccess: () => {
            toast.success(`Document "${doc.name}" removed from collection`);
            // Refresh documents list
            apiClient.get<{ success: boolean; data: Document[] }>(`/api/v1/collections/${collectionId}/documents`)
              .then((response) => {
                if (response.data.success) {
                  setDocuments(response.data.data || []);
                }
              })
              .catch((error) => {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace('Failed to refresh documents', 3, {
                  errorMessage: errorObj.message,
                  collectionId,
                })
              });
          },
          onError: (error) => {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace('Remove from collection error', 3, {
              errorMessage: errorObj.message,
              collectionId,
              documentId: doc.id,
            })
            toast.error('Failed to remove document from collection');
          },
        }
      );
    },
    [collectionId, removeDocumentFromCollection]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Loading collection...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">Collection not found</p>
        <Button variant="outline" onClick={() => router.push('/collections')}>
          Back to Collections
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="container mx-auto max-w-7xl py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/collections')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Collections
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <Folder className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{collection?.name || 'Collection'}</CardTitle>
                    {collection?.description && (
                      <CardDescription className="text-sm">
                        {collection.description}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">
                        {collection.collectionType}
                      </Badge>
                      <Badge variant="secondary">
                        {documents.length} document{documents.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddDocuments}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Documents tab */}
          <TabsContent value="documents" className="space-y-4">
            {/* View toggle */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>
                      {documents.length} document{documents.length !== 1 ? 's' : ''} in
                      this collection
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={view === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setView('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={view === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setView('table')}
                    >
                      <TableIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2">
                    <p className="text-sm text-gray-500">
                      No documents in this collection
                    </p>
                    <Button variant="outline" size="sm" onClick={handleAddDocuments}>
                      Add Documents
                    </Button>
                  </div>
                ) : view === 'grid' ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        onView={handleViewDocument}
                        onDownload={handleDownloadDocument}
                        onShare={handleShareDocument}
                        onDelete={handleRemoveFromCollection}
                      />
                    ))}
                  </div>
                ) : (
                  <DocumentDataTable
                    documents={documents}
                    onView={handleViewDocument}
                    onDownload={handleDownloadDocument}
                    onShare={handleShareDocument}
                    onEdit={handleEditDocument}
                    onDelete={handleRemoveFromCollection}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>Technical information</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">
                      Collection ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{collection.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Tenant ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      N/A
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Type</dt>
                    <dd className="mt-1 text-sm capitalize text-gray-900">
                      {collection.collectionType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">
                      Document Count
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {collection.children?.length || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(collection.createdAt, true)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(collection.updatedAt, true)}
                    </dd>
                  </div>
                  {collection.parentCollectionId && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">
                        Parent Collection
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {collection.parentCollectionId}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
