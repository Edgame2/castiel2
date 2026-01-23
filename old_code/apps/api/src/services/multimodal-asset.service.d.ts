/**
 * Multi-Modal Asset Service
 * Handles storage and management of images, audio, video, and documents for AI insights
 */
import { CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { MultimodalAsset, AssetType, UploadAssetRequest, UploadAssetResponse } from '../types/multimodal-asset.types.js';
import { AzureBlobStorageService } from './azure-blob-storage.service.js';
import { ImageAnalysisService } from './multimodal/image-analysis.service.js';
import { AudioTranscriptionService } from './multimodal/audio-transcription.service.js';
import { DocumentProcessingService } from './multimodal/document-processing.service.js';
import { VideoProcessingService } from './multimodal/video-processing.service.js';
export declare class MultimodalAssetService {
    private client;
    private database;
    private container;
    private blobStorageService;
    private monitoring;
    private imageAnalysisService?;
    private audioTranscriptionService?;
    private documentProcessingService?;
    private videoProcessingService?;
    constructor(cosmosClient: CosmosClient, blobStorageService: AzureBlobStorageService, monitoring: IMonitoringProvider, imageAnalysisService?: ImageAnalysisService, audioTranscriptionService?: AudioTranscriptionService, documentProcessingService?: DocumentProcessingService, videoProcessingService?: VideoProcessingService);
    /**
     * Upload and store a multi-modal asset
     */
    uploadAsset(request: UploadAssetRequest, tenantId: string, userId: string): Promise<UploadAssetResponse>;
    /**
     * Get asset by ID
     */
    getAsset(assetId: string, tenantId: string): Promise<MultimodalAsset | null>;
    /**
     * Update asset
     */
    updateAsset(assetId: string, tenantId: string, updates: Partial<MultimodalAsset>): Promise<MultimodalAsset>;
    /**
     * List assets for a tenant
     */
    listAssets(tenantId: string, options?: {
        assetType?: AssetType;
        attachedTo?: {
            conversationId?: string;
            messageId?: string;
            shardId?: string;
        };
        limit?: number;
        offset?: number;
    }): Promise<MultimodalAsset[]>;
    /**
     * Delete asset
     */
    deleteAsset(assetId: string, tenantId: string): Promise<void>;
    /**
     * Process a pending asset (analyze image, transcribe audio, etc.)
     */
    processAsset(assetId: string, tenantId: string): Promise<MultimodalAsset>;
    /**
     * Estimate processing time based on asset type and size
     */
    private estimateProcessingTime;
}
//# sourceMappingURL=multimodal-asset.service.d.ts.map