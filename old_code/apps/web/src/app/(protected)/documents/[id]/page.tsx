'use client';

import { use, useCallback, useState } from 'react';
import { Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryBadge } from '@/components/documents/CategoryBadge';
import { VisibilityBadge } from '@/components/documents/VisibilityBadge';
import { StatusBadge } from '@/components/documents/StatusBadge';
import {
  formatDate,
  formatBytes,
  formatRelativeTime,
  getMimeTypeIcon,
  isImage,
} from '@/lib/document-utils';
import {
  ArrowLeft,
  Download,
  Share2,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  User,
  Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDocument } from '@/hooks/useDocuments';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { EditDocumentMetadataDialog } from '@/components/documents/EditDocumentMetadataDialog';
import { ShareDocumentDialog } from '@/components/documents/ShareDocumentDialog';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
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

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Document detail page
 * Displays comprehensive document information, metadata, and actions
 */
export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Fetch document using hook
  const { document, isLoading, refetch, downloadDocument, isDownloading, deleteDocument, isDeleting } = useDocument(id);

  // Action handlers
  const handleDownload = useCallback(async () => {
    try {
      await downloadDocument();
      toast.success('Download started...');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Download error', 3, {
        errorMessage: errorObj.message,
        documentId: id,
      })
      toast.error('Failed to download document');
    }
  }, [downloadDocument]);

  const handleShare = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const handleEdit = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  const handleDelete = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteDocument();
      toast.success('Document deleted successfully');
      router.push('/documents');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Delete error', 3, {
        errorMessage: errorObj.message,
        documentId: id,
      })
      toast.error('Failed to delete document');
    }
  }, [deleteDocument, router]);

  const handleOpenExternal = useCallback(async () => {
    if (!document) return;
    
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { downloadUrl: string } 
      }>(`/api/v1/documents/${id}/download`);
      
      if (response.data.success && response.data.data?.downloadUrl) {
        window.open(response.data.data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Invalid download response');
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Open external error', 3, {
        errorMessage: errorObj.message,
        documentId: id,
      })
      toast.error('Failed to open document');
    }
  }, [id, document]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-500">Loading document...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">Document not found</p>
        <Button variant="outline" onClick={() => router.push('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const Icon = getMimeTypeIcon(document.mimeType);
  const showPreview = isImage(document.mimeType);

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="container mx-auto max-w-6xl py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <Icon className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{document.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {document.category && (
                        <CategoryBadge category={document.category} />
                      )}
                      <VisibilityBadge visibility={document.visibility} />
                      <StatusBadge status={document.status} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showPreview && <TabsTrigger value="preview">Preview</TabsTrigger>}
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document.description && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-gray-700">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600">{document.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem icon={FileText} label="File Size" value={formatBytes(document.fileSize)} />
                    <InfoItem icon={FileText} label="MIME Type" value={document.mimeType} />
                    <InfoItem icon={Clock} label="Created" value={formatRelativeTime(document.createdAt)} />
                    <InfoItem icon={Clock} label="Modified" value={formatRelativeTime(document.updatedAt)} />
                    <InfoItem icon={User} label="Created By" value={document.createdBy || 'Unknown'} />
                  </div>

                  {document.tags && document.tags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Tag className="h-4 w-4" />
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {document.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleOpenExternal}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Preview tab */}
          {showPreview && (
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Document Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center rounded-lg bg-gray-100 p-8">
                    <img
                      src={document.storagePath}
                      alt={document.name}
                      className="max-h-[600px] rounded-lg shadow-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Metadata tab */}
          <TabsContent value="metadata">
            <Card>
              <CardHeader>
                <CardTitle>Technical Metadata</CardTitle>
                <CardDescription>Detailed document properties</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <MetadataRow label="Document ID" value={document.id} />
                  <MetadataRow label="Storage Path" value={document.storagePath || 'N/A'} />
                  <MetadataRow label="File Size" value={formatBytes(document.fileSize)} />
                  <MetadataRow label="MIME Type" value={document.mimeType} />
                  <MetadataRow label="Category" value={document.category || 'None'} />
                  <MetadataRow label="Visibility" value={document.visibility} />
                  <MetadataRow label="Status" value={document.status} />
                  <MetadataRow label="Created" value={formatDate(document.createdAt, true)} />
                  <MetadataRow label="Updated" value={formatDate(document.updatedAt, true)} />
                  <MetadataRow label="Created By" value={document.createdBy || 'Unknown'} />
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>Document access and modification logs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Activity logging coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit metadata dialog */}
      <EditDocumentMetadataDialog
        document={document}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          refetch();
          setShowEditDialog(false);
        }}
        availableCategories={[]} // TODO: Get from API
      />

      {/* Share dialog */}
      <ShareDocumentDialog
        document={document}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        onSuccess={() => {
          refetch();
          setShowShareDialog(false);
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{document?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper components
interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-gray-500" />
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

interface MetadataRowProps {
  label: string;
  value: string;
}

function MetadataRow({ label, value }: MetadataRowProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
