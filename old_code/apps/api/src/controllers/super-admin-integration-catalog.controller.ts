/**
 * Super Admin Integration Catalog Controller
 * 
 * REST API endpoints for managing the integration catalog
 * Only accessible to super admins
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CreateVisibilityRuleInput,
  UpdateVisibilityRuleInput,
  CatalogListOptions,
} from '../types/integration.types.js';
import { IntegrationCatalogService } from '../services/integration-catalog.service.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';

/**
 * Super Admin Integration Catalog Controller
 */
export class SuperAdminIntegrationCatalogController {
  constructor(
    private catalogService: IntegrationCatalogService,
    private catalogRepository: IntegrationCatalogRepository
  ) {}

  // ============================================
  // Catalog Entry Management Endpoints
  // ============================================

  /**
   * POST /api/super-admin/integration-catalog
   * Create new integration in catalog
   */
  async createIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const input = request.body as CreateIntegrationCatalogInput;
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.createIntegration({
        ...input,
        createdBy: userId,
      });

      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to create integration',
      });
    }
  }

  /**
   * GET /api/super-admin/integration-catalog/:integrationId
   * Get integration details
   */
  async getIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };

      const result = await this.catalogService.getIntegration(integrationId);

      if (!result) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to fetch integration',
      });
    }
  }

  /**
   * GET /api/super-admin/integration-catalog
   * List all integrations in catalog
   */
  async listIntegrations(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 20, offset = 0, category, status, visibility, requiredPlan, searchTerm, beta, deprecated } = request.query as any;

      const options: CatalogListOptions = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        filter: {
          ...(category && { category }),
          ...(status && { status }),
          ...(visibility && { visibility }),
          ...(requiredPlan && { requiredPlan }),
          ...(searchTerm && { searchTerm }),
          ...(beta !== undefined && { beta: beta === 'true' }),
          ...(deprecated !== undefined && { deprecated: deprecated === 'true' }),
        },
      };

      const result = await this.catalogService.listIntegrations(options);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to list integrations',
      });
    }
  }

  /**
   * PATCH /api/super-admin/integration-catalog/:integrationId
   * Update integration details
   */
  async updateIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const input = request.body as UpdateIntegrationCatalogInput;
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.updateIntegration(integrationId, {
        ...input,
        updatedBy: userId,
      });

      if (!result) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to update integration',
      });
    }
  }

  /**
   * DELETE /api/super-admin/integration-catalog/:integrationId
   * Delete integration from catalog
   */
  async deleteIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };

      const success = await this.catalogService.deleteIntegration(integrationId);

      if (!success) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.status(204).send();
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to delete integration',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/deprecate
   * Deprecate integration (soft delete)
   */
  async deprecateIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.deprecateIntegration(integrationId, userId);

      if (!result) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to deprecate integration',
      });
    }
  }

  // ============================================
  // Shard Type Mappings
  // ============================================

  /**
   * GET /api/super-admin/integration-catalog/:integrationId/shard-mappings
   * Get shard type mappings
   */
  async getShardMappings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };

      const integration = await this.catalogService.getIntegration(integrationId);

      if (!integration) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send({
        integrationId,
        shardMappings: integration.shardMappings,
        supportedShardTypes: integration.supportedShardTypes,
        relationshipMappings: integration.relationshipMappings,
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to fetch shard mappings',
      });
    }
  }

  /**
   * PATCH /api/super-admin/integration-catalog/:integrationId/shard-mappings
   * Update shard type mappings
   */
  async updateShardMappings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const { mappings } = request.body as { mappings: any[] };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.updateShardMappings(integrationId, mappings, userId);

      if (!result) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send({
        integrationId,
        shardMappings: result.shardMappings,
        supportedShardTypes: result.supportedShardTypes,
      });
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to update shard mappings',
      });
    }
  }

  // ============================================
  // Visibility Rules Management
  // ============================================

  /**
   * GET /api/super-admin/integration-catalog/:integrationId/visibility
   * Get all visibility rules for integration
   */
  async getVisibilityRulesForIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };

      const rules = await this.catalogService.getVisibilityRulesForIntegration(integrationId);

      return reply.send(rules);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to fetch visibility rules',
      });
    }
  }

  /**
   * GET /api/super-admin/tenants/:tenantId/integration-visibility
   * Get all visibility rules for tenant
   */
  async getVisibilityRulesForTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.params as { tenantId: string };

      const rules = await this.catalogService.getVisibilityRulesForTenant(tenantId);

      return reply.send(rules);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to fetch visibility rules',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/visibility/:tenantId
   * Create or update visibility rule
   */
  async createOrUpdateVisibilityRule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const input = request.body as UpdateVisibilityRuleInput;

      let rule = await this.catalogService.getVisibilityRule(tenantId, integrationId);

      if (rule) {
        rule = await this.catalogService.updateVisibilityRule(rule.id, tenantId, input);
        return reply.send(rule);
      }

      rule = await this.catalogService.createVisibilityRule({
        tenantId,
        integrationId,
        ...(input as any),
      });

      return reply.status(201).send(rule);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to manage visibility rule',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/approve/:tenantId
   * Approve integration for tenant
   */
  async approveIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.approveIntegration(tenantId, integrationId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to approve integration',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/deny/:tenantId
   * Deny integration for tenant
   */
  async denyIntegration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const { reason } = request.body as { reason: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.denyIntegration(tenantId, integrationId, reason, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to deny integration',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/hide/:tenantId
   * Hide integration from tenant
   */
  async hideIntegrationFromTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const { reason } = request.body as { reason?: string };

      const result = await this.catalogService.hideIntegrationFromTenant(tenantId, integrationId, reason);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to hide integration',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/show/:tenantId
   * Show integration to tenant
   */
  async showIntegrationToTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };

      const result = await this.catalogService.showIntegrationToTenant(tenantId, integrationId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to show integration',
      });
    }
  }

  // ============================================
  // Whitelist & Blocking Management
  // ============================================

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
   * Add tenant to whitelist
   */
  async addTenantToWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.addTenantToWhitelist(integrationId, tenantId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to add tenant to whitelist',
      });
    }
  }

  /**
   * DELETE /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId
   * Remove tenant from whitelist
   */
  async removeTenantFromWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.removeTenantFromWhitelist(integrationId, tenantId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to remove tenant from whitelist',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/block/:tenantId
   * Block tenant from integration
   */
  async blockTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.blockTenant(integrationId, tenantId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to block tenant',
      });
    }
  }

  /**
   * DELETE /api/super-admin/integration-catalog/:integrationId/block/:tenantId
   * Unblock tenant
   */
  async unblockTenant(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId, tenantId } = request.params as { integrationId: string; tenantId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.unblockTenant(integrationId, tenantId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to unblock tenant',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/make-public
   * Make integration available to all tenants
   */
  async makePublic(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.makePublic(integrationId, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to make integration public',
      });
    }
  }

  /**
   * POST /api/super-admin/integration-catalog/:integrationId/make-private
   * Make integration available to whitelist only
   */
  async makePrivate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { integrationId } = request.params as { integrationId: string };
      const { allowedTenants } = request.body as { allowedTenants: string[] };
      const userId = (request.user as any)?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const result = await this.catalogService.makePrivate(integrationId, allowedTenants, userId);

      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to make integration private',
      });
    }
  }
}
