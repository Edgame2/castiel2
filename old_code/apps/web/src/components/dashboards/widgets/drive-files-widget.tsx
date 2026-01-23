"use client"

import { Folder, File, ExternalLink, RefreshCw, Loader2, Upload, FileText, Image, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { formatDistanceToNow } from "date-fns"
import { useDriveFiles } from "@/hooks/use-google-workspace"
import Link from "next/link"

interface DriveFilesWidgetProps {
  widget: Widget
  data: unknown
}

interface DriveFilesData {
  files: Array<{
    id: string
    name: string
    mimeType: string
    size?: string
    webViewLink?: string
    webContentLink?: string
    createdTime?: string
    modifiedTime?: string
    ownerEmail?: string
    isShared?: boolean
  }>
  count: number
}

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File
  if (mimeType.includes('folder')) return Folder
  if (mimeType.includes('image')) return Image
  if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return FileSpreadsheet
  if (mimeType.includes('document') || mimeType.includes('word')) return FileText
  return File
}

const formatFileSize = (size?: string) => {
  if (!size) return ''
  const bytes = parseInt(size, 10)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function DriveFilesWidget({ widget, data }: DriveFilesWidgetProps) {
  const integrationId = (widget.config as any)?.integrationId as string | undefined
  const limit = (widget.config as any)?.limit as number || 10

  const { data: filesData, isLoading, error, refetch } = useDriveFiles(integrationId || '', {
    limit,
  })

  // Use provided data or fetched data
  const files = ((data as DriveFilesData)?.files) || filesData?.files || []
  const isLoadingData = !data && isLoading
  const hasError = !data && error

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Folder className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load Drive files</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Folder className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-4">No recent files</p>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://drive.google.com/drive/u/0/my-drive"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          <span className="font-semibold">Recent Files</span>
          {files.length > 0 && (
            <Badge variant="secondary">{files.length}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mimeType)
            const modifiedDate = file.modifiedTime ? new Date(file.modifiedTime) : null

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors group"
              >
                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate mb-1">
                    {file.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {file.size && <span>{formatFileSize(file.size)}</span>}
                    {modifiedDate && (
                      <span>
                        {formatDistanceToNow(modifiedDate, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                {file.webViewLink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Drive"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1" size="sm" asChild>
          <Link
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Drive
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://drive.google.com/drive/u/0/my-drive"
            target="_blank"
            rel="noopener noreferrer"
            title="Upload file"
          >
            <Upload className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}







