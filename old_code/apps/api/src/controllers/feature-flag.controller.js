/**
 * Feature Flag Controller
 *
 * Handles REST API operations for feature flags.
 */
import { FeatureFlagRepository } from '../repositories/feature-flag.repository.js';
import { FeatureFlagService } from '../services/feature-flag.service.js';
import { UserRole } from '@castiel/shared-types';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError } from '../middleware/error-handler.js';
/**
 * Feature Flag Controller
 */
export class FeatureFlagController {
    service;
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
        const repository = new FeatureFlagRepository(monitoring);
        this.service = new FeatureFlagService(repository, monitoring);
    }
    /**
     * Initialize the controller
     */
    async initialize() {
        await this.service.initialize();
    }
    /**
     * Check if user has permission to manage feature flags
     */
    hasPermission(roles) {
        if (!roles)
            return false;
        return roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.ADMIN);
    }
    /**
     * Get authenticated user from request
     * Note: This controller uses req.auth pattern (set by authentication middleware)
     */
    getAuth(req) {
        const auth = req.auth;
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
    listFeatureFlags = async (req, reply) => {
        const auth = req.auth;
        const tenantId = auth?.tenantId;
        try {
            const flags = await this.service.list(tenantId);
            reply.status(200).send({
                flags,
                count: flags.length,
            });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
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
    getFeatureFlag = async (req, reply) => {
        const auth = req.auth;
        const tenantId = auth?.tenantId;
        // Fastify schema validation ensures name is present
        const { name } = req.params;
        try {
            const flag = await this.service.getFlag(name, tenantId);
            if (!flag) {
                throw new NotFoundError(`Feature flag not found: ${name}`);
            }
            reply.status(200).send(flag);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
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
    checkFeatureFlag = async (req, reply) => {
        const auth = req.auth;
        // Fastify schema validation ensures name is present
        const { name } = req.params;
        const { environment, userRole, userId } = req.query;
        try {
            const context = {
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
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
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
    createFeatureFlag = async (req, reply) => {
        const auth = this.getAuth(req);
        if (!this.hasPermission(auth.roles)) {
            throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can create feature flags');
        }
        // Fastify schema validation ensures body structure is valid
        const input = {
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
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
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
    updateFeatureFlag = async (req, reply) => {
        const auth = this.getAuth(req);
        if (!this.hasPermission(auth.roles)) {
            throw new ForbiddenError('Only ADMIN or SUPER_ADMIN can update feature flags');
        }
        // Fastify schema validation ensures id is present
        const { id } = req.params;
        const input = {
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
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
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
    deleteFeatureFlag = async (req, reply) => {
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
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            this.monitoring.trackException(error, {
                operation: 'deleteFeatureFlag',
                id: req.params.id,
            });
            throw new AppError('Failed to delete feature flag', 500);
        }
    };
}
//# sourceMappingURL=feature-flag.controller.js.map