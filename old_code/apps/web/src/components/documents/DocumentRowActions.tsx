'use client';

import { Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  MoreVertical,
  Eye,
  Download,
  Share2,
  Edit2,
  Trash2,
  Copy,
  FolderInput,
} from 'lucide-react';
import { useState, useCallback } from 'react';

interface DocumentRowActionsProps {
  document: Document;
  onView?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onShare?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onDuplicate?: (doc: Document) => void;
  onMove?: (doc: Document) => void;
}

/**
 * Row actions dropdown for document data table
 * Provides context menu with common document actions
 */
export function DocumentRowActions({
  document,
  onView,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}: DocumentRowActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = useCallback(() => {
    onDelete?.(document);
    setShowDeleteDialog(false);
  }, [document, onDelete]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onView && (
            <DropdownMenuItem onClick={() => onView(document)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem onClick={() => onDownload(document)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
          )}
          {onShare && (
            <DropdownMenuItem onClick={() => onShare(document)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          )}
          {(onView || onDownload || onShare) && (onEdit || onDuplicate || onMove || onDelete) && (
            <DropdownMenuSeparator />
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(document)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Metadata
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(document)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}
          {onMove && (
            <DropdownMenuItem onClick={() => onMove(document)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Collection
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{document.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
