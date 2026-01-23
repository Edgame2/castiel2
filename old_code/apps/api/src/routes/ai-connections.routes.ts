/**
 * AI Connections Management Routes
 * 
 * Manages connections to AI models (system-wide and tenant-specific)
 * Integrates with Azure Key Vault for secure credential storage
 */

import { FastifyInstance } from 'fastify';
import { AIConnectionService } from '../services/ai/index.js';
import { UnifiedAIClient } from '../services/ai/unified-ai-client.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import type {
  CreateAIConnectionInput,
  UpdateAIConnectionInput,
  AIConnectionListFilters,
} from '@castiel/shared-types';

export function registerAIConnectionsRoutes(
  fastify: FastifyInstance,
  connectionService: AIConnectionService,
  unifiedAIClient?: UnifiedAIClient,
  monitoring?: IMonitoringProvider,
) {
  // ============================================
  // System Connections (Super Admin Only)
  // ============================================

  /**
   * List system AI connections
   * GET /admin/ai/connections
   */
  fastify.get<{
    Querystring: AIConnectionListFilters;
  }>(
    '/admin/ai/connections',
    {
      schema: {
        description: 'List system AI connections',
        tags: ['ai-admin'],
        querystring: {
          type: 'object',
          properties: {
            modelId: { type: 'string' },
            status: { type: 'string', enum: ['active', 'disabled', 'error'] },
            isDefaultModel: { type: 'boolean' },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 1000 },
            offset: { type: 'number', default: 0, minimum: 0 },
            sortBy: { type: 'string', enum: ['name', 'modelId', 'createdAt', 'updatedAt'], default: 'name' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await connectionService.listConnections({
          ...request.query,
          tenantId: 'system', // System connections only
        });
        return result;
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list system connections');
        return reply.status(500).send({
          error: 'Failed to list system connections',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get a single system AI connection
   * GET /admin/ai/connections/:connectionId
   */
  fastify.get<{
    Params: { connectionId: string };
  }>(
    '/admin/ai/connections/:connectionId',
    {
      schema: {
        description: 'Get a system AI connection by ID',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      try {
        const connection = await connectionService.getConnection(request.params.connectionId);

        if (!connection) {
          return reply.status(404).send({
            error: 'Connection not found',
            message: `System AI connection with ID ${request.params.connectionId} not found`,
          });
        }

        // Verify it's a system connection
        if (connection.tenantId !== 'system' && connection.tenantId !== null) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'This is not a system connection',
          });
        }

        return { connection };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get system connection');
        return reply.status(500).send({
          error: 'Failed to get system connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Test a system AI connection
   * POST /admin/ai/connections/:connectionId/test
   */
  fastify.post<{
    Params: { connectionId: string };
  }>(
    '/admin/ai/connections/:connectionId/test',
    {
      schema: {
        description: 'Test a system AI connection to verify it works',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      try {
        const connection = await connectionService.getConnection(request.params.connectionId);

        if (!connection) {
          return reply.status(404).send({
            error: 'Connection not found',
            message: `Connection with ID ${request.params.connectionId} not found`,
          });
        }

        // Verify it's a system connection
        if (connection.tenantId !== 'system' && connection.tenantId !== null) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'This is not a system connection',
          });
        }

        // Resolve connection credentials + model
        const creds = await connectionService.getConnectionWithCredentials(connection.id);
        if (!creds) {
          return reply.status(404).send({
            error: 'Connection credentials not found',
            message: 'Could not load credentials for this connection',
          });
        }

        const { connection: fullConnection, model, apiKey } = creds;
        const provider = detectProvider(fullConnection.endpoint, fullConnection.modelId);

        // Log the endpoint being tested for debugging
        fastify.log.info({
          connectionId: fullConnection.id,
          connectionName: fullConnection.name,
          endpoint: fullConnection.endpoint,
          modelType: model.type,
          provider,
        }, 'Testing AI connection');

        const startTime = Date.now();
        let testResult: {
          success: boolean;
          message: string;
          latency?: number;
          endpoint?: string;
          modelInfo?: any;
          error?: string;
          usage?: any;
        };

        try {
          switch (model.type) {
            case 'LLM': {
              if (!unifiedAIClient) {
                throw new Error('Unified AI Client unavailable');
              }
              const llmStart = Date.now();
              const result = await unifiedAIClient.chat(fullConnection, apiKey, {
                messages: [
                  { role: 'system', content: 'You are a health-check bot. Reply with the word PING.' },
                  { role: 'user', content: 'Say PING exactly.' },
                ],
                temperature: 0,
                maxTokens: 16,
              });

              const latency = Date.now() - llmStart;
              const normalized = (result.content || '').trim().toLowerCase();
              const success = normalized === 'ping';

              testResult = {
                success,
                message: success ? 'LLM responded correctly' : `Unexpected response: ${result.content}`,
                latency,
                endpoint: fullConnection.endpoint,
                usage: result.usage,
              };
              break;
            }
            case 'Embedding': {
              const embeddingStart = Date.now();
              const embeddingResult = await testEmbedding(fullConnection, apiKey, provider);
              const latency = Date.now() - embeddingStart;
              testResult = {
                ...embeddingResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'ImageGeneration': {
              const imgStart = Date.now();
              const imgResult = await testImageGeneration(fullConnection, apiKey, provider);
              const latency = Date.now() - imgStart;
              testResult = {
                ...imgResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'Moderation': {
              const modStart = Date.now();
              const modResult = await testModeration(fullConnection, apiKey, provider);
              const latency = Date.now() - modStart;
              testResult = {
                ...modResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'Vision': {
              const visStart = Date.now();
              const visResult = await testVision(fullConnection, apiKey, provider);
              const latency = Date.now() - visStart;
              testResult = {
                ...visResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'SpeechToText': {
              const sttStart = Date.now();
              const sttResult = await testSpeechToText(fullConnection, apiKey, provider);
              const latency = Date.now() - sttStart;
              testResult = {
                ...sttResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'TextToSpeech': {
              const ttsStart = Date.now();
              const ttsResult = await testTextToSpeech(fullConnection, apiKey, provider);
              const latency = Date.now() - ttsStart;
              testResult = {
                ...ttsResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            case 'VideoGeneration': {
              const vidStart = Date.now();
              const vidResult = await testVideoGeneration(fullConnection, apiKey, provider);
              const latency = Date.now() - vidStart;
              testResult = {
                ...vidResult,
                latency,
                endpoint: fullConnection.endpoint,
              };
              break;
            }
            default: {
              testResult = {
                success: false,
                message: `Model type ${model.type} test not implemented yet`,
                endpoint: fullConnection.endpoint,
                error: 'NOT_IMPLEMENTED',
              };
              break;
            }
          }
        } catch (error: any) {
          testResult = {
            success: false,
            message: error?.message || 'Test failed',
            endpoint: fullConnection.endpoint,
            error: error?.message,
          };
        }

        // Track monitoring if provided
        monitoring?.trackEvent('ai-connection.test', {
          connectionId: fullConnection.id,
          modelId: fullConnection.modelId,
          modelType: model.type,
          provider,
          success: testResult.success,
          latencyMs: testResult.latency,
          error: testResult.error,
        });

        return {
          connectionId: fullConnection.id,
          connectionName: fullConnection.name,
          modelType: model.type,
          provider,
          ...testResult,
        };
      } catch (error) {
        fastify.log.error({
          err: error,
          connectionId: request.params.connectionId,
        }, 'Failed to test connection');
        return reply.status(500).send({
          error: 'Failed to test connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Create a system AI connection
   * POST /admin/ai/connections
   */
  fastify.post<{
    Body: CreateAIConnectionInput;
  }>(
    '/admin/ai/connections',
    {
      schema: {
        description: 'Create a system AI connection',
        tags: ['ai-admin'],
        body: {
          type: 'object',
          required: ['name', 'modelId', 'endpoint'],
          properties: {
            name: { type: 'string' },
            modelId: { type: 'string' },
            endpoint: { type: 'string' },
            version: { type: 'string' },
            deploymentName: { type: 'string' },
            contextWindow: { type: 'number' },
            isDefaultModel: { type: 'boolean' },
            apiKey: { type: 'string' },
            apiKeyEnvVar: { type: 'string' },
            tenantId: { type: ['string', 'null'] },
          },
          oneOf: [
            { required: ['apiKey'] },
            { required: ['apiKeyEnvVar'] },
          ],
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id || (request as any).user?.id;
      const roles = (request.user as any)?.roles || (request as any).user?.roles;

      // Check if user is super admin
      const isSuperAdmin = roles?.includes('super-admin') || roles?.includes('super_admin') || roles?.includes('superadmin');
      if (!isSuperAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only super admins can create system AI connections',
        });
      }

      try {
        const connection = await connectionService.createConnection(
          {
            ...request.body,
            tenantId: null, // System connection
          },
          userId
        );

        return reply.status(201).send({
          success: true,
          message: 'System connection created and API key stored securely in Key Vault',
          connection: {
            ...connection,
            secretId: undefined, // Don't expose secret ID
          },
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create system connection');
        return reply.status(500).send({
          error: 'Failed to create system connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Update a system AI connection
   * PATCH /admin/ai/connections/:connectionId
   */
  fastify.patch<{
    Params: { connectionId: string };
    Body: UpdateAIConnectionInput;
  }>(
    '/admin/ai/connections/:connectionId',
    {
      schema: {
        description: 'Update a system AI connection',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id || (request as any).user?.id;

      try {
        const connection = await connectionService.updateConnection(
          request.params.connectionId,
          request.body,
          userId
        );

        return {
          success: true,
          connection: {
            ...connection,
            secretId: undefined,
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to update system connection');

        if (error instanceof Error && error.message === 'Connection not found') {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        return reply.status(500).send({
          error: 'Failed to update system connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Toggle connection status (active ↔ disabled)
   * POST /admin/ai/connections/:connectionId/toggle-status
   */
  fastify.post<{
    Params: { connectionId: string };
  }>(
    '/admin/ai/connections/:connectionId/toggle-status',
    {
      schema: {
        description: 'Toggle connection status between active and disabled',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      const userId = (request.user as any)?.id || (request as any).user?.id;

      try {
        const connection = await connectionService.getConnection(request.params.connectionId);

        if (!connection) {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        // Toggle status: active → disabled, anything else → active
        const newStatus = connection.status === 'active' ? 'disabled' : 'active';

        const updated = await connectionService.updateConnection(
          request.params.connectionId,
          { status: newStatus },
          userId
        );

        return {
          success: true,
          connection: {
            ...updated,
            secretId: undefined,
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to toggle connection status');

        if (error instanceof Error && error.message === 'Connection not found') {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        return reply.status(500).send({
          error: 'Failed to toggle connection status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Delete a system AI connection
   * DELETE /admin/ai/connections/:connectionId
   */
  fastify.delete<{
    Params: { connectionId: string };
  }>(
    '/admin/ai/connections/:connectionId',
    {
      schema: {
        description: 'Delete a system AI connection',
        tags: ['ai-admin'],
      },
    },
    async (request, reply) => {
      try {
        await connectionService.hardDeleteConnection(request.params.connectionId);
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete system connection');
        return reply.status(500).send({
          error: 'Failed to delete system connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ============================================
  // Tenant Connections (Tenant Admin)
  // ============================================

  /**
   * List tenant AI connections
   * GET /tenant/ai/connections
   */
  fastify.get(
    '/tenant/ai/connections',
    {
      schema: {
        description: 'List available AI connections for tenant',
        tags: ['ai-tenant'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      try {
        const connections = await connectionService.getAvailableConnections(tenantId);

        // Don't expose secret IDs
        const sanitized = connections.map(c => ({
          ...c,
          secretId: undefined,
        }));

        return { connections: sanitized };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list tenant connections');
        return reply.status(500).send({
          error: 'Failed to list tenant connections',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Create a tenant AI connection (BYOK - Bring Your Own Key)
   * POST /tenant/ai/connections
   */
  fastify.post<{
    Body: CreateAIConnectionInput;
  }>(
    '/tenant/ai/connections',
    {
      schema: {
        description: 'Create a tenant AI connection with your own API key',
        tags: ['ai-tenant'],
        body: {
          type: 'object',
          required: ['name', 'modelId', 'endpoint'],
          properties: {
            name: { type: 'string' },
            modelId: { type: 'string' },
            endpoint: { type: 'string' },
            version: { type: 'string' },
            deploymentName: { type: 'string' },
            contextWindow: { type: 'number' },
            isDefaultModel: { type: 'boolean' },
            apiKey: { type: 'string' },
            apiKeyEnvVar: { type: 'string' },
          },
          oneOf: [
            { required: ['apiKey'] },
            { required: ['apiKeyEnvVar'] },
          ],
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const userId = (request.user as any)?.id || (request as any).user?.id;

      try {
        const connection = await connectionService.createConnection(
          {
            ...request.body,
            tenantId, // Tenant-specific connection
          },
          userId
        );

        return reply.status(201).send({
          success: true,
          message: 'Tenant connection created and API key stored securely in Key Vault',
          connection: {
            ...connection,
            secretId: undefined,
          },
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create tenant connection');

        if (error instanceof Error && error.message.includes('not allowed')) {
          return reply.status(403).send({
            error: 'Tenant connections not allowed for this model',
            message: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Failed to create tenant connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Update a tenant AI connection
   * PATCH /tenant/ai/connections/:connectionId
   */
  fastify.patch<{
    Params: { connectionId: string };
    Body: UpdateAIConnectionInput;
  }>(
    '/tenant/ai/connections/:connectionId',
    {
      schema: {
        description: 'Update a tenant AI connection',
        tags: ['ai-tenant'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const userId = (request.user as any)?.id || (request as any).user?.id;

      try {
        // Verify connection belongs to tenant
        const existing = await connectionService.getConnection(request.params.connectionId);

        if (!existing) {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        if (existing.tenantId !== tenantId) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const connection = await connectionService.updateConnection(
          request.params.connectionId,
          request.body,
          userId
        );

        return {
          success: true,
          connection: {
            ...connection,
            secretId: undefined,
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to update tenant connection');
        return reply.status(500).send({
          error: 'Failed to update tenant connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Toggle tenant connection status (active ↔ disabled)
   * POST /tenant/ai/connections/:connectionId/toggle-status
   */
  fastify.post<{
    Params: { connectionId: string };
  }>(
    '/tenant/ai/connections/:connectionId/toggle-status',
    {
      schema: {
        description: 'Toggle tenant connection status between active and disabled',
        tags: ['ai-tenant'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;
      const userId = (request.user as any)?.id || (request as any).user?.id;

      try {
        // Verify connection belongs to tenant
        const existing = await connectionService.getConnection(request.params.connectionId);

        if (!existing) {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        if (existing.tenantId !== tenantId) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Toggle status: active → disabled, anything else → active
        const newStatus = existing.status === 'active' ? 'disabled' : 'active';

        const updated = await connectionService.updateConnection(
          request.params.connectionId,
          { status: newStatus },
          userId
        );

        return {
          success: true,
          connection: {
            ...updated,
            secretId: undefined,
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to toggle tenant connection status');
        return reply.status(500).send({
          error: 'Failed to toggle connection status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Delete a tenant AI connection
   * DELETE /tenant/ai/connections/:connectionId
   */
  fastify.delete<{
    Params: { connectionId: string };
  }>(
    '/tenant/ai/connections/:connectionId',
    {
      schema: {
        description: 'Delete a tenant AI connection',
        tags: ['ai-tenant'],
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      try {
        // Verify connection belongs to tenant
        const existing = await connectionService.getConnection(request.params.connectionId);

        if (!existing) {
          return reply.status(404).send({ error: 'Connection not found' });
        }

        if (existing.tenantId !== tenantId) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        await connectionService.hardDeleteConnection(request.params.connectionId);
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete tenant connection');
        return reply.status(500).send({
          error: 'Failed to delete tenant connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get default connection for tenant
   * GET /tenant/ai/connections/default/:type
   */
  fastify.get<{
    Params: { type: 'LLM' | 'Embedding' };
  }>(
    '/tenant/ai/connections/default/:type',
    {
      schema: {
        description: 'Get default AI connection for tenant',
        tags: ['ai-tenant'],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['LLM', 'Embedding'] },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request.user as any)?.tenantId || (request as any).user?.tenantId;

      try {
        const credentials = await connectionService.getDefaultConnection(
          tenantId,
          request.params.type
        );

        if (!credentials) {
          return reply.status(404).send({
            error: 'No default connection found',
            message: `No default ${request.params.type} connection configured`,
          });
        }

        // Don't return API key in this endpoint
        return {
          connection: {
            ...credentials.connection,
            secretId: undefined,
          },
          model: credentials.model,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to get default connection');
        return reply.status(500).send({
          error: 'Failed to get default connection',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

// Infer provider from endpoint/model
function detectProvider(endpoint: string, modelId: string): string {
  const lowerEndpoint = endpoint.toLowerCase();
  const lowerModel = modelId.toLowerCase();

  // Azure patterns: openai.azure.com or cognitiveservices.azure.com
  if (lowerEndpoint.includes('openai.azure.com') || lowerEndpoint.includes('cognitiveservices.azure.com')) {return 'azure_openai';}
  if (lowerEndpoint.includes('api.openai.com')) {return 'openai';}
  if (lowerEndpoint.includes('api.anthropic.com')) {return 'anthropic';}
  if (lowerEndpoint.includes('googleapis.com') || lowerEndpoint.includes('vertex')) {return 'google_vertex';}
  if (lowerEndpoint.includes('api.cohere.ai')) {return 'cohere';}

  if (lowerModel.startsWith('gpt-') || lowerModel.includes('text-embedding')) {
    return lowerEndpoint.includes('azure') ? 'azure_openai' : 'openai';
  }
  if (lowerModel.startsWith('claude-')) {return 'anthropic';}
  if (lowerModel.startsWith('gemini-')) {return 'google_vertex';}
  if (lowerModel.startsWith('command-') || lowerModel.startsWith('embed-')) {return 'cohere';}

  return 'unknown';
}

/**
 * Normalize Azure endpoint by removing /openai/ suffix if present
 * Azure expects: https://instance.cognitiveservices.azure.com/
 * Then /openai/deployments/{deployment}/... is appended
 */
function normalizeAzureEndpoint(endpoint: string): string {
  let normalized = endpoint.trim();
  if (normalized.endsWith('/openai/')) {
    normalized = normalized.slice(0, -8); // Remove '/openai/'
  } else if (normalized.endsWith('/openai')) {
    normalized = normalized.slice(0, -7); // Remove '/openai'
  }
  return normalized;
}

// Minimal embedding probe for OpenAI & Azure OpenAI
async function testEmbedding(connection: any, apiKey: string, provider: string) {
  const payloadText = 'health check';

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ input: payloadText }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    return {
      success: Array.isArray(embedding) && embedding.length > 0,
      message: 'Embedding test executed',
      modelInfo: {
        embeddingLength: embedding?.length || 0,
      },
    };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/embeddings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: connection.modelId,
        input: payloadText,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    return {
      success: Array.isArray(embedding) && embedding.length > 0,
      message: 'Embedding test executed',
      modelInfo: {
        embeddingLength: embedding?.length || 0,
      },
    };
  }

  return {
    success: false,
    message: `Embedding test not supported for provider ${provider}`,
    error: 'NOT_IMPLEMENTED',
  };
}

// Minimal image generation probe for OpenAI & Azure OpenAI
async function testImageGeneration(connection: any, apiKey: string, provider: string) {
  const prompt = 'Generate a simple blue square.';

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ prompt, size: '256x256', n: 1 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const image = data?.data?.[0];
    const hasPayload = !!(image?.b64_json || image?.url);
    return {
      success: hasPayload,
      message: hasPayload ? 'Image generation test executed' : 'No image payload returned',
      modelInfo: {
        hasBase64: Boolean(image?.b64_json),
        hasUrl: Boolean(image?.url),
      },
    };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/images/generations`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: connection.modelId, prompt, size: '256x256', n: 1 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const image = data?.data?.[0];
    const hasPayload = !!(image?.b64_json || image?.url);
    return {
      success: hasPayload,
      message: hasPayload ? 'Image generation test executed' : 'No image payload returned',
      modelInfo: {
        hasBase64: Boolean(image?.b64_json),
        hasUrl: Boolean(image?.url),
      },
    };
  }

  return {
    success: false,
    message: `Image generation test not supported for provider ${provider}`,
    error: 'NOT_IMPLEMENTED',
  };
}

// Minimal moderation probe for OpenAI & Azure OpenAI
async function testModeration(connection: any, apiKey: string, provider: string) {
  const input = 'This is a safe test message.';

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/moderations?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const flagged = Boolean(data?.results?.[0]?.flagged);
    return {
      success: true,
      message: flagged ? 'Moderation flagged the benign input (unexpected)' : 'Moderation responded',
      modelInfo: {
        flagged,
      },
    };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/moderations`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: connection.modelId, input }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const flagged = Boolean(data?.results?.[0]?.flagged);
    return {
      success: true,
      message: flagged ? 'Moderation flagged the benign input (unexpected)' : 'Moderation responded',
      modelInfo: {
        flagged,
      },
    };
  }

  return {
    success: false,
    message: `Moderation test not supported for provider ${provider}`,
    error: 'NOT_IMPLEMENTED',
  };
}

// Minimal vision probe for OpenAI & Azure OpenAI (image + short question)
async function testVision(connection: any, apiKey: string, provider: string) {
  // 1x1 blue pixel PNG
  const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XK9N8AAAAASUVORK5CYII=';
  const imageUrl = `data:image/png;base64,${tinyPngBase64}`;
  const messages = [
    { role: 'user', content: [{ type: 'text', text: 'What color is this image?' }, { type: 'image_url', image_url: { url: imageUrl } }] },
  ];

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ messages, max_tokens: 32 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.toLowerCase?.() || '';
    const success = answer.includes('blue');
    return { success, message: success ? 'Vision responded correctly' : `Unexpected vision answer: ${answer}` };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: connection.modelId, messages, max_tokens: 32 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.toLowerCase?.() || '';
    const success = answer.includes('blue');
    return { success, message: success ? 'Vision responded correctly' : `Unexpected vision answer: ${answer}` };
  }

  return { success: false, message: `Vision test not supported for provider ${provider}`, error: 'NOT_IMPLEMENTED' };
}

// Minimal STT probe for OpenAI & Azure OpenAI (Whisper)
async function testSpeechToText(connection: any, apiKey: string, provider: string) {
  // Tiny WAV header with silence is enough to test; we just assert the endpoint responds.
  const wavBytes = Uint8Array.from([82,73,70,70,36,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,136,88,1,0,2,0,16,0,100,97,116,97,0,0,0,0]);
  const blob = Buffer.from(wavBytes);

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/audio/transcriptions?api-version=${apiVersion}`;

    const form = new FormData();
    form.append('file', new Blob([blob], { type: 'audio/wav' }), 'test.wav');
    form.append('model', deployment);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': apiKey },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const text = (data?.text || '').toLowerCase();
    return { success: true, message: 'STT responded', modelInfo: { transcript: text.slice(0, 32) } };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/audio/transcriptions`;
    const form = new FormData();
    form.append('file', new Blob([blob], { type: 'audio/wav' }), 'test.wav');
    form.append('model', connection.modelId);

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const text = (data?.text || '').toLowerCase();
    return { success: true, message: 'STT responded', modelInfo: { transcript: text.slice(0, 32) } };
  }

  return { success: false, message: `STT test not supported for provider ${provider}`, error: 'NOT_IMPLEMENTED' };
}

// Minimal TTS probe for OpenAI & Azure OpenAI
async function testTextToSpeech(connection: any, apiKey: string, provider: string) {
  const input = 'ping';

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ input, voice: 'alloy', format: 'wav' }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const success = buf.length > 0;
    return { success, message: success ? 'TTS returned audio' : 'Empty audio payload', modelInfo: { bytes: buf.length } };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/audio/speech`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: connection.modelId, input, voice: 'alloy', format: 'wav' }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const success = buf.length > 0;
    return { success, message: success ? 'TTS returned audio' : 'Empty audio payload', modelInfo: { bytes: buf.length } };
  }

  return { success: false, message: `TTS test not supported for provider ${provider}`, error: 'NOT_IMPLEMENTED' };
}

// Minimal video generation probe (OpenAI/Azure) – shallow validation
async function testVideoGeneration(connection: any, apiKey: string, provider: string) {
  const prompt = 'Generate a 1-second abstract animation.';

  if (provider === 'azure_openai') {
    const apiVersion = connection.version || '2024-02-15-preview';
    const deployment = connection.deploymentName || connection.modelId;
    const baseEndpoint = normalizeAzureEndpoint(connection.endpoint);
    const url = `${baseEndpoint}/openai/deployments/${deployment}/videos/generations?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ prompt, duration: 1 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const video = data?.data?.[0];
    const hasPayload = !!(video?.url || video?.b64_json);
    return { success: hasPayload, message: hasPayload ? 'Video generation responded' : 'No video payload returned', modelInfo: { hasUrl: Boolean(video?.url), hasBase64: Boolean(video?.b64_json) } };
  }

  if (provider === 'openai') {
    const url = `${connection.endpoint}/v1/videos/generations`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: connection.modelId, prompt, duration: 1 }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || response.statusText);
    }

    const data: any = await response.json();
    const video = data?.data?.[0];
    const hasPayload = !!(video?.url || video?.b64_json);
    return { success: hasPayload, message: hasPayload ? 'Video generation responded' : 'No video payload returned', modelInfo: { hasUrl: Boolean(video?.url), hasBase64: Boolean(video?.b64_json) } };
  }

  return { success: false, message: `Video generation test not supported for provider ${provider}`, error: 'NOT_IMPLEMENTED' };
}
