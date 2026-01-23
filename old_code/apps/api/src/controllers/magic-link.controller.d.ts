/**
 * Magic Link Controller
 *
 * HTTP handlers for passwordless authentication via magic links
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MagicLinkService } from '../services/auth/magic-link.service.js';
import type { CacheManager } from '../cache/manager.js';
/**
 * Magic Link Controller
 */
export declare class MagicLinkController {
    private readonly magicLinkService;
    private readonly cacheManager;
    private readonly accessTokenExpiry;
    constructor(magicLinkService: MagicLinkService, cacheManager: CacheManager, accessTokenExpiry?: string);
    /**
     * POST /auth/magic-link/request
     * Request a magic link for passwordless login
     *
     * Note: Input validation is handled by Fastify schema validation (requestMagicLinkSchema)
     * This method only handles business logic.
     */
    requestMagicLink(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /auth/magic-link/verify/:token
     * Verify magic link and complete login
     *
     * Note: Input validation is handled by Fastify schema validation (verifyMagicLinkSchema)
     * This method only handles business logic validation (token validity, user status, etc.).
     */
    verifyMagicLink(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=magic-link.controller.d.ts.map