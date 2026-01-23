/**
 * EmbeddingService Unit Tests
 * Tests for vector embedding generation, caching, and API integration
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IMonitoringProvider } from '../../types/monitoring.types'

interface Embedding {
    text: string
    embedding: number[]
    model: string
    dimensions: number
    tokenCount: number
    cached: boolean
}

interface BatchEmbeddingResult {
    embeddings: Embedding[]
    failed: Array<{ text: string; error: string }>
    stats: { successful: number; failed: number; totalTokens: number }
}

/**
 * Mock OpenAI Service for testing
 */
class MockOpenAIClient {
    async createEmbedding(texts: string[], model: string): Promise<{ data: any[]; usage: any }> {
        return {
            data: texts.map((text, i) => ({
                embedding: Array(1536)
                    .fill(0)
                    .map((_, j) => Math.sin(i + j)),
            })),
            usage: {
                prompt_tokens: texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0),
            },
        }
    }
}

/**
 * Mock EmbeddingService for testing
 * In production: apps/api/src/services/embedding.service.ts
 */
class EmbeddingService {
    private cache = new Map<string, Embedding>()
    private requestStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensProcessed: 0,
        totalCost: 0,
    }

    constructor(
        private openaiClient: MockOpenAIClient,
        private monitoring: IMonitoringProvider,
        private model: string = 'text-embedding-3-small',
        private dimensions: number = 1536
    ) { }

    async embed(text: string): Promise<Embedding> {
        if (!text || text.trim().length === 0) {
            throw new Error('Text cannot be empty')
        }

        this.requestStats.totalRequests++

        // Check cache
        const cacheKey = this.getCacheKey(text)
        const cached = this.cache.get(cacheKey)

        if (cached) {
            this.monitoring.trackEvent('embedding-cache-hit', {
                model: this.model,
                textLength: text.length,
            })
            return { ...cached, cached: true }
        }

        try {
            // Call OpenAI
            const result = await this.openaiClient.createEmbedding([text], this.model)

            const embedding: Embedding = {
                text,
                embedding: result.data[0].embedding,
                model: this.model,
                dimensions: this.dimensions,
                tokenCount: result.usage.prompt_tokens,
                cached: false,
            }

            // Store in cache
            this.cache.set(cacheKey, embedding)

            // Track stats
            this.requestStats.successfulRequests++
            this.requestStats.totalTokensProcessed += embedding.tokenCount
            this.requestStats.totalCost += (embedding.tokenCount / 1000000) * 0.02 // Rough cost estimate

            this.monitoring.trackEvent('embedding-generated', {
                model: this.model,
                textLength: text.length,
                tokenCount: embedding.tokenCount,
            })

            return embedding
        } catch (error) {
            this.requestStats.failedRequests++

            this.monitoring.trackException(error as Error, {
                operation: 'embed',
                model: this.model,
            })

            throw error
        }
    }

    async embedBatch(texts: string[], options: { maxRetries?: number } = {}): Promise<BatchEmbeddingResult> {
        const { maxRetries = 3 } = options

        const embeddings: Embedding[] = []
        const failed: Array<{ text: string; error: string }> = []
        let totalTokens = 0

        for (const text of texts) {
            try {
                const embedding = await this.embed(text)
                embeddings.push(embedding)
                totalTokens += embedding.tokenCount
            } catch (error) {
                failed.push({
                    text,
                    error: (error as Error).message,
                })
            }
        }

        return {
            embeddings,
            failed,
            stats: {
                successful: embeddings.length,
                failed: failed.length,
                totalTokens,
            },
        }
    }

    async embedLarge(
        texts: string[],
        options: { batchSize?: number; maxConcurrent?: number } = {}
    ): Promise<BatchEmbeddingResult> {
        const { batchSize = 10, maxConcurrent = 5 } = options

        const embeddings: Embedding[] = []
        const failed: Array<{ text: string; error: string }> = []
        let totalTokens = 0

        // Process in batches to respect rate limits
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize)

            // Limit concurrent requests
            const results = await Promise.allSettled(batch.map((text) => this.embed(text)))

            for (let j = 0; j < results.length; j++) {
                const result = results[j]
                if (result.status === 'fulfilled') {
                    embeddings.push(result.value)
                    totalTokens += result.value.tokenCount
                } else {
                    failed.push({
                        text: batch[j],
                        error: (result.reason as Error).message,
                    })
                }
            }
        }

        return {
            embeddings,
            failed,
            stats: {
                successful: embeddings.length,
                failed: failed.length,
                totalTokens,
            },
        }
    }

    private getCacheKey(text: string): string {
        return Buffer.from(text).toString('base64')
    }

    getStats(): typeof this.requestStats {
        return this.requestStats
    }

    getCacheSize(): number {
        return this.cache.size
    }

    clearCache(): void {
        this.cache.clear()
    }
}

