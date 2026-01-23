/**
 * AI Provider Types
 * Configuration for AI model providers (OpenAI, Azure, Anthropic, etc.)
 */

// ============================================
// AI Provider Definition
// ============================================

/**
 * AI Provider names
 */
export type AIProviderName =
  | 'openai'
  | 'azure_openai'
  | 'anthropic'
  | 'google_vertex'
  | 'cohere'
  | 'custom';

/**
 * AI Model type/capability
 */
export type AIModelType =
  | 'chat'           // Chat completions (GPT-4, Claude)
  | 'completion'     // Text completions (legacy)
  | 'embedding'      // Text embeddings
  | 'image'          // Image generation (DALL-E)
  | 'vision'         // Image understanding
  | 'audio'          // Speech-to-text, text-to-speech
  | 'moderation';    // Content moderation

/**
 * AI Model definition
 */
export interface AIModel {
  id: string;                      // e.g., 'gpt-4', 'claude-3-opus'
  name: string;                    // Display name
  provider: AIProviderName;
  types: AIModelType[];            // Capabilities
  contextWindow: number;           // Max tokens
  maxOutputTokens: number;
  inputPricePerMillion: number;    // USD per million tokens
  outputPricePerMillion: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  supportsJSON: boolean;
  isDeprecated: boolean;
  deprecationDate?: Date;
  recommendedReplacement?: string;
}

/**
 * AI Provider definition (stored in integration definitions)
 */
export interface AIProviderDefinition {
  provider: AIProviderName;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  
  // Authentication
  authType: 'api_key' | 'api_key_with_endpoint' | 'service_account' | 'oauth2';
  requiresEndpoint: boolean;       // Azure requires custom endpoint
  requiresDeploymentName: boolean; // Azure uses deployment names
  
  // Available models
  models: AIModel[];
  
  // Default configuration
  defaultModel: string;
  defaultEmbeddingModel?: string;
  
  // Rate limits
  defaultRateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  
  // Documentation
  documentationUrl: string;
  apiKeyUrl: string;              // Where to get API key
}

// ============================================
// Model Selection Configuration
// ============================================

/**
 * Model selection configuration
 * Controls how AI models are automatically selected
 */
export interface ModelSelectionConfig {
  // Enable/disable auto-selection
  enabled: boolean;
  
  // Default quality preference when not specified
  defaultQualityPreference: 'economy' | 'standard' | 'premium' | 'auto';
  
  // Scoring weights (must sum to 100)
  scoringWeights: {
    complexityMatching: number;    // How much to weight complexity fit (default: 40)
    costOptimization: number;      // How much to weight cost (default: 30)
    capabilityMatching: number;    // How much to weight capabilities (default: 30)
    performanceHistory?: number;   // How much to weight past performance (default: 0, optional)
  };
  
  // Complexity thresholds
  complexityThresholds: {
    economyMax: number;            // Below this = economy tier (default: 30)
    premiumMin: number;            // Above this = premium tier (default: 70)
  };
  
  // Cost optimization strategy
  costOptimization: {
    strategy: 'aggressive' | 'balanced' | 'quality-first';
    maxCostMultiplier: number;     // Max cost vs cheapest option (default: 2.0)
    preferTenantModels: boolean;   // Prefer tenant BYOK models (default: true)
  };
  
  // Fallback behavior
  fallback: {
    allowFallback: boolean;        // Allow fallback to different tier (default: true)
    fallbackOrder: ('economy' | 'standard' | 'premium')[]; // Fallback priority
    maxFallbackAttempts: number;   // Max attempts before error (default: 2)
  };
  
  // Performance-based selection
  performanceBasedSelection?: {
    enabled: boolean;              // Use historical performance (default: false)
    minSampleSize: number;         // Min requests before using performance (default: 10)
    performanceWeight: number;     // Weight for performance in scoring (0-1)
    considerLatency: boolean;      // Factor in latency (default: true)
    considerSuccessRate: boolean;  // Factor in success rate (default: true)
    considerUserSatisfaction: boolean; // Factor in user feedback (default: false)
  };
  
  // Model preferences by insight type
  insightTypePreferences?: {
    [insightType: string]: {
      preferredTier?: 'economy' | 'standard' | 'premium';
      preferredModels?: string[];  // Model IDs in priority order
      minTier?: 'economy' | 'standard' | 'premium';
    };
  };
  
  // Tenant override capabilities
  tenantOverrides: {
    allowQualityPreference: boolean;  // Allow tenants to set default quality (default: true)
    allowModelBlacklist: boolean;      // Allow tenants to blacklist models (default: true)
    allowModelWhitelist: boolean;      // Allow tenants to whitelist models (default: false)
    maxCustomPreferences: number;      // Max custom insight type preferences (default: 5)
  };
}

