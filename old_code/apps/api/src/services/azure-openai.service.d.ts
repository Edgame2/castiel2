/**
 * Azure OpenAI Embeddings Service
 * Generates embeddings using Azure OpenAI REST API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { EmbeddingModel } from '../types/vectorization.types.js';
import { EmbeddingRequest, EmbeddingResponse } from '../types/vector-search.types.js';
/**
 * Azure OpenAI configuration
 */
export interface AzureOpenAIConfig {
    endpoint: string;
    apiKey: string;
    apiVersion?: string;
    deploymentName?: string;
    timeout?: number;
    maxRetries?: number;
}
export interface AzureOpenAICompletionOptions {
    deploymentName?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
}
/**
 * Azure OpenAI Embeddings Service
 */
export declare class AzureOpenAIService {
    private monitoring;
    private config;
    constructor(config: AzureOpenAIConfig, monitoring: IMonitoringProvider);
    /**
     * Call Azure OpenAI REST API
     */
    private callEmbeddingsAPI;
    private callCompletionsAPI;
    private callChatCompletionAPI;
    /**
     * Generate embedding for text
     */
    generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    /**
     * Generate embeddings for multiple texts in batch
     */
    generateEmbeddingsBatch(texts: string[], model?: string): Promise<EmbeddingResponse[]>;
    /**
     * Check if the service is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get supported models
     */
    getSupportedModels(): EmbeddingModel[];
    /**
     * Get model info
     */
    getModelInfo(model: EmbeddingModel): import("../types/vectorization.types.js").EmbeddingModelInfo;
    /**
     * Chat completion with system and user messages
     */
    chat(systemPrompt: string, userPrompt: string, options?: AzureOpenAICompletionOptions): Promise<string>;
    /**
     * Simple text completion
     */
    complete(prompt: string, options?: AzureOpenAICompletionOptions): Promise<string>;
}
//# sourceMappingURL=azure-openai.service.d.ts.map