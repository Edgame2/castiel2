/**
 * AI Insights Service Tests
 * Unit tests for the main InsightsService
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InsightsService } from '../../../src/services/ai-insights/insights.service';
import { AIInsightsCosmosService } from '../../../src/services/ai-insights/cosmos.service';
import { IntentAnalyzerService } from '../../../src/services/ai/intent-analyzer.service';
import { ContextTemplateService } from '../../../src/services/ai/context-template.service';
import { ModelRouterService } from '../../../src/services/ai/model-router.service';
import { ConversationService } from '../../../src/services/ai/conversation.service';
import type { InsightRequest } from '../../../src/types/ai-insights.types';

// ==========================================================================
// Mocks
// ==========================================================================

const mockMonitoring = {
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    trackMetric: vi.fn(),
};

const mockCosmosService = {
    getFeedbackContainer: vi.fn(),
    create: vi.fn(),
    read: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
    queryAll: vi.fn(),
    buildPartitionKey: vi.fn((...parts) => parts),
    healthCheck: vi.fn().mockResolvedValue(true),
} as unknown as AIInsightsCosmosService;

const mockIntentAnalyzer = {
    analyzeIntent: vi.fn(),
} as unknown as IntentAnalyzerService;

const mockContextService = {
    assembleContext: vi.fn(),
} as unknown as ContextTemplateService;

const mockModelRouter = {
    selectModel: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
} as unknown as ModelRouterService;

const mockConversationService = {
    getConversation: vi.fn(),
} as unknown as ConversationService;

// ==========================================================================
// Test Suite
// ==========================================================================

describe('InsightsService', () => {
    let service: InsightsService;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Create service instance
        service = new InsightsService(
            mockMonitoring as any,
            mockCosmosService,
            mockIntentAnalyzer,
            mockContextService,
            mockModelRouter,
            mockConversationService
        );
    });

    describe('generateInsight', () => {
        const mockRequest: InsightRequest = {
            query: 'What are the key risks in this project?',
            tenantId: 'tenant-123',
            userId: 'user-456',
            shardId: 'shard-789',
        };

        const mockIntent = {
            insightType: 'analysis' as const,
            confidence: 0.9,
            entities: [
                {
                    type: 'shard-id' as const,
                    value: 'shard-789',
                    confidence: 1.0,
                    source: 'explicit' as const,
                },
            ],
            scope: 'single-shard' as const,
            targetShardIds: ['shard-789'],
            reasoning: 'User explicitly mentioned project risks',
        };

        const mockContext = {
            text: 'Project context...',
            shards: [
                {
                    id: 'shard-789',
                    type: 'project',
                    title: 'Project Alpha',
                    content: 'Project details...',
                    relevanceScore: 1.0,
                    includeReason: 'Primary target',
                },
            ],
            totalTokens: 500,
            truncated: false,
            metadata: {
                templateId: 'template-1',
                templateName: 'Project Analysis',
                assemblyTime: 100,
                shardsIncluded: 1,
                shardsAvailable: 1,
                retrievalMethod: 'template' as const,
            },
        };

        const mockModel = {
            id: 'gpt-4',
            provider: 'openai',
            name: 'GPT-4',
            version: '2024-01-01',
            defaultTemperature: 0.7,
            defaultMaxTokens: 2000,
            pricing: {
                promptPer1k: 0.03,
                completionPer1k: 0.06,
            },
        };

        const mockGeneration = {
            content: 'Based on the project details, the key risks are...',
            usage: {
                promptTokens: 600,
                completionTokens: 200,
                totalTokens: 800,
            },
        };

        beforeEach(() => {
            // Setup default mock responses
            (mockIntentAnalyzer.analyzeIntent as any).mockResolvedValue(mockIntent);
            (mockContextService.assembleContext as any).mockResolvedValue(mockContext);
            (mockModelRouter.selectModel as any).mockResolvedValue(mockModel);
            (mockModelRouter.generate as any).mockResolvedValue(mockGeneration);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});
            (mockCosmosService.create as any).mockResolvedValue({});
            (mockCosmosService.buildPartitionKey as any).mockReturnValue([
                'tenant-123',
                'insight-id',
                'user-456',
            ]);
        });

        it('should generate insight successfully', async () => {
            const result = await service.generateInsight(mockRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe('completed');
            expect(result.query).toBe(mockRequest.query);
            expect(result.tenantId).toBe(mockRequest.tenantId);
            expect(result.userId).toBe(mockRequest.userId);
            expect(result.insightType).toBe('analysis');
            expect(result.result).toContain('key risks');
        });

        it('should call intent analyzer with correct parameters', async () => {
            await service.generateInsight(mockRequest);

            expect(mockIntentAnalyzer.analyzeIntent).toHaveBeenCalledWith(
                mockRequest.query,
                expect.objectContaining({
                    tenantId: mockRequest.tenantId,
                    userId: mockRequest.userId,
                    shardId: mockRequest.shardId,
                })
            );
        });

        it('should call context service with intent result', async () => {
            await service.generateInsight(mockRequest);

            expect(mockContextService.assembleContext).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: mockRequest.tenantId,
                    userId: mockRequest.userId,
                    query: mockRequest.query,
                    scope: mockIntent.scope,
                    targetShardIds: mockIntent.targetShardIds,
                })
            );
        });

        it('should call model router for generation', async () => {
            await service.generateInsight(mockRequest);

            expect(mockModelRouter.selectModel).toHaveBeenCalled();
            expect(mockModelRouter.generate).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: mockRequest.tenantId,
                    modelId: mockModel.id,
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' }),
                        expect.objectContaining({ role: 'user' }),
                    ]),
                })
            );
        });

        it('should store insight in Cosmos DB', async () => {
            await service.generateInsight(mockRequest);

            expect(mockCosmosService.create).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    type: 'insight',
                    tenantId: mockRequest.tenantId,
                    userId: mockRequest.userId,
                    query: mockRequest.query,
                })
            );
        });

        it('should track performance metrics', async () => {
            const result = await service.generateInsight(mockRequest);

            expect(result.performance).toBeDefined();
            expect(result.performance.intentAnalysisMs).toBeGreaterThan(0);
            expect(result.performance.contextAssemblyMs).toBeGreaterThan(0);
            expect(result.performance.modelGenerationMs).toBeGreaterThan(0);
            expect(result.performance.groundingMs).toBeGreaterThan(0);
            expect(result.performance.totalMs).toBeGreaterThan(0);
            expect(result.performance.tokensUsed.total).toBe(800);
        });

        it('should calculate cost based on token usage', async () => {
            const result = await service.generateInsight(mockRequest);

            expect(result.performance.cost).toBeDefined();
            expect(result.performance.cost?.amount).toBeGreaterThan(0);
            expect(result.performance.cost?.currency).toBe('USD');

            // Cost should be: (600/1000 * 0.03) + (200/1000 * 0.06) = 0.018 + 0.012 = 0.03
            expect(result.performance.cost?.amount).toBeCloseTo(0.03, 4);
        });

        it('should include grounding result', async () => {
            const result = await service.generateInsight(mockRequest);

            expect(result.grounding).toBeDefined();
            expect(result.grounding.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.grounding.overallScore).toBeLessThanOrEqual(1);
            expect(result.grounding.hallucinationRisk).toMatch(/^(low|medium|high)$/);
        });

        it('should include citations', async () => {
            const result = await service.generateInsight(mockRequest);

            expect(result.citations).toBeDefined();
            expect(Array.isArray(result.citations)).toBe(true);
        });

        it('should track monitoring events', async () => {
            await service.generateInsight(mockRequest);

            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
                'InsightGenerated',
                expect.objectContaining({
                    tenantId: mockRequest.tenantId,
                    userId: mockRequest.userId,
                    insightType: 'analysis',
                })
            );

            expect(mockMonitoring.trackMetric).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const error = new Error('Generation failed');
            (mockModelRouter.generate as any).mockRejectedValueOnce(error);

            await expect(service.generateInsight(mockRequest)).rejects.toThrow('Generation failed');

            expect(mockMonitoring.trackException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    tenantId: mockRequest.tenantId,
                    userId: mockRequest.userId,
                })
            );
        });

        it('should respect user-provided temperature', async () => {
            const requestWithTemp = {
                ...mockRequest,
                temperature: 0.5,
            };

            await service.generateInsight(requestWithTemp);

            expect(mockModelRouter.generate).toHaveBeenCalledWith(
                expect.objectContaining({
                    temperature: 0.5,
                })
            );
        });

        it('should respect user-provided maxTokens', async () => {
            const requestWithMax = {
                ...mockRequest,
                maxTokens: 1000,
            };

            await service.generateInsight(requestWithMax);

            expect(mockModelRouter.generate).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxTokens: 1000,
                })
            );
        });
    });

    describe('generateInsightStream', () => {
        const mockRequest: InsightRequest = {
            query: 'Summarize this project',
            tenantId: 'tenant-123',
            userId: 'user-456',
            stream: true,
        };

        beforeEach(() => {
            const mockIntent = {
                insightType: 'summary' as const,
                confidence: 0.95,
                entities: [],
                scope: 'single-shard' as const,
                reasoning: 'Summary requested',
            };

            const mockContext = {
                text: 'Context...',
                shards: [],
                totalTokens: 100,
                truncated: false,
                metadata: {
                    templateId: 'template-1',
                    templateName: 'Summary',
                    assemblyTime: 50,
                    shardsIncluded: 0,
                    shardsAvailable: 0,
                    retrievalMethod: 'template' as const,
                },
            };

            const mockModel = {
                id: 'gpt-3.5-turbo',
                provider: 'openai',
                name: 'GPT-3.5 Turbo',
                pricing: {
                    promptPer1k: 0.001,
                    completionPer1k: 0.002,
                },
            };

            (mockIntentAnalyzer.analyzeIntent as any).mockResolvedValue(mockIntent);
            (mockContextService.assembleContext as any).mockResolvedValue(mockContext);
            (mockModelRouter.selectModel as any).mockResolvedValue(mockModel);
            (mockModelRouter.generateStream as any).mockImplementation(async (req: any, onToken: any) => {
                // Simulate streaming tokens
                onToken('This ');
                onToken('is ');
                onToken('a ');
                onToken('summary.');

                return {
                    content: 'This is a summary.',
                    usage: {
                        promptTokens: 100,
                        completionTokens: 50,
                        totalTokens: 150,
                    },
                };
            });
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});
            (mockCosmosService.create as any).mockResolvedValue({});
            (mockCosmosService.buildPartitionKey as any).mockReturnValue(['tenant-123', 'id', 'user-456']);
        });

        it('should stream chunks during generation', async () => {
            const chunks: any[] = [];
            const onChunk = vi.fn((chunk) => chunks.push(chunk));

            await service.generateInsightStream(mockRequest, onChunk);

            expect(onChunk).toHaveBeenCalled();
            expect(chunks.length).toBeGreaterThan(0);

            // Check chunk types
            const chunkTypes = chunks.map((c) => c.type);
            expect(chunkTypes).toContain('intent');
            expect(chunkTypes).toContain('context');
            expect(chunkTypes).toContain('token');
            expect(chunkTypes).toContain('citation');
            expect(chunkTypes).toContain('grounding');
            expect(chunkTypes).toContain('complete');
        });

        it('should send intent chunk first', async () => {
            const chunks: any[] = [];
            await service.generateInsightStream(mockRequest, (chunk) => chunks.push(chunk));

            expect(chunks[0].type).toBe('intent');
            expect(chunks[0].data).toHaveProperty('insightType');
        });

        it('should send token chunks during generation', async () => {
            const chunks: any[] = [];
            await service.generateInsightStream(mockRequest, (chunk) => chunks.push(chunk));

            const tokenChunks = chunks.filter((c) => c.type === 'token');
            expect(tokenChunks.length).toBeGreaterThan(0);
            expect(tokenChunks[0].data).toHaveProperty('token');
        });

        it('should send complete chunk at the end', async () => {
            const chunks: any[] = [];
            await service.generateInsightStream(mockRequest, (chunk) => chunks.push(chunk));

            const lastChunk = chunks[chunks.length - 1];
            expect(lastChunk.type).toBe('complete');
            expect(lastChunk.data).toHaveProperty('id');
            expect(lastChunk.data).toHaveProperty('result');
        });

        it('should send error chunk on failure', async () => {
            const error = new Error('Stream failed');
            (mockModelRouter.generateStream as any).mockRejectedValueOnce(error);

            const chunks: any[] = [];
            await expect(
                service.generateInsightStream(mockRequest, (chunk) => chunks.push(chunk))
            ).rejects.toThrow();

            const errorChunks = chunks.filter((c) => c.type === 'error');
            expect(errorChunks.length).toBeGreaterThan(0);
        });
    });

    describe('getInsight', () => {
        it('should retrieve insight by ID', async () => {
            const mockInsight = {
                id: 'insight-123',
                tenantId: 'tenant-123',
                userId: 'user-456',
                query: 'Test query',
                status: 'completed',
            };

            (mockCosmosService.read as any).mockResolvedValue(mockInsight);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});

            const result = await service.getInsight('tenant-123', 'insight-123', 'user-456');

            expect(result).toEqual(mockInsight);
            expect(mockCosmosService.read).toHaveBeenCalled();
        });

        it('should return null if insight not found', async () => {
            (mockCosmosService.read as any).mockResolvedValue(null);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});

            const result = await service.getInsight('tenant-123', 'nonexistent', 'user-456');

            expect(result).toBeNull();
        });
    });

    describe('listInsights', () => {
        it('should list insights with pagination', async () => {
            const mockResults = {
                items: [
                    { id: 'insight-1', query: 'Query 1' },
                    { id: 'insight-2', query: 'Query 2' },
                ],
                continuationToken: 'token-123',
                hasMore: true,
            };

            (mockCosmosService.query as any).mockResolvedValue(mockResults);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});

            const result = await service.listInsights('tenant-123', 'user-456', { limit: 2 });

            expect(result.items).toHaveLength(2);
            expect(result.hasMore).toBe(true);
            expect(mockCosmosService.query).toHaveBeenCalled();
        });

        it('should filter by status', async () => {
            const mockResults = {
                items: [{ id: 'insight-1', status: 'completed' }],
                continuationToken: undefined,
                hasMore: false,
            };

            (mockCosmosService.query as any).mockResolvedValue(mockResults);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});

            await service.listInsights('tenant-123', 'user-456', { status: 'completed' });

            expect(mockCosmosService.query).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    query: expect.stringContaining('c.status = @status'),
                }),
                expect.anything()
            );
        });
    });

    describe('deleteInsight', () => {
        it('should delete insight successfully', async () => {
            (mockCosmosService.delete as any).mockResolvedValue(undefined);
            (mockCosmosService.getFeedbackContainer as any).mockReturnValue({});

            await service.deleteInsight('tenant-123', 'insight-123', 'user-456');

            expect(mockCosmosService.delete).toHaveBeenCalled();
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith(
                'InsightDeleted',
                expect.objectContaining({
                    insightId: 'insight-123',
                    tenantId: 'tenant-123',
                    userId: 'user-456',
                })
            );
        });
    });
});