/**
 * Default model selection configuration
 */
export const DEFAULT_MODEL_SELECTION_CONFIG: ModelSelectionConfig = {
  enabled: true,
  defaultQualityPreference: 'auto',
  scoringWeights: {
    complexityMatching: 40,
    costOptimization: 30,
    capabilityMatching: 30,
    performanceHistory: 0,
  },
  complexityThresholds: {
    economyMax: 30,
    premiumMin: 70,
  },
  costOptimization: {
    strategy: 'balanced',
    maxCostMultiplier: 2.0,
    preferTenantModels: true,
  },
  fallback: {
    allowFallback: true,
    fallbackOrder: ['standard', 'economy', 'premium'],
    maxFallbackAttempts: 2,
  },
  performanceBasedSelection: {
    enabled: false,
    minSampleSize: 10,
    performanceWeight: 0.2,
    considerLatency: true,
    considerSuccessRate: true,
    considerUserSatisfaction: false,
  },
  tenantOverrides: {
    allowQualityPreference: true,
    allowModelBlacklist: true,
    allowModelWhitelist: false,
    maxCustomPreferences: 5,
  },
};

// ============================================
// System AI Configuration (Super Admin)
// ============================================

/**
 * System-wide AI configuration
 * Set by Super Admin, applies to all tenants as default
 */
export interface SystemAIConfig {
  id: string;                      // 'system-ai-config'
  
  // Default provider for the entire system
  defaultProvider: AIProviderName;
  defaultModel: string;            // e.g., 'gpt-4'
  defaultEmbeddingModel: string;   // e.g., 'text-embedding-3-small'
  
  // System-level credentials (used when tenant has no override)
  systemCredentials?: {
    provider: AIProviderName;
    encryptedApiKey: string;
    endpoint?: string;             // For Azure OpenAI
    deploymentMappings?: Record<string, string>; // model -> deployment name
  }[];
  
  // Allowed providers for tenants
  allowedProviders: AIProviderName[];
  
  // Allowed models for tenants
  allowedModels: string[];
  
  // Global rate limits
  globalRateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  
  // Cost controls
  costControls: {
    maxTokensPerRequest: number;
    maxDailyCostPerTenant: number;    // USD
    maxMonthlyCostPerTenant: number;  // USD
  };
  
  // Feature flags
  features: {
    allowTenantBYOK: boolean;        // Allow tenants to bring their own keys
    allowTenantModelSelection: boolean;
    enableUsageTracking: boolean;
    enableCostAllocation: boolean;
  };
  
  // Model selection configuration
  modelSelection?: ModelSelectionConfig;
  
  // Metadata
  updatedAt: Date;
  updatedBy: string;
}

// ============================================
// Tenant AI Configuration
// ============================================

/**
 * Tenant-level AI configuration
 * Set by Tenant Admin, overrides system defaults
 */
export interface TenantAIConfig {
  id: string;
  tenantId: string;
  
  // Override default provider/model for this tenant
  defaultProvider?: AIProviderName;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  
  // Tenant's own credentials (BYOK)
  tenantCredentials?: {
    provider: AIProviderName;
    encryptedApiKey: string;
    endpoint?: string;
    deploymentMappings?: Record<string, string>;
    isActive: boolean;
    addedAt: Date;
    addedBy: string;
  }[];
  
  // Use system credentials or tenant's own
  useSystemCredentials: boolean;
  
  // Tenant-specific rate limits (within system limits)
  rateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
  
