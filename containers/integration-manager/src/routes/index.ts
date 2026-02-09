/**
 * Route Registration
 * Integration Manager routes
 */

import { FastifyInstance } from 'fastify';
import { authenticateRequest, tenantEnforcementMiddleware, generateServiceToken, ServiceClient, EventPublisher } from '@coder/shared';
import { IntegrationProviderService } from '../services/IntegrationProviderService';
import { IntegrationService } from '../services/IntegrationService';
import { IntegrationCatalogService } from '../services/IntegrationCatalogService';
import { IntegrationConnectionService } from '../services/IntegrationConnectionService';
import { AdapterManagerService } from '../services/AdapterManagerService';
import { fetchIntegrationRecords } from '../services/IntegrationFetchHandler';
import { WebhookService } from '../services/WebhookService';
import { SyncTaskService } from '../services/SyncTaskService';
import { ContentGenerationService } from '../services/ContentGenerationService';
import { ContentTemplateService } from '../services/ContentTemplateService';
import { TemplateService } from '../services/TemplateService';
import { integrationHealthRoutes } from './integrationHealth.routes';
import {
  CreateIntegrationInput,
  UpdateIntegrationInput,
  Integration,
  CreateWebhookInput,
  UpdateWebhookInput,
  CreateSyncTaskInput,
  IntegrationStatus,
  SyncStatus,
  SyncJobType,
  SyncTrigger,
  AuthMethod,
  SyncDirection,
  ConnectionStatus,
  ConflictResolutionMode,
  EntityMapping,
  FieldMapping,
} from '../types/integration.types';
import {
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CreateVisibilityRuleInput,
} from '../types/integration-catalog.types';
import {
  CreateContentJobInput,
  GenerateContentRequest,
  CreateContentTemplateInput,
  UpdateContentTemplateInput,
} from '../types/content.types';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  RenderTemplateInput,
} from '../types/template.types';
import {
  DetectConflictInput,
  ResolveConflictInput,
} from '../types/bidirectional-sync.types';
import { BidirectionalSyncService } from '../services/BidirectionalSyncService';
import { createGoogleWorkspaceAdapter } from '../adapters/GoogleWorkspaceAdapter';
import { log } from '../utils/logger';
import {
  UpdateSystemSettingsInput,
  RateLimitSettings,
  ProcessingCapacitySettings,
  FeatureFlags,
} from '../types/system-settings.types';

