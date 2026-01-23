/**
 * AI Model Seeder Service
 * Seeds initial AI model definitions as c_aimodel Shards
 */

import type { CosmosClient, Container } from '@azure/cosmos';
import { config } from '../config/env.js';

export interface AIModelSeed {
  name: string;
  modelId: string;
  modelType: 'llm' | 'image_generation' | 'text_to_speech' | 'speech_to_text' | 'embedding' | 'moderation' | 'vision';
  provider: 'openai' | 'azure_openai' | 'anthropic' | 'google' | 'cohere' | 'mistral' | 'meta' | 'custom';
  hoster: 'openai' | 'azure' | 'aws' | 'gcp' | 'self_hosted' | 'castiel' | 'anthropic';
  version?: string;
  description?: string;
  isSystemWide: boolean;
  isDefault: boolean;
  allowTenantCustom: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  supportsJSON?: boolean;
  endpoint?: string;
  deploymentName?: string;
  isActive: boolean;
  isDeprecated?: boolean;
  tags?: string[];
  // Extended properties (optional, for future use)
  qualityTier?: string;
  capabilities?: string[];
  taskScores?: Record<string, number>;
  avgLatencyMs?: number;
  maxConcurrency?: number;
}

/**
 * Seed AI models for the system
 */
export const AI_MODEL_SEEDS: AIModelSeed[] = [
  // ============================================
  // OpenAI LLMs
  // ============================================
  {
    name: 'GPT-4o',
    modelId: 'gpt-4o',
    modelType: 'llm',
    provider: 'openai',
    hoster: 'openai',
    version: '2024-05-13',
    description: 'OpenAI\'s most advanced model. Great for complex reasoning, vision, and creative tasks. 128K context window.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: true,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 15.0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['recommended', 'multimodal', 'latest'],
    qualityTier: 'standard',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 90,
      reasoning: 88,
      coding: 92,
      creative: 85,
      dataAnalysis: 87,
      conversation: 90,
    },
    avgLatencyMs: 3000,
    maxConcurrency: 100,
  },
  {
    name: 'GPT-4 Turbo',
    modelId: 'gpt-4-turbo',
    modelType: 'llm',
    provider: 'openai',
    hoster: 'openai',
    version: '2024-04-09',
    description: 'Powerful model with vision capabilities and 128K context. Good balance of speed and quality.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['multimodal'],
    qualityTier: 'premium',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 88,
      reasoning: 92,
      coding: 90,
      creative: 82,
      dataAnalysis: 90,
      conversation: 88,
    },
    avgLatencyMs: 4000,
    maxConcurrency: 80,
  },
  {
    name: 'GPT-4',
    modelId: 'gpt-4',
    modelType: 'llm',
    provider: 'openai',
    hoster: 'openai',
    version: '0613',
    description: 'Original GPT-4 with 8K context. High quality reasoning and generation.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 8192,
    maxOutputTokens: 4096,
    inputPricePerMillion: 30.0,
    outputPricePerMillion: 60.0,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['stable'],
    qualityTier: 'premium',
    capabilities: ['text'],
    taskScores: {
      textGeneration: 85,
      reasoning: 95,
      coding: 88,
      creative: 80,
      dataAnalysis: 90,
      conversation: 85,
    },
    avgLatencyMs: 5000,
    maxConcurrency: 50,
  },
  {
    name: 'GPT-3.5 Turbo',
    modelId: 'gpt-3.5-turbo',
    modelType: 'llm',
    provider: 'openai',
    hoster: 'openai',
    version: '0125',
    description: 'Fast and cost-effective. Good for simple tasks and high-volume applications.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 1.5,
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['fast', 'economical'],
    qualityTier: 'economy',
    capabilities: ['text'],
    taskScores: {
      textGeneration: 75,
      reasoning: 65,
      coding: 70,
      creative: 72,
      dataAnalysis: 68,
      conversation: 80,
    },
    avgLatencyMs: 1500,
    maxConcurrency: 200,
  },

  // ============================================
  // Anthropic Claude
  // ============================================
  {
    name: 'Claude 3.5 Sonnet',
    modelId: 'claude-3-5-sonnet-20241022',
    modelType: 'llm',
    provider: 'anthropic',
    hoster: 'anthropic',
    version: '2024-10-22',
    description: 'Anthropic\'s most balanced model. Excellent for analysis, coding, and creative writing. 200K context.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['recommended', 'multimodal', 'coding'],
    qualityTier: 'standard',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 92,
      reasoning: 90,
      coding: 95,
      creative: 88,
      dataAnalysis: 92,
      conversation: 90,
    },
    avgLatencyMs: 3000,
    maxConcurrency: 100,
  },
  {
    name: 'Claude 3 Opus',
    modelId: 'claude-3-opus-20240229',
    modelType: 'llm',
    provider: 'anthropic',
    hoster: 'anthropic',
    version: '2024-02-29',
    description: 'Anthropic\'s most powerful model. Best for complex, nuanced tasks requiring deep expertise.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['premium', 'multimodal'],
    qualityTier: 'premium',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 95,
      reasoning: 98,
      coding: 93,
      creative: 92,
      dataAnalysis: 95,
      conversation: 92,
    },
    avgLatencyMs: 5000,
    maxConcurrency: 50,
  },
  {
    name: 'Claude 3 Haiku',
    modelId: 'claude-3-haiku-20240307',
    modelType: 'llm',
    provider: 'anthropic',
    hoster: 'anthropic',
    version: '2024-03-07',
    description: 'Fast and affordable. Great for simple tasks and customer-facing applications.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['fast', 'economical', 'multimodal'],
    qualityTier: 'economy',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 78,
      reasoning: 70,
      coding: 75,
      creative: 75,
      dataAnalysis: 72,
      conversation: 82,
    },
    avgLatencyMs: 1000,
    maxConcurrency: 200,
  },

  // ============================================
  // Google
  // ============================================
  {
    name: 'Gemini 1.5 Pro',
    modelId: 'gemini-1.5-pro',
    modelType: 'llm',
    provider: 'google',
    hoster: 'gcp',
    version: '1.5',
    description: 'Google\'s most capable model. 1M token context window, excellent for document analysis.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3.5,
    outputPricePerMillion: 10.5,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['multimodal', 'large-context'],
    qualityTier: 'standard',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 88,
      reasoning: 85,
      coding: 88,
      creative: 82,
      dataAnalysis: 92,
      conversation: 87,
    },
    avgLatencyMs: 3500,
    maxConcurrency: 100,
  },
  {
    name: 'Gemini 1.5 Flash',
    modelId: 'gemini-1.5-flash',
    modelType: 'llm',
    provider: 'google',
    hoster: 'gcp',
    version: '1.5',
    description: 'Fast, cost-effective Google model. Great for high-volume applications.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsJSON: true,
    isActive: true,
    tags: ['fast', 'economical', 'multimodal'],
    qualityTier: 'economy',
    capabilities: ['text', 'image'],
    taskScores: {
      textGeneration: 80,
      reasoning: 72,
      coding: 78,
      creative: 75,
      dataAnalysis: 75,
      conversation: 82,
    },
    avgLatencyMs: 800,
    maxConcurrency: 300,
  },

  // ============================================
  // Embeddings
  // ============================================
  {
    name: 'Text Embedding 3 Small',
    modelId: 'text-embedding-3-small',
    modelType: 'embedding',
    provider: 'openai',
    hoster: 'openai',
    version: '3',
    description: 'Fast, efficient embedding model. Best for most use cases.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: false,
    contextWindow: 8191,
    inputPricePerMillion: 0.02,
    supportsStreaming: false,
    isActive: true,
    tags: ['embedding', 'semantic-search'],
    qualityTier: 'economy',
    capabilities: ['embedding'],
    avgLatencyMs: 200,
    maxConcurrency: 500,
  },
  {
    name: 'Text Embedding 3 Large',
    modelId: 'text-embedding-3-large',
    modelType: 'embedding',
    provider: 'openai',
    hoster: 'openai',
    version: '3',
    description: 'Highest quality embeddings. Best for complex similarity search.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: false,
    contextWindow: 8191,
    inputPricePerMillion: 0.13,
    supportsStreaming: false,
    isActive: true,
    tags: ['embedding', 'high-quality'],
    qualityTier: 'standard',
    capabilities: ['embedding'],
    avgLatencyMs: 300,
    maxConcurrency: 400,
  },
  {
    name: 'Text Embedding Ada 002 (Azure)',
    modelId: 'text-embedding-ada-002',
    modelType: 'embedding',
    provider: 'azure_openai',
    hoster: 'azure',
    version: '002',
    description: 'Azure-hosted embedding model. Compatible with Azure OpenAI deployments.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    contextWindow: 8191,
    inputPricePerMillion: 0.1,
    supportsStreaming: false,
    isActive: true,
    tags: ['embedding', 'azure', 'enterprise'],
    qualityTier: 'economy',
    capabilities: ['embedding'],
    avgLatencyMs: 250,
    maxConcurrency: 400,
  },

  // ============================================
  // Image Generation
  // ============================================
  {
    name: 'DALL-E 3',
    modelId: 'dall-e-3',
    modelType: 'image_generation',
    provider: 'openai',
    hoster: 'openai',
    version: '3',
    description: 'OpenAI\'s latest image generation model. High quality, excellent prompt following.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: true,
    inputPricePerMillion: 40.0, // Per image actually
    supportsStreaming: false,
    isActive: true,
    tags: ['image', 'creative'],
    qualityTier: 'premium',
    capabilities: ['image'],
    avgLatencyMs: 8000,
    maxConcurrency: 20,
  },
  {
    name: 'DALL-E 2',
    modelId: 'dall-e-2',
    modelType: 'image_generation',
    provider: 'openai',
    hoster: 'openai',
    version: '2',
    description: 'Previous generation image model. More affordable, good for simpler tasks.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    inputPricePerMillion: 20.0,
    supportsStreaming: false,
    isActive: true,
    tags: ['image', 'economical'],
    qualityTier: 'standard',
    capabilities: ['image'],
    avgLatencyMs: 6000,
    maxConcurrency: 30,
  },

  // ============================================
  // Text to Speech
  // ============================================
  {
    name: 'TTS-1',
    modelId: 'tts-1',
    modelType: 'text_to_speech',
    provider: 'openai',
    hoster: 'openai',
    version: '1',
    description: 'Fast text-to-speech model. Good quality at lower latency.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: true,
    inputPricePerMillion: 15.0,
    supportsStreaming: true,
    isActive: true,
    tags: ['audio', 'speech', 'fast'],
    qualityTier: 'standard',
    capabilities: ['audio'],
    avgLatencyMs: 2000,
    maxConcurrency: 100,
  },
  {
    name: 'TTS-1 HD',
    modelId: 'tts-1-hd',
    modelType: 'text_to_speech',
    provider: 'openai',
    hoster: 'openai',
    version: '1-hd',
    description: 'High-definition text-to-speech. Best quality audio output.',
    isSystemWide: true,
    isDefault: false,
    allowTenantCustom: true,
    inputPricePerMillion: 30.0,
    supportsStreaming: true,
    isActive: true,
    tags: ['audio', 'speech', 'high-quality'],
    qualityTier: 'premium',
    capabilities: ['audio'],
    avgLatencyMs: 3000,
    maxConcurrency: 80,
  },

  // ============================================
  // Speech to Text
  // ============================================
  {
    name: 'Whisper',
    modelId: 'whisper-1',
    modelType: 'speech_to_text',
    provider: 'openai',
    hoster: 'openai',
    version: 'large-v3',
    description: 'OpenAI\'s speech recognition. Supports 99 languages, excellent accuracy.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: true,
    inputPricePerMillion: 6.0, // Per minute actually
    supportsStreaming: false,
    isActive: true,
    tags: ['audio', 'transcription', 'multilingual'],
    qualityTier: 'standard',
    capabilities: ['audio'],
    avgLatencyMs: 3000,
    maxConcurrency: 50,
  },

  // ============================================
  // Moderation
  // ============================================
  {
    name: 'Moderation Latest',
    modelId: 'text-moderation-latest',
    modelType: 'moderation',
    provider: 'openai',
    hoster: 'openai',
    description: 'Content moderation to detect harmful content. Free to use.',
    isSystemWide: true,
    isDefault: true,
    allowTenantCustom: false,
    inputPricePerMillion: 0,
    supportsStreaming: false,
    isActive: true,
    tags: ['safety', 'moderation', 'free'],
    qualityTier: 'economy',
    capabilities: ['text'],
    avgLatencyMs: 500,
    maxConcurrency: 1000,
  },
];

