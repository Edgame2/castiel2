'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, DocumentFilters } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { DocumentDataTable } from '@/components/documents/DocumentDataTable';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentFilterPanel } from '@/components/documents/DocumentFilterPanel';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { EditDocumentMetadataDialog } from '@/components/documents/EditDocumentMetadataDialog';
import { ShareDocumentDialog } from '@/components/documents/ShareDocumentDialog';
import { LayoutGrid, Table as TableIcon, Upload } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import { useDocuments } from '@/hooks/useDocuments';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Main documents list page
 * Displays documents in grid or table view with filtering and actions
 */
export default function DocumentsPage() {
  const { t } = useTranslation(['common']) as any;
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);
  const [documentToShare, setDocumentToShare] = useState<Document | null>(null);

  // Fetch documents from API using hook
  const { documents, isLoading, refetch, deleteDocument, isDeletingDocument } = useDocuments(filters);

  // Document action handlers
  const handleView = useCallback((doc: Document) => {
    router.push(`/documents/${doc.id}`);
  }, [router]);

  const handleDownload = useCallback(async (doc: Document) => {
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { downloadUrl: string; fileName?: string; expiresAt?: string } 
      }>(`/api/v1/documents/${doc.id}/download`);
      
      if (!response.data.success || !response.data.data?.downloadUrl) {
        throw new Error('Invalid download response');
      }

      const { downloadUrl, fileName } = response.data.data;
      const finalFileName = fileName || doc.name || 'download';

      // Open download URL in new window/tab
      const link = document.createElement('a' as any);
      link.href = downloadUrl;
      link.download = finalFileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloading ${doc.name}...`);
    } catch (error) {
      toast.error(`Failed to download ${doc.name}`);
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Download error in documents page', 3, {
        errorMessage: errorObj.message,
        documentId: doc.id,
        documentName: doc.name,
      })
    }
  }, []);

  const handleShare = useCallback((doc: Document) => {
    setDocumentToShare(doc);
  }, []);

  const handleEdit = useCallback((doc: Document) => {
    setDocumentToEdit(doc);
  }, []);

  const handleDelete = useCallback((doc: Document) => {
    setDocumentToDelete(doc);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument(documentToDelete.id);
      toast.success(`Document "${documentToDelete.name}" deleted successfully`);
      setDocumentToDelete(null);
      refetch();
    } catch (error) {
      toast.error(`Failed to delete "${documentToDelete.name}"`);
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Delete error in documents page', 3, {
        errorMessage: errorObj.message,
        documentId: documentToDelete.id,
        documentName: documentToDelete.name,
      })
    }
  }, [documentToDelete, deleteDocument, refetch]);

  const handleDuplicate = useCallback(async (doc: Document) => {
    try {
      const response = await apiClient.post<{ 
        success: boolean; 
        data: Document;
        message?: string;
      }>(`/api/v1/documents/${doc.id}/duplicate`, {
        name: `${doc.name} (Copy)`,
      });
      
      if (response.data.success && response.data.data) {
        toast.success(`Document "${response.data.data.name}" duplicated successfully`);
        refetch();
      } else {
        throw new Error('Duplicate failed');
      }
    } catch (error) {
      toast.error(`Failed to duplicate "${doc.name}"`);
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Duplicate error in documents page', 3, {
        errorMessage: errorObj.message,
        documentId: doc.id,
        documentName: doc.name,
      })
    }
  }, [refetch]);

  const handleMove = useCallback((doc: Document) => {
    // TODO: Implement move to collection dialog
    toast.info('Move functionality coming soon');
    trackTrace('Move document requested', 1, {
      documentId: doc.id,
      documentName: doc.name,
    })
  }, []);

  const handleBulkDownload = useCallback(async () => {
    if (selectedDocuments.length === 0) {
      toast.warning('No documents selected');
      return;
    }

    // Download each document sequentially to avoid overwhelming the browser
    let successCount = 0;
    for (const doc of selectedDocuments) {
      try {
        const response = await apiClient.get<{ 
          success: boolean; 
          data: { downloadUrl: string; fileName?: string } 
        }>(`/api/v1/documents/${doc.id}/download`);
        
        if (response.data.success && response.data.data?.downloadUrl) {
          const { downloadUrl, fileName } = response.data.data;
          const finalFileName = fileName || doc.name || 'download';

          const link = document.createElement('a' as any);
          link.href = downloadUrl;
          link.download = finalFileName;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          successCount++;
        }
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to download document in bulk download', 3, {
          errorMessage: errorObj.message,
          documentId: doc.id,
          documentName: doc.name,
        })
      }
    }
    toast.success(`Downloaded ${successCount} of ${selectedDocuments.length} document(s)`);
  }, [selectedDocuments]);

  const handleUploadSuccess = useCallback((uploadedDocs: Document[]) => {
    refetch();
    toast.success(`${uploadedDocs.length} document${uploadedDocs.length !== 1 ? 's' : ''} uploaded successfully`);
  }, [refetch]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and organize your documents
          </p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Documents
        </Button>
      </div>

      <Separator />

      {/* Main content with filter sidebar and documents */}
      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="w-72 flex-shrink-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <DocumentFilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                availableTags={[]} // TODO: Get from API
                className="border-0 bg-transparent p-0"
              />
            </CardContent>
          </Card>
        </aside>

        {/* Documents area */}
        <main className="flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>
                  {documents.length} Document
                  {documents.length !== 1 ? 's' : ''}
                </CardTitle>
                <CardDescription>
                  {view === 'grid' ? 'Grid view' : 'Table view'}
                </CardDescription>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'table')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="grid" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-2">
                    <TableIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Table</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'table')}>
                {/* Grid view */}
                <TabsContent value="grid" className="mt-0">
                  {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-sm text-muted-foreground">Loading documents...</div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-foreground">No documents found</p>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(filters).length > 0
                            ? 'Try adjusting your filters'
                            : 'Upload your first document to get started'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Documents
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {documents.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onView={handleView}
                          onDownload={handleDownload}
                          onShare={handleShare}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Table view */}
                <TabsContent value="table" className="mt-0">
                  {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <div className="text-sm text-muted-foreground">Loading documents...</div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-foreground">No documents found</p>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(filters).length > 0
                            ? 'Try adjusting your filters'
                            : 'Upload your first document to get started'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Documents
                      </Button>
                    </div>
                  ) : (
                    <DocumentDataTable
                      documents={documents}
                      onView={handleView}
                      onDownload={handleDownload}
                      onShare={handleShare}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onMove={handleMove}
                      onSelectionChange={setSelectedDocuments}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Upload modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Edit metadata dialog */}
      <EditDocumentMetadataDialog
        document={documentToEdit}
        open={!!documentToEdit}
        onOpenChange={(open) => !open && setDocumentToEdit(null)}
        onSuccess={() => {
          refetch();
          setDocumentToEdit(null);
        }}
        availableCategories={[]} // TODO: Get from API
      />

      {/* Share dialog */}
      <ShareDocumentDialog
        document={documentToShare}
        open={!!documentToShare}
        onOpenChange={(open) => !open && setDocumentToShare(null)}
        onSuccess={() => {
          refetch();
          setDocumentToShare(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDocument}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeletingDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingDocument ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
