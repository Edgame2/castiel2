/**
 * Rate Limit Middleware
 * Fastify middleware for rate limiting requests
 */
/**
 * Default identifier extractor - uses email from body or IP address
 */
function defaultGetIdentifier(request) {
    const body = request.body;
    // Try to get email from body (for login/registration)
    if (body?.email) {
        return `email:${body.email.toLowerCase()}`;
    }
    // Fall back to IP address
    return `ip:${request.ip}`;
}
/**
 * Default rate limit handler
 */
async function defaultOnRateLimited(_request, reply, result) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    reply
        .status(429)
        .header('Retry-After', retryAfter.toString())
        .header('X-RateLimit-Reset', result.resetAt.toString())
        .send({
        error: 'Too Many Requests',
        message: result.blockExpiresAt
            ? 'Too many failed attempts. Please try again later.'
            : 'Rate limit exceeded. Please slow down.',
        retryAfter,
        resetAt: new Date(result.resetAt).toISOString(),
    });
}
/**
 * Create rate limit middleware for a specific action
 */
export function createRateLimitMiddleware(rateLimiter, options) {
    const getIdentifier = options.getIdentifier || defaultGetIdentifier;
    const onRateLimited = options.onRateLimited || defaultOnRateLimited;
    return async function rateLimitMiddleware(request, reply) {
        const identifier = getIdentifier(request);
        const result = await rateLimiter.checkAndRecord(options.action, identifier);
        // Add rate limit headers
        reply.header('X-RateLimit-Remaining', result.remaining.toString());
        reply.header('X-RateLimit-Reset', result.resetAt.toString());
        if (!result.allowed) {
            await onRateLimited(request, reply, result);
            return;
        }
    };
}
/**
 * Create rate limit check middleware (doesn't record, just checks)
 */
export function createRateLimitCheckMiddleware(rateLimiter, options) {
    const getIdentifier = options.getIdentifier || defaultGetIdentifier;
    const onRateLimited = options.onRateLimited || defaultOnRateLimited;
    return async function rateLimitCheckMiddleware(request, reply) {
        const identifier = getIdentifier(request);
        const result = await rateLimiter.check(options.action, identifier);
        // Add rate limit headers
        reply.header('X-RateLimit-Remaining', result.remaining.toString());
        reply.header('X-RateLimit-Reset', result.resetAt.toString());
        if (!result.allowed) {
            await onRateLimited(request, reply, result);
            return;
        }
    };
}
/**
 * Register rate limiter on Fastify instance
 */
export function registerRateLimiter(server, rateLimiter) {
    server.rateLimiter = rateLimiter;
}
/**
 * Reset rate limit after successful operation
 * Use this after successful login to clear failed attempt counts
 */
export async function resetRateLimit(rateLimiter, action, identifier) {
    await rateLimiter.reset(action, identifier);
}
/**
 * Pre-configured middleware for login rate limiting
 */
export function createLoginRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'login',
        getIdentifier: (request) => {
            const body = request.body;
            // Rate limit by both email and IP
            const email = body?.email?.toLowerCase() || 'unknown';
            return `login:${email}:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'login_rate_limited',
                email: request.body?.email,
                ip: request.ip,
                retryAfter,
            }, 'Login rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many login attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for password reset rate limiting
 */
export function createPasswordResetRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'passwordReset',
        getIdentifier: (request) => {
            const body = request.body;
            const email = body?.email?.toLowerCase() || 'unknown';
            return `password_reset:${email}:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'password_reset_rate_limited',
                email: request.body?.email,
                ip: request.ip,
                retryAfter,
            }, 'Password reset rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many password reset attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for registration rate limiting
 */
export function createRegistrationRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'registration',
        getIdentifier: (request) => {
            const body = request.body;
            const email = body?.email?.toLowerCase() || 'unknown';
            return `registration:${email}:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'registration_rate_limited',
                email: request.body?.email,
                ip: request.ip,
                retryAfter,
            }, 'Registration rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many registration attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for user connection operations rate limiting
 */
export function createUserConnectionRateLimitMiddleware(rateLimiter, action) {
    return createRateLimitMiddleware(rateLimiter, {
        action,
        getIdentifier: (request) => {
            const user = request.user;
            const userId = user?.id || 'anonymous';
            const params = request.params;
            // Rate limit by user ID and integration ID to prevent abuse
            return `${action}:${userId}:${params.id || 'unknown'}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: `${action}_rate_limited`,
                userId: request.user?.id,
                integrationId: request.params?.id,
                ip: request.ip,
                retryAfter,
            }, `${action} rate limit exceeded`);
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: `Too many ${action.replace('userConnection', '').toLowerCase()} attempts. Please wait before trying again.`,
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for user connection test rate limiting (more restrictive)
 */
export function createUserConnectionTestRateLimitMiddleware(rateLimiter) {
    return createUserConnectionRateLimitMiddleware(rateLimiter, 'userConnectionTest');
}
/**
 * Pre-configured middleware for user connection create rate limiting
 */
export function createUserConnectionCreateRateLimitMiddleware(rateLimiter) {
    return createUserConnectionRateLimitMiddleware(rateLimiter, 'userConnectionCreate');
}
/**
 * Pre-configured middleware for user connection update rate limiting
 */
export function createUserConnectionUpdateRateLimitMiddleware(rateLimiter) {
    return createUserConnectionRateLimitMiddleware(rateLimiter, 'userConnectionUpdate');
}
/**
 * Pre-configured middleware for user connection delete rate limiting
 */
