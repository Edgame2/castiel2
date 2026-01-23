/**
 * AI Provider Types
 * Configuration for AI model providers (OpenAI, Azure, Anthropic, etc.)
 */
/**
 * AI Provider names
 */
export type AIProviderName = 'openai' | 'azure_openai' | 'anthropic' | 'google_vertex' | 'cohere' | 'custom';
/**
 * AI Model type/capability
 */
export type AIModelType = 'chat' | 'completion' | 'embedding' | 'image' | 'vision' | 'audio' | 'moderation';
/**
 * AI Model definition
 */
export interface AIModel {
    id: string;
    name: string;
    provider: AIProviderName;
    types: AIModelType[];
    contextWindow: number;
    maxOutputTokens: number;
    inputPricePerMillion: number;
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
    authType: 'api_key' | 'api_key_with_endpoint' | 'service_account' | 'oauth2';
    requiresEndpoint: boolean;
    requiresDeploymentName: boolean;
    models: AIModel[];
    defaultModel: string;
    defaultEmbeddingModel?: string;
    defaultRateLimits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
    documentationUrl: string;
    apiKeyUrl: string;
}
/**
 * Model selection configuration
 * Controls how AI models are automatically selected
 */
export interface ModelSelectionConfig {
    enabled: boolean;
    defaultQualityPreference: 'economy' | 'standard' | 'premium' | 'auto';
    scoringWeights: {
        complexityMatching: number;
        costOptimization: number;
        capabilityMatching: number;
        performanceHistory?: number;
    };
    complexityThresholds: {
        economyMax: number;
        premiumMin: number;
    };
    costOptimization: {
        strategy: 'aggressive' | 'balanced' | 'quality-first';
        maxCostMultiplier: number;
        preferTenantModels: boolean;
    };
    fallback: {
        allowFallback: boolean;
        fallbackOrder: ('economy' | 'standard' | 'premium')[];
        maxFallbackAttempts: number;
    };
    performanceBasedSelection?: {
        enabled: boolean;
        minSampleSize: number;
        performanceWeight: number;
        considerLatency: boolean;
        considerSuccessRate: boolean;
        considerUserSatisfaction: boolean;
    };
    insightTypePreferences?: {
        [insightType: string]: {
            preferredTier?: 'economy' | 'standard' | 'premium';
            preferredModels?: string[];
            minTier?: 'economy' | 'standard' | 'premium';
        };
    };
    tenantOverrides: {
        allowQualityPreference: boolean;
        allowModelBlacklist: boolean;
        allowModelWhitelist: boolean;
        maxCustomPreferences: number;
    };
}
/**
 * Default model selection configuration
 */
export declare const DEFAULT_MODEL_SELECTION_CONFIG: ModelSelectionConfig;
/**
 * System-wide AI configuration
 * Set by Super Admin, applies to all tenants as default
 */
export interface SystemAIConfig {
    id: string;
    defaultProvider: AIProviderName;
    defaultModel: string;
    defaultEmbeddingModel: string;
    systemCredentials?: {
        provider: AIProviderName;
        encryptedApiKey: string;
        endpoint?: string;
        deploymentMappings?: Record<string, string>;
    }[];
    allowedProviders: AIProviderName[];
    allowedModels: string[];
    globalRateLimits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
    costControls: {
        maxTokensPerRequest: number;
        maxDailyCostPerTenant: number;
        maxMonthlyCostPerTenant: number;
    };
    features: {
        allowTenantBYOK: boolean;
        allowTenantModelSelection: boolean;
        enableUsageTracking: boolean;
        enableCostAllocation: boolean;
    };
    modelSelection?: ModelSelectionConfig;
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Tenant-level AI configuration
 * Set by Tenant Admin, overrides system defaults
 */
export interface TenantAIConfig {
    id: string;
    tenantId: string;
    defaultProvider?: AIProviderName;
    defaultModel?: string;
    defaultEmbeddingModel?: string;
    tenantCredentials?: {
        provider: AIProviderName;
        encryptedApiKey: string;
        endpoint?: string;
        deploymentMappings?: Record<string, string>;
        isActive: boolean;
        addedAt: Date;
        addedBy: string;
    }[];
    useSystemCredentials: boolean;
    rateLimits?: {
        requestsPerMinute?: number;
        tokensPerMinute?: number;
    };
    usage: {
        currentMonthTokens: number;
        currentMonthCost: number;
        lastResetAt: Date;
        monthlyBudget?: number;
    };
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string;
}
/**
 * Result of model selection hierarchy
 */
export interface ResolvedAIConfig {
    provider: AIProviderName;
    model: string;
    embeddingModel: string;
    credentialSource: 'system' | 'tenant';
    rateLimits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
    costLimits: {
        maxTokensPerRequest: number;
        remainingDailyBudget: number;
        remainingMonthlyBudget: number;
    };
    selectionReason: string;
}
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
    provider: AIProviderName;
    model: string;
    operation: 'chat' | 'completion' | 'embedding' | 'other';
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    requestedAt: Date;
    durationMs: number;
    source: 'assistant' | 'enrichment' | 'search' | 'api';
    sourceId?: string;
    insightType?: string;
    conversationId?: string;
    connectionId?: string;
}
export declare const AI_PROVIDERS: Record<AIProviderName, AIProviderDefinition>;
/**
 * Get all chat models from all providers
 */
export declare function getAllChatModels(): AIModel[];
/**
 * Get all embedding models from all providers
 */
export declare function getAllEmbeddingModels(): AIModel[];
/**
 * Get model by ID
 */
export declare function getModelById(modelId: string): AIModel | undefined;
/**
 * Get provider by model ID
 */
export declare function getProviderByModelId(modelId: string): AIProviderDefinition | undefined;
//# sourceMappingURL=ai-provider.types.d.ts.map