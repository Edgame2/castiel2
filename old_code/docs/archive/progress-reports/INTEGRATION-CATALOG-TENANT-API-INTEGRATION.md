/**
 * Integration Catalog - Tenant API Integration Guide
 * 
 * How to modify tenant API endpoints to use the catalog visibility system
 */

// ============================================
// Step 1: Update Tenant Integration Service
// ============================================
// File: apps/api/src/services/tenant-integration.service.ts

import { IntegrationVisibilityService } from './integration-visibility.service';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository';

export class TenantIntegrationService {
  constructor(
    private visibilityService: IntegrationVisibilityService,
    private catalogRepository: IntegrationCatalogRepository,
    // ... other dependencies
  ) {}

  /**
   * Get available integrations for tenant
   * Filters by visibility rules, pricing tier, whitelisting, etc.
   */
  async getAvailableIntegrations(
    tenantId: string,
    tenantTier: 'free' | 'pro' | 'enterprise',
    isSuperAdmin: boolean = false
  ): Promise<TenantCatalogView> {
    const tenantContext = {
      tenantId,
      pricingTier: tenantTier,
      superAdmin: isSuperAdmin,
    };

    // Use visibility service to filter catalog
    return this.visibilityService.getTenantCatalogView(tenantContext);
  }

  /**
   * Get single integration details with visibility rules applied
   */
  async getIntegrationForTenant(
    tenantId: string,
    tenantTier: 'free' | 'pro' | 'enterprise',
    integrationId: string
  ): Promise<IntegrationCatalogEntry | null> {
    const tenantContext = {
      tenantId,
      pricingTier: tenantTier,
      superAdmin: false,
    };

    return this.visibilityService.getIntegrationForTenant(tenantContext, integrationId);
  }

  /**
   * Verify tenant can use integration before creating connection
   */
  async canActivateIntegration(
    tenantId: string,
    tenantTier: 'free' | 'pro' | 'enterprise',
    integrationId: string
  ): Promise<{
    canActivate: boolean;
    reason?: string;
  }> {
    const tenantContext = {
      tenantId,
      pricingTier: tenantTier,
      superAdmin: false,
    };

    const result = await this.visibilityService.isIntegrationAvailable(tenantContext, integrationId);

    return {
      canActivate: result.available,
      reason: result.message,
    };
  }

  /**
   * Get effective rate limit for tenant/integration combo
   * Considers custom overrides set by super admin
   */
  async getEffectiveRateLimit(
    tenantId: string,
    integrationId: string
  ) {
    const tenantContext = { tenantId, superAdmin: false };
    return this.visibilityService.getEffectiveRateLimit(tenantContext, integrationId);
  }
}

// ============================================
// Step 2: Update Tenant Routes
// ============================================
// File: apps/api/src/routes/tenant.routes.ts

import { FastifyInstance } from 'fastify';
import { TenantIntegrationController } from '../controllers/tenant-integration.controller';

export async function registerTenantRoutes(
  fastify: FastifyInstance,
  controller: TenantIntegrationController
): Promise<void> {
  /**
   * GET /api/tenant/integrations
   * List available integrations for this tenant
   * Filtered by visibility rules, pricing tier, whitelisting
   */
  fastify.get('/api/tenant/integrations', {
    schema: {
      tags: ['tenant', 'integrations'],
      summary: 'Get available integrations for tenant',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          includeUnavailable: { 
            type: 'boolean',
            description: 'Show unavailable integrations with reasons'
          },
        },
      },
    },
    onRequest: fastify.authenticate,
    handler: controller.listAvailableIntegrations.bind(controller),
  });

  /**
   * GET /api/tenant/integrations/:integrationId
   * Get details of integration if available for tenant
   */
  fastify.get('/api/tenant/integrations/:integrationId', {
    schema: {
      tags: ['tenant', 'integrations'],
      summary: 'Get integration details if available',
      params: {
        type: 'object',
        properties: {
          integrationId: { type: 'string' },
        },
        required: ['integrationId'],
      },
    },
    onRequest: fastify.authenticate,
    handler: controller.getIntegration.bind(controller),
  });

  // ... other routes
}

// ============================================
// Step 3: Update Tenant Controller
// ============================================
// File: apps/api/src/controllers/tenant-integration.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { TenantIntegrationService } from '../services/tenant-integration.service';

export class TenantIntegrationController {
  constructor(private tenantIntegrationService: TenantIntegrationService) {}

  /**
   * List available integrations for tenant
   */
  async listAvailableIntegrations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const tenantId = request.tenantId;
      const tenantTier = request.tenantTier || 'free';
      const { category, includeUnavailable } = request.query as any;

      // Get available integrations with visibility rules applied
      const catalogView = await this.tenantIntegrationService.getAvailableIntegrations(
        tenantId,
        tenantTier
      );

      // Filter by category if provided
      let integrations = catalogView.integrations;
      if (category) {
        integrations = integrations.filter((i) => i.category === category);
      }

      const response = {
        integrations,
        ...(includeUnavailable === 'true' && {
          unavailable: catalogView.unavailableIntegrations,
        }),
        total: integrations.length,
        hasMore: false,
      };

