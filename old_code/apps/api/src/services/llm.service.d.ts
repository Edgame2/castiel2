/**
 * LLM Service Interface
 * Simple interface for LLM completion operations used by GroundingService
 */
export interface LLMService {
    complete(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<string>;
}
/**
 * Adapter for UnifiedAIClient to LLMService interface
 * Note: This adapter requires an AIConnection and apiKey to be provided
 * For simplicity, we'll use AzureOpenAI adapter instead when UnifiedAIClient is not directly usable
 */
export declare class UnifiedAIClientLLMAdapter implements LLMService {
    private unifiedAIClient;
    private aiConnection;
    private apiKey;
    private defaultModelId;
    constructor(unifiedAIClient: any, // UnifiedAIClient
    aiConnection: any, // AIConnection
    apiKey: string, defaultModelId?: string);
    complete(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<string>;
}
/**
 * Adapter for AzureOpenAIService to LLMService interface
 */
export declare class AzureOpenAILLMAdapter implements LLMService {
    private azureOpenAI;
    constructor(azureOpenAI: any);
    complete(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<string>;
}
//# sourceMappingURL=llm.service.d.ts.map