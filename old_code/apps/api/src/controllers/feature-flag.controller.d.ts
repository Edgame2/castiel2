/**
 * Feature Flag Controller
 *
 * Handles REST API operations for feature flags.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
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
export declare class FeatureFlagController {
    private service;
    private monitoring;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize the controller
     */
    initialize(): Promise<void>;
    /**
     * Check if user has permission to manage feature flags
     */
    private hasPermission;
    /**
     * Get authenticated user from request
     * Note: This controller uses req.auth pattern (set by authentication middleware)
     */
    private getAuth;
    /**
     * GET /api/v1/feature-flags
     * List all feature flags
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    listFeatureFlags: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/feature-flags/:name
     * Get a specific feature flag
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    getFeatureFlag: (req: FastifyRequest<{
        Params: NameParams;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * GET /api/v1/feature-flags/:name/check
     * Check if a feature flag is enabled for the current context
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    checkFeatureFlag: (req: FastifyRequest<{
        Params: NameParams;
        Querystring: CheckFeatureFlagQuery;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * POST /api/v1/feature-flags
     * Create a new feature flag (admin only)
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic and authorization.
     */
    createFeatureFlag: (req: FastifyRequest<{
        Body: CreateFeatureFlagBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * PATCH /api/v1/feature-flags/:id
     * Update a feature flag (admin only)
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic and authorization.
     */
    updateFeatureFlag: (req: FastifyRequest<{
        Params: IdParams;
        Body: UpdateFeatureFlagBody;
    }>, reply: FastifyReply) => Promise<void>;
    /**
     * DELETE /api/v1/feature-flags/:id
     * Delete a feature flag (admin only)
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic and authorization.
     */
    deleteFeatureFlag: (req: FastifyRequest<{
        Params: IdParams;
    }>, reply: FastifyReply) => Promise<void>;
}
export {};
//# sourceMappingURL=feature-flag.controller.d.ts.map