/**
 * Multi-Modal Asset Display Component
 * Displays uploaded assets (images, audio, video, documents) in chat messages
 */

"use client"

import { useState } from 'react'
import { Image, Music, Video, FileText, Loader2, ExternalLink, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMultimodalAsset } from '@/hooks/use-multimodal-assets'
import { MultimodalAsset, AssetType, ProcessingStatus } from '@/lib/api/multimodal-assets'
import { cn } from '@/lib/utils'

interface MultimodalAssetDisplayProps {
  assetId: string
  className?: string
  showDetails?: boolean
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
 * Get status badge color
 */
function getStatusBadgeVariant(status: ProcessingStatus) {
  switch (status) {
    case 'completed':
      return 'default'
    case 'processing':
      return 'secondary'
    case 'pending':
      return 'outline'
    case 'failed':
      return 'destructive'
  }
}

/**
 * Multi-Modal Asset Display Component
 */
export function MultimodalAssetDisplay({
  assetId,
  className,
  showDetails = false,
}: MultimodalAssetDisplayProps) {
  const { data: asset, isLoading, error } = useMultimodalAsset(assetId)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // If assetId is not provided, return null
  if (!assetId) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Loading asset...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !asset) {
    return (
      <Card className={cn("p-4 border-destructive", className)}>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm text-destructive">Failed to load asset</p>
          </div>
        </div>
      </Card>
    )
  }

  const renderAssetContent = () => {
    switch (asset.assetType) {
      case 'image':
        return (
          <div className="relative w-full max-w-md">
            <img
              src={asset.url}
              alt={asset.analysis?.summary || asset.fileName}
              className="rounded-lg w-full h-auto max-h-96 object-contain"
            />
            {asset.analysis?.summary && showDetails && (
              <div className="mt-2 text-sm text-muted-foreground">
                {asset.analysis.summary}
              </div>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className="space-y-2">
            <audio
              src={asset.url}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {asset.analysis?.transcription && showDetails && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Transcription:</p>
                <p className="text-sm text-muted-foreground">{asset.analysis.transcription}</p>
              </div>
            )}
          </div>
        )

      case 'video':
        return (
          <div className="space-y-2">
            <video
              src={asset.url}
              controls
              className="w-full max-w-md rounded-lg"
            />
            {asset.analysis?.summary && showDetails && (
              <div className="mt-2 text-sm text-muted-foreground">
                {asset.analysis.summary}
              </div>
            )}
          </div>
        )

      case 'document':
        return (
          <div className="space-y-2">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(asset.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(asset.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
            </Card>
            {asset.extracted?.text && showDetails && (
              <div className="mt-2 p-3 bg-muted rounded-lg max-h-60 overflow-y-auto">
                <p className="text-sm font-medium mb-1">Extracted Text:</p>
                <p className="text-sm text-muted-foreground line-clamp-6">
                  {asset.extracted.text}
                </p>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <Card className={cn("p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getAssetTypeIcon(asset.assetType)}
          <span className="text-sm font-medium capitalize">{asset.assetType}</span>
          <Badge variant={getStatusBadgeVariant(asset.processingStatus)}>
            {asset.processingStatus}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(asset.url, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Asset Content */}
      {renderAssetContent()}

      {/* Analysis Details */}
      {showDetails && asset.analysis && (
        <div className="space-y-2 pt-2 border-t">
          {asset.analysis.keyInsights && asset.analysis.keyInsights.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Key Insights:</p>
              <div className="flex flex-wrap gap-1">
                {asset.analysis.keyInsights.map((insight, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {insight}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {asset.analysis.topics && asset.analysis.topics.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Topics:</p>
              <div className="flex flex-wrap gap-1">
                {asset.analysis.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