  // Cost tracking
  usage: {
    currentMonthTokens: number;
    currentMonthCost: number;
    lastResetAt: Date;
    monthlyBudget?: number; // Optional monthly budget limit
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================
// Model Selection Result
// ============================================

/**
 * Result of model selection hierarchy
 */
export interface ResolvedAIConfig {
  provider: AIProviderName;
  model: string;
  embeddingModel: string;
  
  // Which credentials to use
  credentialSource: 'system' | 'tenant';
  
  // Rate limits to apply
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  
  // Cost limits
  costLimits: {
    maxTokensPerRequest: number;
    remainingDailyBudget: number;
    remainingMonthlyBudget: number;
  };
  
  // For debugging
  selectionReason: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface UpdateSystemAIConfigInput {
  defaultProvider?: AIProviderName;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  allowedProviders?: AIProviderName[];
  allowedModels?: string[];
  globalRateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
  costControls?: {
    maxTokensPerRequest?: number;
    maxDailyCostPerTenant?: number;
    maxMonthlyCostPerTenant?: number;
  };
  features?: {
    allowTenantBYOK?: boolean;
    allowTenantModelSelection?: boolean;
    enableUsageTracking?: boolean;
    enableCostAllocation?: boolean;
  };
  modelSelection?: Partial<ModelSelectionConfig>;
}

export interface UpdateTenantAIConfigInput {
  defaultProvider?: AIProviderName;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  useSystemCredentials?: boolean;
  rateLimits?: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
  };
}

export interface AddTenantAICredentialInput {
  provider: AIProviderName;
  apiKey: string;
  endpoint?: string;
  deploymentMappings?: Record<string, string>;
}

export interface AIUsageRecord {
  id: string;
  tenantId: string;
  userId: string;
  
  // Request details
  provider: AIProviderName;
  model: string;
  operation: 'chat' | 'completion' | 'embedding' | 'other';
  
  // Token usage
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  
  // Cost
  estimatedCost: number;
  
  // Timing
  requestedAt: Date;
  durationMs: number;
  
  // Source
  source: 'assistant' | 'enrichment' | 'search' | 'api';
  sourceId?: string;              // Assistant ID, etc.
  
  // Billing metadata (for detailed analytics)
  insightType?: string;           // Insight type (summary, analysis, etc.)
  conversationId?: string;        // Conversation ID for chat sessions
  connectionId?: string;          // AI connection ID used
  feature?: 'ai-insights' | 'chat' | 'embeddings' | 'web-search' | 'content-generation' | 'other'; // High-level feature category
}

// ============================================
// Built-in Provider Definitions
// ============================================

export const AI_PROVIDERS: Record<AIProviderName, AIProviderDefinition> = {
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI API with GPT-4, GPT-3.5, and embedding models',
    icon: 'openai',
    color: '#10a37f',
    authType: 'api_key',
    requiresEndpoint: false,
    requiresDeploymentName: false,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        types: ['chat', 'vision'],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 15.0,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        types: ['chat', 'vision'],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 10.0,
        outputPricePerMillion: 30.0,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        types: ['chat'],
        contextWindow: 8192,
        maxOutputTokens: 4096,
        inputPricePerMillion: 30.0,
        outputPricePerMillion: 60.0,
        supportsStreaming: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        types: ['chat'],
        contextWindow: 16385,
        maxOutputTokens: 4096,
        inputPricePerMillion: 0.5,
        outputPricePerMillion: 1.5,
        supportsStreaming: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        provider: 'openai',
        types: ['embedding'],
        contextWindow: 8191,
        maxOutputTokens: 0,
        inputPricePerMillion: 0.02,
        outputPricePerMillion: 0,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        isDeprecated: false,
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        provider: 'openai',
        types: ['embedding'],
        contextWindow: 8191,
        maxOutputTokens: 0,
        inputPricePerMillion: 0.13,
        outputPricePerMillion: 0,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        isDeprecated: false,
      },
    ],
    defaultModel: 'gpt-4o',
    defaultEmbeddingModel: 'text-embedding-3-small',
    defaultRateLimits: {
      requestsPerMinute: 500,
      tokensPerMinute: 30000,
    },
    documentationUrl: 'https://platform.openai.com/docs',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },

  azure_openai: {
    provider: 'azure_openai',
    displayName: 'Azure OpenAI',
    description: 'Microsoft Azure hosted OpenAI models with enterprise features',
    icon: 'azure',
    color: '#0078d4',
    authType: 'api_key_with_endpoint',
    requiresEndpoint: true,
    requiresDeploymentName: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Azure)',
        provider: 'azure_openai',
        types: ['chat', 'vision'],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 15.0,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4 (Azure)',
        provider: 'azure_openai',
        types: ['chat'],
        contextWindow: 8192,
        maxOutputTokens: 4096,
        inputPricePerMillion: 30.0,
        outputPricePerMillion: 60.0,
        supportsStreaming: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002 (Azure)',
        provider: 'azure_openai',
        types: ['embedding'],
        contextWindow: 8191,
        maxOutputTokens: 0,
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        isDeprecated: false,
      },
    ],
    defaultModel: 'gpt-4o',
    defaultEmbeddingModel: 'text-embedding-ada-002',
    defaultRateLimits: {
      requestsPerMinute: 300,
      tokensPerMinute: 120000,
    },
    documentationUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
    apiKeyUrl: 'https://portal.azure.com/',
  },

  anthropic: {
    provider: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude AI models with strong reasoning and safety features',
    icon: 'anthropic',
    color: '#d4a574',
    authType: 'api_key',
    requiresEndpoint: false,
    requiresDeploymentName: false,
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        types: ['chat', 'vision'],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 15.0,
        outputPricePerMillion: 75.0,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        types: ['chat', 'vision'],
        contextWindow: 200000,
        maxOutputTokens: 8192,
        inputPricePerMillion: 3.0,
        outputPricePerMillion: 15.0,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        types: ['chat', 'vision'],
        contextWindow: 200000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 0.25,
        outputPricePerMillion: 1.25,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
    ],
    defaultModel: 'claude-3-5-sonnet',
    defaultRateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 40000,
    },
    documentationUrl: 'https://docs.anthropic.com/',
    apiKeyUrl: 'https://console.anthropic.com/',
  },

  google_vertex: {
    provider: 'google_vertex',
    displayName: 'Google Vertex AI',
    description: 'Google Cloud AI with Gemini models',
    icon: 'google',
    color: '#4285f4',
    authType: 'service_account',
    requiresEndpoint: true,
    requiresDeploymentName: false,
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google_vertex',
        types: ['chat', 'vision'],
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        inputPricePerMillion: 3.5,
        outputPricePerMillion: 10.5,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google_vertex',
        types: ['chat', 'vision'],
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        inputPricePerMillion: 0.075,
        outputPricePerMillion: 0.3,
        supportsStreaming: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
    ],
    defaultModel: 'gemini-1.5-pro',
    defaultRateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 32000,
    },
    documentationUrl: 'https://cloud.google.com/vertex-ai/docs',
    apiKeyUrl: 'https://console.cloud.google.com/',
  },

  cohere: {
    provider: 'cohere',
    displayName: 'Cohere',
    description: 'Enterprise AI with strong multilingual support',
    icon: 'cohere',
    color: '#39594d',
    authType: 'api_key',
    requiresEndpoint: false,
    requiresDeploymentName: false,
    models: [
      {
        id: 'command-r-plus',
        name: 'Command R+',
        provider: 'cohere',
        types: ['chat'],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 3.0,
        outputPricePerMillion: 15.0,
        supportsStreaming: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        supportsJSON: true,
        isDeprecated: false,
      },
      {
        id: 'embed-english-v3.0',
        name: 'Embed English v3.0',
        provider: 'cohere',
        types: ['embedding'],
        contextWindow: 512,
        maxOutputTokens: 0,
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        isDeprecated: false,
      },
      {
        id: 'embed-multilingual-v3.0',
        name: 'Embed Multilingual v3.0',
        provider: 'cohere',
        types: ['embedding'],
        contextWindow: 512,
        maxOutputTokens: 0,
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0,
        supportsStreaming: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsJSON: false,
        isDeprecated: false,
      },
    ],
    defaultModel: 'command-r-plus',
    defaultEmbeddingModel: 'embed-english-v3.0',
    defaultRateLimits: {
      requestsPerMinute: 100,
      tokensPerMinute: 100000,
    },
    documentationUrl: 'https://docs.cohere.com/',
    apiKeyUrl: 'https://dashboard.cohere.com/',
  },

  custom: {
    provider: 'custom',
    displayName: 'Custom Provider',
    description: 'Custom OpenAI-compatible API endpoint',
    icon: 'settings',
    color: '#6b7280',
    authType: 'api_key_with_endpoint',
    requiresEndpoint: true,
    requiresDeploymentName: false,
    models: [],
    defaultModel: '',
    defaultRateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 10000,
    },
    documentationUrl: '',
    apiKeyUrl: '',
  },
};

/**
 * Get all chat models from all providers
 */
export function getAllChatModels(): AIModel[] {
  return Object.values(AI_PROVIDERS)
    .flatMap(p => p.models)
    .filter(m => m.types.includes('chat'));
}

/**
 * Get all embedding models from all providers
 */
export function getAllEmbeddingModels(): AIModel[] {
  return Object.values(AI_PROVIDERS)
    .flatMap(p => p.models)
    .filter(m => m.types.includes('embedding'));
}

/**
 * Get model by ID
 */
export function getModelById(modelId: string): AIModel | undefined {
  for (const provider of Object.values(AI_PROVIDERS)) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {return model;}
  }
  return undefined;
}

/**
 * Get provider by model ID
 */
export function getProviderByModelId(modelId: string): AIProviderDefinition | undefined {
  for (const provider of Object.values(AI_PROVIDERS)) {
    if (provider.models.some(m => m.id === modelId)) {
      return provider;
    }
  }
  return undefined;
}











