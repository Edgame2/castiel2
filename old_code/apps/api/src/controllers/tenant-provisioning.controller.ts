/**
 * Tenant Provisioning Controller
 * HTTP handlers for tenant SCIM provisioning management
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SCIMService } from '../services/auth/scim.service.js';
import type { AuthUser } from '../types/auth.types.js';
import { config } from '../config/env.js';

/**
 * Tenant Provisioning Controller
 */
export class TenantProvisioningController {
  constructor(private readonly scimService: SCIMService) {}

  /**
   * GET /api/tenants/:tenantId/provisioning
   * Get SCIM configuration for tenant
   */
  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      const config = await this.scimService.getConfigResponse(tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SCIM is not configured for this tenant',
        });
      }

      return reply.code(200).send(config);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get SCIM config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get SCIM configuration',
      });
    }
  }

  /**
   * POST /api/tenants/:tenantId/provisioning/enable
   * Enable SCIM for tenant
   */
  async enableSCIM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      // Get base URL from config
      const baseUrl = config.api.publicUrl || 'https://api.castiel.ai';

      const { config: scimConfig, token } = await this.scimService.enableSCIM(
        tenantId,
        user.id,
        baseUrl
      );

      // Return config with token (only shown once)
      return reply.code(200).send({
        enabled: true,
        endpointUrl: scimConfig.endpointUrl,
        token, // Only returned on creation
        createdAt: scimConfig.createdAt,
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to enable SCIM');
      return reply.code(500).send({
        error: 'InternalError',
        message: error.message || 'Failed to enable SCIM',
      });
    }
  }

  /**
   * POST /api/tenants/:tenantId/provisioning/disable
   * Disable SCIM for tenant
   */
  async disableSCIM(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      await this.scimService.disableSCIM(tenantId);

      return reply.code(200).send({
        enabled: false,
        message: 'SCIM has been disabled',
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to disable SCIM');
      return reply.code(500).send({
        error: 'InternalError',
        message: error.message || 'Failed to disable SCIM',
      });
    }
  }

  /**
   * POST /api/tenants/:tenantId/provisioning/rotate
   * Rotate SCIM token
   */
  async rotateToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      const token = await this.scimService.rotateToken(tenantId);

      return reply.code(200).send({
        token, // Only returned on rotation
        message: 'Token rotated successfully',
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to rotate SCIM token');
      return reply.code(500).send({
        error: 'InternalError',
        message: error.message || 'Failed to rotate token',
      });
    }
  }

  /**
   * POST /api/tenants/:tenantId/provisioning/test
   * Test SCIM connectivity
   */
  async testConnection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      const config = await this.scimService.getConfig(tenantId);

      if (!config || !config.enabled) {
        return reply.code(400).send({
          success: false,
          message: 'SCIM is not enabled for this tenant',
        });
      }

      // Simple test - verify config exists and is enabled
      return reply.code(200).send({
        success: true,
        message: 'SCIM is configured and enabled',
        endpointUrl: config.endpointUrl,
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to test SCIM connection');
      return reply.code(500).send({
        success: false,
        message: error.message || 'Failed to test connection',
      });
    }
  }

  /**
   * GET /api/tenants/:tenantId/provisioning/logs
   * Get SCIM activity logs
   */
  async getLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };

      // Check authorization
      if (user.tenantId !== tenantId && !user.roles?.includes('global_admin')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
        });
      }

      const query = request.query as any;
      const limit = parseInt(query.limit || '100', 10);

      const logs = await this.scimService.getActivityLogs(tenantId, limit);

      return reply.code(200).send({
        logs,
        total: logs.length,
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get SCIM logs');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get activity logs',
      });
    }
  }
}









