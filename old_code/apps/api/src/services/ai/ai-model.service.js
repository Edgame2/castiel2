// @ts-nocheck - Optional AI service, not used by workers
import { CosmosClient } from '@azure/cosmos';
import { config } from '../../config/env.js';
/**
 * Service for managing the AI Model catalog
 * Super admin only - defines available models and their capabilities
 */
export class AIModelService {
    monitoring;
    client;
    container;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        const containerName = config.cosmosDb.containers.aiModels;
        this.monitoring.trackEvent('ai-model.service.initialized', { containerName });
        this.container = database.container(containerName);
    }
    /**
     * Create a new AI model in the catalog
     */
    async createModel(input, createdBy) {
        const now = new Date().toISOString();
        const id = `model-${input.provider.toLowerCase()}-${input.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        const model = {
            id,
            name: input.name,
            provider: input.provider, // Used as partition key
            type: input.type,
            hoster: input.hoster,
            allowTenantConnections: input.allowTenantConnections,
            contextWindow: input.contextWindow,
            maxOutputs: input.maxOutputs,
            streaming: input.streaming,
            vision: input.vision,
            functions: input.functions,
            jsonMode: input.jsonMode,
            status: 'active',
            description: input.description,
            modelIdentifier: input.modelIdentifier,
            pricing: input.pricing,
            createdAt: now,
            createdBy,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(model);
        if (!resource) {
            throw new Error('Failed to create AI model');
        }
        return resource;
    }
    /**
     * Get a model by ID
     * Query by ID since partition key is /provider, not /id
     */
    async getModel(modelId) {
        try {
            const { resources } = await this.container.items
                .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: modelId }],
            })
                .fetchAll();
            return resources.length > 0 ? resources[0] : null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * List models with optional filters
     */
    async listModels(filters) {
        try {
            let query = 'SELECT * FROM c WHERE 1=1';
            const parameters = [];
            let paramIndex = 0;
            if (filters?.type) {
                query += ` AND c.type = @type${paramIndex}`;
                parameters.push({ name: `@type${paramIndex}`, value: filters.type });
                paramIndex++;
            }
            if (filters?.provider) {
                query += ` AND c.provider = @provider${paramIndex}`;
                parameters.push({ name: `@provider${paramIndex}`, value: filters.provider });
                paramIndex++;
            }
            if (filters?.hoster) {
                query += ` AND c.hoster = @hoster${paramIndex}`;
                parameters.push({ name: `@hoster${paramIndex}`, value: filters.hoster });
                paramIndex++;
            }
            if (filters?.status) {
                query += ` AND c.status = @status${paramIndex}`;
                parameters.push({ name: `@status${paramIndex}`, value: filters.status });
                paramIndex++;
            }
            if (filters?.allowTenantConnections !== undefined) {
                query += ` AND c.allowTenantConnections = @allowTenant${paramIndex}`;
                parameters.push({ name: `@allowTenant${paramIndex}`, value: filters.allowTenantConnections });
                paramIndex++;
            }
            // Add sorting
            const sortBy = filters?.sortBy || 'name';
            const sortOrder = filters?.sortOrder || 'asc';
            query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;
            const { resources } = await this.container.items
                .query({
                query,
                parameters,
            })
                .fetchAll();
            // Handle pagination in-memory
            const limit = filters?.limit || 50;
            const offset = filters?.offset || 0;
            const paginatedResources = resources.slice(offset, offset + limit);
            return {
                models: paginatedResources,
                limit,
                offset,
                count: paginatedResources.length,
                total: resources.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'ai-model.list-models' });
            throw error;
        }
    } /**
     * Update a model
     */
    async updateModel(modelId, input, updatedBy) {
        const existing = await this.getModel(modelId);
        if (!existing) {
            throw new Error('Model not found');
        }
        // Provider is the partition key, cannot be changed
        const updated = {
            ...existing,
            ...input,
            updatedAt: new Date().toISOString(),
            updatedBy,
        };
        const { resource } = await this.container
            .item(modelId, existing.provider) // Use provider as partition key
            .replace(updated);
        if (!resource) {
            throw new Error('Failed to update AI model');
        }
        return resource;
    }
    /**
     * Delete a model (soft delete by setting status to 'disabled')
     */
    async deleteModel(modelId, deletedBy) {
        await this.updateModel(modelId, { status: 'disabled' }, deletedBy);
    }
    /**
     * Hard delete a model (use with caution)
     */
    async hardDeleteModel(modelId) {
        // Get model first to find provider (partition key)
        const model = await this.getModel(modelId);
        if (!model) {
            throw new Error('Model not found');
        }
        await this.container.item(modelId, model.provider).delete();
    }
    /**
     * Get models available for tenant connections
     */
    async getModelsForTenants() {
        const result = await this.listModels({
            allowTenantConnections: true,
            status: 'active',
        });
        return result.models || [];
    }
    /**
     * Get active LLM models
     */
    async getActiveLLMModels() {
        const result = await this.listModels({
            type: 'LLM',
            status: 'active',
        });
        return result.models || [];
    }
    /**
     * Get active embedding models
     */
    async getActiveEmbeddingModels() {
        const result = await this.listModels({
            type: 'Embedding',
            status: 'active',
        });
        return result.models || [];
    }
    /**
     * Ensure the container exists and create if needed
     */
    async ensureContainer() {
        // Container creation is handled by CosmosDbClient initialization
        // This is a no-op but kept for consistency
    }
}
//# sourceMappingURL=ai-model.service.js.map