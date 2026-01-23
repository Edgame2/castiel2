/**
 * AI Model Seeder Service
 * Seeds initial AI model definitions as c_aimodel Shards
 */
import { CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
export interface AIModelSeed {
    name: string;
    modelId: string;
    modelType: 'llm' | 'image_generation' | 'text_to_speech' | 'speech_to_text' | 'embedding' | 'moderation' | 'vision';
    provider: 'openai' | 'azure_openai' | 'anthropic' | 'google' | 'cohere' | 'mistral' | 'meta' | 'custom';
    hoster: 'openai' | 'azure' | 'aws' | 'gcp' | 'self_hosted' | 'castiel';
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
}
/**
 * Seed AI models for the system
 */
export declare const AI_MODEL_SEEDS: AIModelSeed[];
export declare class AIModelSeederService {
    private shardContainer;
    private shardTypeContainer;
    private monitoring?;
    constructor(cosmosClient: CosmosClient, monitoring?: IMonitoringProvider);
    /**
     * Seed AI models if they don't exist
     */
    seedModels(): Promise<{
        created: number;
        skipped: number;
    }>;
    /**
     * Check if a model with the given modelId already exists
     */
    private modelExists;
    /**
     * Create an AI model shard
     */
    private createModel;
    /**
     * Get all active AI models
     */
    getActiveModels(modelType?: string, provider?: string): Promise<any[]>;
    /**
     * Get default model for a type
     */
    getDefaultModel(modelType: string): Promise<any | null>;
    /**
     * Get model by modelId
     */
    getModelByModelId(modelId: string): Promise<any | null>;
}
//# sourceMappingURL=ai-model-seeder.service.d.ts.map