export async function registerRoutes(app: FastifyInstance, config: any): Promise<void> {
  const integrationProviderService = new IntegrationProviderService();
  const integrationCatalogService = new IntegrationCatalogService(app);
  // Get secret management URL from config (no hardcoded fallback - must be in config)
  if (!config.services?.secret_management?.url) {
    throw new Error('Secret management service URL must be configured in config/services/secret_management/url');
  }
  const secretManagementUrl = config.services.secret_management.url;
  
  // Initialize event publisher for cache invalidation
  let eventPublisher: EventPublisher | null = null;
  if (config.rabbitmq?.url) {
    try {
      eventPublisher = new EventPublisher(
        {
          url: config.rabbitmq.url,
          exchange: config.rabbitmq.exchange || 'coder_events',
          exchangeType: 'topic',
        },
        'integration-manager'
      );
    } catch (error: any) {
      console.warn('Failed to initialize event publisher for cache invalidation', error);
    }
  }
  
  const integrationService = new IntegrationService(secretManagementUrl, eventPublisher || undefined);
  const integrationConnectionService = new IntegrationConnectionService(
    app,
    integrationService,
    integrationProviderService
  );
  const adapterManagerService = new AdapterManagerService(
    integrationConnectionService,
    integrationService,
    app
  );
  adapterManagerService.registerAdapter('google_workspace', {
    create: (monitoring, connectionService, tenantId, connectionId) =>
      createGoogleWorkspaceAdapter(monitoring, connectionService, tenantId, connectionId),
  });
  const bidirectionalSyncService = new BidirectionalSyncService();
  const webhookService = new WebhookService(secretManagementUrl);
  const syncTaskService = new SyncTaskService();
  const contentGenerationService = new ContentGenerationService(
    config.services.ai_service?.url,
    config.services.shard_manager?.url
  );
  const contentTemplateService = new ContentTemplateService();
  const templateService = new TemplateService();

  // ===== INTEGRATION PROVIDER ROUTES (Catalog) =====

  /**
   * List integration providers (catalog)
   * GET /api/v1/integrations/providers
   */
  app.get<{
    Querystring: {
      category?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/integrations/providers',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List integration providers (catalog)',
        tags: ['Integration Providers'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            isActive: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of integration providers',
          },
        },
      },
    },
    async (request, reply) => {
      const providers = await integrationProviderService.list({
        category: request.query.category,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(providers);
    }
  );

  /**
   * Get integration provider by ID
   * GET /api/v1/integrations/providers/:id
   */
  app.get<{ Params: { id: string; category: string } }>(
    '/api/v1/integrations/providers/:category/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration provider by ID',
        tags: ['Integration Providers'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            category: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration provider details',
          },
        },
      },
    },
    async (request, reply) => {
      const provider = await integrationProviderService.getById(
        request.params.id,
        request.params.category
      );
      reply.send(provider);
    }
  );

  // ===== INTEGRATION ROUTES =====

  /**
   * Create integration
   * POST /api/v1/integrations
   */
  app.post<{ Body: CreateIntegrationInput }>(
    '/api/v1/integrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new integration instance',
        tags: ['Integrations'],
        body: {
          type: 'object',
          required: ['integrationId', 'name', 'credentialSecretName', 'authMethod'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            credentialSecretName: { type: 'string' },
            authMethod: { type: 'string', enum: ['oauth', 'apikey', 'serviceaccount', 'basic'] },
            instanceUrl: { type: 'string' },
            settings: { type: 'object' },
            syncConfig: { type: 'object' },
            userScoped: { type: 'boolean' },
            allowedShardTypes: { type: 'array', items: { type: 'string' } },
            searchEnabled: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Integration created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...(request.body as unknown as Record<string, unknown>),
        tenantId,
        userId,
      } as unknown as CreateIntegrationInput;

      const integration = await integrationService.create(input);
      reply.code(201).send(integration);
    }
  );

  /**
   * Get integration by ID
   * GET /api/v1/integrations/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration by ID',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const integration = await integrationService.getById(request.params.id, tenantId);
      reply.send(integration);
    }
  );

  /**
   * Update integration
   * PUT /api/v1/integrations/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateIntegrationInput }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update integration',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            settings: { type: 'object' },
            syncConfig: { type: 'object' },
            userScoped: { type: 'boolean' },
            allowedShardTypes: { type: 'array', items: { type: 'string' } },
            searchEnabled: { type: 'boolean' },
            status: { type: 'string', enum: ['pending', 'connected', 'error', 'disabled'] },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Integration updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const integration = await integrationService.update(
        request.params.id,
        tenantId,
        request.body
      );
      reply.send(integration);
    }
  );

  /**
   * Delete integration
   * DELETE /api/v1/integrations/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/integrations/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete integration (deactivate)',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Integration deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await integrationService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  // ===== TENANT INTEGRATION CONNECTION ROUTES =====

  // Get available integration types
  app.get(
    '/api/v1/integrations/available',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get available integration types for tenant',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              integrationTypes: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        request.user!.tenantId; // tenant context for catalog visibility
        const catalogResult = await integrationCatalogService.listIntegrations({
          filter: { visibility: 'public' },
        });
        return reply.send({
          integrationTypes: catalogResult.entries,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_TYPES_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get available integration types',
          },
        });
      }
    }
  );

  // Get OAuth authorization URL
  app.get<{
    Params: { integrationType: string };
    Querystring: { redirectUri?: string };
  }>(
    '/api/v1/integrations/oauth-url/:integrationType',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get OAuth authorization URL for integration type',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            integrationType: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            redirectUri: { type: 'string', format: 'uri' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              authorizationUrl: { type: 'string', format: 'uri' },
              state: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { integrationType } = request.params;
        const { redirectUri } = request.query;

        // Get integration catalog entry
        const catalogEntry = await integrationCatalogService.getIntegration(integrationType);
        if (!catalogEntry) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_TYPE_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }

        // Check if OAuth is supported
        if (!catalogEntry.authMethods.includes(AuthMethod.OAUTH)) {
          return reply.status(400).send({
            error: {
              code: 'OAUTH_NOT_SUPPORTED',
              message: 'Integration type does not support OAuth',
            },
          });
        }

        // Create a temporary integration instance for OAuth flow
        // In a real scenario, you might want to create the integration first
        // For now, we'll use the catalog entry to generate the OAuth URL
        const returnUrl = redirectUri || '/settings/integrations';
        
        // Use the connection service to start OAuth flow
        // Note: This requires an integration instance, so we might need to create one first
        // For simplicity, we'll create a minimal integration instance
        const tempIntegration = await integrationService.create({
          integrationId: catalogEntry.id,
          name: `${catalogEntry.displayName} (Connecting)`,
          tenantId,
          userId,
          credentialSecretName: '', // Will be set after OAuth
          authMethod: AuthMethod.OAUTH,
        });

        const result = await integrationConnectionService.startOAuthFlow(
          tempIntegration.id,
          tenantId,
          userId,
          returnUrl
        );

        return reply.send({
          authorizationUrl: result.authorizationUrl,
          state: result.state,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'OAUTH_URL_GENERATION_FAILED',
            message: error.message || 'Failed to generate OAuth URL',
          },
        });
      }
    }
  );

  // Connect integration (OAuth2)
  app.post<{
    Body: {
      integrationType: string;
      authorizationCode: string;
      redirectUri: string;
      state: string;
    };
  }>(
    '/api/v1/integrations/connect',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration using OAuth2 authorization code',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['integrationType', 'authorizationCode', 'redirectUri', 'state'],
          properties: {
            integrationType: { type: 'string' },
            authorizationCode: { type: 'string' },
            redirectUri: { type: 'string', format: 'uri' },
            state: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              integration: { type: 'object' },
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        request.user!.id;
        const { integrationType: _integrationType, authorizationCode, redirectUri: _redirectUri, state } = request.body as { integrationType: string; authorizationCode: string; redirectUri: string; state: string };

        // Handle OAuth callback (this will create the connection)
        // The state should have been created in a previous /oauth-url call
        // and contains the integrationId
        const result = await integrationConnectionService.handleOAuthCallback(authorizationCode, state);
        
        if (!result.success) {
          return reply.status(400).send({
            error: {
              code: 'OAUTH_CONNECTION_FAILED',
              message: result.error || 'OAuth connection failed',
            },
          });
        }

        // Get the integration using the integrationId from the result
        let integration = null;
        if (result.integrationId) {
          try {
            integration = await integrationService.getById(result.integrationId, tenantId);
          } catch (error) {
            log.warn('Failed to get integration after OAuth connection', {
              integrationId: result.integrationId,
              error,
            });
          }
        }

        return reply.send({
          integration: integration || {},
          success: true,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_CONNECTION_FAILED',
            message: error.message || 'Failed to connect integration',
          },
        });
      }
    }
  );

  // Connect integration (API Key)
  app.post<{
    Body: {
      integrationType: string;
      apiKey: string;
      apiSecret?: string;
      instanceUrl?: string;
      displayName?: string;
    };
  }>(
    '/api/v1/integrations/connect-api-key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration using API key',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['integrationType', 'apiKey'],
          properties: {
            integrationType: { type: 'string' },
            apiKey: { type: 'string' },
            apiSecret: { type: 'string' },
            instanceUrl: { type: 'string', format: 'uri' },
            displayName: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              integration: { type: 'object' },
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { integrationType, apiKey, instanceUrl, displayName } = request.body as { integrationType: string; apiKey: string; apiSecret?: string; instanceUrl?: string; displayName?: string };

        // Get integration catalog entry
        const catalogEntry = await integrationCatalogService.getIntegration(integrationType);
        if (!catalogEntry) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_TYPE_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }

        // Create integration instance
        const integration = await integrationService.create({
          integrationId: catalogEntry.id,
          name: displayName || catalogEntry.displayName,
          tenantId,
          userId,
          credentialSecretName: '', // Will be set by connection service
          authMethod: AuthMethod.API_KEY,
          instanceUrl,
        });

        // Create connection with API key
        await integrationConnectionService.connectWithApiKey(
          integration.id,
          tenantId,
          userId,
          apiKey,
          displayName
        );

        // Update integration with connection status
        await integrationService.update(integration.id, tenantId, {
          status: IntegrationStatus.CONNECTED,
          connectionStatus: ConnectionStatus.ACTIVE,
        });

        return reply.status(201).send({
          integration,
          success: true,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'API_KEY_CONNECTION_FAILED',
            message: error.message || 'Failed to connect integration with API key',
          },
        });
      }
    }
  );

  /**
   * Connect integration with service account (e.g. Google Workspace domain-wide delegation)
   * POST /api/v1/integrations/connect-service-account
   */
  app.post<{
    Body: {
      integrationType: string;
      serviceAccountJson: string;
      displayName?: string;
    };
  }>(
    '/api/v1/integrations/connect-service-account',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with service account JSON key',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['integrationType', 'serviceAccountJson'],
          properties: {
            integrationType: { type: 'string' },
            serviceAccountJson: { type: 'string' },
            displayName: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              integration: { type: 'object' },
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { integrationType, serviceAccountJson, displayName } = request.body as {
          integrationType: string;
          serviceAccountJson: string;
          displayName?: string;
        };

        const catalogEntry = await integrationCatalogService.getIntegration(integrationType);
        if (!catalogEntry) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_TYPE_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }

        const integration = await integrationService.create({
          integrationId: catalogEntry.id,
          name: displayName || catalogEntry.displayName,
          tenantId,
          userId,
          credentialSecretName: '',
          authMethod: AuthMethod.SERVICE_ACCOUNT,
        });

        await integrationConnectionService.connectWithServiceAccount(
          integration.id,
          tenantId,
          userId,
          serviceAccountJson,
          displayName
        );

        await integrationService.update(integration.id, tenantId, {
          status: IntegrationStatus.CONNECTED,
          connectionStatus: ConnectionStatus.ACTIVE,
        });

        return reply.status(201).send({
          integration,
          success: true,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SERVICE_ACCOUNT_CONNECTION_FAILED',
            message: error.message || 'Failed to connect integration with service account',
          },
        });
      }
    }
  );

  /**
   * List integrations
   * GET /api/v1/integrations
   */
  app.get<{
    Querystring: {
      providerName?: string;
      status?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/integrations',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List integrations',
        tags: ['Integrations'],
        querystring: {
          type: 'object',
          properties: {
            providerName: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'connected', 'error', 'disabled'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of integrations',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await integrationService.list(tenantId, {
        providerName: request.query.providerName,
        status: request.query.status as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== SYNC CONFIGURATION ROUTES =====

  // Get sync configuration
  app.get<{ Params: { id: string } }>(
    '/api/v1/integrations/:id/sync-config',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync configuration for integration',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              syncConfig: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);
        
        return reply.send({
          syncConfig: integration.syncConfig || null,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_CONFIG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get sync configuration',
          },
        });
      }
    }
  );

  /**
   * Fetch records from external system via adapter
   * POST /api/v1/integrations/:integrationId/fetch
   * Used by integration-sync to pull data; passes pullFilters from syncConfig and body into adapter FetchOptions.filters.
   */
  app.post<{
    Params: { integrationId: string };
    Body: {
      direction?: string;
      entityType?: string;
      filters?: Record<string, any>;
      limit?: number;
      offset?: number;
    };
  }>(
    '/api/v1/integrations/:integrationId/fetch',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Fetch records from external integration via adapter',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            direction: { type: 'string' },
            entityType: { type: 'string' },
            filters: { type: 'object' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'Array of records from external system',
          },
          501: {
            type: 'object',
            description: 'Adapter not registered for this provider',
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const body = (request.body as { direction?: string; entityType?: string; filters?: Record<string, any>; limit?: number; offset?: number }) || {};
        const { records } = await fetchIntegrationRecords(integrationService, adapterManagerService, {
          integrationId,
          tenantId,
          userId,
          body: { entityType: body.entityType, filters: body.filters, limit: body.limit, offset: body.offset },
        });
        return reply.send(records);
      } catch (error: any) {
        log.error('Fetch from integration failed', error, { integrationId: request.params.integrationId, tenantId: request.user!.tenantId, service: 'integration-manager' });
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_FETCH_FAILED',
            message: error.message || 'Failed to fetch data from integration',
          },
        });
      }
    }
  );

  // Update sync configuration
  app.put<{
    Params: { id: string };
    Body: {
      enabledEntities?: string[];
      schedule?: {
        frequency: 'manual' | '15min' | 'hourly' | 'daily' | 'weekly' | 'custom';
        cronExpression?: string;
        timezone?: string;
      };
      direction?: 'one-way' | 'bidirectional';
      filters?: Array<{
        entityType: string;
        field: string;
        operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
        value: any;
      }>;
      syncEnabled?: boolean;
      entityMappings?: any[];
      pullFilters?: any[];
      conflictResolution?: string;
      maxRecordsPerSync?: number;
    };
  }>(
    '/api/v1/integrations/:id/sync-config',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update sync configuration for integration',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            enabledEntities: { type: 'array', items: { type: 'string' } },
            schedule: { type: 'object' },
            direction: { type: 'string', enum: ['one-way', 'bidirectional'] },
            filters: { type: 'array' },
            syncEnabled: { type: 'boolean' },
            entityMappings: { type: 'array' },
            pullFilters: { type: 'array' },
            conflictResolution: { type: 'string' },
            maxRecordsPerSync: { type: 'number' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              syncConfig: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const body = request.body;

        // Get existing integration
        const integration = await integrationService.getById(id, tenantId);
        
        // Build updated sync config
        type SyncConfigPartial = { entityMappings?: EntityMapping[]; [key: string]: unknown };
        const existingSyncConfig = (integration.syncConfig || {}) as SyncConfigPartial;
        const updatedSyncConfig: Record<string, unknown> = {
          ...existingSyncConfig,
        };

        // Map request body to sync config structure
        if (body.syncEnabled !== undefined) {
          updatedSyncConfig.syncEnabled = body.syncEnabled;
        }
        if (body.direction) {
          updatedSyncConfig.syncDirection = body.direction === 'one-way' ? SyncDirection.INBOUND : SyncDirection.BIDIRECTIONAL;
        }
        if (body.schedule) {
          if (body.schedule.frequency === 'manual') {
            updatedSyncConfig.syncFrequency = { type: 'manual' };
          } else if (body.schedule.frequency === 'custom' && body.schedule.cronExpression) {
            updatedSyncConfig.syncFrequency = {
              type: 'cron',
              cronExpression: body.schedule.cronExpression,
            };
          } else {
            // Map frequency to interval minutes
            const intervalMap: Record<string, number> = {
              '15min': 15,
              'hourly': 60,
              'daily': 1440,
              'weekly': 10080,
            };
            if (intervalMap[body.schedule.frequency]) {
              updatedSyncConfig.syncFrequency = {
                type: 'interval',
                intervalMinutes: intervalMap[body.schedule.frequency],
              };
            }
          }
        }
        if (body.enabledEntities !== undefined) {
          if (existingSyncConfig.entityMappings) {
            updatedSyncConfig.entityMappings = existingSyncConfig.entityMappings.map((mapping: EntityMapping) => ({
              ...mapping,
              enabled: body.enabledEntities!.includes(mapping.externalEntity),
            }));
          }
        }
        if (body.filters) {
          updatedSyncConfig.pullFilters = body.filters.map((filter: { field: string; operator: string; value: unknown }) => ({
            field: filter.field,
            operator: filter.operator === 'greaterThan' ? 'gt' : filter.operator === 'lessThan' ? 'lt' : filter.operator,
            value: filter.value,
          }));
        }
        if (body.entityMappings !== undefined) {
          updatedSyncConfig.entityMappings = body.entityMappings;
        }
        if (body.pullFilters !== undefined) {
          updatedSyncConfig.pullFilters = body.pullFilters;
        }
        if (body.conflictResolution !== undefined) {
          updatedSyncConfig.conflictResolution = body.conflictResolution;
        }
        if (body.maxRecordsPerSync !== undefined) {
          updatedSyncConfig.maxRecordsPerSync = body.maxRecordsPerSync;
        }

        // Update integration with new sync config
        const updatedIntegration = await integrationService.update(id, tenantId, {
          syncConfig: updatedSyncConfig as Integration['syncConfig'],
        });

        return reply.send({
          syncConfig: updatedIntegration.syncConfig,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_CONFIG_UPDATE_FAILED',
            message: error.message || 'Failed to update sync configuration',
          },
        });
      }
    }
  );

  // Trigger manual sync
  app.post<{
    Params: { id: string };
    Body: {
      entityTypes?: string[];
      fullSync?: boolean;
    };
  }>(
    '/api/v1/integrations/:id/sync',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Trigger manual sync for integration',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            entityTypes: { type: 'array', items: { type: 'string' } },
            fullSync: { type: 'boolean' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              syncTaskId: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { entityTypes, fullSync } = request.body;

        // Get integration
        const integration = await integrationService.getById(id, tenantId);

        // Determine job type
        const jobType = fullSync ? SyncJobType.FULL : SyncJobType.INCREMENTAL;

        // Build entity mappings if specific entities requested
        let entityMappings;
        if (entityTypes && entityTypes.length > 0 && integration.syncConfig?.entityMappings) {
          entityMappings = integration.syncConfig.entityMappings.filter((mapping: any) =>
            entityTypes.includes(mapping.externalEntity)
          );
        } else {
          entityMappings = integration.syncConfig?.entityMappings;
        }

        // Create sync task
        const input: CreateSyncTaskInput = {
          integrationId: id,
          jobType,
          trigger: SyncTrigger.MANUAL,
          tenantId,
          userId,
          entityMappings,
        };

        const task = await syncTaskService.create(input);

        return reply.status(202).send({
          syncTaskId: task.id,
          status: task.status === SyncStatus.RUNNING ? 'running' : 'queued',
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_TRIGGER_FAILED',
            message: error.message || 'Failed to trigger sync',
          },
        });
      }
    }
  );

  // ===== FIELD MAPPING ROUTES =====

  // Get field mappings for entity type
  app.get<{ Params: { id: string; entityType: string } }>(
    '/api/v1/integrations/:id/field-mappings/:entityType',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get field mappings for entity type',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fieldMappings: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);
        
        // Find entity mapping for this entity type
        const entityMapping = integration.syncConfig?.entityMappings?.find(
          (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
        );

        return reply.send({
          fieldMappings: entityMapping?.fieldMappings || [],
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FIELD_MAPPINGS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get field mappings',
          },
        });
      }
    }
  );

  // Update field mappings for entity type
  app.put<{
    Params: { id: string; entityType: string };
    Body: { fieldMappings: any[] };
  }>(
    '/api/v1/integrations/:id/field-mappings/:entityType',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update field mappings for entity type',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['fieldMappings'],
          properties: {
            fieldMappings: { type: 'array' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fieldMappings: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;
        const { fieldMappings } = (request.body as { fieldMappings?: FieldMapping[] }) || {};

        const integration = await integrationService.getById(id, tenantId);
        
        // Get or create sync config
        const syncConfig: NonNullable<Integration['syncConfig']> = integration.syncConfig ?? {
          syncEnabled: false,
          syncDirection: SyncDirection.INBOUND,
          entityMappings: [],
          conflictResolution: ConflictResolutionMode.LAST_WRITE_WINS,
        };

        // Find or create entity mapping
        let entityMapping = syncConfig.entityMappings.find(
          (mapping) => mapping.externalEntity === entityType || (mapping as { externalEntityName?: string }).externalEntityName === entityType
        );

        if (!entityMapping) {
          const newMapping: EntityMapping = {
            id: require('uuid').v4(),
            externalEntity: entityType,
            shardTypeId: '',
            fieldMappings: [],
            enabled: true,
          };
          entityMapping = newMapping;
          syncConfig.entityMappings.push(newMapping);
        }

        // Update field mappings
        entityMapping.fieldMappings = fieldMappings as FieldMapping[];

        // Update integration
        const updatedIntegration = await integrationService.update(id, tenantId, {
          syncConfig,
        });

        // Find updated entity mapping
        const updatedEntityMapping = updatedIntegration.syncConfig?.entityMappings?.find(
          (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
        );

        return reply.send({
          fieldMappings: updatedEntityMapping?.fieldMappings || [],
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FIELD_MAPPINGS_UPDATE_FAILED',
            message: error.message || 'Failed to update field mappings',
          },
        });
      }
    }
  );

  // Get available external fields
  app.get<{ Params: { id: string; entityType: string } }>(
    '/api/v1/integrations/:id/external-fields/:entityType',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get available external fields for entity type',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fields: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);
        
        // Get provider to determine field schema (for future schema-based field listing)
        void integrationProviderService.getById(integration.integrationId, 'crm');
        
        // For now, return common CRM fields based on entity type
        // In a real implementation, this would query the adapter or provider schema
        const commonFields: Record<string, any[]> = {
          Opportunity: [
            { name: 'Id', label: 'ID', type: 'string', required: true },
            { name: 'Name', label: 'Name', type: 'string', required: true },
            { name: 'Amount', label: 'Amount', type: 'number', required: false },
            { name: 'StageName', label: 'Stage', type: 'string', required: false },
            { name: 'CloseDate', label: 'Close Date', type: 'date', required: false },
            { name: 'Probability', label: 'Probability', type: 'number', required: false },
            { name: 'AccountId', label: 'Account ID', type: 'string', required: false },
            { name: 'OwnerId', label: 'Owner ID', type: 'string', required: false },
          ],
          Account: [
            { name: 'Id', label: 'ID', type: 'string', required: true },
            { name: 'Name', label: 'Name', type: 'string', required: true },
            { name: 'Industry', label: 'Industry', type: 'string', required: false },
            { name: 'Type', label: 'Type', type: 'string', required: false },
          ],
          Contact: [
            { name: 'Id', label: 'ID', type: 'string', required: true },
            { name: 'FirstName', label: 'First Name', type: 'string', required: false },
            { name: 'LastName', label: 'Last Name', type: 'string', required: true },
            { name: 'Email', label: 'Email', type: 'string', required: false },
            { name: 'Phone', label: 'Phone', type: 'string', required: false },
            { name: 'AccountId', label: 'Account ID', type: 'string', required: false },
          ],
        };

        const fields = commonFields[entityType] || [];

        return reply.send({ fields });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'EXTERNAL_FIELDS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get external fields',
          },
        });
      }
    }
  );

  // Get available internal fields (from shard type)
  app.get<{ Params: { id: string; entityType: string } }>(
    '/api/v1/integrations/:id/internal-fields/:entityType',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get available internal fields for entity type',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fields: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);
        
        // Find entity mapping to get shard type
        const entityMapping = integration.syncConfig?.entityMappings?.find(
          (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
        );

        if (!entityMapping?.shardTypeId) {
          return reply.status(404).send({
            error: {
              code: 'SHARD_TYPE_NOT_FOUND',
              message: 'Shard type not configured for this entity type',
            },
          });
        }

        // Get shard type from shard-manager
        const shardManagerClient = new ServiceClient({
          baseURL: config.services.shard_manager?.url,
          timeout: 10000,
          retries: 2,
        });

        const token = generateServiceToken(app, {
          serviceId: 'integration-manager',
          serviceName: 'integration-manager',
          tenantId,
        });

        const shardTypeResponse = await shardManagerClient.get(
          `/api/v1/shard-types/${entityMapping.shardTypeId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        const shardType = shardTypeResponse.data;

        // Extract fields from JSON schema
        const fields: any[] = [];
        if (shardType.schema?.properties) {
          for (const [fieldName, fieldSchema] of Object.entries(shardType.schema.properties as Record<string, any>)) {
            fields.push({
              name: fieldName,
              label: fieldSchema.title || fieldName,
              type: fieldSchema.type || 'string',
              required: shardType.schema.required?.includes(fieldName) || false,
              description: fieldSchema.description,
            });
          }
        }

        return reply.send({ fields });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTERNAL_FIELDS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get internal fields',
          },
        });
      }
    }
  );

  // Get available transform functions
  app.get(
    '/api/v1/integrations/transform-functions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get available transform functions',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              transforms: { type: 'array' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Get transform functions from FieldMapperService
        const { FieldMapperService } = await import('@coder/shared');
        void new FieldMapperService();

        // Built-in transforms
        const transforms = [
          {
            name: 'dateToISO',
            description: 'Convert date to ISO 8601 string',
            parameters: [],
          },
          {
            name: 'dateToUnix',
            description: 'Convert date to Unix timestamp',
            parameters: [],
          },
          {
            name: 'stringToNumber',
            description: 'Convert string to number',
            parameters: [],
          },
          {
            name: 'roundToDecimals',
            description: 'Round number to specified decimal places',
            parameters: [
              { name: 'decimals', type: 'number', required: false, default: 2 },
            ],
          },
          {
            name: 'toLowerCase',
            description: 'Convert string to lowercase',
            parameters: [],
          },
          {
            name: 'toUpperCase',
            description: 'Convert string to uppercase',
            parameters: [],
          },
          {
            name: 'trim',
            description: 'Trim whitespace from string',
            parameters: [],
          },
          {
            name: 'arrayToString',
            description: 'Join array elements into string',
            parameters: [
              { name: 'separator', type: 'string', required: false, default: ', ' },
            ],
          },
          {
            name: 'arrayFirst',
            description: 'Get first element of array',
            parameters: [],
          },
          {
            name: 'booleanToString',
            description: 'Convert boolean to string',
            parameters: [],
          },
          {
            name: 'booleanToYesNo',
            description: 'Convert boolean to Yes/No',
            parameters: [],
          },
          {
            name: 'nullToDefault',
            description: 'Replace null/undefined with default value',
            parameters: [
              { name: 'default', type: 'any', required: false },
            ],
          },
        ];

        return reply.send({ transforms });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'TRANSFORM_FUNCTIONS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get transform functions',
          },
        });
      }
    }
  );

  // Test field mappings
  app.post<{
    Params: { id: string; entityType: string };
    Body: { testData: any; fieldMappings?: any[] };
  }>(
    '/api/v1/integrations/:id/field-mappings/:entityType/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test field mappings with sample data',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['testData'],
          properties: {
            testData: { type: 'object' },
            fieldMappings: { type: 'array' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              transformedData: { type: 'object' },
              valid: { type: 'boolean' },
              errors: { type: 'array' },
              warnings: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;
        const { testData, fieldMappings: testMappings } = request.body;

        const integration = await integrationService.getById(id, tenantId);
        
        // Use provided mappings or get from integration
        let fieldMappings = testMappings;
        if (!fieldMappings) {
          const entityMapping = integration.syncConfig?.entityMappings?.find(
            (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
          );
          fieldMappings = entityMapping?.fieldMappings || [];
        }

        // Use FieldMapperService to test mappings
        const { FieldMapperService } = await import('@coder/shared');
        const fieldMapper = new FieldMapperService();

        // Load custom transforms if any
        const syncConfigWithTransforms = integration.syncConfig as { customTransforms?: Array<{ name: string; code?: string; function?: unknown }> } | undefined;
        if (syncConfigWithTransforms?.customTransforms) {
          fieldMapper.loadCustomTransforms(id, syncConfigWithTransforms.customTransforms as unknown as Parameters<typeof fieldMapper.loadCustomTransforms>[1]);
        }

        // Apply mappings
        const transformedData: Record<string, any> = {};
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const mapping of fieldMappings) {
          const externalField = mapping.externalField || mapping.externalFieldName;
          const shardField = mapping.shardField || mapping.internalFieldName;
          
          if (!externalField || !shardField) {
            warnings.push(`Mapping missing external or internal field: ${JSON.stringify(mapping)}`);
            continue;
          }

          try {
            let value = testData[externalField];
            
            // Apply default value if needed
            if ((value === null || value === undefined || value === '') && mapping.defaultValue !== undefined) {
              value = mapping.defaultValue;
            }

            // Apply transform if specified
            if (mapping.transform && value !== null && value !== undefined && value !== '') {
              value = fieldMapper.applyTransform(
                value,
                mapping.transform,
                mapping.transformOptions,
                id
              );
            }

            transformedData[shardField] = value;

            // Check required fields
            if (mapping.required && (value === null || value === undefined || value === '')) {
              errors.push(`Required field ${shardField} is missing or empty`);
            }
          } catch (error: any) {
            errors.push(`Failed to map field ${externalField} to ${shardField}: ${error.message}`);
          }
        }

        return reply.send({
          transformedData,
          valid: errors.length === 0,
          errors,
          warnings,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FIELD_MAPPING_TEST_FAILED',
            message: error.message || 'Failed to test field mappings',
          },
        });
      }
    }
  );

  // Export field mappings
  app.get<{ Params: { id: string; entityType: string } }>(
    '/api/v1/integrations/:id/field-mappings/:entityType/export',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Export field mappings as JSON',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fieldMappings: { type: 'array' },
              exportedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;

        const integration = await integrationService.getById(id, tenantId);
        
        const entityMapping = integration.syncConfig?.entityMappings?.find(
          (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
        );

        return reply.send({
          fieldMappings: entityMapping?.fieldMappings || [],
          exportedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FIELD_MAPPINGS_EXPORT_FAILED',
            message: error.message || 'Failed to export field mappings',
          },
        });
      }
    }
  );

  // Import field mappings
  app.post<{
    Params: { id: string; entityType: string };
    Body: { fieldMappings: any[] };
  }>(
    '/api/v1/integrations/:id/field-mappings/:entityType/import',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Import field mappings from JSON',
        tags: ['Integrations', 'Field Mappings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['fieldMappings'],
          properties: {
            fieldMappings: { type: 'array' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              fieldMappings: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id, entityType } = request.params;
        const tenantId = request.user!.tenantId;
        const { fieldMappings } = (request.body as { fieldMappings?: FieldMapping[] }) || {};

        // Use the same logic as PUT endpoint
        const integration = await integrationService.getById(id, tenantId);
        
        const syncConfig: NonNullable<Integration['syncConfig']> = integration.syncConfig ?? {
          syncEnabled: false,
          syncDirection: SyncDirection.INBOUND,
          entityMappings: [],
          conflictResolution: ConflictResolutionMode.LAST_WRITE_WINS,
        };

        let entityMapping = syncConfig.entityMappings.find(
          (mapping) => mapping.externalEntity === entityType || (mapping as { externalEntityName?: string }).externalEntityName === entityType
        );

        if (!entityMapping) {
          const newMapping: EntityMapping = {
            id: require('uuid').v4(),
            externalEntity: entityType,
            shardTypeId: '',
            fieldMappings: [],
            enabled: true,
          };
          entityMapping = newMapping;
          syncConfig.entityMappings.push(newMapping);
        }

        entityMapping.fieldMappings = fieldMappings as FieldMapping[];

        const updatedIntegration = await integrationService.update(id, tenantId, {
          syncConfig,
        });

        const updatedEntityMapping = updatedIntegration.syncConfig?.entityMappings?.find(
          (mapping: any) => mapping.externalEntity === entityType || mapping.externalEntityName === entityType
        );

        return reply.send({
          fieldMappings: updatedEntityMapping?.fieldMappings || [],
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FIELD_MAPPINGS_IMPORT_FAILED',
            message: error.message || 'Failed to import field mappings',
          },
        });
      }
    }
  );

  // Get sync history
  app.get<{
    Params: { id: string };
    Querystring: {
      limit?: number;
      offset?: number;
    };
  }>(
    '/api/v1/integrations/:id/sync-history',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync history for integration',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              history: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const tenantId = request.user!.tenantId;
        const { limit = 50, offset = 0 } = request.query;

        // Verify integration exists
        await integrationService.getById(id, tenantId);

        // Get sync tasks for this integration
        const result = await syncTaskService.list(tenantId, {
          integrationId: id,
          limit: limit + offset, // Fetch more to handle offset
        });

        // Apply offset and limit
        const history = result.items.slice(offset, offset + limit).map((task) => ({
          syncTaskId: task.id,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          status: task.status === SyncStatus.RUNNING ? 'running' : 
                  task.status === SyncStatus.SUCCESS ? 'completed' : 
                  task.status === SyncStatus.FAILED ? 'failed' : 'completed',
          recordsProcessed: task.stats.recordsProcessed,
          recordsFailed: task.stats.recordsFailed,
          duration: task.durationMs || (task.completedAt && task.startedAt 
            ? task.completedAt.getTime() - task.startedAt.getTime() 
            : undefined),
          errors: task.errors?.map((e) => e.message) || [],
        }));

        return reply.send({
          history,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_HISTORY_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get sync history',
          },
        });
      }
    }
  );

  /**
   * Test integration connection
   * POST /api/v1/integrations/:id/test
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/integrations/:id/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test integration connection',
        tags: ['Integrations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Connection test result',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await integrationService.testConnection(request.params.id, tenantId);
      reply.send(result);
    }
  );

  // ===== WEBHOOK ROUTES =====

  /**
   * Create webhook
   * POST /api/v1/webhooks
   */
  app.post<{ Body: CreateWebhookInput }>(
    '/api/v1/webhooks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create webhook',
        tags: ['Webhooks'],
        body: {
          type: 'object',
          required: ['integrationId', 'webhookUrl', 'events'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            webhookUrl: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            webhookSecret: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Webhook created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...(request.body as unknown as Record<string, unknown>),
        tenantId,
        userId,
      } as unknown as CreateWebhookInput;

      const webhook = await webhookService.create(input);
      reply.code(201).send(webhook);
    }
  );

  /**
   * Get webhook by ID
   * GET /api/v1/webhooks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get webhook by ID',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Webhook details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhook = await webhookService.getById(request.params.id, tenantId);
      reply.send(webhook);
    }
  );

  /**
   * Update webhook
   * PUT /api/v1/webhooks/:id
   */
  app.put<{ Params: { id: string }; Body: UpdateWebhookInput }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Webhook updated successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhook = await webhookService.update(request.params.id, tenantId, request.body);
      reply.send(webhook);
    }
  );

  /**
   * Delete webhook
   * DELETE /api/v1/webhooks/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/webhooks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: {
            type: 'null',
            description: 'Webhook deleted successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await webhookService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List webhooks
   * GET /api/v1/webhooks
   */
  app.get<{
    Querystring: {
      integrationId?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/webhooks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List webhooks',
        tags: ['Webhooks'],
        querystring: {
          type: 'object',
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            description: 'List of webhooks',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const webhooks = await webhookService.list(tenantId, {
        integrationId: request.query.integrationId,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(webhooks);
    }
  );

  // ===== SYNC TASK ROUTES =====

  /**
   * Create sync task
   * POST /api/v1/sync-tasks
   */
  app.post<{ Body: CreateSyncTaskInput }>(
    '/api/v1/sync-tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create sync task (manual trigger)',
        tags: ['Sync Tasks'],
        body: {
          type: 'object',
          required: ['integrationId', 'jobType', 'trigger'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            jobType: { type: 'string', enum: ['full', 'incremental', 'webhook', 'manual'] },
            trigger: { type: 'string', enum: ['scheduled', 'webhook', 'manual', 'retry'] },
            entityMappings: { type: 'array', items: { type: 'object' } },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Sync task created successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input: CreateSyncTaskInput = {
        ...request.body,
        tenantId,
        userId,
      };

      const task = await syncTaskService.create(input);
      reply.code(201).send(task);
    }
  );

  /**
   * Get sync task by ID
   * GET /api/v1/sync-tasks/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/sync-tasks/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync task by ID',
        tags: ['Sync Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Sync task details',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await syncTaskService.getById(request.params.id, tenantId);
      reply.send(task);
    }
  );

  /**
   * List sync tasks
   * GET /api/v1/sync-tasks
   */
  app.get<{
    Querystring: {
      integrationId?: string;
      status?: string;
      jobType?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/sync-tasks',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List sync tasks',
        tags: ['Sync Tasks'],
        querystring: {
          type: 'object',
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['running', 'success', 'partial', 'failed', 'cancelled'] },
            jobType: { type: 'string', enum: ['full', 'incremental', 'webhook', 'manual'] },
            limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
            continuationToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'List of sync tasks',
            properties: {
              items: { type: 'array' },
              continuationToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await syncTaskService.list(tenantId, {
        integrationId: request.query.integrationId,
        status: request.query.status as any,
        jobType: request.query.jobType as any,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Cancel sync task
   * POST /api/v1/sync-tasks/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/sync-tasks/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel running sync task',
        tags: ['Sync Tasks'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Sync task cancelled successfully',
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const task = await syncTaskService.cancel(request.params.id, tenantId);
      reply.send(task);
    }
  );

  // ===== INTEGRATION SYNC ROUTES (from integration-sync) =====

  /**
   * Get sync task status
   * GET /api/v1/sync/tasks/:taskId
   */
  app.get<{ Params: { taskId: string } }>(
    '/api/v1/sync/tasks/:taskId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get sync task status',
        tags: ['Sync'],
      },
    },
    async (request, reply) => {
      try {
        const { taskId } = request.params;
        const tenantId = request.user!.tenantId;

        // Use existing syncTaskService
        const task = await syncTaskService.getById(taskId, tenantId);

        if (!task) {
          return reply.status(404).send({
            error: {
              code: 'TASK_NOT_FOUND',
              message: 'Sync task not found',
            },
          });
        }

        return reply.send(task);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'TASK_RETRIEVAL_FAILED',
            message: error.message || 'Failed to retrieve sync task',
          },
        });
      }
    }
  );

  /**
   * Create and trigger sync
   * POST /api/v1/sync/trigger
   */
  app.post<{ Body: { integrationId: string; direction: string; entityType?: string; filters?: Record<string, any> } }>(
    '/api/v1/sync/trigger',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create and trigger synchronization',
        tags: ['Sync'],
        body: {
          type: 'object',
          required: ['integrationId', 'direction'],
          properties: {
            integrationId: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['pull', 'push', 'bidirectional'] },
            entityType: { type: 'string' },
            filters: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, direction, entityType, filters: _filters } = request.body as { integrationId: string; direction: string; entityType?: string; filters?: Record<string, unknown> };
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;

        // Create sync task using existing service
        const input: CreateSyncTaskInput = {
          integrationId,
          jobType: direction === 'pull' ? SyncJobType.INCREMENTAL : direction === 'push' ? SyncJobType.MANUAL : SyncJobType.FULL,
          trigger: SyncTrigger.MANUAL,
          tenantId,
          userId,
          entityMappings: entityType ? [{ id: '', externalEntity: entityType, shardTypeId: '', fieldMappings: [], enabled: true }] : undefined,
        };

        const task = await syncTaskService.create(input);

        return reply.status(202).send({
          taskId: task.id,
          status: task.status,
          message: 'Sync task created and started',
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SYNC_TRIGGER_FAILED',
            message: error.message || 'Failed to trigger synchronization',
          },
        });
      }
    }
  );

  // ===== CONTENT GENERATION ROUTES (from content-generation) =====

  /**
   * Generate content (synchronous)
   * POST /api/v1/content/generate
   */
  app.post<{ Body: any }>(
    '/api/v1/content/generate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Generate content using AI (synchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: { type: 'object' },
            options: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const requestBody = {
        ...(request.body as Record<string, unknown>),
        tenantId,
        userId,
      };

      const job = await contentGenerationService.generate(requestBody as GenerateContentRequest);
      reply.send(job);
    }
  );

  /**
   * Create content generation job (asynchronous)
   * POST /api/v1/content/jobs
   */
  app.post<{ Body: any }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content generation job (asynchronous)',
        tags: ['Content Generation'],
        body: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            templateId: { type: 'string', format: 'uuid' },
            context: { type: 'object' },
            options: { type: 'object' },
            requestId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...(request.body as Record<string, unknown>),
        tenantId,
        userId,
      };

      const job = await contentGenerationService.create(input as CreateContentJobInput);
      reply.code(201).send(job);
    }
  );

  /**
   * Get content generation job by ID
   * GET /api/v1/content/jobs/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content generation job by ID',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.getById(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * Cancel content generation job
   * POST /api/v1/content/jobs/:id/cancel
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/content/jobs/:id/cancel',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Cancel content generation job',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const job = await contentGenerationService.cancel(request.params.id, tenantId);
      reply.send(job);
    }
  );

  /**
   * List content generation jobs
   * GET /api/v1/content/jobs
   */
  app.get<{
    Querystring: {
      status?: string;
      userId?: string;
      templateId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/content/jobs',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content generation jobs',
        tags: ['Content Generation'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await contentGenerationService.list(tenantId, {
        status: request.query.status as any,
        userId: request.query.userId,
        templateId: request.query.templateId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  // ===== CONTENT TEMPLATE ROUTES (from content-generation) =====

  /**
   * Create content template
   * POST /api/v1/content/templates
   */
  app.post<{ Body: any }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create content template',
        tags: ['Content Templates'],
        body: {
          type: 'object',
          required: ['name', 'category', 'documentType', 'templateContent'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            documentType: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            templateContent: { type: 'string' },
            defaultTheme: { type: 'object' },
            requiredFields: { type: 'array' },
            aiConfig: { type: 'object' },
            isSystemTemplate: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const input = {
        ...(request.body as Record<string, unknown>),
        tenantId,
        userId,
      };

      const template = await contentTemplateService.create(input as CreateContentTemplateInput);
      reply.code(201).send(template);
    }
  );

  /**
   * Get content template by ID
   * GET /api/v1/content/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get content template by ID',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update content template
   * PUT /api/v1/content/templates/:id
   */
  app.put<{ Params: { id: string }; Body: any }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update content template',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await contentTemplateService.update(request.params.id, tenantId, request.body as UpdateContentTemplateInput);
      reply.send(template);
    }
  );

  /**
   * Delete content template
   * DELETE /api/v1/content/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/content/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete content template',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await contentTemplateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List content templates
   * GET /api/v1/content/templates
   */
  app.get<{
    Querystring: {
      category?: string;
      documentType?: string;
      isActive?: boolean;
      limit?: number;
    };
  }>(
    '/api/v1/content/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List content templates',
        tags: ['Content Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const templates = await contentTemplateService.list(tenantId, {
        category: request.query.category,
        documentType: request.query.documentType,
        isActive: request.query.isActive,
        limit: request.query.limit,
      });
      reply.send(templates);
    }
  );

  // ===== TEMPLATE ROUTES (from template-service) =====

  /**
   * Create template
   * POST /api/v1/templates
   */
  app.post<{ Body: any }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create a new template',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['name', 'type', 'content'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            type: { type: 'string', enum: ['context', 'email', 'document', 'code', 'report'] },
            category: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            variables: { type: 'array' },
            organizationId: { type: 'string', format: 'uuid' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
            subject: { type: 'string' },
            htmlContent: { type: 'string' },
            textContent: { type: 'string' },
            format: { type: 'string' },
            contextType: { type: 'string' },
            sections: { type: 'array' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const body = request.body as Record<string, unknown>;
      const input = {
        ...body,
        tenantId,
        userId,
        type: body.type,
      };

      const template = await templateService.create(input as CreateTemplateInput);
      reply.code(201).send(template);
    }
  );

  /**
   * Get template by ID
   * GET /api/v1/templates/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get template by ID',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const template = await templateService.getById(request.params.id, tenantId);
      reply.send(template);
    }
  );

  /**
   * Update template
   * PUT /api/v1/templates/:id
   */
  app.put<{ Params: { id: string }; Body: any }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const userId = request.user!.id;

      const template = await templateService.update(request.params.id, tenantId, userId, request.body as UpdateTemplateInput);
      reply.send(template);
    }
  );

  /**
   * Delete template
   * DELETE /api/v1/templates/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      await templateService.delete(request.params.id, tenantId);
      reply.code(204).send();
    }
  );

  /**
   * List templates
   * GET /api/v1/templates
   */
  app.get<{
    Querystring: {
      type?: string;
      category?: string;
      status?: string;
      organizationId?: string;
      limit?: number;
      continuationToken?: string;
    };
  }>(
    '/api/v1/templates',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List templates',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const result = await templateService.list(tenantId, {
        type: request.query.type as any,
        category: request.query.category,
        status: request.query.status as any,
        organizationId: request.query.organizationId,
        limit: request.query.limit,
        continuationToken: request.query.continuationToken,
      });
      reply.send(result);
    }
  );

  /**
   * Render template
   * POST /api/v1/templates/:id/render
   */
  app.post<{ Params: { id: string }; Body: any }>(
    '/api/v1/templates/:id/render',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Render template with variables',
        tags: ['Templates'],
        body: {
          type: 'object',
          required: ['variables'],
          properties: {
            variables: { type: 'object', additionalProperties: true },
            organizationId: { type: 'string', format: 'uuid' },
            version: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const input = {
        tenantId,
        templateId: request.params.id,
        ...(request.body as Record<string, unknown>),
      };

      const rendered = await templateService.render(input as RenderTemplateInput);
      reply.send({ rendered });
    }
  );

  /**
   * Get template versions
   * GET /api/v1/templates/:id/versions
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id/versions',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all versions of a template',
        tags: ['Templates'],
      },
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const versions = await templateService.getVersions(tenantId, request.params.id);
      reply.send(versions);
    }
  );

  // ===== INTEGRATION CATALOG ROUTES (Super Admin) =====
  // Legacy routes at /api/v1/super-admin/integration-catalog (kept for backward compatibility)
  // New routes at /api/v1/admin/integrations/catalog (as per plan specification)

  // ===== NEW ADMIN ROUTES: /api/v1/admin/integrations/catalog =====

  // List all integration types
  app.get<{ Querystring: { category?: string; limit?: number; offset?: number } }>(
    '/api/v1/admin/integrations/catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List all integration types in catalog (Super Admin only)',
        tags: ['Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const result = await integrationCatalogService.listIntegrations({
          filter: request.query.category ? { category: request.query.category } : undefined,
          limit: request.query.limit,
          offset: request.query.offset,
        });
        return reply.send({
          integrationTypes: result.entries,
          total: result.total,
          limit: request.query.limit,
          offset: request.query.offset,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_LIST_FAILED',
            message: error.message || 'Failed to list integration catalog',
          },
        });
      }
    }
  );

  // Get single integration type
  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/integrations/catalog/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get single integration type by ID (Super Admin only)',
        tags: ['Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const catalogEntry = await integrationCatalogService.getIntegration(request.params.id);
        if (!catalogEntry) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }
        return reply.send({
          integrationType: catalogEntry,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integration catalog entry',
          },
        });
      }
    }
  );

  // Create integration type
  app.post<{ Body: CreateIntegrationCatalogInput }>(
    '/api/v1/admin/integrations/catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create new integration type in catalog (Super Admin only)',
        tags: ['Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const catalogEntry = await integrationCatalogService.createIntegration(request.body);
        return reply.status(201).send({
          integrationType: catalogEntry,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_CREATION_FAILED',
            message: error.message || 'Failed to create integration catalog entry',
          },
        });
      }
    }
  );

  // Update integration type
  app.put<{ Params: { id: string }; Body: UpdateIntegrationCatalogInput }>(
    '/api/v1/admin/integrations/catalog/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update integration type in catalog (Super Admin only)',
        tags: ['Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const catalogEntry = await integrationCatalogService.updateIntegration(
          request.params.id,
          request.body
        );
        if (!catalogEntry) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }
        return reply.send({
          integrationType: catalogEntry,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_UPDATE_FAILED',
            message: error.message || 'Failed to update integration catalog entry',
          },
        });
      }
    }
  );

  // Delete integration type
  app.delete<{ Params: { id: string } }>(
    '/api/v1/admin/integrations/catalog/:id',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete integration type from catalog (Super Admin only)',
        tags: ['Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const deleted = await integrationCatalogService.deleteIntegration(request.params.id);
        if (!deleted) {
          return reply.status(404).send({
            error: {
              code: 'INTEGRATION_NOT_FOUND',
              message: 'Integration type not found',
            },
          });
        }
        return reply.status(200).send({
          success: true,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_DELETE_FAILED',
            message: error.message || 'Failed to delete integration catalog entry',
          },
        });
      }
    }
  );

  // ===== LEGACY ROUTES: /api/v1/super-admin/integration-catalog (kept for backward compatibility) =====

  // List integrations in catalog
  app.get<{ Querystring: { category?: string; limit?: number; offset?: number } }>(
    '/api/v1/super-admin/integration-catalog',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'List all integrations in catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const result = await integrationCatalogService.listIntegrations({
          filter: request.query.category ? { category: request.query.category } : undefined,
          limit: request.query.limit,
          offset: request.query.offset,
        });
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_LIST_FAILED',
            message: error.message || 'Failed to list integration catalog',
          },
        });
      }
    }
  );

  // Get integration by ID
  app.get<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integration details (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const catalogEntry = await integrationCatalogService.getIntegration(request.params.integrationId);
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integration catalog entry',
          },
        });
      }
    }
  );

  // Update integration in catalog
  app.put<{ Params: { integrationId: string }; Body: UpdateIntegrationCatalogInput }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update integration in catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const catalogEntry = await integrationCatalogService.updateIntegration(
          request.params.integrationId,
          request.body
        );
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_UPDATE_FAILED',
            message: error.message || 'Failed to update integration catalog entry',
          },
        });
      }
    }
  );

  // Delete integration from catalog
  app.delete<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete integration from catalog (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const deleted = await integrationCatalogService.deleteIntegration(request.params.integrationId);
        if (!deleted) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_DELETE_FAILED',
            message: error.message || 'Failed to delete integration catalog entry',
          },
        });
      }
    }
  );

  // Deprecate integration
  app.post<{ Params: { integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/:integrationId/deprecate',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Deprecate integration (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const catalogEntry = await integrationCatalogService.deprecateIntegration(
          request.params.integrationId,
          userId
        );
        if (!catalogEntry) {
          return reply.status(404).send({ error: 'Integration not found' });
        }
        return reply.send(catalogEntry);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_DEPRECATE_FAILED',
            message: error.message || 'Failed to deprecate integration',
          },
        });
      }
    }
  );

  // Get integrations by category
  app.get<{ Params: { category: string } }>(
    '/api/v1/super-admin/integration-catalog/category/:category',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get integrations by category (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const entries = await integrationCatalogService.getIntegrationsByCategory(request.params.category);
        return reply.send(entries);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CATALOG_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get integrations by category',
          },
        });
      }
    }
  );

  // Visibility rule management
  app.post<{ Body: CreateVisibilityRuleInput }>(
    '/api/v1/super-admin/integration-catalog/visibility-rules',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Create visibility rule (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const rule = await integrationCatalogService.createVisibilityRule(request.body);
        return reply.status(201).send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'VISIBILITY_RULE_CREATION_FAILED',
            message: error.message || 'Failed to create visibility rule',
          },
        });
      }
    }
  );

  // Approve integration for tenant
  app.post<{ Body: { tenantId: string; integrationId: string } }>(
    '/api/v1/super-admin/integration-catalog/approve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Approve integration for tenant (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const rule = await integrationCatalogService.approveIntegration(
          request.body.tenantId,
          request.body.integrationId,
          userId
        );
        return reply.send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_APPROVAL_FAILED',
            message: error.message || 'Failed to approve integration',
          },
        });
      }
    }
  );

  // Deny integration for tenant
  app.post<{ Body: { tenantId: string; integrationId: string; denialReason: string } }>(
    '/api/v1/super-admin/integration-catalog/deny',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Deny integration for tenant (Super Admin only)',
        tags: ['Super Admin', 'Integration Catalog'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const rule = await integrationCatalogService.denyIntegration(
          request.body.tenantId,
          request.body.integrationId,
          request.body.denialReason,
          userId
        );
        return reply.send(rule);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'INTEGRATION_DENIAL_FAILED',
            message: error.message || 'Failed to deny integration',
          },
        });
      }
    }
  );

  // ===== INTEGRATION CONNECTION ROUTES =====

  // Start OAuth flow
  app.post<{ Params: { integrationId: string }; Body: { returnUrl: string } }>(
    '/api/v1/integrations/:integrationId/oauth/start',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Start OAuth flow for integration',
        tags: ['Integrations', 'OAuth'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { returnUrl } = request.body;

        const result = await integrationConnectionService.startOAuthFlow(
          integrationId,
          tenantId,
          userId,
          returnUrl
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'OAUTH_START_FAILED',
            message: error.message || 'Failed to start OAuth flow',
          },
        });
      }
    }
  );

  // Handle OAuth callback
  app.get<{ Querystring: { code: string; state: string } }>(
    '/api/v1/integrations/oauth/callback',
    {
      schema: {
        description: 'Handle OAuth callback',
        tags: ['Integrations', 'OAuth'],
      },
    },
    async (request, reply) => {
      try {
        const { code, state } = request.query;
        const result = await integrationConnectionService.handleOAuthCallback(code, state);
        
        if (result.success) {
          return reply.redirect(result.returnUrl);
        } else {
          return reply.redirect(`${result.returnUrl}?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
        }
      } catch (error: any) {
        return reply.status(500).send({
          error: {
            code: 'OAUTH_CALLBACK_FAILED',
            message: error.message || 'Failed to handle OAuth callback',
          },
        });
      }
    }
  );

  // Connect with API key
  app.post<{ Params: { integrationId: string }; Body: { apiKey: string; displayName?: string } }>(
    '/api/v1/integrations/:integrationId/connections/api-key',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with API key',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { apiKey, displayName } = request.body;

        const connection = await integrationConnectionService.connectWithApiKey(
          integrationId,
          tenantId,
          userId,
          apiKey,
          displayName
        );
        return reply.status(201).send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_CREATION_FAILED',
            message: error.message || 'Failed to create connection',
          },
        });
      }
    }
  );

  // Connect with basic auth
  app.post<{ Params: { integrationId: string }; Body: { username: string; password: string; displayName?: string } }>(
    '/api/v1/integrations/:integrationId/connections/basic-auth',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with basic auth',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { username, password, displayName } = request.body;

        const connection = await integrationConnectionService.connectWithBasicAuth(
          integrationId,
          tenantId,
          userId,
          username,
          password,
          displayName
        );
        return reply.status(201).send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_CREATION_FAILED',
            message: error.message || 'Failed to create connection',
          },
        });
      }
    }
  );

  // Connect with service account (e.g. Google Workspace domain-wide delegation)
  app.post<{
    Params: { integrationId: string };
    Body: { serviceAccountJson: string; displayName?: string };
  }>(
    '/api/v1/integrations/:integrationId/connections/service-account',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Connect integration with service account JSON key',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['serviceAccountJson'],
          properties: {
            serviceAccountJson: { type: 'string', description: 'JSON string of service account key' },
            displayName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const userId = request.user!.id;
        const { serviceAccountJson, displayName } = request.body;

        const connection = await integrationConnectionService.connectWithServiceAccount(
          integrationId,
          tenantId,
          userId,
          serviceAccountJson,
          displayName
        );
        return reply.status(201).send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_CREATION_FAILED',
            message: error.message || 'Failed to create connection',
          },
        });
      }
    }
  );

  // Get connection
  app.get<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get connection by ID',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        const connection = await integrationConnectionService.getConnection(connectionId, integrationId, tenantId);
        if (!connection) {
          return reply.status(404).send({ error: 'Connection not found' });
        }
        return reply.send(connection);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get connection',
          },
        });
      }
    }
  );

  // Test connection
  app.post<{ Params: { integrationId: string }; Querystring: { connectionId?: string } }>(
    '/api/v1/integrations/:integrationId/connections/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test connection',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId } = request.params;
        const tenantId = request.user!.tenantId;
        const { connectionId } = request.query;

        const result = await integrationConnectionService.testConnection(
          integrationId,
          tenantId,
          connectionId
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_TEST_FAILED',
            message: error.message || 'Failed to test connection',
          },
        });
      }
    }
  );

  // Refresh tokens
  app.post<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId/refresh',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Refresh OAuth tokens',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        const success = await integrationConnectionService.refreshTokens(connectionId, integrationId, tenantId);
        return reply.send({ success });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: error.message || 'Failed to refresh tokens',
          },
        });
      }
    }
  );

  // Delete connection
  app.delete<{ Params: { integrationId: string; connectionId: string } }>(
    '/api/v1/integrations/:integrationId/connections/:connectionId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Delete connection',
        tags: ['Integrations', 'Connections'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { integrationId, connectionId } = request.params;
        const tenantId = request.user!.tenantId;

        await integrationConnectionService.deleteConnection(connectionId, integrationId, tenantId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONNECTION_DELETE_FAILED',
            message: error.message || 'Failed to delete connection',
          },
        });
      }
    }
  );

  // ===== ADAPTER MANAGEMENT ROUTES =====

  // Get adapter instance
  app.post<{ Body: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/get',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get adapter instance for integration',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.body;
        const tenantId = request.user!.tenantId;

        // Note: This returns adapter metadata, not the actual adapter instance
        // The adapter instance should be used internally by the service
        const adapter = await adapterManagerService.getAdapter(
          providerName,
          integrationId,
          tenantId,
          userId
        );

        return reply.send({
          providerId: adapter.providerId,
          providerName: adapter.providerName,
          isConnected: adapter.isConnected(),
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_GET_FAILED',
            message: error.message || 'Failed to get adapter',
          },
        });
      }
    }
  );

  // Test adapter connection
  app.post<{ Body: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/test',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Test adapter connection',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.body;
        const tenantId = request.user!.tenantId;

        const adapter = await adapterManagerService.getAdapter(
          providerName,
          integrationId,
          tenantId,
          userId
        );

        const result = await adapterManagerService.testAdapterConnection(adapter);
        return reply.send(result);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_TEST_FAILED',
            message: error.message || 'Failed to test adapter connection',
          },
        });
      }
    }
  );

  // Get adapter registry statistics
  app.get(
    '/api/v1/integrations/adapters/registry/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get adapter registry statistics',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      try {
        const stats = adapterManagerService.getRegistryStats();
        return reply.send(stats);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_STATS_FAILED',
            message: error.message || 'Failed to get adapter statistics',
          },
        });
      }
    }
  );

  // ===== INTEGRATION HEALTH & MONITORING ROUTES =====
  await integrationHealthRoutes(app, integrationService, syncTaskService);

  // Clear adapter cache
  app.post(
    '/api/v1/integrations/adapters/cache/clear',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Clear adapter cache',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      try {
        adapterManagerService.clearCache();
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_CACHE_CLEAR_FAILED',
            message: error.message || 'Failed to clear adapter cache',
          },
        });
      }
    }
  );

  // Remove adapter from cache
  app.delete<{ Querystring: { providerName: string; integrationId: string; userId?: string } }>(
    '/api/v1/integrations/adapters/cache',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Remove adapter from cache',
        tags: ['Integrations', 'Adapters'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { providerName, integrationId, userId } = request.query;
        adapterManagerService.removeFromCache(providerName, integrationId, userId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'ADAPTER_CACHE_REMOVE_FAILED',
            message: error.message || 'Failed to remove adapter from cache',
          },
        });
      }
    }
  );

  // ===== BIDIRECTIONAL SYNC & CONFLICT RESOLUTION ROUTES =====

  // Detect conflicts
  app.post<{ Body: DetectConflictInput }>(
    '/api/v1/integrations/sync/conflicts/detect',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Detect conflicts between local and remote versions',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const conflict = await bidirectionalSyncService.detectConflicts(request.body);
        if (!conflict) {
          return reply.send({ conflict: null, hasConflict: false });
        }
        return reply.send({ conflict, hasConflict: true });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_DETECTION_FAILED',
            message: error.message || 'Failed to detect conflicts',
          },
        });
      }
    }
  );

  // Resolve conflict
  app.post<{ Body: ResolveConflictInput }>(
    '/api/v1/integrations/sync/conflicts/resolve',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Resolve a sync conflict',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const resolution = await bidirectionalSyncService.resolveConflict(request.body);
        return reply.send(resolution);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_RESOLUTION_FAILED',
            message: error.message || 'Failed to resolve conflict',
          },
        });
      }
    }
  );

  // Get conflict by ID
  app.get<{ Params: { conflictId: string } }>(
    '/api/v1/integrations/sync/conflicts/:conflictId',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conflict by ID',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { conflictId } = request.params;
        const tenantId = request.user!.tenantId;
        const conflict = await bidirectionalSyncService.getConflict(conflictId, tenantId);
        if (!conflict) {
          return reply.status(404).send({ error: 'Conflict not found' });
        }
        return reply.send(conflict);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get conflict',
          },
        });
      }
    }
  );

  // Get pending conflicts
  app.get(
    '/api/v1/integrations/sync/conflicts/pending',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all pending conflicts for tenant',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const conflicts = await bidirectionalSyncService.getPendingConflicts(tenantId);
        return reply.send({ conflicts });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICTS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get pending conflicts',
          },
        });
      }
    }
  );

  // Ignore conflict
  app.post<{ Params: { conflictId: string } }>(
    '/api/v1/integrations/sync/conflicts/:conflictId/ignore',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Ignore a conflict',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { conflictId } = request.params;
        const tenantId = request.user!.tenantId;
        await bidirectionalSyncService.ignoreConflict(conflictId, tenantId);
        return reply.status(204).send();
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_IGNORE_FAILED',
            message: error.message || 'Failed to ignore conflict',
          },
        });
      }
    }
  );

  // Get conflict statistics
  app.get(
    '/api/v1/integrations/sync/conflicts/stats',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get conflict statistics for tenant',
        tags: ['Integrations', 'Sync'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const stats = await bidirectionalSyncService.getConflictStats(tenantId);
        return reply.send(stats);
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CONFLICT_STATS_FAILED',
            message: error.message || 'Failed to get conflict statistics',
          },
        });
      }
    }
  );

  // ===== SYSTEM SETTINGS ROUTES (Admin) =====

  const { SystemSettingsService } = await import('../services/SystemSettingsService.js');
  const systemSettingsService = new SystemSettingsService();

  // Get all system settings
  app.get(
    '/api/v1/admin/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get all system settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const settings = await systemSettingsService.getSettings();
        return reply.send({ settings });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SETTINGS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get system settings',
          },
        });
      }
    }
  );

  // Update system settings
  app.put<{ Body: UpdateSystemSettingsInput }>(
    '/api/v1/admin/settings',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update system settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            rateLimits: { type: 'object' },
            capacity: { type: 'object' },
            queueConfig: { type: 'object' },
            featureFlags: { type: 'object' },
            azureServices: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const settings = await systemSettingsService.updateSettings(request.body, userId);
        return reply.send({ settings });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'SETTINGS_UPDATE_FAILED',
            message: error.message || 'Failed to update system settings',
          },
        });
      }
    }
  );

  // Get rate limit settings
  app.get(
    '/api/v1/admin/settings/rate-limits',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get rate limit settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              rateLimits: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const rateLimits = await systemSettingsService.getRateLimits();
        return reply.send({ rateLimits });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'RATE_LIMITS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get rate limit settings',
          },
        });
      }
    }
  );

  // Update rate limit settings
  app.put<{ Body: RateLimitSettings }>(
    '/api/v1/admin/settings/rate-limits',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update rate limit settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['global'],
          properties: {
            global: {
              type: 'object',
              properties: {
                requestsPerSecond: { type: 'number' },
                requestsPerMinute: { type: 'number' },
                requestsPerHour: { type: 'number' },
              },
            },
            defaultByIntegrationType: { type: 'object' },
            tenantOverrides: { type: 'object' },
            bypassTenants: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              rateLimits: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const rateLimits = await systemSettingsService.updateRateLimits(request.body, userId);
        return reply.send({ rateLimits });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'RATE_LIMITS_UPDATE_FAILED',
            message: error.message || 'Failed to update rate limit settings',
          },
        });
      }
    }
  );

  // Get processing capacity settings
  app.get(
    '/api/v1/admin/settings/capacity',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get processing capacity settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              capacity: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const capacity = await systemSettingsService.getCapacity();
        return reply.send({ capacity });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CAPACITY_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get processing capacity settings',
          },
        });
      }
    }
  );

  // Update processing capacity settings
  app.put<{ Body: ProcessingCapacitySettings }>(
    '/api/v1/admin/settings/capacity',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update processing capacity settings (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['lightProcessors', 'heavyProcessors'],
          properties: {
            lightProcessors: {
              type: 'object',
              properties: {
                minInstances: { type: 'number' },
                maxInstances: { type: 'number' },
                autoScaleThreshold: { type: 'number' },
                prefetch: { type: 'number' },
                concurrentProcessing: { type: 'number' },
                memoryLimitMB: { type: 'number' },
              },
            },
            heavyProcessors: {
              type: 'object',
              properties: {
                minInstances: { type: 'number' },
                maxInstances: { type: 'number' },
                autoScaleThreshold: { type: 'number' },
                prefetch: { type: 'number' },
                concurrentProcessing: { type: 'number' },
                memoryLimitMB: { type: 'number' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              capacity: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const capacity = await systemSettingsService.updateCapacity(request.body, userId);
        return reply.send({ capacity });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'CAPACITY_UPDATE_FAILED',
            message: error.message || 'Failed to update processing capacity settings',
          },
        });
      }
    }
  );

  // Get feature flags
  app.get(
    '/api/v1/admin/settings/feature-flags',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Get feature flags (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              featureFlags: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const featureFlags = await systemSettingsService.getFeatureFlags();
        return reply.send({ featureFlags });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FEATURE_FLAGS_RETRIEVAL_FAILED',
            message: error.message || 'Failed to get feature flags',
          },
        });
      }
    }
  );

  // Update feature flags
  app.put<{ Body: FeatureFlags }>(
    '/api/v1/admin/settings/feature-flags',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Update feature flags (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            documentProcessing: { type: 'boolean' },
            emailProcessing: { type: 'boolean' },
            meetingTranscription: { type: 'boolean' },
            entityLinking: { type: 'boolean' },
            mlFieldAggregation: { type: 'boolean' },
            suggestedLinks: { type: 'boolean' },
            bidirectionalSync: { type: 'boolean' },
            webhooks: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              featureFlags: { type: 'object' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const featureFlags = await systemSettingsService.updateFeatureFlags(request.body, userId);
        return reply.send({ featureFlags });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FEATURE_FLAGS_UPDATE_FAILED',
            message: error.message || 'Failed to update feature flags',
          },
        });
      }
    }
  );

  // Toggle single feature flag
  app.patch<{ Params: { flagName: string }; Body: { enabled: boolean } }>(
    '/api/v1/admin/settings/feature-flags/:flagName',
    {
      preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
      schema: {
        description: 'Toggle a single feature flag (Super Admin only)',
        tags: ['Admin', 'System Settings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            flagName: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['enabled'],
          properties: {
            enabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              featureFlag: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Super-admin-only: enforce when RBAC/super-admin role is wired
        const userId = request.user!.id;
        const featureFlags = await systemSettingsService.toggleFeatureFlag(
          request.params.flagName,
          request.body.enabled,
          userId
        );
        return reply.send({
          featureFlag: {
            name: request.params.flagName,
            enabled: featureFlags[request.params.flagName],
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          error: {
            code: 'FEATURE_FLAG_TOGGLE_FAILED',
            message: error.message || 'Failed to toggle feature flag',
          },
        });
      }
    }
  );
}