      return reply.send(response);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to list integrations',
      });
    }
  }

  /**
   * Get single integration if available for tenant
   */
  async getIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const tenantId = request.tenantId;
      const tenantTier = request.tenantTier || 'free';

      const integration = await this.tenantIntegrationService.getIntegrationForTenant(
        tenantId,
        tenantTier,
        integrationId
      );

      if (!integration) {
        return reply.status(404).send({
          error: 'Integration not available for your account',
        });
      }

      return reply.send(integration);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to fetch integration',
      });
    }
  }

  /**
   * Activate integration for tenant
   * (Existing endpoint, but add visibility check)
   */
  async activateIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const tenantId = request.tenantId;
      const tenantTier = request.tenantTier || 'free';

      // Check if tenant can activate this integration
      const { canActivate, reason } = await this.tenantIntegrationService.canActivateIntegration(
        tenantId,
        tenantTier,
        integrationId
      );

      if (!canActivate) {
        return reply.status(403).send({
          error: reason,
        });
      }

      // Get effective rate limit for this tenant/integration
      const rateLimit = await this.tenantIntegrationService.getEffectiveRateLimit(
        tenantId,
        integrationId
      );

      // Continue with activation (existing logic)
      // ...

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to activate integration',
      });
    }
  }
}

// ============================================
// Step 4: Register Routes in Main App
// ============================================
// File: apps/api/src/index.ts

import { registerSuperAdminIntegrationCatalogRoutes } from './routes/super-admin-integration-catalog.routes';
import { SuperAdminIntegrationCatalogController } from './controllers/super-admin-integration-catalog.controller';
import { IntegrationCatalogService } from './services/integration-catalog.service';
import { IntegrationCatalogRepository } from './repositories/integration-catalog.repository';
import { IntegrationVisibilityService } from './services/integration-visibility.service';

async function startServer() {
  const fastify = Fastify();
  const cosmosClient = new CosmosClient(/* ... */);

  // Initialize catalog repositories and services
  const catalogRepository = new IntegrationCatalogRepository(
    cosmosClient,
    process.env.COSMOS_DB_NAME!
  );

  const catalogService = new IntegrationCatalogService(catalogRepository);
  const visibilityService = new IntegrationVisibilityService(catalogRepository);

  // Initialize controllers
  const catalogController = new SuperAdminIntegrationCatalogController(
    catalogService,
    catalogRepository
  );

  // Register Super Admin catalog routes
  await registerSuperAdminIntegrationCatalogRoutes(fastify, catalogController);

  // Register other routes...
  await registerTenantRoutes(fastify, tenantController);

  // Start server
  await fastify.listen({ port: 3000 });
}

startServer().catch(console.error);

// ============================================
// Step 5: Update Request Object
// ============================================
// File: apps/api/src/plugins/auth.plugin.ts

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      tenantTier?: 'free' | 'pro' | 'enterprise';
      userId: string;
      isSuperAdmin: boolean;
    }
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    // Verify JWT token
    // Extract tenant info from token
    const token = request.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    // Get tenant tier from database
    const tenant = await tenantRepository.findById(decoded.tenantId);

    request.tenantId = decoded.tenantId;
    request.tenantTier = tenant?.pricingTier || 'free';
    request.userId = decoded.userId;
    request.isSuperAdmin = decoded.role === 'SUPER_ADMIN';
  });

  fastify.decorate('isSuperAdmin', async (request: FastifyRequest) => {
    if (!request.isSuperAdmin) {
      throw new Error('Requires super admin role');
    }
  });
}

// ============================================
// Example Usage in Tests
// ============================================

describe('Tenant Integration Visibility', () => {
  it('should only show enterprise integrations to enterprise tenants', async () => {
    // Create enterprise-only integration
    const entry = await catalogService.createIntegration({
      integrationId: 'salesforce',
      // ...
      requiredPlan: 'enterprise',
    });

    // Free tenant should not see it
    const freeView = await visibilityService.getTenantCatalogView({
      tenantId: 'free-tenant-id',
      pricingTier: 'free',
      superAdmin: false,
    });

    expect(freeView.integrations).not.toContain(
      (i) => i.integrationId === 'salesforce'
    );
    expect(freeView.unavailableIntegrations).toContain(
      expect.objectContaining({ integrationId: 'salesforce' })
    );

    // Enterprise tenant should see it
    const enterpriseView = await visibilityService.getTenantCatalogView({
      tenantId: 'enterprise-tenant-id',
      pricingTier: 'enterprise',
      superAdmin: false,
    });

    expect(enterpriseView.integrations).toContainEqual(
      expect.objectContaining({ integrationId: 'salesforce' })
    );
  });

  it('should respect tenant whitelist', async () => {
    const entry = await catalogService.makePrivate('hubspot', [
      'whitelist-tenant-1',
      'whitelist-tenant-2',
    ]);

    // Tenant not in whitelist cannot see it
    const view = await visibilityService.getTenantCatalogView({
      tenantId: 'other-tenant',
      pricingTier: 'pro',
      superAdmin: false,
    });

    expect(view.integrations).not.toContain(
      (i) => i.integrationId === 'hubspot'
    );

    // Tenant in whitelist can see it
    const whitelistView = await visibilityService.getTenantCatalogView({
      tenantId: 'whitelist-tenant-1',
      pricingTier: 'pro',
      superAdmin: false,
    });

    expect(whitelistView.integrations).toContainEqual(
      expect.objectContaining({ integrationId: 'hubspot' })
    );
  });

  it('should require approval before tenant can use integration', async () => {
    // Create integration requiring approval
    await catalogService.createIntegration({
      integrationId: 'beta-integration',
      requiresApproval: true,
      // ...
    });

    // Tenant can see it but cannot use it
    const available = await visibilityService.isIntegrationAvailable(
      { tenantId: 'tenant-id', pricingTier: 'pro', superAdmin: false },
      'beta-integration'
    );

    expect(available.available).toBe(false);
    expect(available.reason).toBe('requires_approval');

    // After super admin approval
    await catalogService.approveIntegration('tenant-id', 'beta-integration', 'super-admin-id');

    const afterApproval = await visibilityService.isIntegrationAvailable(
      { tenantId: 'tenant-id', pricingTier: 'pro', superAdmin: false },
      'beta-integration'
    );

    expect(afterApproval.available).toBe(true);
  });
});
