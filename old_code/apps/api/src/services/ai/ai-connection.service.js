// @ts-nocheck - Optional AI service, not used by workers
import { CosmosClient } from '@azure/cosmos';
import { config } from '../../config/env.js';
import { AIModelService } from './ai-model.service.js';
import { ShardRepository } from '../../repositories/shard.repository.js';
import { ShardTypeRepository } from '../../repositories/shard-type.repository.js';
/**
 * Service for managing AI connections with Key Vault integration
 * Handles both system-wide and tenant-specific connections
 */
export class AIConnectionService {
    monitoring;
    redis;
    keyVault;
    client;
    container;
    modelService;
    shardRepository;
    shardTypeRepository;
    constructor(monitoring, redis, keyVault) {
        this.monitoring = monitoring;
        this.redis = redis;
        this.keyVault = keyVault;
        // Use optimized connection policy for production
        const connectionPolicy = {
            connectionMode: 'Direct', // Best performance
            requestTimeout: 30000, // 30 seconds
            enableEndpointDiscovery: true, // For multi-region
            retryOptions: {
                maxRetryAttemptCount: 9,
                fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
                maxWaitTimeInSeconds: 30,
            },
        };
        this.client = new CosmosClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
            connectionPolicy,
        });
        const database = this.client.database(config.cosmosDb.databaseId);
        this.container = database.container(config.cosmosDb.containers.aiConnections);
        this.modelService = new AIModelService(monitoring);
        this.shardRepository = new ShardRepository(monitoring);
        this.shardTypeRepository = new ShardTypeRepository(monitoring);
    }
    /**
     * Get model by ID - checks aimodel container only
     */
    async getModelById(modelId) {
        // Get from aimodel container
        const model = await this.modelService.getModel(modelId);
        if (model) {
            return model;
        }
        // Model not found
        return null;
    }
    // REMOVED: Legacy Shards storage check - all models now in aimodel container
    /*
    private async getModelByIdLegacy(modelId: string): Promise<AIModel | null> {
      try {
        // Get AI Model ShardType - try both by name and by direct ID
        const shardTypes = await this.shardTypeRepository.list('system', { limit: 100 });
        let aiModelType = shardTypes.shardTypes.find(
          (st) => st.name === CORE_SHARD_TYPE_NAMES.AI_MODEL || st.name === 'c_aimodel'
        );
  
        // If not found by name, try to find by searching for shardTypeId = 'c_aimodel'
        if (!aiModelType) {
          // Try to get the shardType directly by querying shards with shardTypeId = 'c_aimodel'
          // This is a fallback if the ShardType isn't in the repository yet
          this.monitoring.trackEvent('ai-connection.modelTypeNotFound', {
            modelId,
            searchedTypes: shardTypes.shardTypes.length,
          });
        }
  
        // Try to find by ID using findById (works regardless of ShardType lookup)
        try {
          const shard = await this.shardRepository.findById(modelId, 'system');
          if (shard) {
            // Check if it's an AI model shard (by shardTypeId or by checking the structuredData)
            const isAIModel = shard.shardTypeId === 'c_aimodel' ||
                             (aiModelType && shard.shardTypeId === aiModelType.id) ||
                             (shard.structuredData as any)?.modelType !== undefined ||
                             (shard.structuredData as any)?.provider !== undefined;
              
              if (isAIModel) {
                const data = shard.structuredData as any;
                this.monitoring.trackEvent('ai-connection.modelFoundById', {
                  modelId,
                  shardId: shard.id,
                  shardTypeId: shard.shardTypeId,
                });
                
                // Convert Shard format to AIModel format
                return {
                  id: shard.id,
                  name: data.name,
                  modelId: data.modelId || data.name || shard.id,
                  type: data.modelType || 'LLM',
                  provider: data.provider,
                  hoster: data.hoster || data.provider || 'provider',
                  allowTenantConnections: data.allowTenantCustom ?? data.allowTenantConnections ?? false,
                  contextWindow: data.contextWindow,
                  maxOutputs: data.maxOutputTokens || data.maxOutputs,
                  streaming: data.supportsStreaming ?? data.streaming ?? false,
                  vision: data.supportsVision ?? data.vision ?? false,
                  functions: data.supportsFunctionCalling ?? data.functions ?? false,
                  jsonMode: data.supportsJSON ?? data.jsonMode ?? false,
                  status: (data.isActive ?? true) ? 'active' : 'disabled',
                  description: data.description || '',
                  modelIdentifier: data.modelId || data.name,
                  pricing: {
                    inputPricePerMillion: data.inputPricePerMillion || 0,
                    outputPricePerMillion: data.outputPricePerMillion || 0,
                  },
                  createdAt: shard.createdAt?.toISOString() || new Date().toISOString(),
                  updatedAt: shard.updatedAt?.toISOString() || new Date().toISOString(),
                } as AIModel;
              } else {
                this.monitoring.trackEvent('ai-connection.modelWrongType', {
                  modelId,
                  shardId: shard.id,
                  shardTypeId: shard.shardTypeId,
                  expectedTypeId: aiModelType?.id || 'c_aimodel',
                });
              }
            }
          } catch (shardError: any) {
            this.monitoring.trackException(shardError, {
              operation: 'ai-connection.getModelById.findById',
              modelId,
            });
          }
  
        // If not found by ID, try searching by name or modelId in structuredData
        // Use ShardType ID if available, otherwise use 'c_aimodel' directly
        const shardTypeIdFilter = aiModelType?.id || 'c_aimodel';
        try {
          const result = await this.shardRepository.list({
            filter: {
              tenantId: 'system',
              shardTypeId: shardTypeIdFilter,
            },
            limit: 100,
          });
  
          this.monitoring.trackEvent('ai-connection.modelSearch', {
            modelId,
            totalShards: result.shards.length,
            shardTypeId: aiModelType.id,
          });
  
          const foundShard = result.shards.find(
            (s) =>
              s.id === modelId ||
              (s.structuredData as any)?.modelId === modelId ||
              (s.structuredData as any)?.name === modelId ||
              (s.structuredData as any)?.name?.toLowerCase() === modelId.toLowerCase()
          );
  
          if (foundShard) {
            const data = foundShard.structuredData as any;
            this.monitoring.trackEvent('ai-connection.modelFoundBySearch', {
              modelId,
              foundById: foundShard.id === modelId,
              foundByName: (data.name === modelId),
              foundByModelId: (data.modelId === modelId),
            });
            
            return {
              id: foundShard.id,
              name: data.name,
              modelId: data.modelId || data.name || foundShard.id,
              type: data.modelType || 'LLM',
              provider: data.provider,
              hoster: data.hoster || data.provider || 'provider',
              allowTenantConnections: data.allowTenantCustom ?? data.allowTenantConnections ?? false,
              contextWindow: data.contextWindow,
              maxOutputs: data.maxOutputTokens || data.maxOutputs,
              streaming: data.supportsStreaming ?? data.streaming ?? false,
              vision: data.supportsVision ?? data.vision ?? false,
              functions: data.supportsFunctionCalling ?? data.functions ?? false,
              jsonMode: data.supportsJSON ?? data.jsonMode ?? false,
              status: (data.isActive ?? true) ? 'active' : 'disabled',
              description: data.description || '',
              modelIdentifier: data.modelId || data.name,
              pricing: {
                inputPricePerMillion: data.inputPricePerMillion || 0,
                outputPricePerMillion: data.outputPricePerMillion || 0,
              },
              createdAt: foundShard.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: foundShard.updatedAt?.toISOString() || new Date().toISOString(),
            } as AIModel;
          } else {
            this.monitoring.trackEvent('ai-connection.modelNotFound', {
              modelId,
              searchedShards: result.shards.length,
              shardIds: result.shards.map(s => s.id).slice(0, 5),
            });
          }
        }
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'ai-connection.getModelFromShards',
          modelId,
        });
      }
  
      return null;
    }
  
    /**
     * Create a new AI connection
     * Stores API key in Key Vault OR uses environment variable
     */
    async createConnection(input, createdBy) {
        // Validate model exists
        const model = await this.getModelById(input.modelId);
        if (!model) {
            throw new Error(`Model not found: ${input.modelId}`);
        }
        // Check tenant permissions
        if (input.tenantId && !model.allowTenantConnections) {
            throw new Error(`Tenant connections not allowed for model: ${model.name}`);
        }
        // Validate that either apiKey or apiKeyEnvVar is provided
        if (!input.apiKey && !input.apiKeyEnvVar) {
            throw new Error('Either apiKey or apiKeyEnvVar must be provided');
        }
        const now = new Date().toISOString();
        const connectionId = `conn-${input.modelId}-${input.tenantId || 'system'}-${Date.now()}`;
        let secretId;
        // Store API key in Key Vault only if apiKey is provided (not apiKeyEnvVar)
        if (input.apiKey) {
            if (!this.keyVault) {
                throw new Error('Key Vault not configured - cannot store API key securely');
            }
            // Generate secret ID for Key Vault using model name and a random suffix for uniqueness
            secretId = this.generateSecretId(model.name, input.tenantId || null);
            try {
                await this.keyVault.setSecret(secretId, input.apiKey, {
                    contentType: 'application/json',
                    tags: {
                        provider: model.provider,
                        modelId: input.modelId,
                        scope: input.tenantId ? 'tenant' : 'system',
                        tenantId: input.tenantId || 'system',
                        connectionId,
                        createdAt: now,
                    },
                });
            }
            catch (error) {
                throw new Error(`Failed to store API key in Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // If this is set as default, unset other defaults
        if (input.isDefaultModel) {
            await this.unsetDefaults(input.tenantId || null, model.type);
        }
        const connection = {
            id: connectionId,
            name: input.name,
            modelId: input.modelId,
            tenantId: input.tenantId || 'system', // Used as partition key (null → 'system')
            endpoint: input.endpoint,
            version: input.version,
            deploymentName: input.deploymentName,
            contextWindow: input.contextWindow,
            isDefaultModel: input.isDefaultModel || false,
            secretId, // Will be undefined if using apiKeyEnvVar
            apiKeyEnvVar: input.apiKeyEnvVar, // Store env var name if provided
            status: 'active',
            createdAt: now,
            createdBy,
            updatedAt: now,
        };
        const { resource } = await this.container.items.create(connection);
        if (!resource) {
            // Cleanup Key Vault if database insert fails
            if (this.keyVault && secretId) {
                try {
                    await this.keyVault.deleteSecret(secretId);
                }
                catch (err) {
                    // Log but don't throw - database failure is more critical
                    this.monitoring?.trackException(err, { operation: 'ai-connection.cleanup-key-vault-secret' });
                }
            }
            throw new Error('Failed to create AI connection');
        }
        return resource;
    }
    /**
     * Get a connection by ID
     */
    async getConnection(connectionId) {
        try {
            // Query by ID since partition key is tenantId, not connectionId
            const { resources } = await this.container.items
                .query({
                query: 'SELECT * FROM c WHERE c.id = @id',
                parameters: [{ name: '@id', value: connectionId }],
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
     * List connections with optional filters
     */
    async listConnections(filters) {
        try {
            let query = 'SELECT * FROM c WHERE 1=1';
            const parameters = [];
            let paramIndex = 0;
            if (filters?.modelId) {
                query += ` AND c.modelId = @modelId${paramIndex}`;
                parameters.push({ name: `@modelId${paramIndex}`, value: filters.modelId });
                paramIndex++;
            }
            if (filters?.tenantId !== undefined) {
                if (filters.tenantId === 'system' || filters.tenantId === null) {
                    // System connections - filter by tenantId = 'system'
                    query += ` AND c.tenantId = 'system'`;
                }
                else {
                    // Tenant-specific connections
                    query += ` AND c.tenantId = @tenantId${paramIndex}`;
                    parameters.push({ name: `@tenantId${paramIndex}`, value: filters.tenantId });
                    paramIndex++;
                }
            }
            if (filters?.status) {
                query += ` AND c.status = @status${paramIndex}`;
                parameters.push({ name: `@status${paramIndex}`, value: filters.status });
                paramIndex++;
            }
            if (filters?.isDefaultModel !== undefined) {
                query += ` AND c.isDefaultModel = @isDefault${paramIndex}`;
                parameters.push({ name: `@isDefault${paramIndex}`, value: filters.isDefaultModel });
                paramIndex++;
            }
            // Add sorting
            const sortBy = filters?.sortBy || 'name';
            const sortOrder = filters?.sortOrder || 'asc';
            query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;
            this.monitoring?.trackEvent('ai-connection.list-query', { query });
            const { resources } = await this.container.items
                .query({
                query,
                parameters,
            }, { maxItemCount: -1 } // Enable cross-partition query
            )
                .fetchAll();
            // Handle pagination in-memory
            const limit = filters?.limit || 50;
            const offset = filters?.offset || 0;
            const paginatedResources = resources.slice(offset, offset + limit);
            return {
                connections: paginatedResources,
                limit,
                offset,
                count: paginatedResources.length,
                total: resources.length,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, { operation: 'ai-connection.list-connections' });
            throw error;
        }
    }
    /**
     * Update a connection
     */
    async updateConnection(connectionId, input, updatedBy) {
        const existing = await this.getConnection(connectionId);
        if (!existing) {
            throw new Error('Connection not found');
        }
        const partitionKey = existing.tenantId || 'system'; // tenantId is partition key
        // If updating API key, update in Key Vault
        if (input.apiKey && this.keyVault && existing.secretId) {
            try {
                await this.keyVault.setSecret(existing.secretId, input.apiKey, {
                    contentType: 'application/json',
                    tags: {
                        updatedAt: new Date().toISOString(),
                        updatedBy,
                    },
                });
            }
            catch (error) {
                throw new Error(`Failed to update API key in Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // If changing default status, handle other defaults
        if (input.isDefaultModel && !existing.isDefaultModel) {
            const model = await this.getModelById(existing.modelId);
            if (model) {
                await this.unsetDefaults(existing.tenantId, model.type);
            }
        }
        // Build updated connection, excluding apiKey from input
        const { apiKey: _apiKey, ...inputWithoutApiKey } = input;
        const updated = {
            ...existing,
            ...inputWithoutApiKey,
            updatedAt: new Date().toISOString(),
            updatedBy,
        };
        // Remove apiKey from update
        delete updated.apiKey;
        const { resource } = await this.container.item(connectionId, partitionKey).replace(updated);
        if (!resource) {
            throw new Error('Failed to update AI connection');
        }
        return resource;
    }
    /**
     * Delete a connection (soft delete)
     */
    async deleteConnection(connectionId, deletedBy) {
        await this.updateConnection(connectionId, { status: 'disabled' }, deletedBy);
    }
    /**
     * Hard delete a connection (removes from database AND Key Vault)
     */
    async hardDeleteConnection(connectionId) {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }
        const partitionKey = connection.tenantId || 'system'; // tenantId is partition key
        // Delete from Key Vault (only if secretId exists)
        if (this.keyVault && connection.secretId) {
            try {
                await this.keyVault.deleteSecret(connection.secretId);
            }
            catch (error) {
                this.monitoring.trackException(error, { operation: 'ai-connection.delete-key-vault-secret' });
                // Continue with database deletion even if Key Vault fails
            }
        }
        // Delete from database
        await this.container.item(connectionId, partitionKey).delete();
    }
    /**
     * Get connection with credentials (retrieves API key from Key Vault)
     */
    async getConnectionWithCredentials(connectionId) {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            return null;
        }
        const model = await this.getModelById(connection.modelId);
        if (!model) {
            throw new Error(`Model not found for connection: ${connection.modelId}`);
        }
        // Retrieve API key from Key Vault or environment variable
        let apiKey;
        if (connection.apiKeyEnvVar) {
            // Use environment variable
            const envValue = process.env[connection.apiKeyEnvVar];
            if (!envValue) {
                throw new Error(`Environment variable ${connection.apiKeyEnvVar} not set`);
            }
            apiKey = envValue;
        }
        else if (this.keyVault && connection.secretId) {
            try {
                const secret = await this.keyVault.getSecret(connection.secretId);
                apiKey = secret.value;
            }
            catch (error) {
                throw new Error(`Failed to retrieve API key from Key Vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        else {
            throw new Error('Key Vault not configured - cannot retrieve credentials');
        }
        return {
            connection,
            model,
            apiKey,
        };
    }
    /**
     * Get default connection for a tenant and model type
     * Returns tenant connection if exists, otherwise system connection
     */
    async getDefaultConnection(tenantId, modelType) {
        // First, try tenant-specific default
        if (tenantId) {
            const tenantResult = await this.listConnections({
                tenantId,
                isDefaultModel: true,
            });
            const tenantConnections = tenantResult.connections || [];
            for (const conn of tenantConnections) {
                const model = await this.getModelById(conn.modelId);
                if (model && model.type === modelType && conn.status === 'active') {
                    return this.getConnectionWithCredentials(conn.id);
                }
            }
        }
        // Fallback to system default
        const systemResult = await this.listConnections({
            tenantId: 'system',
            isDefaultModel: true,
        });
        const systemConnections = systemResult.connections || [];
        for (const conn of systemConnections) {
            const model = await this.modelService.getModel(conn.modelId);
            if (model && model.type === modelType && conn.status === 'active') {
                return this.getConnectionWithCredentials(conn.id);
            }
        }
        return null;
    }
    /**
     * Get available connections for a tenant
     * Returns tenant-specific connections + system connections
     */
    async getAvailableConnections(tenantId) {
        // Get tenant connections
        const tenantResult = await this.listConnections({
            tenantId,
            status: 'active',
        });
        const tenantConnections = tenantResult.connections || [];
        // Get system connections
        const systemResult = await this.listConnections({
            tenantId: 'system',
            status: 'active',
        });
        const systemConnections = systemResult.connections || [];
        // Tenant connections override system connections for the same model
        const tenantModelIds = new Set(tenantConnections.map(c => c.modelId));
        const filteredSystemConnections = systemConnections.filter(c => !tenantModelIds.has(c.modelId));
        return [...tenantConnections, ...filteredSystemConnections];
    }
    /**
     * Generate Key Vault secret ID
     */
    generateSecretId(modelName, tenantId) {
        // Normalize model name to a safe slug for Key Vault naming
        const slug = modelName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60); // keep it reasonable
        const randomSuffix = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
        if (tenantId) {
            return `ai-provider-${slug}-tenant-${tenantId}-${randomSuffix}`;
        }
        return `ai-provider-${slug}-system-${randomSuffix}`;
    }
    /**
     * Unset other default connections for the same scope and model type
     */
    async unsetDefaults(tenantId, modelType) {
        const result = await this.listConnections({
            tenantId,
            isDefaultModel: true,
        });
        const connections = result.connections || [];
        for (const conn of connections) {
            const model = await this.modelService.getModel(conn.modelId);
            if (model && model.type === modelType) {
                const partitionKey = conn.tenantId || 'system'; // tenantId is partition key
                await this.container.item(conn.id, partitionKey).replace({
                    ...conn,
                    isDefaultModel: false,
                    updatedAt: new Date().toISOString(),
                });
            }
        }
    }
    /**
     * Get default connection for a tenant and model type
     */
    async getDefaultConnection(tenantId, modelType) {
        // First try tenant-specific default
        const tenantResult = await this.listConnections({
            tenantId,
            isDefaultModel: true,
            status: 'active',
        });
        if (tenantResult.connections.length > 0) {
            for (const conn of tenantResult.connections) {
                const model = await this.getModelById(conn.modelId);
                if (model && model.type === modelType) {
                    return conn;
                }
            }
        }
        // Fall back to system default
        const systemResult = await this.listConnections({
            tenantId: 'system',
            isDefaultModel: true,
            status: 'active',
        });
        for (const conn of systemResult.connections) {
            const model = await this.getModelById(conn.modelId);
            if (model && model.type === modelType) {
                return conn;
            }
        }
        return null;
    }
    /**
     * Get active connection for a specific model
     */
    async getConnectionForModel(modelId, tenantId) {
        // First try tenant-specific connection
        const tenantResult = await this.listConnections({
            tenantId,
            modelId,
            status: 'active',
        });
        if (tenantResult.connections.length > 0) {
            return tenantResult.connections[0];
        }
        // Fall back to system connection
        const systemResult = await this.listConnections({
            tenantId: 'system',
            modelId,
            status: 'active',
        });
        if (systemResult.connections.length > 0) {
            return systemResult.connections[0];
        }
        return null;
    }
    /**
     * Get connection with credentials for a specific model
     * This includes retrieving the API key from Key Vault
     */
    async getConnectionWithCredentialsForModel(modelId, tenantId) {
        // First, get the connection
        const connection = await this.getConnectionForModel(modelId, tenantId);
        if (!connection) {
            // Try to get default connection if no specific model match
            const defaultConn = await this.getDefaultConnection(tenantId, 'LLM');
            if (defaultConn) {
                return this.getConnectionWithCredentials(defaultConn.id);
            }
            return null;
        }
        // Then get the credentials
        return this.getConnectionWithCredentials(connection.id);
    }
    /**
     * Ensure the container exists
     */
    async ensureContainer() {
        // Container creation is handled by CosmosDbClient initialization
    }
}
//# sourceMappingURL=ai-connection.service.js.map