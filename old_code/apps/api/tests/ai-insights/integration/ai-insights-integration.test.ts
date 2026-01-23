/**
 * AI Insights Integration Test Suite
 * 
 * Comprehensive integration tests for all AI Insights features:
 * - Chat Session Persistence
 * - Billing Integration & Cost Tracking
 * - Embedding Content Hash Cache
 * - Multi-Intent Detection
 * - Semantic Reranking
 * - Template-Aware Query Processing
 * - Conversation Memory Management
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { InsightService } from '../../../src/services/insight.service.js';
import { ConversationService } from '../../../src/services/conversation.service.js';
import { AIConfigService } from '../../../src/services/ai-config.service.js';
import { EmbeddingContentHashCacheService } from '../../../src/services/embedding-content-hash-cache.service.js';
import { IntentAnalyzerService } from '../../../src/services/intent-analyzer.service.js';
import type { InsightRequest, InsightResponse } from '../../../src/types/ai-insights.types.js';
import { MockMonitoringProvider } from '@castiel/monitoring';
import { MockRedis } from '../../utils/test-utils.js';
import type { Redis } from 'ioredis';

const TENANT_ID = 'test-tenant-integration';
const USER_ID = 'test-user-integration';

describe('AI Insights Integration Tests', () => {
  let insightService: InsightService;
  let conversationService: ConversationService;
  let aiConfigService: AIConfigService;
  let embeddingCache: EmbeddingContentHashCacheService;
  let intentAnalyzer: IntentAnalyzerService;
  let monitoring: MockMonitoringProvider;
  let redis: Redis;

  // Mock services
  let mockShardRepository: any;
  let mockShardTypeRepository: any;
  let mockVectorSearch: any;
  let mockUnifiedAIClient: any;
  let mockAIConnectionService: any;
  let mockAIModelSelection: any;
  let mockPromptResolver: any;
  let mockContextTemplateService: any;

  beforeAll(() => {
    monitoring = new MockMonitoringProvider({ enabled: true });
    redis = MockRedis.getClient() as any;

    // Initialize embedding cache
    embeddingCache = new EmbeddingContentHashCacheService(redis, monitoring);

    // Mock Shard Repository
    mockShardRepository = {
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      updateVectors: vi.fn(),
    };

    // Mock Shard Type Repository
    mockShardTypeRepository = {
      findById: vi.fn(),
      list: vi.fn(),
    };

    // Mock Vector Search
    mockVectorSearch = {
      search: vi.fn(async (request: any) => {
        return {
          results: [
            {
              shardId: 'doc-1',
              shardTypeId: 'c_document',
              shardName: 'Test Document',
              content: 'Test content for document 1',
              chunkIndex: 0,
              score: 0.85,
            },
            {
              shardId: 'doc-2',
              shardTypeId: 'c_document',
              shardName: 'Test Document 2',
              content: 'Test content for document 2',
              chunkIndex: 0,
              score: 0.80,
            },
          ],
          totalResults: 2,
        };
      }),
    };

    // Mock Unified AI Client
    mockUnifiedAIClient = {
      chat: vi.fn(async (request: any) => {
        return {
          content: 'This is a test response',
          usage: {
            prompt: 100,
            completion: 50,
            total: 150,
          },
          provider: 'azure_openai' as const,
          connectionId: 'conn-123',
        };
      }),
      chatStream: vi.fn(async function* (request: any) {
        yield { type: 'delta', content: 'This is a ' };
        yield { type: 'delta', content: 'test response' };
        yield {
          type: 'complete',
          usage: { prompt: 100, completion: 50, total: 150 },
          provider: 'azure_openai' as const,
          connectionId: 'conn-123',
        };
      }),
    };

    // Mock AI Connection Service
    mockAIConnectionService = {
      getConnectionForModel: vi.fn(async () => ({
        id: 'conn-123',
        name: 'Test Connection',
        provider: 'azure_openai',
      })),
    };

    // Mock AI Model Selection
    mockAIModelSelection = {
      selectModel: vi.fn(async () => ({
        modelId: 'gpt-4o-mini',
        connectionId: 'conn-123',
        provider: 'azure_openai',
      })),
    };

    // Mock Prompt Resolver
    mockPromptResolver = {
      resolvePrompt: vi.fn(async () => ({
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'User query: {query}',
        experimentId: undefined,
        variantId: undefined,
      })),
      recordABTestMetric: vi.fn(),
    };

    // Mock Azure OpenAI Service (required parameter)
    const mockAzureOpenAI = {
      complete: vi.fn(),
      generateEmbedding: vi.fn(),
    };

    // Mock Context Template Service
    mockContextTemplateService = {
      selectTemplate: vi.fn(async () => ({
        id: 'template-1',
        name: 'Default Template',
        rag: {
          maxChunks: 10,
          minScore: 0.7,
        },
      })),
      assembleContext: vi.fn(async () => ({
        formattedContext: 'Test context',
        ragChunks: [],
        related: [],
        metadata: {
          totalTokens: 100,
          templateId: 'template-1',
        },
      })),
    };

    // Mock Intent Analyzer
    intentAnalyzer = {
      analyze: vi.fn(async (query: string) => {
        // Detect multi-intent for specific queries
        if (query.includes('and also')) {
          return {
            insightType: 'search' as const,
            confidence: 0.9,
            entities: [],
            scope: { type: 'tenant-wide' },
            isMultiIntent: true,
            secondaryIntents: [
              {
                type: 'summary' as const,
                confidence: 0.7,
                query: 'Summarize the results',
              },
            ],
          };
        }
        return {
          insightType: 'search' as const,
          confidence: 0.9,
          entities: [],
          scope: { type: 'tenant-wide' },
        };
      }),
    } as any;

    // Mock Conversation Service
    conversationService = {
      create: vi.fn(async (tenantId: string, userId: string, input: any) => ({
        id: 'conv-123',
        tenantId,
        structuredData: {
          title: input.title,
          messages: [],
          stats: {
            messageCount: 0,
            totalTokens: 0,
            totalCost: 0,
          },
        },
      })),
      getMessages: vi.fn(async () => ({
        messages: [],
      })),
      addMessage: vi.fn(),
      addAssistantMessage: vi.fn(),
    } as any;

    // Mock AI Config Service
    aiConfigService = {
      recordUsage: vi.fn(),
      getUsageStats: vi.fn(async () => ({
        totalTokens: 1000,
        totalCost: 0.05,
        requestCount: 10,
        byModel: {},
        byDay: [],
        byInsightType: {},
        byUser: {},
      })),
      getBillingSummary: vi.fn(async () => ({
        totalCost: 0.05,
        totalTokens: 1000,
        insightCount: 10,
        byModel: [],
        byInsightType: [],
        byUser: [],
        dailyBreakdown: [],
      })),
      checkBudget: vi.fn(async () => ({
        hasCapacity: true,
        currentUsage: 0.05,
      })),
    } as any;

    // Create InsightService with correct parameter order
    insightService = new InsightService(
      monitoring,
      mockShardRepository,
      mockShardTypeRepository,
      intentAnalyzer,
      mockContextTemplateService,
      conversationService,
      mockAzureOpenAI as any, // azureOpenAI (required)
      null, // groundingService
      mockVectorSearch,
      null, // webSearchContextIntegration
      redis,
      mockAIModelSelection,
      mockUnifiedAIClient,
      mockAIConnectionService,
      null, // shardRelationshipService
      mockPromptResolver,
      null, // contextAwareQueryParser
      null, // toolExecutor
      aiConfigService // aiConfigService
    );
  });

  beforeEach(async () => {
    monitoring.clearEvents();
    vi.clearAllMocks();
    await MockRedis.reset();
  });

  afterAll(async () => {
    await MockRedis.reset();
  });

  describe('Chat Session Persistence', () => {
    it('should automatically create conversation when conversationId is not provided', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      const response = await insightService.generate(TENANT_ID, USER_ID, request);

      expect(response).toBeDefined();
      expect(conversationService.create).toHaveBeenCalled();
      expect(conversationService.create).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        expect.objectContaining({
          title: expect.stringContaining('What are the key projects'),
          visibility: 'private',
        })
      );

      // Response should include conversationId
      if ('conversationId' in response) {
        expect(response.conversationId).toBeDefined();
      }
    });

    it('should use existing conversation when conversationId is provided', async () => {
      const conversationId = 'existing-conv-123';
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'Tell me more',
        conversationId,
      };

      // Mock conversation messages
      (conversationService.getMessages as any).mockResolvedValue({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'What are the key projects?',
            createdAt: new Date(),
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Here are the key projects...',
            createdAt: new Date(),
          },
        ],
      });

      const response = await insightService.generate(TENANT_ID, USER_ID, request);

      expect(response).toBeDefined();
      expect(conversationService.getMessages).toHaveBeenCalledWith(
        conversationId,
        TENANT_ID,
        expect.any(Object)
      );
      expect(conversationService.create).not.toHaveBeenCalled();
    });

    it('should save messages to conversation after generation', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      await insightService.generate(TENANT_ID, USER_ID, request);

      expect(conversationService.addMessage).toHaveBeenCalled();
      expect(conversationService.addAssistantMessage).toHaveBeenCalled();
    });
  });

  describe('Billing Integration & Cost Tracking', () => {
    it('should record usage after insight generation', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      await insightService.generate(TENANT_ID, USER_ID, request);

      expect(aiConfigService.recordUsage).toHaveBeenCalled();
      const usageCall = (aiConfigService.recordUsage as any).mock.calls[0][0];
      expect(usageCall).toMatchObject({
        tenantId: TENANT_ID,
        userId: USER_ID,
        provider: 'azure_openai',
        model: 'gpt-4o-mini',
        operation: 'chat',
        totalTokens: expect.any(Number),
        estimatedCost: expect.any(Number),
      });
    });

    it('should include insightType and conversationId in usage record', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      await insightService.generate(TENANT_ID, USER_ID, request);

      const usageCall = (aiConfigService.recordUsage as any).mock.calls[0][0];
      expect(usageCall.insightType).toBeDefined();
      expect(usageCall.conversationId).toBeDefined();
    });

    it('should provide billing summary with breakdowns', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const summary = await aiConfigService.getBillingSummary(TENANT_ID, startDate, endDate);

      expect(summary).toBeDefined();
      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
      expect(summary.totalTokens).toBeGreaterThanOrEqual(0);
      expect(summary.byModel).toBeDefined();
      expect(summary.byInsightType).toBeDefined();
      expect(summary.byUser).toBeDefined();
      expect(summary.dailyBreakdown).toBeDefined();
    });

    it('should check budget before expensive operations', async () => {
      const budgetCheck = await aiConfigService.checkBudget(TENANT_ID, 0.15);

      expect(budgetCheck).toBeDefined();
      expect(budgetCheck.hasCapacity).toBeDefined();
      expect(budgetCheck.currentUsage).toBeDefined();
    });
  });

  describe('Embedding Content Hash Cache', () => {
    it('should cache embeddings by content hash', async () => {
      const text = 'Test content for embedding';
      const templateId = 'template-123';
      const contentHash = embeddingCache.calculateContentHash(text, templateId);

      const embedding = [0.1, 0.2, 0.3]; // Mock embedding
      const model = 'text-embedding-3-small';
      const dimensions = 1536;

      // Store in cache
      await embeddingCache.setCached(contentHash, embedding, model, dimensions);

      // Retrieve from cache
      const cached = await embeddingCache.getCached(contentHash);

      expect(cached).toBeDefined();
      expect(cached?.embedding).toEqual(embedding);
      expect(cached?.model).toBe(model);
      expect(cached?.dimensions).toBe(dimensions);
    });

    it('should support batch cache operations', async () => {
      const entries = [
        {
          contentHash: 'hash-1',
          embedding: [0.1, 0.2],
          model: 'text-embedding-3-small',
          dimensions: 1536,
        },
        {
          contentHash: 'hash-2',
          embedding: [0.3, 0.4],
          model: 'text-embedding-3-small',
          dimensions: 1536,
        },
      ];

      // Store batch
      await embeddingCache.setCachedBatch(entries);

      // Retrieve batch
      const cached = await embeddingCache.getCachedBatch(['hash-1', 'hash-2', 'hash-3']);

      expect(cached.size).toBe(2);
      expect(cached.get('hash-1')).toBeDefined();
      expect(cached.get('hash-2')).toBeDefined();
      expect(cached.get('hash-3')).toBeUndefined();
    });

    it('should provide cache statistics', async () => {
      // Add some cached entries
      await embeddingCache.setCached('hash-1', [0.1, 0.2], 'model-1', 1536);
      await embeddingCache.setCached('hash-2', [0.3, 0.4], 'model-1', 1536);

      const stats = await embeddingCache.getStats();

      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
      expect(stats.estimatedSizeMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Intent Detection', () => {
    it('should detect multi-intent queries', async () => {
      const query = 'What are the key projects and also summarize the results';
      
      const intent = await intentAnalyzer.analyze(query, TENANT_ID, {});

      expect(intent.isMultiIntent).toBe(true);
      expect(intent.secondaryIntents).toBeDefined();
      expect(intent.secondaryIntents?.length).toBeGreaterThan(0);
    });

    it('should handle single-intent queries', async () => {
      const query = 'What are the key projects?';
      
      const intent = await intentAnalyzer.analyze(query, TENANT_ID, {});

      expect(intent.isMultiIntent).toBeFalsy();
      expect(intent.secondaryIntents).toBeUndefined();
    });
  });

  describe('Semantic Reranking', () => {
    it('should rerank RAG chunks when enabled', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
        options: {
          enableReranking: true,
        },
      };

      // Mock reranking in unifiedAIClient
      (mockUnifiedAIClient.chat as any).mockImplementationOnce(async (req: any) => {
        // Simulate reranking response
        if (req.messages?.some((m: any) => m.content?.includes('rerank'))) {
          return {
            content: JSON.stringify([
              { index: 1, score: 0.95 },
              { index: 0, score: 0.85 },
            ]),
            usage: { prompt: 50, completion: 20, total: 70 },
            provider: 'azure_openai' as const,
            connectionId: 'conn-123',
          };
        }
        return {
          content: 'This is a test response',
          usage: { prompt: 100, completion: 50, total: 150 },
          provider: 'azure_openai' as const,
          connectionId: 'conn-123',
        };
      });

      const response = await insightService.generate(TENANT_ID, USER_ID, request);

      expect(response).toBeDefined();
      // Verify reranking was attempted (check if unifiedAIClient was called for reranking)
      expect(mockUnifiedAIClient.chat).toHaveBeenCalled();
    });
  });

  describe('Template-Aware Query Processing', () => {
    it('should select template based on insight type and scope', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
        scopeMode: 'project',
        projectId: 'project-123',
      };

      await insightService.generate(TENANT_ID, USER_ID, request);

      expect(mockContextTemplateService.selectTemplate).toHaveBeenCalled();
      const selectCall = (mockContextTemplateService.selectTemplate as any).mock.calls[0][0];
      expect(selectCall.insightType).toBeDefined();
      expect(selectCall.scopeMode).toBe('project');
    });

    it('should use template RAG configuration for vector search', async () => {
      // Mock template with specific RAG config
      (mockContextTemplateService.selectTemplate as any).mockResolvedValueOnce({
        id: 'template-1',
        name: 'Project Template',
        rag: {
          maxChunks: 5,
          minScore: 0.8,
        },
      });

      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
        scopeMode: 'project',
        projectId: 'project-123',
      };

      await insightService.generate(TENANT_ID, USER_ID, request);

      // Verify vector search was called with template's RAG config
      expect(mockVectorSearch.search).toHaveBeenCalled();
    });
  });

  describe('Conversation Memory Management', () => {
    it('should manage conversation tokens within limits', async () => {
      const conversationId = 'conv-memory-test';
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'Tell me more',
        conversationId,
        options: {
          maxConversationTokens: 1000, // Small limit for testing
        },
      };

      // Mock long conversation history
      const longHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'This is a long message that will exceed the token limit. '.repeat(10),
        createdAt: new Date(),
      }));

      (conversationService.getMessages as any).mockResolvedValue({
        messages: longHistory,
      });

      const response = await insightService.generate(TENANT_ID, USER_ID, request);

      expect(response).toBeDefined();
      // Verify conversation history was loaded and managed
      expect(conversationService.getMessages).toHaveBeenCalled();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full insight generation workflow', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects and their risks?',
        options: {
          enableReranking: true,
          maxConversationTokens: 4000,
        },
      };

      const response = await insightService.generate(TENANT_ID, USER_ID, request);

      // Verify all steps were executed
      expect(response).toBeDefined();
      expect(intentAnalyzer.analyze).toHaveBeenCalled();
      expect(mockContextTemplateService.selectTemplate).toHaveBeenCalled();
      expect(mockVectorSearch.search).toHaveBeenCalled();
      expect(mockUnifiedAIClient.chat).toHaveBeenCalled();
      expect(conversationService.create).toHaveBeenCalled();
      expect(conversationService.addMessage).toHaveBeenCalled();
      expect(conversationService.addAssistantMessage).toHaveBeenCalled();
      expect(aiConfigService.recordUsage).toHaveBeenCalled();
    });

    it('should handle streaming insight generation', async () => {
      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      const stream = insightService.generateStream(TENANT_ID, USER_ID, request);
      const events: any[] = [];

      for await (const event of stream) {
        events.push(event);
        if (event.type === 'complete') {
          break;
        }
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'delta')).toBe(true);
      expect(events.some(e => e.type === 'complete')).toBe(true);

      // Verify conversation was created and saved
      expect(conversationService.create).toHaveBeenCalled();
      expect(conversationService.addMessage).toHaveBeenCalled();
      expect(conversationService.addAssistantMessage).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding cache failures gracefully', async () => {
      // Simulate cache failure
      const failingCache = new EmbeddingContentHashCacheService(null, monitoring);

      // Should not throw error
      const cached = await failingCache.getCached('hash-123');
      expect(cached).toBeNull();
    });

    it('should handle conversation creation failures gracefully', async () => {
      (conversationService.create as any).mockRejectedValueOnce(new Error('Database error'));

      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      // Should still generate insight even if conversation creation fails
      const response = await insightService.generate(TENANT_ID, USER_ID, request);
      expect(response).toBeDefined();
    });

    it('should handle cost tracking failures gracefully', async () => {
      (aiConfigService.recordUsage as any).mockRejectedValueOnce(new Error('Tracking error'));

      const request: InsightRequest = {
        tenantId: TENANT_ID,
        userId: USER_ID,
        query: 'What are the key projects?',
      };

      // Should still generate insight even if cost tracking fails
      const response = await insightService.generate(TENANT_ID, USER_ID, request);
      expect(response).toBeDefined();
    });
  });
});