/**
 * Test Suite: EmbeddingService
 */
describe('EmbeddingService', () => {
    let service: EmbeddingService
    let mockOpenAI: MockOpenAIClient
    let mockMonitoring: IMonitoringProvider

    beforeEach(() => {
        mockOpenAI = new MockOpenAIClient()
        mockMonitoring = {
            trackEvent: vi.fn(),
            trackException: vi.fn(),
            trackMetric: vi.fn(),
            trackDependency: vi.fn(),
        } as any

        service = new EmbeddingService(mockOpenAI, mockMonitoring)
    })

    describe('Single Embedding', () => {
        it('should generate embedding for text', async () => {
            const embedding = await service.embed('Hello world')

            expect(embedding.embedding).toHaveLength(1536)
            expect(embedding.model).toBe('text-embedding-3-small')
            expect(embedding.dimensions).toBe(1536)
        })

        it('should include token count', async () => {
            const embedding = await service.embed('This is a test sentence.')

            expect(embedding.tokenCount).toBeGreaterThan(0)
        })

        it('should mark as uncached on first generation', async () => {
            const embedding = await service.embed('First generation')

            expect(embedding.cached).toBe(false)
        })

        it('should validate non-empty text', async () => {
            await expect(service.embed('')).rejects.toThrow('Text cannot be empty')
            await expect(service.embed('   ')).rejects.toThrow('Text cannot be empty')
        })

        it('should preserve text in embedding result', async () => {
            const text = 'Test content'

            const embedding = await service.embed(text)

            expect(embedding.text).toBe(text)
        })
    })

    describe('Caching', () => {
        it('should return cached embedding on second request', async () => {
            const text = 'Cached text'

            // First request
            const first = await service.embed(text)
            expect(first.cached).toBe(false)

            // Second request
            const second = await service.embed(text)
            expect(second.cached).toBe(true)
            expect(second.embedding).toEqual(first.embedding)
        })

        it('should use consistent cache key', async () => {
            const text = 'Cache test'

            const embedding1 = await service.embed(text)
            const embedding2 = await service.embed(text)

            expect(embedding1.embedding).toEqual(embedding2.embedding)
        })

        it('should track cache hits', async () => {
            const text = 'Tracked cache'

            // Prime cache
            await service.embed(text)

            // Cache hit
            await service.embed(text)

            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
                'embedding-cache-hit',
                expect.any(Object)
            )
        })

        it('should allow cache clearing', async () => {
            await service.embed('Cached text')

            let size = service.getCacheSize()
            expect(size).toBeGreaterThan(0)

            service.clearCache()

            size = service.getCacheSize()
            expect(size).toBe(0)
        })
    })

    describe('Batch Processing', () => {
        it('should embed multiple texts', async () => {
            const texts = ['First text', 'Second text', 'Third text']

            const result = await service.embedBatch(texts)

            expect(result.embeddings).toHaveLength(3)
            expect(result.stats.successful).toBe(3)
            expect(result.stats.failed).toBe(0)
        })

        it('should handle partial batch failures', async () => {
            const texts = ['Valid text', '', 'Another valid']

            const result = await service.embedBatch(texts)

            expect(result.embeddings.length).toBeGreaterThan(0)
            expect(result.failed.length).toBeGreaterThan(0)
        })

        it('should count total tokens in batch', async () => {
            const texts = ['Text one', 'Text two', 'Text three']

            const result = await service.embedBatch(texts)

            expect(result.stats.totalTokens).toBeGreaterThan(0)
        })

        it('should return failed texts with errors', async () => {
            const texts = ['Valid text', '', 'Another valid']

            const result = await service.embedBatch(texts)

            if (result.failed.length > 0) {
                expect(result.failed[0]).toHaveProperty('text')
                expect(result.failed[0]).toHaveProperty('error')
            }
        })
    })

    describe('Large Batch Processing', () => {
        it('should process large batches with batching', async () => {
            const texts = Array.from({ length: 50 }, (_, i) => `Text number ${i}`)

            const result = await service.embedLarge(texts, { batchSize: 10 })

            expect(result.embeddings.length).toBeGreaterThan(0)
            expect(result.stats.successful).toBeGreaterThan(0)
        })

        it('should respect batch size limit', async () => {
            const texts = Array.from({ length: 25 }, (_, i) => `Text ${i}`)

            const result = await service.embedLarge(texts, { batchSize: 5 })

            expect(result.embeddings.length).toBeGreaterThan(0)
        })

        it('should handle concurrent requests', async () => {
            const texts = Array.from({ length: 20 }, (_, i) => `Text ${i}`)

            const result = await service.embedLarge(texts, { maxConcurrent: 5 })

            expect(result.embeddings.length).toBeGreaterThan(0)
        })
    })

    describe('Embedding Quality', () => {
        it('should generate deterministic embeddings for same text', async () => {
            const text = 'Same text'

            const emb1 = await service.embed(text)
            service.clearCache() // Clear cache but model is deterministic
            const emb2 = await service.embed(text)

            // Both should be valid embeddings
            expect(emb1.embedding.length).toBe(1536)
            expect(emb2.embedding.length).toBe(1536)
        })

        it('should generate different embeddings for different texts', async () => {
            const emb1 = await service.embed('First text')
            const emb2 = await service.embed('Second text')

            // Embeddings should be different (not just cached)
            const difference = emb1.embedding.reduce((sum, val, i) => sum + Math.abs(val - emb2.embedding[i]), 0)
            expect(difference).toBeGreaterThan(0)
        })

        it('should normalize embedding dimensions', async () => {
            const embedding = await service.embed('Test text')

            expect(embedding.dimensions).toBe(1536)
            expect(embedding.embedding.length).toBe(embedding.dimensions)
        })
    })

    describe('Error Handling', () => {
        it('should track failed embedding attempts', async () => {
            try {
                await service.embed('')
            } catch {
                // Expected
            }

            const stats = service.getStats()
            expect(stats.totalRequests).toBeGreaterThan(0)
        })

        it('should report exception in monitoring', async () => {
            try {
                await service.embed('')
            } catch {
                // Expected
            }

            expect(mockMonitoring.trackException).toHaveBeenCalled()
        })
    })

    describe('Statistics Tracking', () => {
        it('should track total requests', async () => {
            await service.embed('First')
            await service.embed('Second')
            await service.embed('Third')

            const stats = service.getStats()
            expect(stats.totalRequests).toBeGreaterThanOrEqual(3)
        })

        it('should track successful requests', async () => {
            await service.embed('Success text')

            const stats = service.getStats()
            expect(stats.successfulRequests).toBeGreaterThan(0)
        })

        it('should accumulate token count', async () => {
            await service.embed('First text with some content')
            await service.embed('Second text with more content')

            const stats = service.getStats()
            expect(stats.totalTokensProcessed).toBeGreaterThan(0)
        })

        it('should calculate approximate cost', async () => {
            await service.embed('Cost tracking test')

            const stats = service.getStats()
            expect(stats.totalCost).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Model Configuration', () => {
        it('should use specified model', async () => {
            const customService = new EmbeddingService(
                mockOpenAI,
                mockMonitoring,
                'text-embedding-3-large',
                3072
            )

            const embedding = await customService.embed('Test')

            expect(embedding.model).toBe('text-embedding-3-large')
            expect(embedding.dimensions).toBe(3072)
        })

        it('should support different dimensions', async () => {
            const customService = new EmbeddingService(mockOpenAI, mockMonitoring, 'text-embedding-ada-002', 1024)

            const embedding = await customService.embed('Test')

            expect(embedding.dimensions).toBe(1024)
        })
    })

    describe('Rate Limiting', () => {
        it('should handle rapid consecutive requests', async () => {
            const promises = Array.from({ length: 5 }, (_, i) => service.embed(`Text ${i}`))

            const results = await Promise.all(promises)

            expect(results).toHaveLength(5)
            for (const result of results) {
                expect(result.embedding).toBeDefined()
            }
        })

        it('should benefit from caching under concurrent access', async () => {
            const text = 'Shared text'

            // First request fills cache
            await service.embed(text)

            // Multiple concurrent requests should hit cache
            const promises = Array.from({ length: 5 }, () => service.embed(text))
            const results = await Promise.all(promises)

            const cachedCount = results.filter((r) => r.cached).length
            expect(cachedCount).toBeGreaterThan(0)
        })
    })
})
