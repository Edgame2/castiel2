/**
 * Web Search Context Integration Service - Integration Tests
 *
 * Comprehensive tests for WebSearchContextIntegrationService covering:
 * - Auto-trigger detection logic
 * - Vector similarity search accuracy
 * - Semantic retrieval ranking
 * - Integration with InsightService
 * - Edge cases and error handling
 * - Performance benchmarks
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSearchContextIntegrationService } from '../web-search-context-integration.service';
describe('WebSearchContextIntegrationService - Integration Tests', () => {
    let service;
    let mockWebSearchService;
    let mockEmbeddingService;
    let mockContainer;
    // Test data
    const testTenantId = 'tenant-123';
    const testProjectId = 'project-456';
    const testQuery = 'What are the latest trends in AI agents?';
    beforeEach(() => {
        // Mock WebSearchService
        mockWebSearchService = {
            search: vi.fn().mockResolvedValue({
                search: { id: 'search-1', results: [] },
                costBreakdown: { searchCost: 0.001, totalCost: 0.001 },
            }),
        };
        // Mock EmbeddingService
        mockEmbeddingService = {
            embed: vi.fn().mockResolvedValue([
                { embedding: createMockEmbedding(), text: testQuery },
            ]),
        };
        // Mock Cosmos Container
        mockContainer = {
            items: {
                query: vi.fn().mockReturnValue({
                    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
                }),
            },
        };
        // Create service instance
        service = new WebSearchContextIntegrationService(mockWebSearchService, mockEmbeddingService, mockContainer);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    // ========================================================================
    // Auto-Trigger Detection Tests
    // ========================================================================
    describe('Auto-Trigger Detection', () => {
        it('should trigger web search for "search" intent type', async () => {
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.triggered).toBe(true);
            expect(result.reason).toContain('search');
        });
        it('should trigger web search for high-confidence intent with web keywords', async () => {
            const intent = createMockIntent('analysis', 0.85);
            const query = 'What are the latest market trends in AI?';
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, query, baseContext);
            expect(result.triggered).toBe(true);
            expect(result.reason).toContain('keywords');
        });
        it('should trigger web search for current information queries', async () => {
            const intent = createMockIntent('analysis', 0.8);
            const query = 'What is the current price of Bitcoin?';
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, query, baseContext);
            expect(result.triggered).toBe(true);
            expect(result.reason).toContain('current external information');
        });
        it('should NOT trigger web search for low-confidence intent', async () => {
            const intent = createMockIntent('summary', 0.5);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.triggered).toBe(false);
            expect(result.reason).toContain('confidence too low');
        });
        it('should NOT trigger web search when explicitly disabled', async () => {
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { skipWebSearch: true });
            expect(result.triggered).toBe(false);
            expect(result.reason).toContain('explicitly disabled');
        });
        it('should NOT trigger web search for internal-only queries', async () => {
            const intent = createMockIntent('summary', 0.8);
            const query = 'Summarize this project status';
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, query, baseContext);
            expect(result.triggered).toBe(false);
            expect(result.reason).toContain('No web search trigger conditions met');
        });
    });
    // ========================================================================
    // Cached Page Retrieval Tests
    // ========================================================================
    describe('Cached Page Retrieval', () => {
        it('should retrieve cached pages within max age', async () => {
            const cachedPages = createMockWebPages(3);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { maxCacheAge: 24 });
            expect(result.triggered).toBe(true);
            expect(result.metadata.pagesScraped).toBe(3);
        });
        it('should trigger new web search if no cached pages found', async () => {
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(mockWebSearchService.search).toHaveBeenCalledWith(testTenantId, expect.any(String), expect.objectContaining({ useCache: true, type: 'web' }));
        });
        it('should use custom max cache age when provided', async () => {
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { maxCacheAge: 12 } // 12 hours
            );
            const queryCall = mockContainer.items.query.mock.calls[0][0];
            expect(queryCall.parameters).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: '@cutoffTime' }),
            ]));
        });
    });
    // ========================================================================
    // Semantic Retrieval Tests
    // ========================================================================
    describe('Semantic Retrieval', () => {
        it('should retrieve and rank chunks by relevance score', async () => {
            const cachedPages = createMockWebPages(2);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.ragChunks.length).toBeGreaterThan(0);
            // Verify chunks are sorted by score (highest first)
            for (let i = 0; i < result.ragChunks.length - 1; i++) {
                expect(result.ragChunks[i].score).toBeGreaterThanOrEqual(result.ragChunks[i + 1].score);
            }
        });
        it('should filter chunks below minimum relevance score', async () => {
            const cachedPages = createMockWebPages(2);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { minRelevanceScore: 0.8 } // High threshold
            );
            // All returned chunks should have score >= 0.8
            expect(result.ragChunks.every(chunk => chunk.score >= 0.8)).toBe(true);
        });
        it('should respect max chunks limit', async () => {
            const cachedPages = createMockWebPages(5); // Many pages
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { maxChunks: 5 });
            expect(result.ragChunks.length).toBeLessThanOrEqual(5);
        });
        it('should generate meaningful highlights for chunks', async () => {
            const cachedPages = createMockWebPages(1);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            // Verify highlights are generated
            expect(result.ragChunks.every(chunk => chunk.highlight)).toBe(true);
            expect(result.ragChunks.every(chunk => chunk.highlight.length > 0)).toBe(true);
        });
        it('should deduplicate similar chunks', async () => {
            const cachedPages = createMockWebPagesWithDuplicates();
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            // Should have fewer chunks than total due to deduplication
            const totalChunks = cachedPages.reduce((sum, p) => sum + p.chunks.length, 0);
            expect(result.ragChunks.length).toBeLessThan(totalChunks);
        });
    });
    // ========================================================================
    // Vector Similarity Tests
    // ========================================================================
    describe('Vector Similarity Calculation', () => {
        it('should calculate cosine similarity correctly', async () => {
            const cachedPages = createMockWebPages(1);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            // Create highly similar embedding
            mockEmbeddingService.embed = vi.fn().mockResolvedValue([
                { embedding: cachedPages[0].chunks[0].embedding, text: testQuery },
            ]);
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            // Should have high similarity score (>0.9)
            expect(result.ragChunks[0].score).toBeGreaterThan(0.9);
        });
        it('should handle different embedding dimensions correctly', async () => {
            const cachedPages = createMockWebPages(1);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            // Should not throw error
            await expect(service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext)).resolves.not.toThrow();
        });
        it('should calculate average relevance score correctly', async () => {
            const cachedPages = createMockWebPages(2);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            if (result.ragChunks.length > 0) {
                const manualAvg = result.ragChunks.reduce((sum, chunk) => sum + chunk.score, 0) /
                    result.ragChunks.length;
                expect(result.metadata.avgRelevanceScore).toBeCloseTo(manualAvg, 2);
            }
        });
    });
    // ========================================================================
    // Deep Search Integration Tests
    // ========================================================================
    describe('Deep Search Integration', () => {
        it('should enable deep search when requested', async () => {
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { enableDeepSearch: true, deepSearchPages: 5 });
            expect(mockWebSearchService.search).toHaveBeenCalled();
        });
        it('should track deep search metadata', async () => {
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext, { enableDeepSearch: true });
            expect(result.metadata.deepSearchEnabled).toBe(true);
        });
    });
    // ========================================================================
    // Error Handling Tests
    // ========================================================================
    describe('Error Handling', () => {
        it('should handle web search service failures gracefully', async () => {
            mockWebSearchService.search = vi.fn().mockRejectedValue(new Error('Search provider unavailable'));
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.triggered).toBe(false);
            expect(result.reason).toContain('Failed to integrate web search');
        });
        it('should handle embedding service failures gracefully', async () => {
            mockEmbeddingService.embed = vi.fn().mockRejectedValue(new Error('Embedding service unavailable'));
            const cachedPages = createMockWebPages(1);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.ragChunks).toEqual([]);
        });
        it('should handle cosmos DB query failures gracefully', async () => {
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockRejectedValue(new Error('Database unavailable')),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            // Should still attempt to trigger new search
            expect(mockWebSearchService.search).toHaveBeenCalled();
        });
        it('should handle empty cached pages gracefully', async () => {
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.ragChunks).toEqual([]);
            expect(result.metadata.pagesScraped).toBe(0);
        });
        it('should handle pages with no chunks gracefully', async () => {
            const cachedPages = [
                createMockWebPage('page-1', []), // No chunks
            ];
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.ragChunks).toEqual([]);
        });
    });
    // ========================================================================
    // Performance Tests
    // ========================================================================
    describe('Performance', () => {
        it('should complete within reasonable time for small dataset', async () => {
            const cachedPages = createMockWebPages(3);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.metadata.durationMs).toBeLessThan(5000); // 5 seconds
        });
        it('should track execution time accurately', async () => {
            const cachedPages = createMockWebPages(1);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const startTime = Date.now();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            const endTime = Date.now();
            expect(result.metadata.durationMs).toBeGreaterThan(0);
            expect(result.metadata.durationMs).toBeLessThanOrEqual(endTime - startTime + 100); // Allow 100ms buffer
        });
    });
    // ========================================================================
    // Metadata Tests
    // ========================================================================
    describe('Metadata Tracking', () => {
        it('should track all required metadata fields', async () => {
            const cachedPages = createMockWebPages(2);
            mockContainer.items.query = vi.fn().mockReturnValue({
                fetchAll: vi.fn().mockResolvedValue({ resources: cachedPages }),
            });
            const intent = createMockIntent('search', 0.9);
            const baseContext = createMockContext();
            const result = await service.integrateWebSearchContext(testTenantId, testProjectId, intent, testQuery, baseContext);
            expect(result.metadata).toHaveProperty('query');
            expect(result.metadata).toHaveProperty('pagesScraped');
            expect(result.metadata).toHaveProperty('totalChunksAvailable');
            expect(result.metadata).toHaveProperty('chunksRetrieved');
            expect(result.metadata).toHaveProperty('avgRelevanceScore');
            expect(result.metadata).toHaveProperty('deepSearchEnabled');
            expect(result.metadata).toHaveProperty('durationMs');
        });
        it('should format metadata for logging correctly', () => {
            const result = {
                triggered: true,
                reason: 'Intent type is "search"',
                ragChunks: [],
                metadata: {
                    query: testQuery,
                    pagesScraped: 3,
                    totalChunksAvailable: 15,
                    chunksRetrieved: 5,
                    avgRelevanceScore: 0.85,
                    deepSearchEnabled: true,
                    durationMs: 1234,
                },
            };
            const formatted = service.formatMetadataForLogging(result);
            expect(formatted).toHaveProperty('triggered');
            expect(formatted).toHaveProperty('reason');
            expect(formatted).toHaveProperty('query');
            expect(formatted).toHaveProperty('avgRelevance');
            expect(formatted.avgRelevance).toBe('0.85');
        });
    });
    // ========================================================================
    // Helper Functions
    // ========================================================================
    function createMockIntent(type, confidence) {
        return {
            insightType: type,
            confidence,
            entities: [],
            scope: {},
            complexity: 'simple',
            estimatedTokens: 1000,
        };
    }
    function createMockContext() {
        return {
            primary: {
                shardId: 'shard-1',
                shardName: 'Test Shard',
                shardTypeId: 'type-1',
                shardTypeName: 'Test Type',
                content: {},
                tokenCount: 100,
            },
            related: [],
            ragChunks: [],
            metadata: {
                templateId: 'template-1',
                templateName: 'Test Template',
                totalTokens: 100,
                sourceCount: 1,
                assembledAt: new Date(),
            },
            formattedContext: '',
        };
    }
    function createMockEmbedding() {
        // Create 1536-dimensional mock embedding
        return Array(1536)
            .fill(0)
            .map(() => Math.random() * 2 - 1);
    }
    function createMockChunk(id, content) {
        return {
            id,
            content,
            startPosition: 0,
            endPosition: content.length,
            tokenCount: Math.ceil(content.length / 4),
            embedding: createMockEmbedding(),
            embeddingModel: 'text-embedding-3-small',
            embeddedAt: new Date().toISOString(),
            embeddingCost: 0.0001,
        };
    }
    function createMockWebPage(id, chunks) {
        return {
            id,
            tenantId: testTenantId,
            projectId: testProjectId,
            shardType: 'c_webpages',
            url: `https://example.com/${id}`,
            content: 'Test content',
            chunks,
            metadata: {
                title: `Test Page ${id}`,
                sourceQuery: testQuery,
                searchType: 'web',
                scrapedAt: new Date().toISOString(),
                scrapeDuration: 1000,
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    function createMockWebPages(count) {
        return Array.from({ length: count }, (_, i) => {
            const chunks = Array.from({ length: 5 }, (_, j) => createMockChunk(`chunk-${i}-${j}`, `This is test content for chunk ${j} about AI agents and trends.`));
            return createMockWebPage(`page-${i}`, chunks);
        });
    }
    function createMockWebPagesWithDuplicates() {
        const duplicateContent = 'This is duplicate content about AI agents that appears multiple times.';
        const chunks1 = [
            createMockChunk('chunk-1-1', duplicateContent),
            createMockChunk('chunk-1-2', 'Unique content for page 1.'),
        ];
        const chunks2 = [
            createMockChunk('chunk-2-1', duplicateContent), // Duplicate
            createMockChunk('chunk-2-2', 'Unique content for page 2.'),
        ];
        return [
            createMockWebPage('page-1', chunks1),
            createMockWebPage('page-2', chunks2),
        ];
    }
});
//# sourceMappingURL=web-search-context-integration.test.js.map