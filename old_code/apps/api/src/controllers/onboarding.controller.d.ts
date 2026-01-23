/**
 * Onboarding Controller
 *
 * Handles HTTP requests for user onboarding flow
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { OnboardingService } from '../services/onboarding.service.js';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    /**
     * GET /api/v1/onboarding
     * Get user's onboarding progress
     */
    getProgress(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/onboarding
     * Initialize onboarding for a user
     */
    initialize(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/v1/onboarding
     * Update onboarding progress
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method only handles business logic.
     */
    updateProgress(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/onboarding/skip
     * Skip onboarding
     */
    skip(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/onboarding/stats
     * Get onboarding statistics (admin only)
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * Check if user is tenant admin
     */
    private isTenantAdmin;
}
//# sourceMappingURL=onboarding.controller.d.ts.map