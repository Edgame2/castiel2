/**
 * SSO Configuration Controller
 * 
 * HTTP handlers for SSO configuration management
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SSOConfigService } from '../services/auth/sso-config.service.js';
import type { AuthUser } from '../types/auth.types.js';
import type { CreateSSOConfigRequest, UpdateSSOConfigRequest } from '../types/sso.types.js';

const ADMIN_ROLES = ['owner', 'admin', 'tenant-admin'];

/**
 * SSO Configuration Controller
 */
export class SSOConfigController {
  constructor(private readonly ssoConfigService: SSOConfigService) {}

  /**
   * GET /api/admin/sso/config
   * Get SSO configuration for tenant
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

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config = await this.ssoConfigService.getConfigByOrgId(user.tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      return reply.code(200).send({ config });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get SSO configuration',
      });
    }
  }

  /**
   * POST /api/admin/sso/config
   * Create SSO configuration
   */
  async createConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      // Check if config already exists
      const existing = await this.ssoConfigService.getConfigByOrgId(user.tenantId);
      if (existing) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'SSO configuration already exists. Use PUT to update.',
        });
      }

      const body = request.body as CreateSSOConfigRequest;
      const config = await this.ssoConfigService.createConfig(
        {
          ...body,
          orgId: user.tenantId,
        },
        user.id
      );

      request.log.info({ tenantId: user.tenantId }, 'SSO configuration created');

      return reply.code(201).send({ config });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to create SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to create SSO configuration',
      });
    }
  }

  /**
   * PUT /api/admin/sso/config
   * Update SSO configuration
   */
  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const body = request.body as UpdateSSOConfigRequest;
      const config = await this.ssoConfigService.updateConfig(user.tenantId, body);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      request.log.info({ tenantId: user.tenantId }, 'SSO configuration updated');

      return reply.code(200).send({ config });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to update SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to update SSO configuration',
      });
    }
  }

  /**
   * DELETE /api/admin/sso/config
   * Delete SSO configuration
   */
  async deleteConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const deleted = await this.ssoConfigService.deleteConfig(user.tenantId);

      if (!deleted) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      request.log.info({ tenantId: user.tenantId }, 'SSO configuration deleted');

      return reply.code(200).send({ success: true, message: 'SSO configuration deleted' });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to delete SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to delete SSO configuration',
      });
    }
  }

  /**
   * POST /api/admin/sso/config/activate
   * Activate SSO configuration
   */
  async activateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      // Validate config before activating
      const existingConfig = await this.ssoConfigService.getConfigByOrgId(user.tenantId);
      if (!existingConfig) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      const validation = this.ssoConfigService.validateConfig(existingConfig);
      if (!validation.valid) {
        return reply.code(400).send({
          error: 'ValidationError',
          message: 'SSO configuration is invalid',
          errors: validation.errors,
        });
      }

      const config = await this.ssoConfigService.activateConfig(user.tenantId);

      request.log.info({ tenantId: user.tenantId }, 'SSO configuration activated');

      return reply.code(200).send({ config });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to activate SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to activate SSO configuration',
      });
    }
  }

  /**
   * POST /api/admin/sso/config/deactivate
   * Deactivate SSO configuration
   */
  async deactivateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config = await this.ssoConfigService.deactivateConfig(user.tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      request.log.info({ tenantId: user.tenantId }, 'SSO configuration deactivated');

      return reply.code(200).send({ config });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to deactivate SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to deactivate SSO configuration',
      });
    }
  }

  /**
   * POST /api/admin/sso/config/validate
   * Validate SSO configuration
   */
  async validateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config = await this.ssoConfigService.getConfigByOrgId(user.tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      const validation = this.ssoConfigService.validateConfig(config);

      return reply.code(200).send(validation);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to validate SSO config');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to validate SSO configuration',
      });
    }
  }

  /**
   * POST /api/admin/sso/config/test
   * Get test SSO URL
   */
  async testConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (!this.isAdmin(user)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Admin role required',
        });
      }

      const config = await this.ssoConfigService.getConfigByOrgId(user.tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotFound',
          message: 'SSO configuration not found',
        });
      }

      // Build test URL
      const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
      const baseUrl = process.env.API_BASE_URL || 
        process.env.PUBLIC_API_BASE_URL ||
        (nodeEnv === 'production' 
          ? (() => { throw new Error('API_BASE_URL or PUBLIC_API_BASE_URL is required in production'); })()
          : 'http://localhost:3001');
      const testUrl = `${baseUrl}/auth/sso/${user.tenantId}/login?returnUrl=/admin/settings/sso`;

      return reply.code(200).send({ testUrl });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get test SSO URL');
      return reply.code(500).send({
        error: 'InternalError',
        message: 'Failed to get test URL',
      });
    }
  }

  private isAdmin(user: AuthUser): boolean {
    return ADMIN_ROLES.some((role) => user.roles?.includes(role));
  }
}

