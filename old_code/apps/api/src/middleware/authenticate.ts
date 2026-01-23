import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser, AuthenticatedRequest, JWTPayload } from '../types/auth.types.js';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
import { UnauthorizedError } from './error-handler.js';
import { config } from '../config/env.js';

export const mapPayloadToAuthUser = (payload: JWTPayload): AuthUser => {
  return {
    id: payload.sub,
    email: payload.email,
    tenantId: payload.tenantId,
    roles: payload.roles && payload.roles.length > 0
      ? payload.roles
      : payload.role
        ? [payload.role]
        : [],
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    iat: payload.iat,
    exp: payload.exp,
  };
};

/**
 * Authentication middleware
 * Validates JWT tokens and injects user context
 */
export function authenticate(tokenCache: TokenValidationCacheService | null) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authStartTime = Date.now();
    // request.log may be undefined in some contexts (e.g., during route registration)
    if (request.log) {
      request.log.debug({ url: request.url, method: request.method }, 'Authentication started');
    }
    
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Missing authorization header');
      }

      // Parse Bearer token
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Invalid authorization header format');
      }

      const token = parts[1];

        // Block explicitly blacklisted tokens (e.g., after tenant switch or logout)
        const cacheManager = (request.server as any)?.cacheManager;
        if (cacheManager?.blacklist) {
          const revoked = await cacheManager.blacklist.isTokenBlacklisted(token);
          if (revoked) {
            throw new UnauthorizedError('Token has been revoked');
          }
        }

      // Try to get from cache first
      let user: AuthUser | null = null;
      let fromCache = false;

      // Token validation cache: Disabled via feature flag for backward compatibility
      if (tokenCache && config.jwt.validationCacheEnabled !== false) {
        const startTime = Date.now();
        
        // Add timeout protection for cache lookup
        const cachePromise = tokenCache.getCachedValidation(token);
        const timeoutPromise = new Promise<{ valid: boolean; user?: AuthUser } | null>((resolve) =>
          setTimeout(() => {
            const duration = Date.now() - startTime;
            if (request.log) {
              request.log.warn({ duration }, 'Cache lookup timeout after 5s, proceeding to JWT verification');
            }
            resolve(null);
          }, 5000) // 5 second timeout for cache
        );

        const cached = await Promise.race([cachePromise, timeoutPromise]);
        const duration = Date.now() - startTime;

        if (cached && cached.valid && cached.user) {
          user = cached.user;
          fromCache = true;
          if (request.log) {
            request.log.debug({ duration }, 'Token validation from cache');
          }
        } else if (duration > 1000) {
          if (request.log) {
            request.log.warn({ duration, cached: !!cached }, 'Slow cache lookup');
          }
        }
      }

      // If not in cache, validate locally
      if (!user) {
        if (request.log) {
          request.log.debug({ tokenLength: token.length }, 'Starting JWT verification');
        }
        const startTime = Date.now();
        
        // Check if JWT plugin is available
        const jwtPlugin = (request.server as any).jwt;
        if (!jwtPlugin) {
          if (request.log) {
            request.log.error('JWT plugin not available on server');
          }
          throw new UnauthorizedError('JWT plugin not configured');
        }
        
        let payload: JWTPayload;
        
        try {
          // Add timeout protection for JWT verification
          // Use jwt.verify directly with the extracted token
          const verifyPromise = (async () => {
            if (request.log) {
              request.log.debug('Calling jwt.verify');
            }
            try {
              const decoded = jwtPlugin.verify(token) as JWTPayload;
              if (request.log) {
                request.log.debug({ 
                  type: decoded.type, 
                  sub: decoded.sub, 
                  tenantId: decoded.tenantId 
                }, 'jwt.verify completed successfully');
              }
              return decoded;
            } catch (verifyError: unknown) {
              const errorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError);
              const errorName = verifyError && typeof verifyError === 'object' && 'name' in verifyError ? (verifyError as { name?: string }).name : undefined;
              if (request.log) {
                request.log.error({ 
                  error: errorMessage, 
                  name: errorName 
                }, 'jwt.verify failed');
              }
              throw verifyError;
            }
          })();
          
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => {
              const duration = Date.now() - startTime;
              if (request.log) {
                request.log.error({ duration }, 'JWT verification timeout after 10s');
              }
              reject(new UnauthorizedError('Token validation timeout'));
            }, 10000) // 10 second timeout
          );

          payload = await Promise.race([verifyPromise, timeoutPromise]);
        } catch (jwtError: unknown) {
          const duration = Date.now() - startTime;
          const errorMessage = jwtError instanceof Error ? jwtError.message : String(jwtError);
          const errorName = jwtError && typeof jwtError === 'object' && 'name' in jwtError ? (jwtError as { name?: string }).name : undefined;
          if (request.log) {
            request.log.error({
              error: errorMessage,
              name: errorName,
              duration,
            });
          }
          
          // Provide more specific error messages
          if (errorMessage?.includes('expired') || errorName === 'TokenExpiredError') {
            throw new UnauthorizedError('Token has expired');
          }
          if (errorMessage?.includes('invalid') || errorName === 'JsonWebTokenError') {
            throw new UnauthorizedError('Invalid authentication token');
          }
          if (errorMessage?.includes('secret') || errorMessage?.includes('signature')) {
            throw new UnauthorizedError('Token signature verification failed');
          }
          
          // Re-throw if it's already an UnauthorizedError
          if (jwtError instanceof UnauthorizedError) {
            throw jwtError;
          }
          
          // Otherwise wrap it with generic message to avoid leaking sensitive details
          throw new UnauthorizedError('JWT verification failed');
        }

        const duration = Date.now() - startTime;
        if (request.log) {
          request.log.debug({ duration, payloadType: payload?.type }, 'JWT verification completed');
        }

        if (duration > 1000) {
          if (request.log) {
            request.log.warn({ duration }, 'Slow JWT verification');
          }
        }

        if (!payload || payload.type !== 'access') {
          throw new UnauthorizedError(`Invalid token type: expected 'access', got '${payload?.type || 'undefined'}'`);
        }

        user = mapPayloadToAuthUser(payload);

        // Cache the validation result (non-blocking)
        if (tokenCache) {
          tokenCache.setCachedValidation(token, { valid: true, user }).catch(err => {
            if (request.log) {
              request.log.warn({ err }, 'Failed to cache token validation');
            }
          });
        }

        if (request.log) {
          request.log.debug({ duration }, 'Token validated locally');
        }
      }

      // Enforce tenant isolation if caller specifies tenant context
      const headerTenant = (request.headers['x-tenant-id'] || request.headers['tenant-id']) as string | undefined;
      const paramTenant = (request.params as any)?.tenantId as string | undefined;
      const requestedTenant = headerTenant || paramTenant;

      if (requestedTenant && requestedTenant !== user.tenantId) {
        throw new UnauthorizedError('Token tenant does not match requested tenant');
      }

      // Inject user into request (both .user and .auth for compatibility)
      (request as AuthenticatedRequest).user = user;
      (request as any).auth = user;

      // Log authentication
      const authEndTime = Date.now();
      if (request.log) {
        request.log.debug({ 
          url: request.url, 
          duration: authEndTime - authStartTime, 
          userId: user.id 
        }, 'Authentication completed');
        request.log.info({
          userId: user.id,
          tenantId: user.tenantId,
          fromCache,
        }, 'Request authenticated');
      }

    } catch (error: unknown) {
      const authEndTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : 'Error';
      const errorStack = error instanceof Error ? error.stack?.substring(0, 200) : undefined;
      
      if (request.log) {
        request.log.error({ 
          url: request.url, 
          duration: authEndTime - authStartTime, 
          error: errorMessage,
          errorName,
          stack: errorStack
        }, 'Authentication error');
      }
      
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      // Log and wrap other errors with more details
      if (request.log) {
        request.log.error({ 
          err: error instanceof Error ? error : new Error(errorMessage),
          errorMessage,
          errorName,
          url: request.url
        }, 'Authentication error');
      }
      
      // Include the actual error message in the response for debugging
      const message = errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('expired')
        ? errorMessage
        : `Authentication failed: ${errorMessage}`;
      
      throw new UnauthorizedError(message);
    }
  };
}

