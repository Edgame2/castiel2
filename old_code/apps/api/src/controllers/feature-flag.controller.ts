/**
 * Feature Flag Controller
 * 
 * Handles REST API operations for feature flags.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import { FeatureFlagRepository } from '../repositories/feature-flag.repository.js';
import { FeatureFlagService } from '../services/feature-flag.service.js';
import {
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  FeatureFlagEvaluationContext,
} from '../types/feature-flag.types.js';
import { UserRole } from '@castiel/shared-types';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError } from '../middleware/error-handler.js';

/**
 * Authentication context added to requests
 */
interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

/**
 * Request types
 */
interface CreateFeatureFlagBody {
  name: string;
  description: string;
  enabled: boolean;
  environments?: ('development' | 'staging' | 'production')[];
  roles?: string[];
  percentage?: number;
  tenantId?: string;
}

interface UpdateFeatureFlagBody {
  enabled?: boolean;
  description?: string;
  environments?: ('development' | 'staging' | 'production')[];
  roles?: string[];
  percentage?: number;
}

interface CheckFeatureFlagQuery {
  environment?: 'development' | 'staging' | 'production';
  userRole?: string;
  userId?: string;
}

interface NameParams {
  name: string;
}

interface IdParams {
  id: string;
}

/**
 * Feature Flag Controller
 */
export class FeatureFlagController {
  private service: FeatureFlagService;
  private monitoring: IMonitoringProvider;

  constructor(monitoring: IMonitoringProvider) {
    this.monitoring = monitoring;
    const repository = new FeatureFlagRepository(monitoring);
    this.service = new FeatureFlagService(repository, monitoring);
  }

  /**
   * Initialize the controller
   */
  async initialize(): Promise<void> {
    await this.service.initialize();
  }

