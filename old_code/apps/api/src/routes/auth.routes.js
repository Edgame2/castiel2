import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema, refreshTokenSchema, revokeTokenSchema, introspectTokenSchema, mfaChallengeVerifySchema, getProfileSchema, updateProfileSchema, listUserTenantsSchema, updateDefaultTenantSchema, switchTenantSchema, checkRegistrationSchema, resendVerificationSchema, impersonateSchema, } from '../schemas/auth.schemas.js';
import { createLoginRateLimitMiddleware, createPasswordResetRateLimitMiddleware, createRegistrationRateLimitMiddleware, createTokenRefreshRateLimitMiddleware, createLogoutRateLimitMiddleware, createTokenRevokeRateLimitMiddleware, createEmailVerificationRateLimitMiddleware, createResendVerificationRateLimitMiddleware, } from '../middleware/rate-limit.middleware.js';
import { requireAuth, requireGlobalAdmin } from '../middleware/authorization.js';
export async function registerAuthRoutes(server) {
    const authController = server
        .authController;
    const oauthController = server
        .oauthController;
    if (!authController) {
        throw new Error('AuthController not found on server instance');
    }
    if (!oauthController) {
        throw new Error('OAuthController not found on server instance');
    }
    // Get rate limiter from server if available
    const rateLimiter = server.rateLimiter;
    // Create rate limit middlewares if rate limiter is available
    const loginRateLimit = rateLimiter ? createLoginRateLimitMiddleware(rateLimiter) : undefined;
    const passwordResetRateLimit = rateLimiter ? createPasswordResetRateLimitMiddleware(rateLimiter) : undefined;
    const registrationRateLimit = rateLimiter ? createRegistrationRateLimitMiddleware(rateLimiter) : undefined;
    const tokenRefreshRateLimit = rateLimiter ? createTokenRefreshRateLimitMiddleware(rateLimiter) : undefined;
    const logoutRateLimit = rateLimiter ? createLogoutRateLimitMiddleware(rateLimiter) : undefined;
    const tokenRevokeRateLimit = rateLimiter ? createTokenRevokeRateLimitMiddleware(rateLimiter) : undefined;
    const emailVerificationRateLimit = rateLimiter ? createEmailVerificationRateLimitMiddleware(rateLimiter) : undefined;
    const resendVerificationRateLimit = rateLimiter ? createResendVerificationRateLimitMiddleware(rateLimiter) : undefined;
    // Registration with rate limiting
    server.post('/auth/register', {
        schema: registerSchema,
        preHandler: registrationRateLimit ? [registrationRateLimit] : undefined,
    }, (request, reply) => authController.register(request, reply));
    // Login with rate limiting
    server.post('/auth/login', {
        schema: loginSchema,
        preHandler: loginRateLimit ? [loginRateLimit] : undefined,
    }, (request, reply) => authController.login(request, reply));
    // Email verification with rate limiting
    server.get('/auth/verify-email/:token', {
        schema: verifyEmailSchema,
        preHandler: emailVerificationRateLimit ? [emailVerificationRateLimit] : undefined,
    }, (request, reply) => authController.verifyEmail(request, reply));
    // Resend verification email with rate limiting
    server.post('/auth/resend-verification', {
        schema: resendVerificationSchema,
        preHandler: resendVerificationRateLimit ? [resendVerificationRateLimit] : undefined,
    }, (request, reply) => authController.resendVerificationEmail(request, reply));
    // Forgot password with rate limiting
    server.post('/auth/forgot-password', {
        schema: forgotPasswordSchema,
        preHandler: passwordResetRateLimit ? [passwordResetRateLimit] : undefined,
    }, (request, reply) => authController.forgotPassword(request, reply));
    server.post('/auth/reset-password', { schema: resetPasswordSchema }, (request, reply) => authController.resetPassword(request, reply));
    // Token refresh with rate limiting
    server.post('/auth/refresh', {
        schema: refreshTokenSchema,
        preHandler: tokenRefreshRateLimit ? [tokenRefreshRateLimit] : undefined,
    }, (request, reply) => authController.refreshToken(request, reply));
    // Logout with rate limiting
    server.post('/auth/logout', {
        preHandler: logoutRateLimit ? [logoutRateLimit] : undefined,
    }, (request, reply) => authController.logout(request, reply));
    // Token revocation with rate limiting
    server.post('/auth/revoke', {
        schema: revokeTokenSchema,
        preHandler: tokenRevokeRateLimit ? [tokenRevokeRateLimit] : undefined,
    }, (request, reply) => authController.revokeToken(request, reply));
    server.post('/auth/introspect', { schema: introspectTokenSchema }, (request, reply) => authController.introspectToken(request, reply));
    server.post('/auth/mfa/verify', { schema: mfaChallengeVerifySchema }, (request, reply) => authController.completeMFAChallenge(request, reply));
    server.get('/auth/me', { schema: getProfileSchema }, (request, reply) => authController.getProfile(request, reply));
    server.patch('/auth/me', { schema: updateProfileSchema }, (request, reply) => authController.updateProfile(request, reply));
    server.get('/auth/tenants', { schema: listUserTenantsSchema }, (request, reply) => authController.listUserTenants(request, reply));
    server.patch('/auth/default-tenant', { schema: updateDefaultTenantSchema }, (request, reply) => authController.updateDefaultTenant(request, reply));
    server.post('/auth/switch-tenant', { schema: switchTenantSchema }, (request, reply) => authController.switchTenant(request, reply));
    // Pre-registration check endpoint - determines registration flow based on email
    server.post('/auth/check-registration', { schema: checkRegistrationSchema }, (request, reply) => authController.checkRegistration(request, reply));
    // OAuth routes are registered separately in `oauth.routes.ts` to avoid duplication
    // Impersonation (Global Admin only)
    server.post('/auth/impersonate', {
        schema: impersonateSchema,
        onRequest: [server.authenticate, requireAuth(), requireGlobalAdmin()],
    }, (request, reply) => authController.impersonate(request, reply));
    server.log.info('Authentication routes registered');
}
//# sourceMappingURL=auth.routes.js.map