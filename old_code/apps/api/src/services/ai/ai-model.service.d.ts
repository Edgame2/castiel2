import { IMonitoringProvider } from '@castiel/monitoring';
import type { AIModel, CreateAIModelInput, UpdateAIModelInput, AIModelListFilters } from '@castiel/shared-types';
/**
 * Service for managing the AI Model catalog
 * Super admin only - defines available models and their capabilities
 */
export declare class AIModelService {
    private readonly monitoring;
    private client;
    private container;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Create a new AI model in the catalog
     */
    createModel(input: CreateAIModelInput, createdBy: string): Promise<AIModel>;
    /**
     * Get a model by ID
     * Query by ID since partition key is /provider, not /id
     */
    getModel(modelId: string): Promise<AIModel | null>;
    /**
     * List models with optional filters
     */
    listModels(filters?: AIModelListFilters): Promise<{
        models: AIModel[];
        limit: number;
        offset: number;
        count: number;
        total: number;
    }>; /**
     * Update a model
     */
    updateModel(modelId: string, input: UpdateAIModelInput, updatedBy: string): Promise<AIModel>;
    /**
     * Delete a model (soft delete by setting status to 'disabled')
     */
    deleteModel(modelId: string, deletedBy: string): Promise<void>;
    /**
     * Hard delete a model (use with caution)
     */
    hardDeleteModel(modelId: string): Promise<void>;
    /**
     * Get models available for tenant connections
     */
    getModelsForTenants(): Promise<AIModel[]>;
    /**
     * Get active LLM models
     */
    getActiveLLMModels(): Promise<AIModel[]>;
    /**
     * Get active embedding models
     */
    getActiveEmbeddingModels(): Promise<AIModel[]>;
    /**
     * Ensure the container exists and create if needed
     */
    ensureContainer(): Promise<void>;
}
//# sourceMappingURL=ai-model.service.d.ts.map