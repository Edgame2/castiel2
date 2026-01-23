/**
 * Multi-Modal Asset Service
 * Handles storage and management of images, audio, video, and documents for AI insights
 */
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
export class MultimodalAssetService {
    client;
    database;
    container;
    blobStorageService;
    monitoring;
    imageAnalysisService;
    audioTranscriptionService;
    documentProcessingService;
    videoProcessingService;
    constructor(cosmosClient, blobStorageService, monitoring, imageAnalysisService, audioTranscriptionService, documentProcessingService, videoProcessingService) {
        this.client = cosmosClient;
        this.database = this.client.database(config.cosmosDb.databaseId);
        this.container = this.database.container(config.cosmosDb.containers.media);
        this.blobStorageService = blobStorageService;
        this.monitoring = monitoring;
        this.imageAnalysisService = imageAnalysisService;
        this.audioTranscriptionService = audioTranscriptionService;
        this.documentProcessingService = documentProcessingService;
        this.videoProcessingService = videoProcessingService;
    }
    /**
     * Upload and store a multi-modal asset
     */
    async uploadAsset(request, tenantId, userId) {
        const startTime = Date.now();
        const assetId = uuidv4();
        try {
            // Upload file to blob storage
            // Use the existing uploadFile method with assetId as the shardId for path purposes
            const uploadResult = await this.blobStorageService.uploadFile(tenantId, assetId, // Using assetId as shardId for path purposes
            1, // version
            request.fileName, request.file, {
                mimeType: request.mimeType,
                metadata: {
                    tenantId,
                    userId,
                    assetId,
                    assetType: request.assetType,
                },
            }, false // Don't use quarantine for assets
            );
            // Create asset document in Cosmos DB
            const asset = {
                id: assetId,
                tenantId,
                userId,
                assetType: request.assetType,
                url: uploadResult.url,
                fileName: request.fileName,
                mimeType: request.mimeType,
                size: request.file.length,
                attachedTo: request.attachTo,
                processingStatus: request.autoAnalyze !== false ? 'pending' : 'completed',
                uploadedBy: userId,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                type: 'multimodal_asset',
                partitionKey: tenantId,
            };
            // Store in Cosmos DB
            await this.container.items.create(asset);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('multimodal_asset_uploaded', {
                assetId,
                assetType: request.assetType,
                size: request.file.length,
                durationMs: duration,
                tenantId,
            });
            return {
                assetId,
                url: uploadResult.url,
                processingStatus: asset.processingStatus,
                // Estimate processing time based on asset type and size
                estimatedCompletionTime: request.autoAnalyze !== false
                    ? this.estimateProcessingTime(request.assetType, request.file.length)
                    : undefined,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'multimodal_asset.upload',
                assetType: request.assetType,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get asset by ID
     */
    async getAsset(assetId, tenantId) {
        try {
            const { resource } = await this.container.item(assetId, tenantId).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            this.monitoring.trackException(error, {
                operation: 'multimodal_asset.get',
                assetId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Update asset
     */
    async updateAsset(assetId, tenantId, updates) {
        try {
            const asset = await this.getAsset(assetId, tenantId);
            if (!asset) {
                throw new Error(`Asset ${assetId} not found`);
            }
            const updated = {
                ...asset,
                ...updates,
                updatedAt: new Date(),
            };
            await this.container.item(assetId, tenantId).replace(updated);
            this.monitoring.trackEvent('multimodal_asset_updated', {
                assetId,
                tenantId,
                updates: Object.keys(updates),
            });
            return updated;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'multimodal_asset.update',
                assetId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * List assets for a tenant
     */
    async listAssets(tenantId, options) {
        try {
            let query = 'SELECT * FROM c WHERE c.partitionKey = @tenantId AND c.type = "multimodal_asset"';
            const parameters = [{ name: '@tenantId', value: tenantId }];
            if (options?.assetType) {
                query += ' AND c.assetType = @assetType';
                parameters.push({ name: '@assetType', value: options.assetType });
            }
            if (options?.attachedTo?.conversationId) {
                query += ' AND c.attachedTo.conversationId = @conversationId';
                parameters.push({ name: '@conversationId', value: options.attachedTo.conversationId });
            }
            if (options?.attachedTo?.messageId) {
                query += ' AND c.attachedTo.messageId = @messageId';
                parameters.push({ name: '@messageId', value: options.attachedTo.messageId });
            }
            if (options?.attachedTo?.shardId) {
                query += ' AND c.attachedTo.shardId = @shardId';
                parameters.push({ name: '@shardId', value: options.attachedTo.shardId });
            }
            query += ' ORDER BY c.uploadedAt DESC';
            const limit = options?.limit || 100;
            const offset = options?.offset || 0;
            const { resources } = await this.container.items
                .query({
                query,
                parameters,
            })
                .fetchNext();
            return resources.slice(offset, offset + limit);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'multimodal_asset.list',
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Delete asset
     */
    async deleteAsset(assetId, tenantId) {
        try {
            await this.container.item(assetId, tenantId).delete();
            this.monitoring.trackEvent('multimodal_asset_deleted', {
                assetId,
                tenantId,
            });
        }
        catch (error) {
            if (error.code !== 404) {
                this.monitoring.trackException(error, {
                    operation: 'multimodal_asset.delete',
                    assetId,
                    tenantId,
                });
                throw error;
            }
        }
    }
    /**
     * Process a pending asset (analyze image, transcribe audio, etc.)
     */
    async processAsset(assetId, tenantId) {
        const asset = await this.getAsset(assetId, tenantId);
        if (!asset) {
            throw new Error(`Asset ${assetId} not found`);
        }
        if (asset.processingStatus !== 'pending') {
            return asset; // Already processed or processing
        }
        try {
            // Update status to processing
            await this.updateAsset(assetId, tenantId, {
                processingStatus: 'processing',
            });
            // Process based on asset type
            if (asset.assetType === 'image' && this.imageAnalysisService) {
                const analysis = await this.imageAnalysisService.analyzeImage({
                    imageUrl: asset.url,
                    includeOCR: true,
                    includeObjects: true,
                    includeDescription: true,
                    includeModeration: true,
                });
                // Update asset with analysis results
                const updated = await this.updateAsset(assetId, tenantId, {
                    processingStatus: 'completed',
                    extracted: {
                        text: analysis.text,
                        description: analysis.description,
                        tags: analysis.tags,
                        metadata: {
                            colors: analysis.colors,
                            faces: analysis.faces,
                        },
                    },
                    analysis: {
                        objects: analysis.objects,
                        nsfw: analysis.nsfw,
                        summary: analysis.description.substring(0, 200), // First 200 chars as summary
                        keyInsights: analysis.tags.slice(0, 5), // Top 5 tags as insights
                    },
                    processedAt: new Date(),
                });
                this.monitoring.trackEvent('multimodal_asset_processed', {
                    assetId,
                    assetType: asset.assetType,
                    tenantId,
                });
                return updated;
            }
            if (asset.assetType === 'audio' && this.audioTranscriptionService) {
                const transcription = await this.audioTranscriptionService.transcribeAudio(asset.url, {
                    language: undefined, // Auto-detect
                    speakerDiarization: false, // Not supported by Whisper API
                    timestamp: true, // Request timestamps
                });
                // Update asset with transcription results
                const updated = await this.updateAsset(assetId, tenantId, {
                    processingStatus: 'completed',
                    extracted: {
                        text: transcription.transcription,
                        metadata: {
                            language: transcription.language,
                            confidence: transcription.confidence,
                        },
                    },
                    analysis: {
                        transcription: transcription.transcription,
                        segments: transcription.segments,
                        language: transcription.language,
                        confidence: transcription.confidence,
                        summary: transcription.transcription.substring(0, 200), // First 200 chars as summary
                    },
                    processedAt: new Date(),
                });
                this.monitoring.trackEvent('multimodal_asset_processed', {
                    assetId,
                    assetType: asset.assetType,
                    tenantId,
                });
                return updated;
            }
            if (asset.assetType === 'document' && this.documentProcessingService) {
                const processing = await this.documentProcessingService.processDocument(asset.url);
                // Update asset with processing results
                const updated = await this.updateAsset(assetId, tenantId, {
                    processingStatus: 'completed',
                    extracted: {
                        text: processing.text,
                        description: processing.summary,
                        entities: processing.entities,
                        metadata: {
                            title: processing.metadata?.title,
                            author: processing.metadata?.author,
                            subject: processing.metadata?.subject,
                            keywords: processing.metadata?.keywords,
                            language: processing.metadata?.language,
                            pageCount: processing.metadata?.pageCount || processing.pages,
                        },
                    },
                    analysis: {
                        summary: processing.summary,
                        topics: processing.entities?.slice(0, 10), // Top entities as topics
                        keyInsights: processing.structure?.headings?.slice(0, 5).map(h => h.text) || [],
                    },
                    processedAt: new Date(),
                });
                this.monitoring.trackEvent('multimodal_asset_processed', {
                    assetId,
                    assetType: asset.assetType,
                    tenantId,
                });
                return updated;
            }
            if (asset.assetType === 'video' && this.videoProcessingService) {
                const processing = await this.videoProcessingService.processVideo(asset.url);
                // Update asset with processing results
                const updated = await this.updateAsset(assetId, tenantId, {
                    processingStatus: 'completed',
                    extracted: {
                        text: processing.transcription?.text,
                        description: processing.summary,
                        metadata: {
                            language: processing.transcription?.language,
                            confidence: processing.transcription?.confidence,
                            duration: processing.duration,
                        },
                    },
                    analysis: {
                        transcription: processing.transcription?.text,
                        segments: processing.transcription?.segments,
                        language: processing.transcription?.language,
                        confidence: processing.transcription?.confidence,
                        summary: processing.summary,
                        keyInsights: processing.frames?.map(f => f.description).slice(0, 5) || [],
                    },
                    processedAt: new Date(),
                });
                this.monitoring.trackEvent('multimodal_asset_processed', {
                    assetId,
                    assetType: asset.assetType,
                    tenantId,
                });
                return updated;
            }
            // For other asset types or if video processing service is not available
            // Mark as completed without analysis
            return await this.updateAsset(assetId, tenantId, {
                processingStatus: 'completed',
                processedAt: new Date(),
            });
        }
        catch (error) {
            // Mark as failed
            await this.updateAsset(assetId, tenantId, {
                processingStatus: 'failed',
                processingError: error.message,
            });
            this.monitoring.trackException(error, {
                operation: 'multimodal_asset.process',
                assetId,
                assetType: asset.assetType,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Estimate processing time based on asset type and size
     */
    estimateProcessingTime(assetType, sizeBytes) {
        // Rough estimates in seconds
        const baseTime = 5; // Base processing time
        switch (assetType) {
            case 'image':
                // Image analysis: ~2-10 seconds depending on size
                return baseTime + Math.min(sizeBytes / (1024 * 1024) * 2, 10);
            case 'audio':
                // Audio transcription: ~duration of audio + processing overhead
                // Estimate 1 minute of audio = 60 seconds processing
                return baseTime + Math.min(sizeBytes / (1024 * 1024) * 30, 300);
            case 'video':
                // Video processing: similar to audio but longer
                return baseTime + Math.min(sizeBytes / (1024 * 1024) * 60, 600);
            case 'document':
                // Document extraction: ~5-30 seconds
                return baseTime + Math.min(sizeBytes / (1024 * 1024) * 5, 30);
            default:
                return baseTime;
        }
    }
}
//# sourceMappingURL=multimodal-asset.service.js.map