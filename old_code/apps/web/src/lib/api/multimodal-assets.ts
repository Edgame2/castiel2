/**
 * Multi-Modal Assets API Client
 * Handles communication with the multi-modal assets backend
 */

import apiClient from './client'
import { getAuthToken } from './client'

export type AssetType = 'image' | 'audio' | 'video' | 'document'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface MultimodalAsset {
  id: string
  tenantId: string
  userId: string
  assetType: AssetType
  url: string
  fileName: string
  mimeType: string
  size: number
  extracted?: {
    text?: string
    description?: string
    entities?: string[]
    tags?: string[]
    metadata?: Record<string, any>
  }
  analysis?: {
    sentiment?: string
    topics?: string[]
    summary?: string
    keyInsights?: string[]
    objects?: Array<{
      label: string
      confidence: number
      boundingBox?: {
        x: number
        y: number
        width: number
        height: number
      }
    }>
    colors?: string[]
    faces?: number
    nsfw?: boolean
    transcription?: string
    segments?: Array<{
      start: number
      end: number
      text: string
      speaker?: string
    }>
    language?: string
    confidence?: number
  }
  embedding?: number[]
  attachedTo?: {
    conversationId?: string
    messageId?: string
    shardId?: string
    insightId?: string
  }
  processingStatus: ProcessingStatus
  processingError?: string
  processedAt?: string
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
}

export interface UploadAssetResponse {
  assetId: string
  url: string
  processingStatus: ProcessingStatus
  estimatedCompletionTime?: number
}

export interface ListAssetsResponse {
  assets: MultimodalAsset[]
}

/**
 * Multi-Modal Assets API
 */
export const multimodalAssetsApi = {
  /**
   * Upload a multi-modal asset
   */
  async uploadAsset(
    file: File,
    options: {
      assetType: AssetType
      conversationId?: string
      messageId?: string
      shardId?: string
      insightId?: string
      autoAnalyze?: boolean
    }
  ): Promise<UploadAssetResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams()
    params.append('assetType', options.assetType)
    if (options.conversationId) params.append('conversationId', options.conversationId)
    if (options.messageId) params.append('messageId', options.messageId)
    if (options.shardId) params.append('shardId', options.shardId)
    if (options.insightId) params.append('insightId', options.insightId)
    if (options.autoAnalyze !== undefined) {
      params.append('autoAnalyze', options.autoAnalyze ? 'true' : 'false')
    }

    const response = await apiClient.post<UploadAssetResponse>(
      `/api/v1/insights/assets/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  },

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<MultimodalAsset> {
    const response = await apiClient.get<MultimodalAsset>(`/api/v1/insights/assets/${assetId}`)
    return response.data
  },

  /**
   * List assets
   */
  async listAssets(options?: {
    assetType?: AssetType
    conversationId?: string
    messageId?: string
    shardId?: string
    limit?: number
    offset?: number
  }): Promise<ListAssetsResponse> {
    const params = new URLSearchParams()
    if (options?.assetType) params.append('assetType', options.assetType)
    if (options?.conversationId) params.append('conversationId', options.conversationId)
    if (options?.messageId) params.append('messageId', options.messageId)
    if (options?.shardId) params.append('shardId', options.shardId)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

    const response = await apiClient.get<ListAssetsResponse>(
      `/api/v1/insights/assets?${params.toString()}`
    )
    return response.data
  },

  /**
   * Process a pending asset
   */
  async processAsset(assetId: string): Promise<MultimodalAsset> {
    const response = await apiClient.post<MultimodalAsset>(`/api/v1/insights/assets/${assetId}/process`)
    return response.data
  },

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    await apiClient.delete(`/api/v1/insights/assets/${assetId}`)
  },
}