export function createUserConnectionDeleteRateLimitMiddleware(rateLimiter) {
    return createUserConnectionRateLimitMiddleware(rateLimiter, 'userConnectionDelete');
}
/**
 * Pre-configured middleware for AI Insights chat rate limiting (per user)
 */
export function createAIInsightsChatRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsChat',
        getIdentifier: (request) => {
            const user = request.user;
            const userId = user?.userId || user?.id || 'anonymous';
            return `ai_insights_chat:user:${userId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_chat_rate_limited',
                userId: request.user?.userId || request.user?.id,
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights chat rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded for AI chat. Please slow down.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for AI Insights chat rate limiting (per tenant)
 */
export function createAIInsightsChatTenantRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsChatTenant',
        getIdentifier: (request) => {
            const user = request.user;
            const tenantId = user?.tenantId || 'anonymous';
            return `ai_insights_chat:tenant:${tenantId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_chat_tenant_rate_limited',
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights chat tenant rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Tenant rate limit exceeded for AI chat. Please contact support if you need higher limits.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for AI Insights generate rate limiting (per user)
 */
export function createAIInsightsGenerateRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsGenerate',
        getIdentifier: (request) => {
            const user = request.user;
            const userId = user?.userId || user?.id || 'anonymous';
            return `ai_insights_generate:user:${userId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_generate_rate_limited',
                userId: request.user?.userId || request.user?.id,
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights generate rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded for AI insights generation. Please slow down.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for AI Insights generate rate limiting (per tenant)
 */
export function createAIInsightsGenerateTenantRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsGenerateTenant',
        getIdentifier: (request) => {
            const user = request.user;
            const tenantId = user?.tenantId || 'anonymous';
            return `ai_insights_generate:tenant:${tenantId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_generate_tenant_rate_limited',
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights generate tenant rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Tenant rate limit exceeded for AI insights generation. Please contact support if you need higher limits.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for AI Insights quick rate limiting (per user)
 */
export function createAIInsightsQuickRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsQuick',
        getIdentifier: (request) => {
            const user = request.user;
            const userId = user?.userId || user?.id || 'anonymous';
            return `ai_insights_quick:user:${userId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_quick_rate_limited',
                userId: request.user?.userId || request.user?.id,
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights quick rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded for quick insights. Please slow down.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for AI Insights quick rate limiting (per tenant)
 */
export function createAIInsightsQuickTenantRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'aiInsightsQuickTenant',
        getIdentifier: (request) => {
            const user = request.user;
            const tenantId = user?.tenantId || 'anonymous';
            return `ai_insights_quick:tenant:${tenantId}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'ai_insights_quick_tenant_rate_limited',
                tenantId: request.user?.tenantId,
                ip: request.ip,
                retryAfter,
            }, 'AI Insights quick tenant rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Tenant rate limit exceeded for quick insights. Please contact support if you need higher limits.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for token refresh rate limiting
 */
export function createTokenRefreshRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'tokenRefresh',
        getIdentifier: (request) => {
            // Rate limit by IP address to prevent abuse
            return `token_refresh:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'token_refresh_rate_limited',
                ip: request.ip,
                retryAfter,
            }, 'Token refresh rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many token refresh attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for logout rate limiting
 */
export function createLogoutRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'logout',
        getIdentifier: (request) => {
            // Rate limit by IP address to prevent DoS
            return `logout:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'logout_rate_limited',
                ip: request.ip,
                retryAfter,
            }, 'Logout rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many logout attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for token revocation rate limiting
 */
export function createTokenRevokeRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'tokenRevoke',
        getIdentifier: (request) => {
            // Rate limit by IP address
            return `token_revoke:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'token_revoke_rate_limited',
                ip: request.ip,
                retryAfter,
            }, 'Token revocation rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many token revocation attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for email verification rate limiting
 */
export function createEmailVerificationRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'emailVerification',
        getIdentifier: (request) => {
            // Rate limit by token from URL params
            const params = request.params;
            const token = params?.token || 'unknown';
            // Use first 8 chars of token as identifier (prevents enumeration while limiting abuse)
            return `email_verification:${token.substring(0, 8)}:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'email_verification_rate_limited',
                ip: request.ip,
                retryAfter,
            }, 'Email verification rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many email verification attempts. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
/**
 * Pre-configured middleware for resend verification email rate limiting
 */
export function createResendVerificationRateLimitMiddleware(rateLimiter) {
    return createRateLimitMiddleware(rateLimiter, {
        action: 'resendVerification',
        getIdentifier: (request) => {
            const body = request.body;
            const email = body?.email?.toLowerCase() || 'unknown';
            return `resend_verification:${email}:${request.ip}`;
        },
        onRateLimited: async (request, reply, result) => {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            request.log.warn({
                action: 'resend_verification_rate_limited',
                email: request.body?.email,
                ip: request.ip,
                retryAfter,
            }, 'Resend verification rate limit exceeded');
            reply
                .status(429)
                .header('Retry-After', retryAfter.toString())
                .header('X-RateLimit-Reset', result.resetAt.toString())
                .send({
                error: 'Too Many Requests',
                message: 'Too many verification email requests. Please wait before trying again.',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            });
        },
    });
}
//# sourceMappingURL=rate-limit.middleware.js.map