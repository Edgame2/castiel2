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
    assetType: AssetType;
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
    extracted?: {
        text?: string;
        description?: string;
        entities?: string[];
        tags?: string[];
        metadata?: Record<string, any>;
    };
    analysis?: {
        sentiment?: string;
        topics?: string[];
        summary?: string;
        keyInsights?: string[];
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
        transcription?: string;
        segments?: Array<{
            start: number;
            end: number;
            text: string;
            speaker?: string;
        }>;
        language?: string;
        confidence?: number;
    };
    embedding?: number[];
    attachedTo?: {
        conversationId?: string;
        messageId?: string;
        shardId?: string;
        insightId?: string;
    };
    processingStatus: ProcessingStatus;
    processingError?: string;
    processedAt?: Date;
    uploadedBy: string;
    uploadedAt: Date;
    updatedAt: Date;
    type: 'multimodal_asset';
    partitionKey: string;
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
    autoAnalyze?: boolean;
}
export interface UploadAssetResponse {
    assetId: string;
    url: string;
    processingStatus: ProcessingStatus;
    estimatedCompletionTime?: number;
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
    text?: string;
    tags: string[];
    colors: string[];
    faces?: number;
    nsfw: boolean;
}
export interface TranscriptionRequest {
    language?: string;
    speakerDiarization?: boolean;
    timestamp?: boolean;
}
export interface TranscriptionResponse {
    transcription: string;
    segments?: Array<{
        start: number;
        end: number;
        text: string;
        speaker?: string;
    }>;
    language: string;
    confidence: number;
}
//# sourceMappingURL=multimodal-asset.types.d.ts.map