/**
 * Optional authentication middleware
 * Validates token if present, but doesn't require it
 */
export function optionalAuthenticate(tokenCache: TokenValidationCacheService | null) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return; // No token provided, continue without auth
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return; // Invalid format, continue without auth
      }

      const token = parts[1];

      // Try cache first
      let user: AuthUser | null = null;

      if (tokenCache) {
        const cached = await tokenCache.getCachedValidation(token);
        if (cached && cached.valid && cached.user) {
          user = cached.user;
        }
      }

      // If not in cache, validate locally
      if (!user) {
        try {
          const payload = (await (request as any).jwtVerify({ token })) as JWTPayload;

          if (payload && payload.type === 'access') {
            user = mapPayloadToAuthUser(payload);

            if (tokenCache) {
              await tokenCache.setCachedValidation(token, { valid: true, user });
            }
          }
        } catch (jwtError: unknown) {
          // JWT verification failed - log but don't throw for optional auth
          const errorMessage = jwtError instanceof Error ? jwtError.message : String(jwtError);
          const errorName = jwtError && typeof jwtError === 'object' && 'name' in jwtError ? (jwtError as { name?: string }).name : undefined;
          if (request.log) {
            request.log.debug({ 
              err: jwtError instanceof Error ? jwtError : new Error(errorMessage),
              errorMessage,
              errorName 
            }, 'Optional JWT verification failed');
          }
          // Continue without authentication
          return;
        }
      }

      // Blacklist check for optional auth
      const cacheManager = (request.server as any)?.cacheManager;
      if (cacheManager?.blacklist) {
        const revoked = await cacheManager.blacklist.isTokenBlacklisted(token);
        if (revoked) {
          return; // treat as unauthenticated
        }
      }

      // Inject user if valid (both .user and .auth for compatibility)
      if (user) {
        (request as AuthenticatedRequest).user = user;
        (request as any).auth = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      if (request.log) {
        request.log.debug({ err: error }, 'Optional authentication failed');
      }
    }
  };
}

/**
 * Extract user from authenticated request
 * @param request Fastify request
 * @returns AuthUser or throws error
 */
export function getUser(request: FastifyRequest): AuthUser {
  const user = (request as AuthenticatedRequest).user;

  if (!user) {
    throw new UnauthorizedError('User not authenticated');
  }

  return user;
}

/**
 * Check if request is authenticated
 * @param request Fastify request
 * @returns true if authenticated
 */
export function isAuthenticated(request: FastifyRequest): boolean {
  return !!(request as AuthenticatedRequest).user;
}