import type { IMonitoringProvider } from '@castiel/monitoring';

export class AIModelSeederService {
  private shardContainer: Container;
  private shardTypeContainer: Container;
  private monitoring?: IMonitoringProvider;

  constructor(cosmosClient: CosmosClient, monitoring?: IMonitoringProvider) {
    const database = cosmosClient.database(config.cosmosDb.databaseId);
    this.shardContainer = database.container(config.cosmosDb.containers.shards);
    this.shardTypeContainer = database.container(config.cosmosDb.containers.shardTypes);
    this.monitoring = monitoring;
  }

  /**
   * Seed AI models if they don't exist
   */
  async seedModels(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const seed of AI_MODEL_SEEDS) {
      const exists = await this.modelExists(seed.modelId);
      if (exists) {
        skipped++;
        continue;
      }

      await this.createModel(seed);
      created++;
    }

    this.monitoring?.trackEvent('ai-model-seeder.completed', {
      created,
      skipped,
    });
    return { created, skipped };
  }

  /**
   * Check if a model with the given modelId already exists
   */
  private async modelExists(modelId: string): Promise<boolean> {
    const query = {
      query: `
        SELECT c.id FROM c 
        WHERE c.shardTypeId = 'c_aimodel' 
        AND c.structuredData.modelId = @modelId
      `,
      parameters: [{ name: '@modelId', value: modelId }],
    };

    const { resources } = await this.shardContainer.items.query(query).fetchAll();
    return resources.length > 0;
  }

  /**
   * Create an AI model shard
   */
  private async createModel(seed: AIModelSeed): Promise<void> {
    const now = new Date();
    const id = `c_aimodel_${seed.modelId.replace(/[^a-z0-9]/gi, '_')}`;

    const shard = {
      id,
      tenantId: 'system', // System-wide models
      userId: 'system',
      shardTypeId: 'c_aimodel',
      status: 'active',
      structuredData: {
        name: seed.name,
        modelId: seed.modelId,
        modelType: seed.modelType,
        provider: seed.provider,
        hoster: seed.hoster,
        version: seed.version,
        description: seed.description,
        isSystemWide: seed.isSystemWide,
        isDefault: seed.isDefault,
        allowTenantCustom: seed.allowTenantCustom,
        contextWindow: seed.contextWindow,
        maxOutputTokens: seed.maxOutputTokens,
        inputPricePerMillion: seed.inputPricePerMillion,
        outputPricePerMillion: seed.outputPricePerMillion,
        supportsStreaming: seed.supportsStreaming ?? false,
        supportsVision: seed.supportsVision ?? false,
        supportsFunctionCalling: seed.supportsFunctionCalling ?? false,
        supportsJSON: seed.supportsJSON ?? false,
        endpoint: seed.endpoint,
        deploymentName: seed.deploymentName,
        isActive: seed.isActive,
        isDeprecated: seed.isDeprecated ?? false,
        tags: seed.tags ?? [],
        // New fields for intelligent model selection
        qualityTier: seed.qualityTier,
        capabilities: seed.capabilities ?? [],
        taskScores: seed.taskScores,
        avgLatencyMs: seed.avgLatencyMs,
        maxConcurrency: seed.maxConcurrency,
      },
      internal_relationships: [],
      external_relationships: [],
      tags: seed.tags ?? [],
      isGlobal: true,
      createdAt: now,
      updatedAt: now,
      partitionKey: 'system',
    };

    await this.shardContainer.items.create(shard);
  }

  /**
   * Get all active AI models
   */
  async getActiveModels(
    modelType?: string,
    provider?: string
  ): Promise<any[]> {
    let query = `
      SELECT * FROM c 
      WHERE c.shardTypeId = 'c_aimodel' 
      AND c.structuredData.isActive = true
    `;
    const params: any[] = [];

    if (modelType) {
      query += ' AND c.structuredData.modelType = @modelType';
      params.push({ name: '@modelType', value: modelType });
    }

    if (provider) {
      query += ' AND c.structuredData.provider = @provider';
      params.push({ name: '@provider', value: provider });
    }

    const { resources } = await this.shardContainer.items.query({
      query,
      parameters: params,
    }).fetchAll();

    return resources;
  }

  /**
   * Get default model for a type
   */
  async getDefaultModel(modelType: string): Promise<any | null> {
    const query = {
      query: `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_aimodel' 
        AND c.structuredData.modelType = @modelType
        AND c.structuredData.isDefault = true
        AND c.structuredData.isActive = true
      `,
      parameters: [{ name: '@modelType', value: modelType }],
    };

    const { resources } = await this.shardContainer.items.query(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Get model by modelId
   */
  async getModelByModelId(modelId: string): Promise<any | null> {
    const query = {
      query: `
        SELECT * FROM c 
        WHERE c.shardTypeId = 'c_aimodel' 
        AND c.structuredData.modelId = @modelId
      `,
      parameters: [{ name: '@modelId', value: modelId }],
    };

    const { resources } = await this.shardContainer.items.query(query).fetchAll();
    return resources[0] || null;
  }
}