  /**
   * Check if user has permission to manage feature flags
   */
  private hasPermission(roles?: string[]): boolean {
    if (!roles) return false;
    return roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.ADMIN);
  }

  /**
   * Get authenticated user from request
   * Note: This controller uses req.auth pattern (set by authentication middleware)
   */
  private getAuth(req: FastifyRequest): AuthContext {
    const auth = req.auth as AuthContext | undefined;
    if (!auth || !auth.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    return auth;
  }

  /**
   * GET /api/v1/feature-flags
   * List all feature flags
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method only handles business logic.
   */
  listFeatureFlags = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = req.auth as AuthContext | undefined;
    const tenantId = auth?.tenantId;

    try {
      const flags = await this.service.list(tenantId);

      reply.status(200).send({
        flags,
        count: flags.length,
      });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'listFeatureFlags',
      });
      throw new AppError('Failed to list feature flags', 500);
    }
  };

  /**
   * GET /api/v1/feature-flags/:name
   * Get a specific feature flag
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method only handles business logic.
   */
  getFeatureFlag = async (
    req: FastifyRequest<{ Params: NameParams }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = req.auth as AuthContext | undefined;
    const tenantId = auth?.tenantId;
    // Fastify schema validation ensures name is present
    const { name } = req.params;

    try {
      const flag = await this.service.getFlag(name, tenantId);

      if (!flag) {
        throw new NotFoundError(`Feature flag not found: ${name}`);
      }

      reply.status(200).send(flag);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'getFeatureFlag',
        name: req.params.name,
      });
      throw new AppError('Failed to get feature flag', 500);
    }
  };

  /**
   * GET /api/v1/feature-flags/:name/check
   * Check if a feature flag is enabled for the current context
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method only handles business logic.
   */
  checkFeatureFlag = async (
    req: FastifyRequest<{ Params: NameParams; Querystring: CheckFeatureFlagQuery }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = req.auth as AuthContext | undefined;
    // Fastify schema validation ensures name is present
    const { name } = req.params;
    const { environment, userRole, userId } = req.query;

    try {
      const context: FeatureFlagEvaluationContext = {
        environment: environment || undefined,
        userRole: userRole || auth?.roles?.[0] || undefined,
        userId: userId || auth?.userId || undefined,
        tenantId: auth?.tenantId || undefined,
      };

      const enabled = await this.service.isEnabled(name, context);

      reply.status(200).send({
        name,
        enabled,
        context,
      });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'checkFeatureFlag',
        name: req.params.name,
      });
      throw new AppError('Failed to check feature flag', 500);
    }
  };

  /**
   * POST /api/v1/feature-flags
   * Create a new feature flag (admin only)
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic and authorization.
   */
  createFeatureFlag = async (
    req: FastifyRequest<{ Body: CreateFeatureFlagBody }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    if (!this.hasPermission(auth.roles)) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can create feature flags');
    }

    // Fastify schema validation ensures body structure is valid
    const input: CreateFeatureFlagInput = {
      name: req.body.name,
      description: req.body.description,
      enabled: req.body.enabled,
      environments: req.body.environments,
      roles: req.body.roles,
      percentage: req.body.percentage,
      tenantId: req.body.tenantId || auth.tenantId,
    };

    try {
      const flag = await this.service.create(input, auth.userId);

      reply.status(201).send(flag);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'createFeatureFlag',
      });
      throw new AppError('Failed to create feature flag', 500);
    }
  };

  /**
   * PATCH /api/v1/feature-flags/:id
   * Update a feature flag (admin only)
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic and authorization.
   */
  updateFeatureFlag = async (
    req: FastifyRequest<{ Params: IdParams; Body: UpdateFeatureFlagBody }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    if (!this.hasPermission(auth.roles)) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can update feature flags');
    }

    // Fastify schema validation ensures id is present
    const { id } = req.params;
    const input: UpdateFeatureFlagInput = {
      enabled: req.body.enabled,
      description: req.body.description,
      environments: req.body.environments,
      roles: req.body.roles,
      percentage: req.body.percentage,
    };

    try {
      const flag = await this.service.update(id, auth.tenantId, input, auth.userId);

      if (!flag) {
        throw new NotFoundError(`Feature flag not found: ${id}`);
      }

      reply.status(200).send(flag);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'updateFeatureFlag',
        id: req.params.id,
      });
      throw new AppError('Failed to update feature flag', 500);
    }
  };

  /**
   * DELETE /api/v1/feature-flags/:id
   * Delete a feature flag (admin only)
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic and authorization.
   */
  deleteFeatureFlag = async (
    req: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    if (!this.hasPermission(auth.roles)) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can delete feature flags');
    }

    // Fastify schema validation ensures id is present
    const { id } = req.params;

    try {
      const deleted = await this.service.delete(id, auth.tenantId);

      if (!deleted) {
        throw new NotFoundError(`Feature flag not found: ${id}`);
      }

      reply.status(204).send();
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      this.monitoring.trackException(error as Error, {
        operation: 'deleteFeatureFlag',
        id: req.params.id,
      });
      throw new AppError('Failed to delete feature flag', 500);
    }
  };

  /**
   * POST /api/v1/feature-flags/emergency/enable
   * Enable emergency toggle (kill switch) - disables ALL feature flags (super admin only)
   */
  enableEmergencyToggle = async (
    req: FastifyRequest<{ Body: { reason: string } }>,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    // Only super admin can enable emergency toggle
    if (!auth.roles?.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenError('Only SUPER_ADMIN can enable emergency toggle');
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Reason is required for emergency toggle', 400);
    }

    try {
      this.service.enableEmergencyToggle(reason.trim(), auth.userId);
      
      reply.status(200).send({
        message: 'Emergency toggle enabled - all feature flags are now disabled',
        status: this.service.getEmergencyToggleStatus(),
      });
    } catch (error: unknown) {
      this.monitoring.trackException(error as Error, {
        operation: 'enableEmergencyToggle',
      });
      throw new AppError('Failed to enable emergency toggle', 500);
    }
  };

  /**
   * POST /api/v1/feature-flags/emergency/disable
   * Disable emergency toggle - re-enables normal feature flag evaluation (super admin only)
   */
  disableEmergencyToggle = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    // Only super admin can disable emergency toggle
    if (!auth.roles?.includes(UserRole.SUPER_ADMIN)) {
      throw new ForbiddenError('Only SUPER_ADMIN can disable emergency toggle');
    }

    try {
      this.service.disableEmergencyToggle(auth.userId);
      
      reply.status(200).send({
        message: 'Emergency toggle disabled - feature flags are now evaluated normally',
        status: this.service.getEmergencyToggleStatus(),
      });
    } catch (error: unknown) {
      this.monitoring.trackException(error as Error, {
        operation: 'disableEmergencyToggle',
      });
      throw new AppError('Failed to disable emergency toggle', 500);
    }
  };

  /**
   * GET /api/v1/feature-flags/emergency/status
   * Get emergency toggle status (admin only)
   */
  getEmergencyToggleStatus = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const auth = this.getAuth(req);

    if (!this.hasPermission(auth.roles)) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can view emergency toggle status');
    }

    try {
      const status = this.service.getEmergencyToggleStatus();
      
      reply.status(200).send({
        status,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(error as Error, {
        operation: 'getEmergencyToggleStatus',
      });
      throw new AppError('Failed to get emergency toggle status', 500);
    }
  };
}

