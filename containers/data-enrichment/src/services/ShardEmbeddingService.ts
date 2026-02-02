/**
 * Shard Embedding Service
 * Generates embeddings for shards using templates and field weighting
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { publishEnrichmentEvent } from '../events/publishers/EnrichmentEventPublisher';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromShard } from '../utils/textExtraction';
import * as crypto from 'crypto';
import { EmbeddingTemplateService } from './EmbeddingTemplateService';

export interface EmbeddingGenerationResult {
  shardId: string;
  vectorsGenerated: number;
  templateUsed: string;
  isDefaultTemplate: boolean;
  processingTimeMs: number;
  tokensUsed?: number;
}

export interface RegenerationResult {
  shardTypeId: string;
  totalShards: number;
  processed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface EmbeddingStats {
  tenantId: string;
  totalShards: number;
  shardsWithEmbeddings: number;
  coveragePercentage: number;
  averageVectorsPerShard: number;
  modelDistribution: Record<string, number>;
}

export class ShardEmbeddingService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private embeddingTemplateService: EmbeddingTemplateService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    // Initialize embedding template service
    this.embeddingTemplateService = new EmbeddingTemplateService();
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Generate embeddings for a shard
   */
  async generateEmbeddingsForShard(
    shardId: string,
    tenantId: string,
    options?: {
      forceRegenerate?: boolean;
      maxChunks?: number;
    }
  ): Promise<EmbeddingGenerationResult> {
    const startTime = Date.now();

    try {
      const token = this.getServiceToken(tenantId);

      // Get shard
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!shard) {
        throw new Error(`Shard not found: ${shardId}`);
      }

      // Filter: Only vectorize multi-modal content shards (Document, Email, Meeting, Message, CalendarEvent)
      // Do NOT vectorize CRM shards (Opportunity, Account, Contact)
      const vectorizableShardTypes = ['document', 'email', 'meeting', 'message', 'calendarevent'];
      const shardTypeLower = shard.shardTypeId?.toLowerCase();

      if (!shardTypeLower || !vectorizableShardTypes.includes(shardTypeLower)) {
        log.debug('Skipping vectorization for non-vectorizable shard type', {
          shardId,
          shardTypeId: shard.shardTypeId,
          tenantId,
          service: 'data-enrichment',
        });
        return {
          shardId,
          vectorsGenerated: 0,
          templateUsed: 'none',
          isDefaultTemplate: false,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Check if already has recent vectors
      if (!options?.forceRegenerate && this.hasRecentVectors(shard)) {
        log.info('Shard already has recent vectors', {
          shardId,
          tenantId,
          service: 'data-enrichment',
        });

        return {
          shardId,
          vectorsGenerated: 0,
          templateUsed: 'none',
          isDefaultTemplate: false,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Get shard type for template (if available)
      let shardType: any = null;
      if (shard.shardTypeId) {
        try {
          shardType = await this.shardManagerClient.get<any>(
            `/api/v1/shard-types/${shard.shardTypeId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        } catch (error) {
          log.warn('Failed to get shard type, using default template', {
            shardTypeId: shard.shardTypeId,
            error,
            service: 'data-enrichment',
          });
        }
      }

      // Get embedding template (custom or default)
      const template = this.embeddingTemplateService.getTemplate(shardType);

      // Extract text using template (with field weighting)
      const extractedText = this.embeddingTemplateService.extractText(shard, template, {
        maxTextLength: 8000,
      });

      if (!extractedText || extractedText.trim().length < 10) {
        log.warn('Insufficient text for embedding', {
          shardId,
          tenantId,
          service: 'data-enrichment',
        });

        return {
          shardId,
          vectorsGenerated: 0,
          templateUsed: template.name,
          isDefaultTemplate: template.isDefault,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Preprocess text (chunking, normalization)
      const { text: processedText, chunks } = this.embeddingTemplateService.preprocessText(
        extractedText,
        template.preprocessing
      );

      // Calculate content hash for deduplication
      const contentHash = this.calculateContentHash(processedText, template.id);

      // Check if content hash matches existing
      if (!options?.forceRegenerate && this.hasMatchingContentHash(shard, contentHash)) {
        log.info('Shard content unchanged, skipping embedding generation', {
          shardId,
          tenantId,
          service: 'data-enrichment',
        });

        return {
          shardId,
          vectorsGenerated: 0,
          templateUsed: template.name,
          isDefaultTemplate: template.isDefault,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Get model ID based on template and shard type
      const modelId = this.embeddingTemplateService.getModelId(template, shard.shardTypeName);

      // Generate embedding(s) - one per chunk if chunking enabled
      const textsToEmbed = chunks && chunks.length > 0 ? chunks : [processedText];
      const embeddings: number[][] = [];

      for (const textToEmbed of textsToEmbed) {
        try {
          const embeddingResponse = await this.embeddingsClient.post<any>(
            '/api/v1/embeddings',
            {
              text: textToEmbed,
              model: modelId,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );

          if (!embeddingResponse.embedding || !Array.isArray(embeddingResponse.embedding)) {
            throw new Error('Failed to generate embedding');
          }

          // Normalize embedding using template
          const normalized = this.embeddingTemplateService.normalizeEmbedding(
            embeddingResponse.embedding,
            template.normalization
          );

          embeddings.push(normalized);
        } catch (error: any) {
          log.error('Failed to generate embedding for chunk', error, {
            shardId,
            tenantId,
            chunkIndex: textsToEmbed.indexOf(textToEmbed),
            service: 'data-enrichment',
          });
          // Continue with other chunks
        }
      }

      if (embeddings.length === 0) {
        throw new Error('Failed to generate any embeddings');
      }

      // Create vector objects for all embeddings
      const vectors = embeddings.map((embedding, index) => ({
        id: uuidv4(),
        field: chunks && chunks.length > 0 ? `chunk_${index}` : 'all',
        model: modelId,
        dimensions: embedding.length,
        embedding,
        createdAt: new Date(),
        chunkText: chunks && chunks[index] ? chunks[index] : undefined,
      }));

      // Update shard with embeddings
      await this.shardManagerClient.put<any>(
        `/api/v1/shards/${shardId}`,
        {
          ...shard,
          vectors: vectors,
          metadata: {
            ...shard.metadata,
            embeddingContentHash: contentHash,
            embeddingTemplateId: template.id,
            embeddingTemplateName: template.name,
            embeddingGeneratedAt: new Date().toISOString(),
            embeddingModel: modelId,
            embeddingDimensions: embeddings[0]?.length || 0,
          },
          updatedAt: new Date(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const processingTimeMs = Date.now() - startTime;

      log.info('Embeddings generated for shard', {
        shardId,
        tenantId,
        vectorsGenerated: embeddings.length,
        templateUsed: template.name,
        isDefaultTemplate: template.isDefault,
        model: modelId,
        processingTimeMs,
        service: 'data-enrichment',
      });

      // Publish event
      await publishEnrichmentEvent('shard.embedding.generated', tenantId, {
        shardId,
        vectorsGenerated: embeddings.length,
        templateUsed: template.name,
        model: modelId,
      });

      return {
        shardId,
        vectorsGenerated: embeddings.length,
        templateUsed: template.name,
        isDefaultTemplate: template.isDefault,
        processingTimeMs,
        tokensUsed: Math.ceil(processedText.length / 4), // Rough estimate
      };
    } catch (error: any) {
      log.error('Failed to generate embeddings for shard', error, {
        shardId,
        tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple shards
   */
  async batchGenerateEmbeddings(
    shardIds: string[],
    tenantId: string,
    options?: {
      forceRegenerate?: boolean;
      concurrency?: number;
    }
  ): Promise<{ processed: number; failed: number; skipped: number }> {
    const concurrency = options?.concurrency || 5;
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches
    for (let i = 0; i < shardIds.length; i += concurrency) {
      const batch = shardIds.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((shardId) =>
          this.generateEmbeddingsForShard(shardId, tenantId, options).catch((error) => {
            log.error('Batch embedding generation failed', error, {
              shardId,
              tenantId,
              service: 'data-enrichment',
            });
            throw error;
          })
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.vectorsGenerated > 0) {
            processed++;
          } else {
            skipped++;
          }
        } else {
          failed++;
        }
      }
    }

    return { processed, failed, skipped };
  }

  /**
   * Regenerate embeddings for all shards of a type
   */
  async regenerateEmbeddingsForShardType(
    shardTypeId: string,
    tenantId: string,
    options?: {
      forceRegenerate?: boolean;
    }
  ): Promise<RegenerationResult> {
    const startTime = Date.now();

    try {
      const token = this.getServiceToken(tenantId);

      // Get all shards of this type
      const shardsResponse = await this.shardManagerClient.get<any>(
        `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shards = Array.isArray(shardsResponse) ? shardsResponse : shardsResponse.shards || [];
      const shardIds = shards.map((s: any) => s.id);

      // Process in batches
      const batchSize = 10;
      let processed = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < shardIds.length; i += batchSize) {
        const batch = shardIds.slice(i, i + batchSize);
        const results = await this.batchGenerateEmbeddings(batch, tenantId, options);

        processed += results.processed;
        failed += results.failed;
        skipped += results.skipped;
      }

      const durationMs = Date.now() - startTime;

      return {
        shardTypeId,
        totalShards: shards.length,
        processed,
        failed,
        skipped,
        durationMs,
      };
    } catch (error: any) {
      log.error('Failed to regenerate embeddings for shard type', error, {
        shardTypeId,
        tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(tenantId: string): Promise<EmbeddingStats> {
    try {
      const token = this.getServiceToken(tenantId);

      // Get all shards (simplified - would need pagination in production)
      const shardsResponse = await this.shardManagerClient.get<any>(
        `/api/v1/shards?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const shards = Array.isArray(shardsResponse) ? shardsResponse : shardsResponse.shards || [];
      const totalShards = shards.length;
      const shardsWithEmbeddings = shards.filter((s: any) => s.vectors && s.vectors.length > 0).length;

      // Calculate average vectors per shard
      const totalVectors = shards.reduce((sum: number, s: any) => sum + (s.vectors?.length || 0), 0);
      const averageVectorsPerShard = totalShards > 0 ? totalVectors / totalShards : 0;

      // Model distribution
      const modelDistribution: Record<string, number> = {};
      for (const shard of shards) {
        if (shard.vectors && shard.vectors.length > 0) {
          for (const vector of shard.vectors) {
            const model = vector.model || 'unknown';
            modelDistribution[model] = (modelDistribution[model] || 0) + 1;
          }
        }
      }

      return {
        tenantId,
        totalShards,
        shardsWithEmbeddings,
        coveragePercentage: totalShards > 0 ? (shardsWithEmbeddings / totalShards) * 100 : 0,
        averageVectorsPerShard,
        modelDistribution,
      };
    } catch (error: any) {
      log.error('Failed to get embedding stats', error, {
        tenantId,
        service: 'data-enrichment',
      });
      throw error;
    }
  }

  /**
   * Check if shard has recent vectors
   */
  private hasRecentVectors(shard: any): boolean {
    if (!shard.vectors || shard.vectors.length === 0) {
      return false;
    }

    // Check if vectors were generated recently (within last 24 hours)
    const generatedAt = shard.metadata?.embeddingGeneratedAt;
    if (generatedAt) {
      const generatedDate = new Date(generatedAt);
      const hoursSinceGeneration = (Date.now() - generatedDate.getTime()) / (1000 * 60 * 60);
      return hoursSinceGeneration < 24;
    }

    return false;
  }

  /**
   * Check if content hash matches
   */
  private hasMatchingContentHash(shard: any, contentHash: string): boolean {
    const existingHash = shard.metadata?.embeddingContentHash;
    return existingHash === contentHash;
  }

  /**
   * Calculate content hash
   */
  private calculateContentHash(text: string, templateId: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    hash.update(templateId);
    return hash.digest('hex');
  }
}
