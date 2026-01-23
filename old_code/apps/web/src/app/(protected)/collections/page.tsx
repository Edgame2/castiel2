'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Collection } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CollectionsPanel } from '@/components/documents/CollectionsPanel';
import { Folder, Plus, Search } from 'lucide-react';
import { useCollections } from '@/hooks/useCollections';
import { toast } from 'sonner';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

/**
 * Collections list page
 * Displays and manages document collections
 */
export default function CollectionsPage() {
  const { t } = useTranslation(['common']) as any;
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Use collections hook for API integration
  const {
    collections = [],
    isLoading,
    createCollection,
    updateCollection,
    deleteCollection,
    isCreatingCollection,
    isUpdatingCollection,
    isDeletingCollection,
  } = useCollections();

  // Handle collection selection
  const handleSelectCollection = useCallback((collectionId: string) => {
    setSelectedCollectionId(collectionId);
    // Collection documents will be loaded by the detail view
  }, []);

  // Handle create collection
  const handleCreateCollection = useCallback(() => {
    if (!newCollectionName.trim()) {
      toast.error('Collection name is required');
      return;
    }

    createCollection(
      {
        name: newCollectionName.trim(),
        collectionType: 'folder',
      },
      {
        onSuccess: () => {
          toast.success(`Collection "${newCollectionName}" created successfully`);
          setIsCreateDialogOpen(false);
          setNewCollectionName('');
        },
        onError: (error) => {
          toast.error(`Failed to create collection "${newCollectionName}"`);
          const errorObj = error instanceof Error ? error : new Error(String(error))
          trackException(errorObj, 3)
          trackTrace('Create collection error', 3, {
            errorMessage: errorObj.message,
            collectionName: newCollectionName,
          })
        },
      }
    );
  }, [newCollectionName, createCollection]);

  // Handle delete collection
  const handleDeleteCollection = useCallback((collectionId: string) => {
    const confirmed = confirm('Delete this collection? Documents will not be deleted.');
    if (!confirmed) return;

    deleteCollection(collectionId, {
      onSuccess: () => {
        toast.success('Collection deleted successfully');
        if (selectedCollectionId === collectionId) {
          setSelectedCollectionId(undefined);
        }
      },
      onError: (error) => {
        toast.error('Failed to delete collection');
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Delete collection error', 3, {
          errorMessage: errorObj.message,
          collectionId,
        })
      },
    });
  }, [deleteCollection, selectedCollectionId]);

  // Handle rename collection
  const handleRenameCollection = useCallback(
    (collectionId: string, name: string) => {
      if (!name.trim()) {
        toast.error('Collection name is required');
        return;
      }

      updateCollection(
        {
          collectionId,
          data: { name: name.trim() },
        },
        {
          onSuccess: () => {
            toast.success('Collection renamed successfully');
          },
          onError: (error) => {
            toast.error('Failed to rename collection');
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace('Rename collection error', 3, {
              errorMessage: errorObj.message,
              collectionId,
              newName: name.trim(),
            })
          },
        }
      );
    },
    [updateCollection]
  );

  // Filter collections by search query
  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize documents into collections
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      <Separator />

      {/* Main content with sidebar and details */}
      <div className="flex gap-6">
        {/* Collections sidebar */}
        <aside className="w-72 flex-shrink-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Collections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              {/* Collections tree */}
              <CollectionsPanel
                collections={filteredCollections}
                selectedCollectionId={selectedCollectionId}
                onSelectCollection={handleSelectCollection}
                onCreateCollection={() => setIsCreateDialogOpen(true)}
                onDeleteCollection={handleDeleteCollection}
                onRenameCollection={handleRenameCollection}
              />
            </CardContent>
          </Card>
        </aside>

        {/* Collection details */}
        <main className="flex-1">
          {isLoading ? (
            <Card className="flex h-64 items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading collections...</div>
            </Card>
          ) : !selectedCollection ? (
            <Card className="flex h-64 items-center">
              <CardContent className="flex flex-col items-center justify-center w-full gap-4">
                <div className="rounded-lg bg-muted p-6">
                  <Folder className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Select a collection
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose a collection from the sidebar to view its contents
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Collection header */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        {selectedCollection.name}
                      </CardTitle>
                      {selectedCollection.description && (
                        <CardDescription className="mt-2">
                          {selectedCollection.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="mt-1 text-sm font-medium capitalize">
                        {selectedCollection.collectionType}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Documents</div>
                      <div className="mt-1 text-sm font-medium">
                        {selectedCollection.children?.length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Created</div>
                      <div className="mt-1 text-sm font-medium">
                        {new Date(selectedCollection.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collection documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    Documents in this collection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Document listing coming soon
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Create collection dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                placeholder="Enter collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
