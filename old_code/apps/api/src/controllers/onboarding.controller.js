/**
 * Onboarding Controller
 *
 * Handles HTTP requests for user onboarding flow
 */
import { getUser } from '../middleware/authenticate.js';
import { isGlobalAdmin, hasAnyRole } from '../middleware/authorization.js';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/error-handler.js';
export class OnboardingController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    /**
     * GET /api/v1/onboarding
     * Get user's onboarding progress
     */
    async getProgress(request, reply) {
        const user = getUser(request);
        try {
            const progress = await this.onboardingService.getOnboardingProgress(user.id, user.tenantId);
            if (!progress) {
                throw new NotFoundError('Onboarding progress not found');
            }
            reply.status(200).send(progress);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get onboarding progress');
            throw new AppError('Failed to get onboarding progress', 500);
        }
    }
    /**
     * POST /api/v1/onboarding
     * Initialize onboarding for a user
     */
    async initialize(request, reply) {
        const user = getUser(request);
        // Get user details (we need the full user object)
        // For now, we'll create a minimal user object
        const userObj = {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            emailVerified: false, // Will be updated when email is verified
            firstName: undefined,
            lastName: undefined,
        };
        try {
            const progress = await this.onboardingService.initializeOnboarding(user.id, user.tenantId, userObj);
            reply.status(201).send(progress);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to initialize onboarding');
            throw new AppError('Failed to initialize onboarding', 500);
        }
    }
    /**
     * PATCH /api/v1/onboarding
     * Update onboarding progress
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    async updateProgress(request, reply) {
        const user = getUser(request);
        // Fastify schema validation ensures body structure is valid
        const body = request.body;
        try {
            const progress = await this.onboardingService.updateOnboardingProgress(user.id, user.tenantId, body);
            reply.status(200).send(progress);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to update onboarding progress');
            throw new AppError('Failed to update onboarding progress', 500);
        }
    }
    /**
     * POST /api/v1/onboarding/skip
     * Skip onboarding
     */
    async skip(request, reply) {
        const user = getUser(request);
        try {
            const progress = await this.onboardingService.skipOnboarding(user.id, user.tenantId);
            reply.status(200).send(progress);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to skip onboarding');
            throw new AppError('Failed to skip onboarding', 500);
        }
    }
    /**
     * GET /api/v1/onboarding/stats
     * Get onboarding statistics (admin only)
     */
    async getStats(request, reply) {
        const user = getUser(request);
        // Admin check - only tenant admins and super admins can view stats
        if (!this.isTenantAdmin(user)) {
            throw new ForbiddenError('Admin access required');
        }
        try {
            const stats = await this.onboardingService.getOnboardingStats(user.tenantId);
            reply.status(200).send(stats);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to get onboarding stats');
            throw new AppError('Failed to get onboarding stats', 500);
        }
    }
    /**
     * Check if user is tenant admin
     */
    isTenantAdmin(user) {
        if (isGlobalAdmin(user)) {
            return true;
        }
        const adminRoles = ['admin', 'tenant_admin', 'tenant-admin', 'owner'];
        return hasAnyRole(user, adminRoles);
    }
}
//# sourceMappingURL=onboarding.controller.js.map