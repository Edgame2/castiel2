/**
 * Shard Embedding Service (embeddings container)
 * Generates embeddings for shards using templates; updates shard via shard-manager; publishes shard.embedding.generated.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { EmbeddingTemplateService } from './EmbeddingTemplateService';
import { publishShardEmbeddingGenerated } from '../events/publishers/ShardEmbeddingEventPublisher';

const DEFAULT_DIMENSIONS = 1536;

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
  private embeddingTemplateService: EmbeddingTemplateService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app ?? null;
    this.config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url ?? '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
    this.embeddingTemplateService = new EmbeddingTemplateService();
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) return '';
    return generateServiceToken(this.app, {
      serviceId: 'embeddings',
      serviceName: 'embeddings',
      tenantId,
    });
  }

  /**
   * Generate a deterministic embedding vector from text (stub for pipeline; replace with real embed API when configured).
   */
  private async generateEmbeddingFromText(_model: string, text: string): Promise<number[]> {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const seed = parseInt(hash.slice(0, 8), 16);
    const vec: number[] = [];
    for (let i = 0; i < DEFAULT_DIMENSIONS; i++) {
      const x = Math.sin(seed + i * 1.1) * 0.5 + 0.5;
      vec.push(x);
    }
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (magnitude > 0) {
      return vec.map((v) => v / magnitude);
    }
    return vec;
  }

  async generateEmbeddingsForShard(
    shardId: string,
    tenantId: string,
    options?: { forceRegenerate?: boolean; maxChunks?: number }
  ): Promise<EmbeddingGenerationResult> {
    const startTime = Date.now();
    const token = this.getServiceToken(tenantId);
    const headers = { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId };

    const shard = await this.shardManagerClient.get<any>(`/api/v1/shards/${shardId}`, { headers });
    if (!shard) throw new Error(`Shard not found: ${shardId}`);

    const vectorizableShardTypes = ['document', 'email', 'meeting', 'message', 'calendarevent'];
    const shardTypeLower = shard.shardTypeId?.toLowerCase();
    if (!shardTypeLower || !vectorizableShardTypes.includes(shardTypeLower)) {
      return {
        shardId,
        vectorsGenerated: 0,
        templateUsed: 'none',
        isDefaultTemplate: false,
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (!options?.forceRegenerate && this.hasRecentVectors(shard)) {
      return {
        shardId,
        vectorsGenerated: 0,
        templateUsed: 'none',
        isDefaultTemplate: false,
        processingTimeMs: Date.now() - startTime,
      };
    }

    let shardType: any = null;
    if (shard.shardTypeId) {
      try {
        shardType = await this.shardManagerClient.get<any>(
          `/api/v1/shard-types/${shard.shardTypeId}`,
          { headers }
        );
      } catch {
        // use default template
      }
    }

    const template = this.embeddingTemplateService.getTemplate(shardType);
    const extractedText = this.embeddingTemplateService.extractText(shard, template, { maxTextLength: 8000 });
    if (!extractedText || extractedText.trim().length < 10) {
      return {
        shardId,
        vectorsGenerated: 0,
        templateUsed: template.name,
        isDefaultTemplate: template.isDefault,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const { chunks } = this.embeddingTemplateService.preprocessText(extractedText, template.preprocessing);
    const contentHash = crypto.createHash('sha256').update(extractedText).update(template.id).digest('hex');
    if (!options?.forceRegenerate && shard.metadata?.embeddingContentHash === contentHash) {
      return {
        shardId,
        vectorsGenerated: 0,
        templateUsed: template.name,
        isDefaultTemplate: template.isDefault,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const modelId = this.embeddingTemplateService.getModelId(template, shard.shardTypeName);
    const textsToEmbed = chunks && chunks.length > 0 ? chunks : [extractedText];
    const embeddings: number[][] = [];
    for (const textToEmbed of textsToEmbed) {
      const raw = await this.generateEmbeddingFromText(modelId, textToEmbed);
      const normalized = this.embeddingTemplateService.normalizeEmbedding(raw, template.normalization);
      embeddings.push(normalized);
    }

    const vectors = embeddings.map((embedding, index) => ({
      id: uuidv4(),
      field: chunks && chunks.length > 0 ? `chunk_${index}` : 'all',
      model: modelId,
      dimensions: embedding.length,
      embedding,
      createdAt: new Date(),
      chunkText: chunks?.[index],
    }));

    await this.shardManagerClient.put<any>(
      `/api/v1/shards/${shardId}`,
      {
        ...shard,
        vectors,
        metadata: {
          ...shard.metadata,
          embeddingContentHash: contentHash,
          embeddingTemplateId: template.id,
          embeddingTemplateName: template.name,
          embeddingGeneratedAt: new Date().toISOString(),
          embeddingModel: modelId,
          embeddingDimensions: embeddings[0]?.length ?? 0,
        },
        updatedAt: new Date(),
      },
      { headers }
    );

    await publishShardEmbeddingGenerated(tenantId, {
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
      processingTimeMs: Date.now() - startTime,
      tokensUsed: Math.ceil(extractedText.length / 4),
    };
  }

  async batchGenerateEmbeddings(
    shardIds: string[],
    tenantId: string,
    options?: { forceRegenerate?: boolean; concurrency?: number }
  ): Promise<{ processed: number; failed: number; skipped: number }> {
    const concurrency = options?.concurrency ?? 5;
    let processed = 0;
    let failed = 0;
    let skipped = 0;
    for (let i = 0; i < shardIds.length; i += concurrency) {
      const batch = shardIds.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((shardId) => this.generateEmbeddingsForShard(shardId, tenantId, options))
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.vectorsGenerated > 0) processed++;
          else skipped++;
        } else {
          failed++;
        }
      }
    }
    return { processed, failed, skipped };
  }

  async regenerateEmbeddingsForShardType(
    shardTypeId: string,
    tenantId: string,
    options?: { forceRegenerate?: boolean }
  ): Promise<RegenerationResult> {
    const startTime = Date.now();
    const token = this.getServiceToken(tenantId);
    const headers = { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId };
    const shardsResponse = await this.shardManagerClient.get<any>(
      `/api/v1/shards?shardTypeId=${shardTypeId}&limit=1000`,
      { headers }
    );
    const shards = Array.isArray(shardsResponse) ? shardsResponse : (shardsResponse as any).shards ?? [];
    const shardIds = shards.map((s: any) => s.id);
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
    return {
      shardTypeId,
      totalShards: shards.length,
      processed,
      failed,
      skipped,
      durationMs: Date.now() - startTime,
    };
  }

  async getEmbeddingStats(tenantId: string): Promise<EmbeddingStats> {
    const token = this.getServiceToken(tenantId);
    const headers = { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId };
    const shardsResponse = await this.shardManagerClient.get<any>(`/api/v1/shards?limit=1000`, { headers });
    const shards = Array.isArray(shardsResponse) ? shardsResponse : (shardsResponse as any).shards ?? [];
    const totalShards = shards.length;
    const shardsWithEmbeddings = shards.filter((s: any) => s.vectors?.length > 0).length;
    const totalVectors = shards.reduce((sum: number, s: any) => sum + (s.vectors?.length || 0), 0);
    const modelDistribution: Record<string, number> = {};
    for (const shard of shards) {
      for (const vector of shard.vectors ?? []) {
        const model = vector.model ?? 'unknown';
        modelDistribution[model] = (modelDistribution[model] ?? 0) + 1;
      }
    }
    return {
      tenantId,
      totalShards,
      shardsWithEmbeddings,
      coveragePercentage: totalShards > 0 ? (shardsWithEmbeddings / totalShards) * 100 : 0,
      averageVectorsPerShard: totalShards > 0 ? totalVectors / totalShards : 0,
      modelDistribution,
    };
  }

  private hasRecentVectors(shard: any): boolean {
    if (!shard.vectors?.length) return false;
    const generatedAt = shard.metadata?.embeddingGeneratedAt;
    if (generatedAt) {
      const hours = (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60);
      return hours < 24;
    }
    return false;
  }
}
