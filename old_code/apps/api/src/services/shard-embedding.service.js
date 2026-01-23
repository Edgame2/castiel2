/**
 * Shard Embedding Service
 *
 * Connects the embedding template system with actual embedding generation.
 * This service orchestrates:
 * 1. Template retrieval (per shard type)
 * 2. Text extraction with field weighting
 * 3. Preprocessing (chunking, normalization)
 * 4. Embedding generation (Azure OpenAI)
 * 5. Vector normalization
 * 6. Storage in Cosmos DB
 */
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
/**
 * Service for generating and managing shard embeddings using templates
 */
export class ShardEmbeddingService {
    embeddingTemplateService;
    embeddingService;
    shardTypeRepository;
    shardRepository;
    monitoring;
    embeddingCache;
    constructor(embeddingTemplateService, embeddingService, shardTypeRepository, shardRepository, monitoring, embeddingCache) {
        this.embeddingTemplateService = embeddingTemplateService;
        this.embeddingService = embeddingService;
        this.shardTypeRepository = shardTypeRepository;
        this.shardRepository = shardRepository;
        this.monitoring = monitoring;
        this.embeddingCache = embeddingCache;
    }
    /**
     * Generate embeddings for a shard using its type's template
     * This is the main entry point for embedding generation
     */
    async generateEmbeddingsForShard(shard, tenantId, options) {
        const startTime = Date.now();
        try {
            // Check if we should skip (already has recent vectors)
            if (!options?.forceRegenerate && this.hasRecentVectors(shard)) {
                this.monitoring.trackEvent('shard-embedding.skipped', {
                    shardId: shard.id,
                    shardTypeId: shard.shardTypeId,
                    tenantId,
                    reason: 'has-recent-vectors',
                });
                return {
                    shardId: shard.id,
                    vectorsGenerated: 0,
                    templateUsed: 'none',
                    isDefaultTemplate: false,
                    processingTimeMs: Date.now() - startTime,
                };
            }
            // 1. Get shard type
            const shardType = await this.shardTypeRepository.findById(shard.shardTypeId, tenantId);
            if (!shardType) {
                throw new Error(`ShardType ${shard.shardTypeId} not found for tenant ${tenantId}`);
            }
            // 2. Get embedding template (custom or default)
            const template = this.embeddingTemplateService.getTemplate(shardType);
            this.monitoring.trackEvent('shard-embedding.template-selected', {
                shardId: shard.id,
                shardTypeId: shard.shardTypeId,
                tenantId,
                templateName: template.name,
                isDefault: template.isDefault,
            });
            // 3. Extract text using template (with field weighting)
            const extractedText = this.embeddingTemplateService.extractText(shard, template, { maxTextLength: 8000 });
            if (!extractedText || extractedText.trim().length === 0) {
                this.monitoring.trackEvent('shard-embedding.no-text', {
                    shardId: shard.id,
                    shardTypeId: shard.shardTypeId,
                    tenantId,
                    reason: 'empty-extraction',
                });
                return {
                    shardId: shard.id,
                    vectorsGenerated: 0,
                    templateUsed: template.name,
                    isDefaultTemplate: template.isDefault,
                    processingTimeMs: Date.now() - startTime,
                };
            }
            // 3.1. Calculate content hash for deduplication
            const contentHash = this.calculateContentHash(extractedText, template.id);
            // 3.2. Check if content hash matches existing embeddings (skip if unchanged)
            if (!options?.forceRegenerate && this.hasMatchingContentHash(shard, contentHash)) {
                this.monitoring.trackEvent('shard-embedding.skipped', {
                    shardId: shard.id,
                    shardTypeId: shard.shardTypeId,
                    tenantId,
                    reason: 'content-unchanged',
                    contentHash,
                });
                return {
                    shardId: shard.id,
                    vectorsGenerated: 0,
                    templateUsed: template.name,
                    isDefaultTemplate: template.isDefault,
                    processingTimeMs: Date.now() - startTime,
                };
            }
            // 3.3. Build optional lightweight parent context (e.g., c_project)
            let contextPrefix;
            const parentCfg = template.parentContext;
            if (parentCfg && parentCfg.mode === 'always' && shard.parentShardId) {
                try {
                    const parent = await this.shardRepository.findById(shard.parentShardId, tenantId);
                    if (parent) {
                        const fields = parentCfg.fields || ['name'];
                        const parts = [];
                        const sd = parent.structuredData || {};
                        const name = sd.name || sd.title || parent.shardTypeName || '';
                        if (fields.includes('name') && name) {
                            parts.push(`Project: ${String(name)}`);
                        }
                        if (fields.includes('tags') && Array.isArray(sd.tags) && sd.tags.length) {
                            parts.push(`Tags: ${sd.tags.slice(0, 5).join(', ')}`);
                        }
                        if (fields.includes('summary') && sd.summary) {
                            parts.push(String(sd.summary));
                        }
                        const raw = parts.join(' | ').trim();
                        const maxLen = parentCfg.maxLength ?? 120;
                        contextPrefix = raw.length > maxLen ? raw.substring(0, maxLen) : raw;
                    }
                }
                catch (e) {
                    this.monitoring.trackException(e, {
                        operation: 'shard-embedding.parent-context',
                        shardId: shard.id,
                        tenantId,
                    });
                }
            }
            // 4. Preprocess text (chunking, normalization), optionally applying context prefix
            const { text: processedText, chunks } = this.embeddingTemplateService.preprocessText(extractedText, template.preprocessing, contextPrefix
                ? {
                    contextPrefix,
                    applyPrefixToEachChunk: parentCfg?.asContextPrefix ?? true,
                    separatorOverride: parentCfg?.separator || template.preprocessing.contextPrefixSeparator,
                }
                : undefined);
            // 5. Prepare texts to embed
            const textsToEmbed = chunks && chunks.length > 0 ? chunks : [processedText];
            // Limit chunks if specified
            const limitedTexts = options?.maxChunks
                ? textsToEmbed.slice(0, options.maxChunks)
                : textsToEmbed;
            if (limitedTexts.length === 0 || limitedTexts.every(t => !t || t.trim().length === 0)) {
                this.monitoring.trackEvent('shard-embedding.no-text', {
                    shardId: shard.id,
                    shardTypeId: shard.shardTypeId,
                    tenantId,
                    reason: 'empty-after-preprocessing',
                });
                return {
                    shardId: shard.id,
                    vectorsGenerated: 0,
                    templateUsed: template.name,
                    isDefaultTemplate: template.isDefault,
                    processingTimeMs: Date.now() - startTime,
                };
            }
            // 6. Check cache and generate embeddings for chunks
            const modelId = this.embeddingTemplateService.getModelId(template);
            this.monitoring.trackEvent('shard-embedding.generating', {
                shardId: shard.id,
                shardTypeId: shard.shardTypeId,
                tenantId,
                chunkCount: limitedTexts.length,
                modelId,
            });
            // 6.1. Calculate content hashes for all chunks
            const contentHashes = limitedTexts.map(text => this.embeddingCache?.calculateContentHash(text, template.id) ||
                this.calculateContentHash(text, template.id));
            // 6.2. Check cache for existing embeddings
            let rawEmbeddings;
            const textsToGenerate = [];
            const cachedEmbeddings = new Map();
            if (this.embeddingCache) {
                const cached = await this.embeddingCache.getCachedBatch(contentHashes);
                for (let i = 0; i < limitedTexts.length; i++) {
                    const hash = contentHashes[i];
                    const cachedEmbedding = cached.get(hash);
                    if (cachedEmbedding) {
                        // Use cached embedding
                        cachedEmbeddings.set(i, cachedEmbedding.embedding);
                        // Track cache hit as custom metric for Grafana dashboard
                        this.monitoring.trackMetric('ai_insights_cache_hit', 1, {
                            cacheType: 'embedding-content-hash',
                            shardId: shard.id,
                            chunkIndex: i,
                        });
                        this.monitoring.trackEvent('shard-embedding.cache-hit', {
                            shardId: shard.id,
                            chunkIndex: i,
                            contentHash: hash,
                        });
                    }
                    else {
                        // Need to generate this embedding
                        textsToGenerate.push({
                            text: limitedTexts[i],
                            index: i,
                            hash,
                        });
                    }
                }
                // Generate embeddings only for uncached texts
                if (textsToGenerate.length > 0) {
                    // Track cache misses for uncached texts
                    this.monitoring.trackMetric('ai_insights_cache_miss', textsToGenerate.length, {
                        cacheType: 'embedding-content-hash',
                        shardId: shard.id,
                    });
                    const textsToEmbed = textsToGenerate.map(e => e.text);
                    // Azure OpenAI supports up to 2048 inputs per batch, but we'll use smaller batches
                    // for better error handling and rate limit management
                    const BATCH_SIZE = 100; // Process in batches of 100 to avoid rate limits
                    // Process in batches sequentially to maintain order and avoid overwhelming the API
                    // For very large sets, we could parallelize batches, but sequential is safer
                    const generatedEmbeddings = [];
                    for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
                        const batch = textsToEmbed.slice(i, i + BATCH_SIZE);
                        const batchEmbeddings = await this.embeddingService.embed(batch, { model: modelId });
                        generatedEmbeddings.push(...batchEmbeddings);
                    }
                    // Store generated embeddings in cache
                    const cacheEntries = textsToGenerate.map((entry, idx) => ({
                        contentHash: entry.hash,
                        embedding: generatedEmbeddings[idx],
                        model: modelId,
                        dimensions: generatedEmbeddings[idx].length,
                    }));
                    await this.embeddingCache.setCachedBatch(cacheEntries);
                    // Map generated embeddings back to their original indices
                    for (let i = 0; i < textsToGenerate.length; i++) {
                        cachedEmbeddings.set(textsToGenerate[i].index, generatedEmbeddings[i]);
                    }
                }
                // Reconstruct embeddings array in original order
                rawEmbeddings = Array.from({ length: limitedTexts.length }, (_, i) => cachedEmbeddings.get(i) || []);
            }
            else {
                // No cache available, generate all embeddings in batches
                const BATCH_SIZE = 100; // Process in batches of 100 to avoid rate limits
                rawEmbeddings = [];
                for (let i = 0; i < limitedTexts.length; i += BATCH_SIZE) {
                    const batch = limitedTexts.slice(i, i + BATCH_SIZE);
                    const batchEmbeddings = await this.embeddingService.embed(batch, { model: modelId });
                    rawEmbeddings.push(...batchEmbeddings);
                }
            }
            // 7. Normalize embeddings (L2, min-max, etc.)
            const normalizedEmbeddings = rawEmbeddings.map((embedding) => this.embeddingTemplateService.normalizeEmbedding(embedding, template.normalization));
            // 8. Create vector objects for storage
            const vectors = normalizedEmbeddings.map((embedding, index) => ({
                id: uuidv4(),
                field: chunks && chunks.length > 0 ? 'chunk' : 'all',
                chunkIndex: chunks && chunks.length > 0 ? index : undefined,
                model: modelId,
                dimensions: embedding.length,
                embedding,
                createdAt: new Date(),
            }));
            // 9. Store in shard.vectors[] and update metadata with content hash
            await this.shardRepository.updateVectors(shard.id, tenantId, vectors);
            // 9.1. Update metadata with content hash for future deduplication
            await this.shardRepository.update(shard.id, tenantId, {
                metadata: {
                    ...shard.metadata,
                    embeddingContentHash: contentHash,
                    embeddingTemplateId: template.id,
                    embeddingGeneratedAt: new Date().toISOString(),
                },
                updatedBy: shard.userId,
            });
            const processingTimeMs = Date.now() - startTime;
            this.monitoring.trackEvent('shard-embedding.generated', {
                shardId: shard.id,
                shardTypeId: shard.shardTypeId,
                tenantId,
                vectorCount: vectors.length,
                templateUsed: template.name,
                isDefaultTemplate: template.isDefault,
                processingTimeMs,
            });
            this.monitoring.trackMetric('shard-embedding.processing-time', processingTimeMs, {
                shardTypeId: shard.shardTypeId,
                tenantId,
            });
            return {
                shardId: shard.id,
                vectorsGenerated: vectors.length,
                templateUsed: template.name,
                isDefaultTemplate: template.isDefault,
                processingTimeMs,
            };
        }
        catch (error) {
            const processingTimeMs = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.generate',
                shardId: shard.id,
                shardTypeId: shard.shardTypeId,
                tenantId,
                processingTimeMs,
            });
            throw error;
        }
    }
    /**
     * Get embedding status for a shard
     */
    async getEmbeddingStatus(shardId, tenantId) {
        try {
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                throw new Error(`Shard ${shardId} not found`);
            }
            const hasEmbeddings = shard.vectors && shard.vectors.length > 0;
            const vectorCount = shard.vectors?.length || 0;
            if (!hasEmbeddings) {
                return {
                    hasEmbeddings: false,
                    vectorCount: 0,
                    isRecent: false,
                };
            }
            // Get vector dates
            const vectorDates = shard.vectors
                .map(v => v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt))
                .sort((a, b) => b.getTime() - a.getTime());
            const latestVectorDate = vectorDates[0];
            const oldestVectorDate = vectorDates[vectorDates.length - 1];
            // Check if recent (less than 7 days)
            const daysSinceCreation = (Date.now() - latestVectorDate.getTime()) / (1000 * 60 * 60 * 24);
            const isRecent = daysSinceCreation < 7;
            // Get model and dimensions from first vector
            const firstVector = shard.vectors[0];
            const model = firstVector.model;
            const dimensions = firstVector.vector?.length;
            return {
                hasEmbeddings: true,
                vectorCount,
                latestVectorDate,
                oldestVectorDate,
                isRecent,
                model,
                dimensions,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.get-status',
                shardId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Get embedding generation history for a shard (from embedding jobs)
     */
    async getEmbeddingHistory(shardId, tenantId, limit = 20) {
        try {
            // Import EmbeddingJobRepository dynamically to avoid circular dependencies
            const { EmbeddingJobRepository } = await import('../repositories/embedding-job.repository.js');
            const jobRepository = new EmbeddingJobRepository();
            const result = await jobRepository.list(tenantId, {
                shardId,
                limit,
                offset: 0,
            });
            return result.jobs.map(job => ({
                jobId: job.id,
                status: job.status,
                createdAt: new Date(job.createdAt),
                completedAt: job.updatedAt && job.status !== 'processing' ? new Date(job.updatedAt) : undefined,
                error: job.error,
                retryCount: job.retryCount || 0,
            }));
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.get-history',
                shardId,
                tenantId,
            });
            // Return empty array if job repository not available
            return [];
        }
    }
    /**
     * Validate embedding quality for a shard
     */
    async validateEmbeddingQuality(shardId, tenantId) {
        try {
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                throw new Error(`Shard ${shardId} not found`);
            }
            const issues = [];
            const metrics = {
                vectorCount: shard.vectors?.length || 0,
                dimensions: null,
                isNormalized: false,
                hasValidModel: false,
                averageMagnitude: null,
            };
            if (metrics.vectorCount === 0) {
                issues.push('No embeddings found');
                return { isValid: false, issues, metrics };
            }
            // Check dimensions consistency
            const dimensions = shard.vectors[0].vector?.length;
            metrics.dimensions = dimensions || null;
            if (!dimensions || dimensions === 0) {
                issues.push('Invalid vector dimensions');
            }
            else {
                // Check all vectors have same dimensions
                const inconsistentDimensions = shard.vectors.some(v => v.vector?.length !== dimensions);
                if (inconsistentDimensions) {
                    issues.push('Inconsistent vector dimensions');
                }
            }
            // Check model
            const model = shard.vectors[0].model;
            metrics.hasValidModel = !!model;
            if (!model) {
                issues.push('Missing model information');
            }
            // Check normalization (magnitude should be close to 1.0 for normalized vectors)
            let totalMagnitude = 0;
            let validVectors = 0;
            for (const vector of shard.vectors) {
                if (vector.vector && vector.vector.length > 0) {
                    const magnitude = Math.sqrt(vector.vector.reduce((sum, val) => sum + val * val, 0));
                    totalMagnitude += magnitude;
                    validVectors++;
                    // Check if normalized (magnitude should be close to 1.0, allow small tolerance)
                    if (Math.abs(magnitude - 1.0) > 0.01) {
                        metrics.isNormalized = false;
                    }
                }
            }
            if (validVectors > 0) {
                metrics.averageMagnitude = totalMagnitude / validVectors;
                // If all vectors are normalized, set flag
                if (metrics.averageMagnitude >= 0.99 && metrics.averageMagnitude <= 1.01) {
                    metrics.isNormalized = true;
                }
                else {
                    issues.push('Vectors are not normalized (magnitude should be ~1.0)');
                }
            }
            return {
                isValid: issues.length === 0,
                issues,
                metrics,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.validate-quality',
                shardId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Force regenerate embeddings for a single shard
     */
    async regenerateEmbeddingsForShard(shardId, tenantId) {
        try {
            const shard = await this.shardRepository.findById(shardId, tenantId);
            if (!shard) {
                throw new Error(`Shard ${shardId} not found`);
            }
            return await this.generateEmbeddingsForShard(shard, tenantId, {
                forceRegenerate: true,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.regenerate-shard',
                shardId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Calculate content hash for extracted text
     * Includes template ID to ensure template changes trigger regeneration
     */
    calculateContentHash(extractedText, templateId) {
        const content = `${templateId}:${extractedText}`;
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Check if shard has matching content hash (content unchanged)
     */
    hasMatchingContentHash(shard, contentHash) {
        // Check if metadata contains the content hash
        const storedHash = shard.metadata?.embeddingContentHash;
        if (storedHash === contentHash) {
            // Also verify vectors exist
            return shard.vectors && shard.vectors.length > 0;
        }
        return false;
    }
    /**
     * Check if shard has recent vectors (less than 7 days old)
     */
    hasRecentVectors(shard) {
        if (!shard.vectors || shard.vectors.length === 0) {
            return false;
        }
        // Get most recent vector
        const latestVector = shard.vectors.reduce((latest, current) => {
            const latestTime = latest.createdAt instanceof Date
                ? latest.createdAt.getTime()
                : new Date(latest.createdAt).getTime();
            const currentTime = current.createdAt instanceof Date
                ? current.createdAt.getTime()
                : new Date(current.createdAt).getTime();
            return currentTime > latestTime ? current : latest;
        });
        // Check if less than 7 days old
        const vectorDate = latestVector.createdAt instanceof Date
            ? latestVector.createdAt
            : new Date(latestVector.createdAt);
        const daysSinceCreation = (Date.now() - vectorDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation < 7;
    }
    /**
     * Re-generate embeddings for all shards of a specific type
     * Useful after updating a shard type's embedding template
     */
    async regenerateEmbeddingsForShardType(shardTypeId, tenantId, options) {
        const startTime = Date.now();
        const batchSize = options?.batchSize || 10;
        let processed = 0;
        let failed = 0;
        let skipped = 0;
        try {
            this.monitoring.trackEvent('shard-embedding.regenerate-started', {
                shardTypeId,
                tenantId,
                batchSize,
            });
            // Get all shards of this type
            const shards = await this.shardRepository.findByShardType(shardTypeId, tenantId);
            const totalShards = shards.length;
            const shardsToProcess = options?.maxShards
                ? shards.slice(0, options.maxShards)
                : shards;
            // Process in batches to avoid overwhelming the system
            for (let i = 0; i < shardsToProcess.length; i += batchSize) {
                const batch = shardsToProcess.slice(i, i + batchSize);
                const results = await Promise.allSettled(batch.map(async (shard) => {
                    const result = await this.generateEmbeddingsForShard(shard, tenantId, { forceRegenerate: options?.forceRegenerate });
                    if (result.vectorsGenerated === 0) {
                        skipped++;
                    }
                    else {
                        processed++;
                    }
                }));
                // Count failures
                results.forEach((result) => {
                    if (result.status === 'rejected') {
                        failed++;
                    }
                });
                // Log progress
                this.monitoring.trackEvent('shard-embedding.regenerate-progress', {
                    shardTypeId,
                    tenantId,
                    processed: i + batch.length,
                    total: shardsToProcess.length,
                });
            }
            const durationMs = Date.now() - startTime;
            this.monitoring.trackEvent('shard-embedding.regenerate-complete', {
                shardTypeId,
                tenantId,
                totalShards,
                processed,
                failed,
                skipped,
                durationMs,
            });
            return {
                shardTypeId,
                totalShards,
                processed,
                failed,
                skipped,
                durationMs,
            };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.regenerate',
                shardTypeId,
                tenantId,
                processed,
                failed,
                durationMs,
            });
            throw error;
        }
    }
    /**
     * Batch generate embeddings for multiple shards
     * Useful for bulk operations or migrations
     */
    async batchGenerateEmbeddings(shardIds, tenantId, options) {
        const batchSize = options?.batchSize || 10;
        let processed = 0;
        let failed = 0;
        let skipped = 0;
        try {
            // Process in batches
            for (let i = 0; i < shardIds.length; i += batchSize) {
                const batch = shardIds.slice(i, i + batchSize);
                // Fetch shards - use Promise.allSettled to handle individual failures gracefully
                const shardResults = await Promise.allSettled(batch.map(id => this.shardRepository.findById(id, tenantId)));
                // Extract successfully fetched shards, filtering out failures
                const shards = shardResults
                    .map((result) => result.status === 'fulfilled' ? result.value : null)
                    .filter((shard) => shard !== null);
                // Generate embeddings
                const results = await Promise.allSettled(shards.map(async (shard) => {
                    if (!shard) {
                        skipped++;
                        return;
                    }
                    const result = await this.generateEmbeddingsForShard(shard, tenantId, { forceRegenerate: options?.forceRegenerate });
                    if (result.vectorsGenerated === 0) {
                        skipped++;
                    }
                    else {
                        processed++;
                    }
                }));
                // Count failures
                results.forEach((result) => {
                    if (result.status === 'rejected') {
                        failed++;
                    }
                });
            }
            return {
                total: shardIds.length,
                processed,
                failed,
                skipped,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.batch-generate',
                tenantId,
                shardCount: shardIds.length,
            });
            throw error;
        }
    }
    /**
     * Get embedding statistics for a tenant
     */
    async getEmbeddingStats(tenantId) {
        try {
            // This would typically query Cosmos DB for statistics
            // For now, return a placeholder structure
            this.monitoring.trackEvent('shard-embedding.stats-requested', {
                tenantId,
            });
            return {
                totalShards: 0,
                shardsWithEmbeddings: 0,
                totalVectors: 0,
                averageVectorsPerShard: 0,
                shardTypeStats: [],
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'shard-embedding.get-stats',
                tenantId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=shard-embedding.service.js.map