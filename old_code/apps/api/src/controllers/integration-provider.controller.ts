/**
 * Integration Provider Controller
 * Handles HTTP requests for integration provider management (Super Admin only)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { IntegrationProviderService } from '../services/integration-provider.service.js';
import type { AuthUser } from '../types/auth.types.js';

type AuthenticatedRequest = FastifyRequest & {
  user?: AuthUser;
};

function getUser(request: FastifyRequest): AuthUser {
  const req = request as AuthenticatedRequest;
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

export class IntegrationProviderController {
  private service: IntegrationProviderService;

  constructor(service: IntegrationProviderService) {
    this.service = service;
  }

  /**
   * POST /api/admin/integrations
   * Create integration provider
   */
  async createProvider(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const input = request.body as any;

      const provider = await this.service.createProvider(input, user);

      reply.status(201).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to create provider');
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to create provider',
      });
    }
  }

  /**
   * GET /api/admin/integrations
   * List integration providers
   */
  async listProviders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = request.query as any;
      const result = await this.service.listProviders({
        category: query.category,
        status: query.status,
        audience: query.audience,
        supportsSearch: query.supportsSearch !== undefined ? query.supportsSearch === 'true' : undefined,
        supportsNotifications: query.supportsNotifications !== undefined ? query.supportsNotifications === 'true' : undefined,
        requiresUserScoping: query.requiresUserScoping !== undefined ? query.requiresUserScoping === 'true' : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      });

      reply.status(200).send(result);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to list providers');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list providers',
      });
    }
  }

  /**
   * GET /api/admin/integrations/:category/:id
   * Get integration provider
   */
  async getProvider(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const params = request.params as { category: string; id: string };
      const provider = await this.service.getProvider(params.id, params.category);

      if (!provider) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Provider not found',
        });
        return;
      }

      reply.status(200).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get provider');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get provider',
      });
    }
  }

  /**
   * GET /api/admin/integrations/by-name/:providerName
   * Get integration provider by provider name (searches across all categories)
   */
  async getProviderByName(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const params = request.params as { providerName: string };
      const provider = await this.service.getProviderByName(params.providerName);

      if (!provider) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Provider not found',
        });
        return;
      }

      reply.status(200).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get provider by name');
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get provider by name',
      });
    }
  }

  /**
   * PATCH /api/admin/integrations/:category/:id
   * Update integration provider
   */
  async updateProvider(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const params = request.params as { category: string; id: string };
      const input = request.body as any;

      const provider = await this.service.updateProvider(params.id, params.category, input, user);

      reply.status(200).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to update provider');
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to update provider',
      });
    }
  }

  /**
   * DELETE /api/admin/integrations/:category/:id
   * Delete integration provider
   */
  async deleteProvider(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const params = request.params as { category: string; id: string };

      const deleted = await this.service.deleteProvider(params.id, params.category, user);

      if (!deleted) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'Provider not found',
        });
        return;
      }

      reply.status(204).send();
    } catch (error: any) {
      request.log.error({ error }, 'Failed to delete provider');
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to delete provider',
      });
    }
  }

  /**
   * PATCH /api/admin/integrations/:category/:id/status
   * Change provider status
   */
  async changeStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const params = request.params as { category: string; id: string };
      const body = request.body as { status: 'active' | 'beta' | 'deprecated' | 'disabled' };

      if (!body.status) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'status is required',
        });
        return;
      }

      const provider = await this.service.changeStatus(params.id, params.category, body.status, user);

      reply.status(200).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to change provider status');
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to change provider status',
      });
    }
  }

  /**
   * PATCH /api/admin/integrations/:category/:id/audience
   * Change provider audience
   */
  async changeAudience(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const params = request.params as { category: string; id: string };
      const body = request.body as { audience: 'system' | 'tenant' };

      if (!body.audience) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'audience is required',
        });
        return;
      }

      const provider = await this.service.changeAudience(params.id, params.category, body.audience, user);

      reply.status(200).send(provider);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to change provider audience');
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to change provider audience',
      });
    }
  }
}







