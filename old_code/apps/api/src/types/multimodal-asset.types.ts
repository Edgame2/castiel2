/**
 * Multi-Modal Asset Types
 * Types for handling images, audio, video, and documents in AI insights
 */

export type AssetType = 'image' | 'audio' | 'video' | 'document';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MultimodalAsset {
  id: string;
  tenantId: string;
  userId: string;
  
  // Asset details
  assetType: AssetType;
  url: string;
  fileName: string;
  mimeType: string;
  size: number; // bytes
  
  // Extracted content
  extracted?: {
    text?: string;              // OCR or transcription
    description?: string;        // AI-generated description
    entities?: string[];         // Detected entities
    tags?: string[];
    metadata?: Record<string, any>;
  };
  
  // Analysis
  analysis?: {
    sentiment?: string;
    topics?: string[];
    summary?: string;
    keyInsights?: string[];
    // Image-specific
    objects?: Array<{
      label: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    colors?: string[];
    faces?: number;
    nsfw?: boolean;
    // Audio-specific
    transcription?: string;
    segments?: Array<{
      start: number; // seconds
      end: number;
      text: string;
      speaker?: string;
    }>;
    language?: string;
    confidence?: number;
  };
  
  // Vector embedding (for search)
  embedding?: number[];
  
  // References
  attachedTo?: {
    conversationId?: string;
    messageId?: string;
    shardId?: string;
    insightId?: string;
  };
  
  // Processing
  processingStatus: ProcessingStatus;
  processingError?: string;
  processedAt?: Date;
  
  // Metadata
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
  
  // Cosmos DB fields
  type: 'multimodal_asset';
  partitionKey: string; // tenantId
}

export interface UploadAssetRequest {
  file: Buffer;
  fileName: string;
  mimeType: string;
  assetType: AssetType;
  attachTo?: {
    conversationId?: string;
    messageId?: string;
    shardId?: string;
    insightId?: string;
  };
  autoAnalyze?: boolean; // Default: true
}

export interface UploadAssetResponse {
  assetId: string;
  url: string;
  processingStatus: ProcessingStatus;
  estimatedCompletionTime?: number; // seconds
}

export interface ImageAnalysisResponse {
  description: string;
  objects: Array<{
    label: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text?: string; // OCR
  tags: string[];
  colors: string[];
  faces?: number;
  nsfw: boolean;
}

export interface TranscriptionRequest {
  language?: string; // Auto-detect if not provided
  speakerDiarization?: boolean;
  timestamp?: boolean;
}

export interface TranscriptionResponse {
  transcription: string;
  segments?: Array<{
    start: number; // seconds
    end: number;
    text: string;
    speaker?: string;
  }>;
  language: string;
  confidence: number;
}









