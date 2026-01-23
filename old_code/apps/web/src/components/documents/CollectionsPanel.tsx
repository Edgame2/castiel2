'use client';

import { useCallback, useMemo, useState } from 'react';
import { Collection } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Folder,
  FolderOpen,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollectionsPanelProps {
  collections: Collection[];
  selectedCollectionId?: string;
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection?: () => void;
  onDeleteCollection?: (collectionId: string) => void;
  onRenameCollection?: (collectionId: string, name: string) => void;
  className?: string;
}

/**
 * Collections panel for nested collection navigation
 * Displays hierarchical collections with expand/collapse and context menu
 */
export function CollectionsPanel({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  className,
}: CollectionsPanelProps) {
  // Get root collections (no parent)
  const rootCollections = useMemo(
    () => collections.filter((c) => !c.parentCollectionId),
    [collections]
  );

  // Get children for a collection
  const getChildren = useCallback(
    (parentId: string) =>
      collections.filter((c) => c.parentCollectionId === parentId),
    [collections]
  );

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-gray-200 bg-white',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Collections</h3>
          {onCreateCollection && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCreateCollection}
              className="h-7 w-7 p-0"
              title="Create collection"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collections list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {rootCollections.length === 0 ? (
            <div className="space-y-2 p-2">
              <p className="text-xs text-gray-500">
                No collections yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootCollections.map((collection) => (
                <CollectionTreeItem
                  key={collection.id}
                  collection={collection}
                  children={getChildren(collection.id)}
                  isSelected={selectedCollectionId === collection.id}
                  onSelect={() => onSelectCollection(collection.id)}
                  onDelete={() => onDeleteCollection?.(collection.id)}
                  onRename={(name) => onRenameCollection?.(collection.id, name)}
                  onGetChildren={getChildren}
                  allCollections={collections}
                  level={0}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Recursive collection tree item component
 */
interface CollectionTreeItemProps {
  collection: Collection;
  children: Collection[];
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (collectionId: string) => void;
  onRename: (name: string) => void;
  onGetChildren: (parentId: string) => Collection[];
  allCollections: Collection[];
  level: number;
}

function CollectionTreeItem({
  collection,
  children,
  isSelected,
  onSelect,
  onDelete,
  onRename,
  onGetChildren,
  allCollections,
  level,
}: CollectionTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = children.length > 0;

  return (
    <div className="space-y-1">
      <Collapsible defaultOpen={level === 0}>
        <div className="flex items-center gap-1">
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-gray-100">
                <ChevronRight className="h-4 w-4 transition-transform" />
              </button>
            </CollapsibleTrigger>
          )}
          {!hasChildren && <div className="w-6" />}

          <Button
            variant={isSelected ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'flex-1 justify-start gap-2 text-xs',
              isSelected && 'bg-blue-50 text-blue-700'
            )}
            onClick={onSelect}
          >
            {isOpen ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span className="truncate">{collection.name}</span>
            {collection.children && collection.children.length > 0 && (
              <span className="ml-auto text-xs text-gray-500">
                {collection.children.length}
              </span>
            )}
          </Button>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => {
                  const newName = prompt('New name:', collection.name);
                  if (newName && newName !== collection.name) {
                    onRename(newName);
                  }
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(collection.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            <div className="ml-2 space-y-1 border-l border-gray-200 pl-2">
              {children.map((child) => (
                <CollectionTreeItem
                  key={child.id}
                  collection={child}
                  children={onGetChildren(child.id)}
                  isSelected={isSelected}
                  onSelect={() => onSelect()}
                  onDelete={onDelete}
                  onRename={onRename}
                  onGetChildren={onGetChildren}
                  allCollections={allCollections}
                  level={level + 1}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
