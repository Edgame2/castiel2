/**
 * AI Provider Types
 * Configuration for AI model providers (OpenAI, Azure, Anthropic, etc.)
 */
/**
 * Default model selection configuration
 */
export const DEFAULT_MODEL_SELECTION_CONFIG = {
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
// Built-in Provider Definitions
// ============================================
export const AI_PROVIDERS = {
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
export function getAllChatModels() {
    return Object.values(AI_PROVIDERS)
        .flatMap(p => p.models)
        .filter(m => m.types.includes('chat'));
}
/**
 * Get all embedding models from all providers
 */
export function getAllEmbeddingModels() {
    return Object.values(AI_PROVIDERS)
        .flatMap(p => p.models)
        .filter(m => m.types.includes('embedding'));
}
/**
 * Get model by ID
 */
export function getModelById(modelId) {
    for (const provider of Object.values(AI_PROVIDERS)) {
        const model = provider.models.find(m => m.id === modelId);
        if (model) {
            return model;
        }
    }
    return undefined;
}
/**
 * Get provider by model ID
 */
export function getProviderByModelId(modelId) {
    for (const provider of Object.values(AI_PROVIDERS)) {
        if (provider.models.some(m => m.id === modelId)) {
            return provider;
        }
    }
    return undefined;
}
//# sourceMappingURL=ai-provider.types.js.map