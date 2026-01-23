/**
 * Multi-Modal Asset Upload Component
 * Handles uploading images, audio, video, and documents for AI insights
 */

"use client"

import { useState, useCallback } from 'react'
import { Upload, X, Image, Music, Video, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useUploadMultimodalAsset } from '@/hooks/use-multimodal-assets'
import { AssetType } from '@/lib/api/multimodal-assets'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MultimodalAssetUploadProps {
  conversationId?: string
  messageId?: string
  onAssetUploaded?: (assetId: string, url: string) => void
  className?: string
}

/**
 * Determine asset type from file
 */
function getAssetType(file: File): AssetType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return 'document'
}

/**
 * Get icon for asset type
 */
function getAssetTypeIcon(type: AssetType) {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4" />
    case 'audio':
      return <Music className="h-4 w-4" />
    case 'video':
      return <Video className="h-4 w-4" />
    case 'document':
      return <FileText className="h-4 w-4" />
  }
}

/**
 * Multi-Modal Asset Upload Component
 */
export function MultimodalAssetUpload({
  conversationId,
  messageId,
  onAssetUploaded,
  className,
}: MultimodalAssetUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const uploadAsset = useUploadMultimodalAsset()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejected) => {
        const errors = rejected.errors.map((e: any) => e.message).join(', ')
        toast.error(`${rejected.file.name}: ${errors}`)
      })
    }

    // Add accepted files
    setSelectedFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'audio/*': [],
      'video/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
      'application/vnd.ms-powerpoint': [],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': [],
      'text/*': [],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  })

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const assetType = getAssetType(file)
        const result = await uploadAsset.mutateAsync({
          file,
          options: {
            assetType,
            conversationId,
            messageId,
            autoAnalyze: true, // Auto-analyze by default
          },
        })

        onAssetUploaded?.(result.assetId, result.url)
        return result
      })

      await Promise.all(uploadPromises)
      
      // Clear selected files and close dialog
      setSelectedFiles([])
      setIsOpen(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("shrink-0 text-muted-foreground", className)}
        >
          <Upload className="h-5 w-5" />
          <span className="sr-only">Upload file</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload images, audio, video, or documents to include in your conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-12 w-12 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-muted-foreground">Drop the files here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Drag & drop files here, or click to select</p>
                  <p className="text-xs text-muted-foreground">
                    Supported: Images, Audio, Video, PDF, Word, Excel, PowerPoint, Text files
                  </p>
                  <p className="text-xs text-muted-foreground">Max 100MB per file</p>
                </>
              )}
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Files ({selectedFiles.length})</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const assetType = getAssetType(file)
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="shrink-0">
                        {getAssetTypeIcon(assetType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {assetType}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedFiles([])
              setIsOpen(false)
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploadAsset.isPending}
          >
            {uploadAsset.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}









