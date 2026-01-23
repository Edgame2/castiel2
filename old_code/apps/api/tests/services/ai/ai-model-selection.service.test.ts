/**
 * AI Model Selection Service Tests
 * Unit tests for intelligent model selection logic
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIModelSelectionService } from '../../../src/services/ai/ai-model-selection.service.js'
import { AIConnectionService } from '../../../src/services/ai/ai-connection.service.js'
import { ModelRouterService } from '../../../src/services/model-router.service.js'
import type { AIConnection, AIModel, AIConnectionCredentials, AIModelProvider, AIModelHoster } from '@castiel/shared-types'
import type { ModelSelectionRequest } from '../../../src/types/ai-insights.types.js'

// ==========================================================================
// Mocks
// ==========================================================================

const mockMonitoring = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  startTimer: vi.fn().mockReturnValue({ stop: vi.fn() }),
}

const mockAIConnectionService = {
  listConnections: vi.fn(),
  getDefaultConnection: vi.fn(),
  getConnectionForModel: vi.fn(),
  getConnectionWithCredentials: vi.fn(),
  getModelById: vi.fn(), // Added for bracket notation access in scoreConnections
} as unknown as AIConnectionService

const mockModelRouter = {
  analyzeComplexity: vi.fn(),
} as unknown as ModelRouterService

// Mock AI models
const createMockModel = (
  id: string,
  provider: AIModelProvider,
  qualityTier: 'economy' | 'standard' | 'premium',
  capabilities: Array<'text' | 'image' | 'audio' | 'video' | 'embedding'>,
  inputPrice: number,
  outputPrice: number,
  taskScores?: Record<string, number>
): AIModel => ({
  id,
  name: `Model ${id}`,
  type: 'LLM', // Use 'type' property with uppercase 'LLM' to match AIModel interface
  provider,
  hoster: provider as AIModelHoster,
  qualityTier,
  capabilities,
  contextWindow: 128000,
  inputPricePerMillion: inputPrice,
  outputPricePerMillion: outputPrice,
  supportsStreaming: true,
  taskScores: taskScores || {
    textGeneration: 80,
    reasoning: 80,
    coding: 80,
    creative: 80,
    dataAnalysis: 80,
    conversation: 80,
  },
  avgLatencyMs: qualityTier === 'economy' ? 1500 : qualityTier === 'standard' ? 3000 : 5000,
  maxConcurrency: 100,
  isActive: true,
})

// Mock AI connections
const createMockConnection = (
  model: AIModel,
  tenantId: string = 'tenant-123'
): AIConnection => ({
  id: `conn-${model.id}`,
  name: `Connection ${model.name}`,
  modelId: model.id,
  tenantId,
  endpoint: `https://api.${model.provider}.com`,
  isDefaultModel: false,
  status: 'active',
  createdAt: new Date().toISOString(),
  createdBy: 'system',
  updatedAt: new Date().toISOString(),
})

// Mock connection with credentials
const createMockConnectionWithCreds = (
  connection: AIConnection,
  model: AIModel
): AIConnectionCredentials => ({
  connection,
  model,
  apiKey: 'test-key',
})

// ==========================================================================
// Test Suite
// ==========================================================================

describe('AIModelSelectionService', () => {
  let service: AIModelSelectionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AIModelSelectionService(
      mockAIConnectionService,
      mockModelRouter,
      mockMonitoring as any
    )
  })

  describe('selectModel - complexity-based selection', () => {
    it('should select economy model for simple tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'What is 2+2?',
        tenantId: 'tenant-123',
        taskComplexity: 15,
      }

      const economyModel = createMockModel('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5, {
        textGeneration: 75,
        reasoning: 65,
        coding: 70,
        creative: 72,
        dataAnalysis: 68,
        conversation: 80,
      })

      const premiumModel = createMockModel('gpt-4', 'openai', 'premium', ['text'], 30.0, 60.0)

      const economyConnection = createMockConnection(economyModel)
      const premiumConnection = createMockConnection(premiumModel)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [economyConnection, premiumConnection],
        total: 2,
      })

      vi.mocked(mockModelRouter.analyzeComplexity).mockResolvedValue({
        score: 15,
        category: 'simple',
        confidence: 0.9,
      })

      // Mock getModelById to return models based on modelId
      vi.mocked(mockAIConnectionService.getModelById).mockImplementation(
        async (modelId: string) => {
          if (modelId === economyModel.id) return economyModel
          if (modelId === premiumModel.id) return premiumModel
          return null
        }
      )

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockImplementation(
        async (id: string) => {
          if (id === economyConnection.id) {
            return createMockConnectionWithCreds(economyConnection, economyModel)
          }
          return null
        }
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.qualityTier).toBe('economy')
        expect(result.reason).toContain('economy')
      }
    })

    it('should select premium model for complex tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'Analyze this complex legal document',
        tenantId: 'tenant-123',
        taskComplexity: 85,
      }

      const economyModel = createMockModel('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5)
      const premiumModel = createMockModel('claude-3-opus', 'anthropic', 'premium', ['text', 'image'], 15.0, 75.0, {
        textGeneration: 95,
        reasoning: 98,
        coding: 93,
        creative: 92,
        dataAnalysis: 95,
        conversation: 92,
      })

      const economyConnection = createMockConnection(economyModel)
      const premiumConnection = createMockConnection(premiumModel)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [economyConnection, premiumConnection],
        total: 2,
      })

      vi.mocked(mockModelRouter.analyzeComplexity).mockResolvedValue({
        score: 85,
        category: 'complex',
        confidence: 0.95,
      })

      // Mock getModelById to return models based on modelId
      vi.mocked(mockAIConnectionService.getModelById).mockImplementation(
        async (modelId: string) => {
          if (modelId === economyModel.id) return economyModel
          if (modelId === premiumModel.id) return premiumModel
          return null
        }
      )

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockImplementation(
        async (id: string) => {
          if (id === premiumConnection.id) {
            return createMockConnectionWithCreds(premiumConnection, premiumModel)
          }
          return null
        }
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.qualityTier).toBe('premium')
      }
    })
  })

  describe('selectModel - error handling', () => {
    it('should return error when no connections available', async () => {
      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [],
        total: 0,
      })

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NO_CONNECTIONS')
        expect(result.message).toContain('No AI models configured')
      }
    })
  })

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const model = createMockModel('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const connection = createMockConnection(model)
      const inputTokens = 1000
      const outputTokens = 500

      const cost = service.estimateCost(
        createMockConnectionWithCreds(connection, model),
        inputTokens,
        outputTokens
      )

      // Expected: (1000/1M * 5.0) + (500/1M * 15.0) = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 4)
    })

    it('should handle zero output tokens', () => {
      const model = createMockModel('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const connection = createMockConnection(model)
      const inputTokens = 2000
      const outputTokens = 0

      const cost = service.estimateCost(
        createMockConnectionWithCreds(connection, model),
        inputTokens,
        outputTokens
      )

      // Expected: (2000/1M * 5.0) = 0.01
      expect(cost).toBeCloseTo(0.01, 4)
    })
  })
})

// ==========================================================================
// Test Suite
// ==========================================================================

describe('AIModelSelectionService', () => {
  let service: AIModelSelectionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AIModelSelectionService(
      mockAIConnectionService,
      mockModelRouter,
      mockMonitoring as any
    )
  })

  describe('selectModel - complexity-based selection', () => {
    it('should select economy model for simple tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'What is 2+2?',
        tenantId: 'tenant-123',
        taskComplexity: 15,
      }

      const economyModel = createMockModel('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5, {
        textGeneration: 75,
        reasoning: 65,
        coding: 70,
        creative: 72,
        dataAnalysis: 68,
        conversation: 80,
      })

      const premiumModel = createMockModel('gpt-4', 'openai', 'premium', ['text'], 30.0, 60.0)

      const economyConnection = createMockConnection(economyModel)
      const premiumConnection = createMockConnection(premiumModel)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [economyConnection, premiumConnection],
        total: 2,
      })

      vi.mocked(mockModelRouter.analyzeComplexity).mockResolvedValue({
        score: 15,
        category: 'simple',
        confidence: 0.9,
      })

      // Mock getModelById to return models based on modelId
      vi.mocked(mockAIConnectionService.getModelById).mockImplementation(
        async (modelId: string) => {
          if (modelId === economyModel.id) return economyModel
          if (modelId === premiumModel.id) return premiumModel
          return null
        }
      )

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockImplementation(
        async (id: string) => {
          if (id === economyConnection.id) {
            return createMockConnectionWithCreds(economyConnection, economyModel)
          }
          return null
        }
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.qualityTier).toBe('economy')
        expect(result.reason).toContain('economy')
      }
    })

    it('should select premium model for complex tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'Analyze this complex legal document and provide detailed risk assessment',
        tenantId: 'tenant-123',
        taskComplexity: 85,
      }

      const economyModel = createMockModel('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5)

      const premiumModel = createMockModel(
        'claude-3-opus',
        'anthropic',
        'premium',
        ['text', 'image'],
        15.0,
        75.0,
        {
          textGeneration: 95,
          reasoning: 98,
          coding: 93,
          creative: 92,
          dataAnalysis: 95,
          conversation: 92,
        }
      )

      const economyConnection = createMockConnection(economyModel)
      const premiumConnection = createMockConnection(premiumModel)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [economyConnection, premiumConnection],
        total: 2,
      })

      vi.mocked(mockModelRouter.analyzeComplexity).mockResolvedValue({
        score: 85,
        category: 'complex',
        confidence: 0.95,
      })

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockImplementation(
        async (id: string) => {
          if (id === premiumConnection.id) {
            return createMockConnectionWithCreds(premiumConnection, premiumModel)
          }
          return null
        }
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.qualityTier).toBe('premium')
      }
    })

    it('should select standard model for moderate tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'Write a function to parse JSON',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      const economyModel = createMockModel('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5)
      const standardModel = createMockModel('gpt-4o', 'openai', 'standard', ['text', 'image'], 5.0, 15.0)
      const premiumModel = createMockModel('gpt-4', 'openai', 'premium', ['text'], 30.0, 60.0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [
          createMockConnection(economyModel),
          createMockConnection(standardModel),
          createMockConnection(premiumModel),
        ],
        total: 3,
      })

      vi.mocked(mockModelRouter.analyzeComplexity).mockResolvedValue({
        score: 50,
        category: 'moderate',
        confidence: 0.85,
      })

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockImplementation(
        async (id: string) => {
          const conn = [economyModel, standardModel, premiumModel].find(
            (m) => id === `conn-${m.modelId}`
          )
          if (conn) {
            return createMockConnectionWithCreds(
              createMockConnection(conn),
              conn
            )
          }
          return null
        }
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.qualityTier).toBe('standard')
      }
    })
  })

  describe('selectModel - content type routing', () => {
    it('should select image generation model', async () => {
      const request: ModelSelectionRequest = {
        query: 'Create an image of a sunset',
        tenantId: 'tenant-123',
        requiredContentType: 'image',
        taskComplexity: 50,
      }

      const imageModel = createMockModel('dall-e-3', 'openai', 'premium', ['image'], 40.0, 0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [createMockConnection(imageModel)],
        total: 1,
      })

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockResolvedValue(
        createMockConnectionWithCreds(createMockConnection(imageModel), imageModel)
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.capabilities).toContain('image')
        expect(result.model.modelId).toBe('dall-e-3')
      }
    })

    it('should select audio generation model', async () => {
      const request: ModelSelectionRequest = {
        query: 'Convert this to speech',
        tenantId: 'tenant-123',
        requiredContentType: 'audio',
        taskComplexity: 30,
      }

      const audioModel = createMockModel('tts-1', 'openai', 'standard', ['audio'], 15.0, 0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [createMockConnection(audioModel)],
        total: 1,
      })

      vi.mocked(mockAIConnectionService.getConnectionWithCredentials).mockResolvedValue(
        createMockConnectionWithCreds(createMockConnection(audioModel), audioModel)
      )

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.model.capabilities).toContain('audio')
      }
    })
  })

  describe('selectModel - error handling', () => {
    it('should return error when no connections available', async () => {
      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [],
        total: 0,
      })

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NO_CONNECTIONS')
        expect(result.message).toContain('No AI models configured')
      }
    })

    it('should return error when content type not supported', async () => {
      const request: ModelSelectionRequest = {
        query: 'Create a video',
        tenantId: 'tenant-123',
        requiredContentType: 'video',
        taskComplexity: 50,
      }

      const textModel = createMockModel('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue({
        connections: [createMockConnection(textModel)],
        total: 1,
      })

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONTENT_TYPE_UNSUPPORTED')
        expect(result.message).toContain('video')
      }
    })
  })

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const model = createMockModel('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const inputTokens = 1000
      const outputTokens = 500

      const cost = service.estimateCost(
        createMockConnectionWithCreds(createMockConnection(model), model),
        inputTokens,
        outputTokens
      )

      // Expected: (1000/1M * 5.0) + (500/1M * 15.0) = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 4)
    })

    it('should handle zero output tokens', () => {
      const model = createMockModel('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const inputTokens = 2000
      const outputTokens = 0

      const cost = service.estimateCost(
        createMockConnectionWithCreds(createMockConnection(model), model),
        inputTokens,
        outputTokens
      )

      // Expected: (2000/1M * 5.0) = 0.01
      expect(cost).toBeCloseTo(0.01, 4)
    })

    it('should handle models with no output pricing', () => {
      const model = createMockModel('text-embedding-3-small', 'openai', 'economy', ['embedding'], 0.02, 0)
      const inputTokens = 5000
      const outputTokens = 0

      const cost = service.estimateCost(
        createMockConnectionWithCreds(createMockConnection(model), model),
        inputTokens,
        outputTokens
      )

      // Expected: (5000/1M * 0.02) = 0.0001
      expect(cost).toBeCloseTo(0.0001, 6)
    })
  })
})

// ==========================================================================
// Test Suite
// ==========================================================================

describe('AIModelSelectionService', () => {
  let service: AIModelSelectionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AIModelSelectionService(
      mockAIConnectionService,
      mockModelRouter,
      mockMonitoring as any
    )
  })

  describe('selectModel', () => {
    it('should select explicit model when modelId is provided', async () => {
      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        modelId: 'gpt-4o',
        taskComplexity: 50,
      }

      const mockConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text', 'image'],
        5.0,
        15.0
      )

      vi.mocked(mockAIConnectionService.getConnectionForModel).mockResolvedValue(mockConnection)

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-4o')
        expect(result.reason).toContain('User-specified model')
      }
      expect(mockAIConnectionService.getConnectionForModel).toHaveBeenCalledWith(
        'gpt-4o',
        'tenant-123'
      )
    })

    it('should select by content type for image generation', async () => {
      const request: ModelSelectionRequest = {
        query: 'Create an image of a sunset',
        tenantId: 'tenant-123',
        requiredContentType: 'image',
        taskComplexity: 50,
      }

      const imageConnection = createMockConnection(
        'dall-e-3',
        'openai',
        'premium',
        ['image'],
        40.0,
        0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([imageConnection])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('dall-e-3')
        expect(result.connection.model?.capabilities).toContain('image')
        expect(result.reason).toContain('content type')
      }
    })

    it('should select by content type for audio generation', async () => {
      const request: ModelSelectionRequest = {
        query: 'Convert this to speech',
        tenantId: 'tenant-123',
        requiredContentType: 'audio',
        taskComplexity: 30,
      }

      const audioConnection = createMockConnection('tts-1', 'openai', 'standard', ['audio'], 15.0, 0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([audioConnection])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('tts-1')
        expect(result.connection.model?.capabilities).toContain('audio')
      }
    })

    it('should select economy model for simple tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'What is 2+2?',
        tenantId: 'tenant-123',
        taskComplexity: 15, // Simple task
      }

      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5,
        { textGeneration: 75, reasoning: 65, coding: 70, creative: 72, dataAnalysis: 68, conversation: 80 }
      )

      const premiumConnection = createMockConnection(
        'gpt-4',
        'openai',
        'premium',
        ['text'],
        30.0,
        60.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        economyConnection,
        premiumConnection,
      ])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-3.5-turbo')
        expect(result.connection.model?.qualityTier).toBe('economy')
        expect(result.reason).toContain('economy')
      }
    })

    it('should select premium model for complex tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'Analyze this complex legal document and provide detailed risk assessment',
        tenantId: 'tenant-123',
        taskComplexity: 85, // Complex task
      }

      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5
      )

      const premiumConnection = createMockConnection(
        'claude-3-opus',
        'anthropic',
        'premium',
        ['text', 'image'],
        15.0,
        75.0,
        { textGeneration: 95, reasoning: 98, coding: 93, creative: 92, dataAnalysis: 95, conversation: 92 }
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        economyConnection,
        premiumConnection,
      ])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('claude-3-opus')
        expect(result.connection.model?.qualityTier).toBe('premium')
        expect(result.reason).toContain('complex')
      }
    })

    it('should select standard model for moderate tasks', async () => {
      const request: ModelSelectionRequest = {
        query: 'Write a function to parse JSON',
        tenantId: 'tenant-123',
        taskComplexity: 50, // Moderate task
      }

      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5
      )

      const standardConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text', 'image'],
        5.0,
        15.0,
        { textGeneration: 90, reasoning: 88, coding: 92, creative: 85, dataAnalysis: 87, conversation: 90 }
      )

      const premiumConnection = createMockConnection(
        'gpt-4',
        'openai',
        'premium',
        ['text'],
        30.0,
        60.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        economyConnection,
        standardConnection,
        premiumConnection,
      ])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-4o')
        expect(result.connection.model?.qualityTier).toBe('standard')
      }
    })

    it('should respect budget constraints', async () => {
      const request: ModelSelectionRequest = {
        query: 'Complex analysis task',
        tenantId: 'tenant-123',
        taskComplexity: 80,
        budget: {
          maxCostUSD: 0.01,
          preferEconomy: true,
        },
        estimatedTokens: 5000, // 2500 input + 2500 output
      }

      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5
      )

      const premiumConnection = createMockConnection(
        'claude-3-opus',
        'anthropic',
        'premium',
        ['text'],
        15.0,
        75.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        economyConnection,
        premiumConnection,
      ])

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-3.5-turbo')
        expect(result.estimatedCost).toBeLessThan(0.01)
      }
    })

    it('should return error when no connections available', async () => {
      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([])

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NO_CONNECTIONS')
        expect(result.message).toContain('No AI models configured')
        expect(result.suggestedAction).toBeTruthy()
      }
    })

    it('should return error when content type not supported', async () => {
      const request: ModelSelectionRequest = {
        query: 'Create a video',
        tenantId: 'tenant-123',
        requiredContentType: 'video',
        taskComplexity: 50,
      }

      const textConnection = createMockConnection('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([textConnection])

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONTENT_TYPE_UNSUPPORTED')
        expect(result.message).toContain('video')
        expect(result.availableContentTypes).toContain('text')
      }
    })

    it('should provide alternatives when explicit model unavailable', async () => {
      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        modelId: 'nonexistent-model',
        taskComplexity: 50,
      }

      vi.mocked(mockAIConnectionService.getConnectionForModel).mockResolvedValue(null)

      const alternativeConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text'],
        5.0,
        15.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([alternativeConnection])

      const result = await service.selectModel(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('MODEL_UNAVAILABLE')
        expect(result.availableAlternatives).toBeDefined()
        expect(result.availableAlternatives!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const connection = createMockConnection('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const inputTokens = 1000
      const outputTokens = 500

      const cost = service.estimateCost(connection, inputTokens, outputTokens)

      // Expected: (1000/1M * 5.0) + (500/1M * 15.0) = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 4)
    })

    it('should handle zero output tokens', () => {
      const connection = createMockConnection('gpt-4o', 'openai', 'standard', ['text'], 5.0, 15.0)
      const inputTokens = 2000
      const outputTokens = 0

      const cost = service.estimateCost(connection, inputTokens, outputTokens)

      // Expected: (2000/1M * 5.0) = 0.01
      expect(cost).toBeCloseTo(0.01, 4)
    })

    it('should handle models with no output pricing (embeddings)', () => {
      const connection = createMockConnection(
        'text-embedding-3-small',
        'openai',
        'economy',
        ['embedding'],
        0.02,
        0
      )
      const inputTokens = 5000
      const outputTokens = 0

      const cost = service.estimateCost(connection, inputTokens, outputTokens)

      // Expected: (5000/1M * 0.02) = 0.0001
      expect(cost).toBeCloseTo(0.0001, 6)
    })
  })

  describe('scoreConnections', () => {
    it('should score complexity fit correctly', async () => {
      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5
      )

      const premiumConnection = createMockConnection(
        'claude-3-opus',
        'anthropic',
        'premium',
        ['text'],
        15.0,
        75.0
      )

      const connections = [economyConnection, premiumConnection]

      // Test simple task - economy should score higher
      const simpleRequest: ModelSelectionRequest = {
        query: 'Simple question',
        tenantId: 'tenant-123',
        taskComplexity: 20,
      }

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue(connections)

      const simpleResult = await service.selectModel(simpleRequest)
      expect(simpleResult.success).toBe(true)
      if (simpleResult.success) {
        expect(simpleResult.connection.model?.qualityTier).toBe('economy')
      }

      // Test complex task - premium should score higher
      const complexRequest: ModelSelectionRequest = {
        query: 'Complex analysis',
        tenantId: 'tenant-123',
        taskComplexity: 90,
      }

      const complexResult = await service.selectModel(complexRequest)
      expect(complexResult.success).toBe(true)
      if (complexResult.success) {
        expect(complexResult.connection.model?.qualityTier).toBe('premium')
      }
    })

    it('should prioritize economy models when preferEconomy is true', async () => {
      const economyConnection = createMockConnection(
        'gpt-3.5-turbo',
        'openai',
        'economy',
        ['text'],
        0.5,
        1.5
      )

      const standardConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text'],
        5.0,
        15.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        economyConnection,
        standardConnection,
      ])

      const request: ModelSelectionRequest = {
        query: 'Moderate task',
        tenantId: 'tenant-123',
        taskComplexity: 50,
        budget: {
          preferEconomy: true,
        },
      }

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.model?.qualityTier).toBe('economy')
        expect(result.reason).toContain('budget')
      }
    })

    it('should match capabilities correctly', async () => {
      const textOnlyConnection = createMockConnection(
        'gpt-4',
        'openai',
        'premium',
        ['text'],
        30.0,
        60.0
      )

      const multimodalConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text', 'image'],
        5.0,
        15.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        textOnlyConnection,
        multimodalConnection,
      ])

      const request: ModelSelectionRequest = {
        query: 'Analyze this image',
        tenantId: 'tenant-123',
        requiredContentType: 'image',
        taskComplexity: 50,
      }

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-4o')
        expect(result.connection.model?.capabilities).toContain('image')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle missing model metadata gracefully', async () => {
      const connectionWithoutMetadata: AIConnection = {
        id: 'conn-no-metadata',
        tenantId: 'tenant-123',
        modelId: 'unknown-model',
        modelName: 'Unknown Model',
        provider: 'unknown',
        isActive: true,
        isDefault: false,
        credentials: {},
        model: {
          id: 'unknown-model',
          modelId: 'unknown-model',
          name: 'Unknown Model',
          type: 'LLM',
          provider: 'unknown',
          hoster: 'unknown',
          contextWindow: 8000,
          inputPricePerMillion: 1.0,
          supportsStreaming: false,
          isActive: true,
          // Missing: qualityTier, capabilities, taskScores
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([
        connectionWithoutMetadata,
      ])

      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      const result = await service.selectModel(request)

      // Should still work with default scoring
      expect(result.success).toBe(true)
    })

    it('should handle zero complexity', async () => {
      const connection = createMockConnection('gpt-3.5-turbo', 'openai', 'economy', ['text'], 0.5, 1.5)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([connection])

      const request: ModelSelectionRequest = {
        query: 'Test',
        tenantId: 'tenant-123',
        taskComplexity: 0,
      }

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.model?.qualityTier).toBe('economy')
      }
    })

    it('should handle maximum complexity', async () => {
      const connection = createMockConnection('claude-3-opus', 'anthropic', 'premium', ['text'], 15.0, 75.0)

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([connection])

      const request: ModelSelectionRequest = {
        query: 'Extremely complex task',
        tenantId: 'tenant-123',
        taskComplexity: 100,
      }

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.model?.qualityTier).toBe('premium')
      }
    })

    it('should handle inactive connections', async () => {
      const inactiveConnection = createMockConnection(
        'inactive-model',
        'openai',
        'standard',
        ['text'],
        5.0,
        15.0
      )
      inactiveConnection.isActive = false

      const activeConnection = createMockConnection(
        'gpt-4o',
        'openai',
        'standard',
        ['text'],
        5.0,
        15.0
      )

      vi.mocked(mockAIConnectionService.listConnections).mockResolvedValue([activeConnection])

      const request: ModelSelectionRequest = {
        query: 'Test query',
        tenantId: 'tenant-123',
        taskComplexity: 50,
      }

      const result = await service.selectModel(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.connection.modelId).toBe('gpt-4o')
        expect(result.connection.isActive).toBe(true)
      }
    })
  })
})
