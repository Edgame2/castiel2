'use client';

import { useMemo } from 'react';
import { Document } from '@/types/documents';
import {
  formatDate,
  formatBytes,
  getMimeTypeIcon,
  isImage,
} from '@/lib/document-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Share2,
  MoreVertical,
  Eye,
  Lock,
  Globe,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentCardProps {
  document: Document;
  onDownload?: (doc: Document) => void;
  onShare?: (doc: Document) => void;
  onView?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onSelect?: (doc: Document, selected: boolean) => void;
  isSelected?: boolean;
  className?: string;
}

/**
 * Document card component for grid view
 * Displays document with metadata, thumbnail placeholder, and actions
 */
export function DocumentCard({
  document,
  onDownload,
  onShare,
  onView,
  onDelete,
  onSelect,
  isSelected = false,
  className,
}: DocumentCardProps) {
  // Memoize computed values
  const Icon = useMemo(() => getMimeTypeIcon(document.mimeType), [document.mimeType]);

  const visibilityIcon = useMemo(() => {
    switch (document.visibility) {
      case 'public':
        return <Globe className="h-3.5 w-3.5" />;
      case 'confidential':
        return <Lock className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  }, [document.visibility]);

  const statusColor = useMemo(() => {
    switch (document.status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'quarantined':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'deleted':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  }, [document.status]);

  const hasImage =
    isImage(document.mimeType) && document.storagePath;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        className
      )}
    >
      {/* Checkbox overlay */}
      {onSelect && (
        <div className="absolute right-2 top-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(document, e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600"
          />
        </div>
      )}

      {/* Thumbnail area */}
      <div
        className={cn(
          'relative aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50',
          hasImage ? 'bg-cover bg-center' : 'flex items-center justify-center'
        )}
        style={
          hasImage
            ? { backgroundImage: `url(${document.storagePath})` }
            : undefined
        }
      >
        {!hasImage && (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Icon className="h-8 w-8" />
            <span className="text-xs font-medium">
              {(document.mimeType || 'unknown/file').split('/' as any)[1]?.toUpperCase() || 'FILE'}
            </span>
          </div>
        )}

        {/* Hover overlay with quick actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition-colors group-hover:bg-black/40">
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onView?.(document)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onShare && (
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onShare(document)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {document.name}
          </CardTitle>

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1">
            {document.category && (
              <Badge variant="outline" className="text-xs">
                {document.category}
              </Badge>
            )}
            {visibilityIcon && (
              <Badge variant="outline" className="gap-1 text-xs">
                {visibilityIcon}
                {document.visibility}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {/* File info */}
        <div className="text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>{formatBytes(document.fileSize)}</span>
            <span>{formatDate(document.createdAt)}</span>
          </div>
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {document.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Status badge */}
        <Badge className={cn('text-xs', statusColor)}>
          {document.status}
        </Badge>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onDownload && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 text-xs"
              onClick={() => onDownload(document)}
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="p-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onView && (
                <DropdownMenuItem onClick={() => onView(document)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(document)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(document)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(document)}
                  className="text-red-600"
                >
                  <span className="mr-2">🗑️</span>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
