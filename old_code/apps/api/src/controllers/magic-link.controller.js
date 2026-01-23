/**
 * Magic Link Controller
 *
 * HTTP handlers for passwordless authentication via magic links
 */
import { SessionManagementService } from '../services/auth/session-management.service.js';
import { UserStatus } from '../types/user.types.js';
import { UnauthorizedError, ForbiddenError, AppError } from '../middleware/error-handler.js';
/**
 * Magic Link Controller
 */
export class MagicLinkController {
    magicLinkService;
    cacheManager;
    accessTokenExpiry;
    constructor(magicLinkService, cacheManager, accessTokenExpiry = '9h') {
        this.magicLinkService = magicLinkService;
        this.cacheManager = cacheManager;
        this.accessTokenExpiry = accessTokenExpiry;
    }
    /**
     * POST /auth/magic-link/request
     * Request a magic link for passwordless login
     *
     * Note: Input validation is handled by Fastify schema validation (requestMagicLinkSchema)
     * This method only handles business logic.
     */
    async requestMagicLink(request, reply) {
        // Fastify schema validation ensures email is present and valid format
        const { email, tenantId, returnUrl } = request.body;
        // Default tenant if not specified
        const resolvedTenantId = tenantId || 'default';
        try {
            const result = await this.magicLinkService.requestMagicLink(email.toLowerCase(), resolvedTenantId, returnUrl);
            request.log.info({ email: email.toLowerCase() }, 'Magic link requested');
            reply.status(200).send(result);
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to request magic link');
            throw new AppError('Failed to process magic link request', 500);
        }
    }
    /**
     * GET /auth/magic-link/verify/:token
     * Verify magic link and complete login
     *
     * Note: Input validation is handled by Fastify schema validation (verifyMagicLinkSchema)
     * This method only handles business logic validation (token validity, user status, etc.).
     */
    async verifyMagicLink(request, reply) {
        // Fastify schema validation ensures token is present and non-empty
        const { token } = request.params;
        try {
            // Verify the magic link
            const verifyResult = await this.magicLinkService.verifyMagicLink(token);
            if (!verifyResult.valid) {
                throw new UnauthorizedError('Invalid or expired magic link');
            }
            // Get the user
            const user = await this.magicLinkService.getUserById(verifyResult.userId, verifyResult.tenantId);
            if (!user) {
                throw new UnauthorizedError('User not found');
            }
            // Check if user is active
            if (user.status !== 'active' && user.status !== 'pending_verification') {
                throw new ForbiddenError('Account is not active');
            }
            // If user was pending verification, mark as verified
            // (Magic link serves as email verification)
            if (user.status === 'pending_verification' || !user.emailVerified) {
                user.emailVerified = true;
                user.status = UserStatus.ACTIVE;
                // The user service should handle the update
            }
            // Generate access token
            const accessToken = request.server.jwt.sign({
                sub: user.id,
                email: user.email,
                tenantId: user.tenantId,
                isDefaultTenant: user.isDefaultTenant ?? false,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.roles?.[0] || 'user',
                roles: user.roles || [],
                organizationId: user.organizationId,
                status: user.status,
                type: 'access',
                loginMethod: 'magic_link',
            }, {
                expiresIn: this.accessTokenExpiry,
            });
            // Create refresh token
            const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(user.id, user.tenantId);
            // Extract device and location metadata
            const metadata = SessionManagementService.extractSessionMetadata(request);
            // Create session
            await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                provider: 'magic_link',
                deviceInfo: metadata.deviceInfo,
                locationInfo: metadata.locationInfo,
            });
            request.log.info({ userId: user.id, email: user.email }, 'Magic link login successful');
            reply.status(200).send({
                accessToken,
                refreshToken: refreshTokenResult.token,
                expiresIn: this.accessTokenExpiry,
                returnUrl: verifyResult.returnUrl,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    tenantId: user.tenantId,
                    isDefaultTenant: user.isDefaultTenant ?? false,
                },
            });
        }
        catch (error) {
            // Re-throw AppError instances (will be handled by Fastify error handler)
            if (error instanceof AppError) {
                throw error;
            }
            // Log and transform unknown errors
            request.log.error({ error }, 'Failed to verify magic link');
            throw new AppError('Failed to verify magic link', 500);
        }
    }
}
//# sourceMappingURL=magic-link.controller.js.map