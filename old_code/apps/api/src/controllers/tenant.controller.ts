/**
 * Tenant Controller
 * Handles tenant management endpoints
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { TenantService } from '../services/auth/tenant.service.js';
import type {
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantListQuery,
} from '../types/tenant.types.js';
import type { AuthenticatedRequest, AuthUser } from '../types/auth.types.js';

interface TenantParams {
  tenantId: string;
}

interface TenantDomainParams {
  domain: string;
}

export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * Create tenant
   * POST /api/tenants
   */
  async createTenant(
    request: FastifyRequest<{ Body: CreateTenantRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const user = this.getAuthUser(request);
      const createdBy = user?.id;
      const tenant = await this.tenantService.createTenant(request.body, createdBy);
      reply.code(201).send(tenant);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to create tenant');

      if (error?.message?.includes('already exists')) {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }

      reply.code(400).send({
        error: 'Bad Request',
        message: error?.message || 'Failed to create tenant',
      });
    }
  }

  /**
   * Get tenant
   * GET /api/tenants/:tenantId
   */
  async getTenant(
    request: FastifyRequest<{ Params: TenantParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      const tenant = await this.tenantService.getTenant(tenantId);

      if (!tenant) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Tenant not found',
        });
        return;
      }

      reply.send(tenant);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to get tenant');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get tenant',
      });
    }
  }

  /**
   * Update tenant
   * PATCH /api/tenants/:tenantId
   */
  async updateTenant(
    request: FastifyRequest<{ Params: TenantParams; Body: UpdateTenantRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      const tenant = await this.tenantService.updateTenant(tenantId, request.body);
      reply.send(tenant);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to update tenant');

      if (error?.message === 'Tenant not found') {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      if (error?.message?.includes('already exists')) {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }

      reply.code(400).send({
        error: 'Bad Request',
        message: error?.message || 'Failed to update tenant',
      });
    }
  }

  /**
   * Delete tenant (soft delete)
   * DELETE /api/tenants/:tenantId
   */
  async deleteTenant(
    request: FastifyRequest<{ Params: TenantParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      await this.tenantService.deleteTenant(tenantId);

      reply.send({
        success: true,
        message: 'Tenant deactivated successfully',
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to delete tenant');

      if (error?.message === 'Tenant not found') {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete tenant',
      });
    }
  }

  /**
   * Activate tenant
   * POST /api/tenants/:tenantId/activate
   */
  async activateTenant(
    request: FastifyRequest<{ Params: TenantParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { tenantId } = request.params;
      const tenant = await this.tenantService.activateTenant(tenantId);

      reply.send({
        success: true,
        message: 'Tenant activated successfully',
        activatedAt: tenant.activatedAt,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to activate tenant');

      if (error?.message === 'Tenant not found') {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to activate tenant',
      });
    }
  }

  /**
   * List tenants
   * GET /api/tenants
   */
  async listTenants(
    request: FastifyRequest<{ Querystring: TenantListQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const query = request.query || {};
      const tenants = await this.tenantService.listTenants(query);
      reply.send(tenants);
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to list tenants');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list tenants',
      });
    }
  }

  /**
   * Lookup tenant by domain
   * GET /api/tenants/domain/:domain
   */
  async lookupTenantByDomain(
    request: FastifyRequest<{ Params: TenantDomainParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const rawDomain = request.params.domain?.trim().toLowerCase();
      if (!rawDomain) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Domain is required',
        });
        return;
      }

      const tenant = await this.tenantService.getTenantByDomain(rawDomain);
      if (!tenant) {
        reply.send({ exists: false, tenant: null });
        return;
      }

      reply.send({
        exists: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          plan: tenant.plan,
          activatedAt: tenant.activatedAt,
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to lookup tenant by domain');
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to lookup tenant',
      });
    }
  }

  private getAuthUser(request: FastifyRequest): AuthUser | undefined {
    return (request as AuthenticatedRequest).user;
  }
}
