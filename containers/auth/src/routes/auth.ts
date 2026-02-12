/**
 * Authentication Routes
 * Per ModuleImplementationGuide Section 7
 * 
 * Migrated from server/src/routes/auth.ts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabaseClient, tenantEnforcementMiddleware } from '@coder/shared';
import { getGoogleUserInfo } from '../services/providers/GoogleOAuth';
import { getGitHubUserInfo } from '../services/providers/GitHubOAuth';
import { optionalAuth, authenticateRequest } from '../middleware/auth';
import { hashPassword, verifyPassword, validatePassword as validatePasswordUtils } from '../utils/passwordUtils';
import { recordLoginAttempt as recordLoginAttemptLegacy, isAccountLocked } from '../services/LoginAttemptService';
import { recordLoginAttempt as recordLoginHistory } from '../services/LoginHistoryService';
import { createSession, switchSessionOrganization, generateDeviceFingerprint } from '../services/SessionService';
import { getGeolocationFromIp } from '../utils/geolocationUtils';
import { changePasswordWithHistory, setPassword } from '../services/PasswordHistoryService';
import { requestPasswordReset, resetPasswordWithToken } from '../services/PasswordResetService';
import { linkGoogleProvider, unlinkProvider, getLinkedProviders, type AuthProvider } from '../services/AuthProviderService';
import { sendVerificationEmail, verifyEmailWithToken, verifyEmail } from '../services/EmailVerificationService';
import { generateUsername } from '../utils/stringUtils';
import { log } from '../utils/logger';
import { publishEventSafely, extractEventMetadata, createBaseEvent } from '../events/publishers/AuthEventPublisher';
import type { AuthEvent } from '../types/events';
import { loadConfig } from '../config';
import type { AuthConfig } from '../types/config.types';
import { getLoggingService } from '../services/LoggingService';
import { getAccountService } from '../services/AccountService';
import { generateSAMLRequest, processSAMLResponse } from '../services/SAMLHandler';
import { getSSOConfigurationService, type SSOProvider } from '../services/SSOConfigurationService';
import { requirePermission } from '../middleware/rbac';
import { logAuditAction } from '../middleware/auditLogging';
import { randomUUID } from 'crypto';
import { redis } from '../utils/redis';
import { MfaService } from '../services/MfaService';

/**
 * Extract token from request (helper function for refresh endpoint)
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies
  const cookieToken = (request as any).cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

interface GoogleCallbackQuery {
  code?: string;
  error?: string;
}

export async function setupAuthRoutes(fastify: FastifyInstance, config?: AuthConfig): Promise<void> {
  const routeConfig = config || loadConfig();
  log.info('Registering auth routes', { service: 'auth' });
  
  // Setup OAuth providers if configured
  if (routeConfig.oauth?.google?.enabled && routeConfig.oauth.google.client_id && routeConfig.oauth.google.client_secret) {
    const { setupGoogleOAuth } = await import('../services/providers/GoogleOAuth');
    setupGoogleOAuth(fastify, {
      clientId: routeConfig.oauth.google.client_id,
      clientSecret: routeConfig.oauth.google.client_secret,
      redirectUri: routeConfig.oauth.google.redirect_uri || (routeConfig.server.base_url 
        ? `${routeConfig.server.base_url}/api/v1/auth/google/callback`
        : `http://localhost:${routeConfig.server.port}/api/v1/auth/google/callback`),
    });
  }

  if (routeConfig.oauth?.github?.enabled && routeConfig.oauth.github.client_id && routeConfig.oauth.github.client_secret) {
    const { setupGitHubOAuth } = await import('../services/providers/GitHubOAuth');
    setupGitHubOAuth(fastify, {
      clientId: routeConfig.oauth.github.client_id,
      clientSecret: routeConfig.oauth.github.client_secret,
      redirectUri: routeConfig.oauth.github.redirect_uri || (routeConfig.server.base_url 
        ? `${routeConfig.server.base_url}/api/v1/auth/oauth/github/callback`
        : `http://localhost:${routeConfig.server.port}/api/v1/auth/oauth/github/callback`),
    });
  }

  // OAuth callback - Google
  fastify.get(
    '/api/v1/auth/google/callback',
    async (request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>, reply: FastifyReply) => {
      try {
        // Check if Google OAuth is configured
        if (!(fastify as any).googleOAuth2) {
          reply.code(503).send({ 
            error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
          });
          return;
        }
        
        if (request.query.error) {
          reply.code(400).send({ error: request.query.error });
          return;
        }
        const { token } = await (fastify as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, reply);
        if (!token.access_token) {
          reply.code(400).send({ error: 'Failed to get access token' });
          return;
        }

        // Get user info from Google
        const googleUser = await getGoogleUserInfo(token.access_token);
        
        if (!googleUser || !googleUser.id || !googleUser.email) {
          reply.code(400).send({ error: 'Invalid user data from Google' });
          return;
        }

        // Find or create user
        const db = getDatabaseClient() as any;
        let user = await db.user.findUnique({
          where: { googleId: googleUser.id },
        });

        if (!user) {
          // Check if user exists by email
          user = await db.user.findUnique({
            where: { email: googleUser.email },
          });

          if (user) {
            // Link Google provider to existing user
            await db.user.update({
              where: { id: user.id },
              data: {
                googleId: googleUser.id,
                picture: googleUser.picture || user.picture,
                authProviders: Array.from(new Set([...(user.authProviders as string[] || []), 'google'])),
              },
            });

            // Publish user.provider_linked event
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('auth.user.provider_linked', user.id, undefined, undefined, {
                userId: user.id,
                provider: 'google',
                providerUserId: googleUser.id,
              }),
            } as AuthEvent);
          } else {
            // Generate username
            const baseUsername = generateUsername(googleUser.email, googleUser.name);
            let username = baseUsername;
            let counter = 1;
            
            // Ensure username is unique
            while (await db.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${counter}`;
              counter++;
              if (counter > 1000) {
                username = `${baseUsername}-${Date.now()}`;
                break;
              }
            }
            
            // Create new user
            user = await db.user.create({
              data: {
                email: googleUser.email,
                username,
                name: googleUser.name || googleUser.email.split('@')[0],
                firstName: googleUser.name?.split(' ')[0],
                lastName: googleUser.name?.split(' ').slice(1).join(' '),
                picture: googleUser.picture,
                googleId: googleUser.id,
                isEmailVerified: googleUser.verified_email || false,
                isActive: true,
                authProviders: ['google'],
              },
            });

            // Create Account for user
            const accountService = getAccountService();
            await accountService.createUserAccount(
              user.id,
              user.username || user.email.split('@')[0],
              user.name || user.email
            );

            // Log user registration
            const loggingService = getLoggingService();
            await loggingService.logFromRequest(
              request,
              'user_registered',
              `New user registered via Google OAuth: ${user.email}`,
              {
                category: 'ACTION',
                severity: 'INFO',
                resourceType: 'user',
                resourceId: user.id,
                metadata: {
                  email: user.email,
                  provider: 'google',
                },
              }
            );

            // Publish user.registered event (triggers welcome email)
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('auth.user.registered', user.id, undefined, request.id, {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                provider: 'google',
              }),
            } as AuthEvent);
          }
        }

        // Create session
        const ipRaw = request.ip || request.headers['x-forwarded-for'] || 'unknown';
        const userAgentRaw = request.headers['user-agent'] || 'unknown';
        const ipAddress = Array.isArray(ipRaw) ? ipRaw[0] ?? null : (ipRaw ?? null);
        const userAgent = Array.isArray(userAgentRaw) ? userAgentRaw[0] ?? null : (userAgentRaw ?? null);
        const { accessToken, refreshToken, sessionId } = await createSession(
          user.id,
          null,
          false,
          ipAddress,
          userAgent,
          Array.isArray(request.headers['accept-language']) ? request.headers['accept-language'][0] : request.headers['accept-language'] || undefined,
          fastify
        );

        // Record login history
        const geo = await getGeolocationFromIp(ipAddress || '');
        const deviceFingerprint = generateDeviceFingerprint(userAgent || '', Array.isArray(request.headers['accept-language']) ? request.headers['accept-language'][0] ?? null : request.headers['accept-language'] || null);
        await recordLoginHistory(user.id, sessionId, 'google', ipAddress, userAgent, deviceFingerprint, geo.country || null, geo.city || null, true);

        // Log OAuth login
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'oauth_login',
          `User ${user.id} logged in via Google OAuth`,
          {
            category: 'ACCESS',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: user.id,
            metadata: {
              provider: 'google',
              sessionId,
            },
          }
        );

        // Publish auth.login.success event
        const session = await db.session.findUnique({
          where: { id: sessionId },
          select: { deviceName: true, deviceType: true, country: true, city: true, organizationId: true },
        });
        const metadata = extractEventMetadata(request);
        if (session) {
          metadata.deviceName = session.deviceName || undefined;
          metadata.deviceType = session.deviceType || undefined;
          metadata.country = session.country || undefined;
          metadata.city = session.city || undefined;
        }
        await publishEventSafely({
          ...createBaseEvent('auth.login.success', user.id, session?.organizationId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'google',
            organizationId: session?.organizationId || undefined,
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);
        // Also publish user.logged_in for backward compatibility
        await publishEventSafely({
          ...createBaseEvent('auth.user.logged_in', user.id, session?.organizationId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'google',
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);

        // Set cookies
        reply.setCookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Redirect to frontend with token
        const frontendUrl = routeConfig.services?.main_app?.url ?? routeConfig.frontend_url ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
        if (process.env.FRONTEND_PROTOCOL) {
          reply.redirect(`${process.env.FRONTEND_PROTOCOL}://auth/callback?token=${accessToken}`);
        } else if (frontendUrl) {
          reply.redirect(`${frontendUrl}?token=${accessToken}`);
        } else {
          reply.code(500).send({ error: 'Frontend URL not configured. Set MAIN_APP_URL or config.services.main_app.url (or frontend_url).' });
        }
      } catch (error: any) {
        log.error('OAuth callback error', error, { route: '/api/v1/auth/google/callback', service: 'auth' });
        const errorMessage = error?.message || error?.toString() || 'Authentication failed';
        const statusCode = error?.statusCode || 500;
        reply.code(statusCode).send({ 
          error: 'Authentication failed',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      }
    }
  );

  // GitHub OAuth callback
  fastify.get(
    '/api/v1/auth/oauth/github/callback',
    async (request: FastifyRequest<{ Querystring: GoogleCallbackQuery }>, reply: FastifyReply) => {
      try {
        // Check if GitHub OAuth is configured
        if (!(fastify as any).githubOAuth2) {
          reply.code(503).send({ 
            error: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.' 
          });
          return;
        }
        
        if (request.query.error) {
          reply.code(400).send({ error: request.query.error });
          return;
        }
        const { token } = await (fastify as any).githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, reply);
        if (!token.access_token) {
          reply.code(400).send({ error: 'Failed to get access token' });
          return;
        }

        // Get user info from GitHub
        const githubUser = await getGitHubUserInfo(token.access_token);
        
        if (!githubUser || !githubUser.id || !githubUser.email) {
          reply.code(400).send({ error: 'Invalid user data from GitHub' });
          return;
        }

        // Find or create user
        const db = getDatabaseClient() as any;
        const githubIdString = githubUser.id.toString();
        
        // First check by GitHub ID in UserAuthProvider
        let userAuthProvider = await db.userAuthProvider.findUnique({
          where: {
            provider_providerUserId: {
              provider: 'github',
              providerUserId: githubIdString,
            },
          },
          include: { user: true },
        });

        let user = userAuthProvider?.user;

        if (!user) {
          // Check if user exists by email
          user = await db.user.findUnique({
            where: { email: githubUser.email },
          });

          if (user) {
            // Link GitHub provider to existing user
            await db.userAuthProvider.create({
              data: {
                userId: user.id,
                provider: 'github',
                providerUserId: githubIdString,
                providerData: {
                  login: githubUser.login,
                  avatar_url: githubUser.avatar_url,
                  bio: githubUser.bio,
                  company: githubUser.company,
                  blog: githubUser.blog,
                  location: githubUser.location,
                },
                isPrimary: !user.passwordHash, // Primary if no password
              },
            });

            // Update auth providers array
            const currentProviders = (user.authProviders as string[]) || [];
            const updatedProviders = [...new Set([...currentProviders, 'github'])] as string[];
            
            user = await db.user.update({
              where: { id: user.id },
              data: {
                picture: githubUser.avatar_url || user.picture,
                avatarUrl: githubUser.avatar_url || user.avatarUrl,
                authProviders: updatedProviders,
              },
            });

            // Publish user.provider_linked event
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('auth.user.provider_linked', user.id, undefined, undefined, {
                userId: user.id,
                provider: 'github',
                providerUserId: githubIdString,
              }),
            } as AuthEvent);
          } else {
            // Generate username
            const baseUsername = generateUsername(githubUser.email, githubUser.login || githubUser.name);
            let username = baseUsername;
            let counter = 1;
            
            // Ensure username is unique
            while (await db.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${counter}`;
              counter++;
              if (counter > 1000) {
                username = `${baseUsername}-${Date.now()}`;
                break;
              }
            }
            
            // Create new user with auth provider
            user = await db.user.create({
              data: {
                email: githubUser.email,
                username,
                name: githubUser.name || githubUser.login,
                picture: githubUser.avatar_url,
                avatarUrl: githubUser.avatar_url,
                authProviders: {
                  create: {
                    provider: 'github',
                    providerUserId: githubIdString,
                    providerData: {
                      login: githubUser.login,
                      avatar_url: githubUser.avatar_url,
                      bio: githubUser.bio,
                      company: githubUser.company,
                      blog: githubUser.blog,
                      location: githubUser.location,
                    },
                    isPrimary: true,
                  },
                },
              },
            });

            // Update JSON field for backward compatibility
            await db.user.update({
              where: { id: user.id },
              data: {
                authProviders: ['github'] as any,
              },
            });
            
            // Create Account for user
            const accountService = getAccountService();
            await accountService.createUserAccount(
              user.id,
              user.username || user.email.split('@')[0],
              user.name || user.email
            );

            // Log user registration
            const loggingService = getLoggingService();
            await loggingService.logFromRequest(
              request,
              'user_registered',
              `New user registered via GitHub OAuth: ${user.email}`,
              {
                category: 'ACTION',
                severity: 'INFO',
                resourceType: 'user',
                resourceId: user.id,
                metadata: {
                  email: user.email,
                  provider: 'github',
                },
              }
            );

            // Publish user.registered event (triggers welcome email)
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('auth.user.registered', user.id, undefined, request.id, {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                provider: 'github',
              }),
            } as AuthEvent);
          }
        } else {
          // Update last used timestamp
          if (userAuthProvider) {
            await db.userAuthProvider.update({
              where: { id: userAuthProvider.id },
              data: { lastUsedAt: new Date() },
            });
          }
        }

        // Create session
        const ipRaw = request.ip || request.headers['x-forwarded-for'] || 'unknown';
        const userAgentRaw = request.headers['user-agent'] || 'unknown';
        const ipAddress = Array.isArray(ipRaw) ? ipRaw[0] ?? null : (ipRaw ?? null);
        const userAgent = Array.isArray(userAgentRaw) ? userAgentRaw[0] ?? null : (userAgentRaw ?? null);
        const { accessToken, refreshToken, sessionId } = await createSession(
          user.id,
          null,
          false,
          ipAddress,
          userAgent,
          Array.isArray(request.headers['accept-language']) ? request.headers['accept-language'][0] : request.headers['accept-language'] || undefined,
          fastify
        );

        // Record login history
        const geo = await getGeolocationFromIp(ipAddress || '');
        const deviceFingerprint = generateDeviceFingerprint(userAgent || '', Array.isArray(request.headers['accept-language']) ? request.headers['accept-language'][0] ?? null : request.headers['accept-language'] || null);
        await recordLoginHistory(user.id, sessionId, 'github', ipAddress, userAgent, deviceFingerprint, geo.country || null, geo.city || null, true);

        // Log OAuth login
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'oauth_login',
          `User ${user.id} logged in via Google OAuth`,
          {
            category: 'ACCESS',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: user.id,
            metadata: {
              provider: 'google',
              sessionId,
            },
          }
        );

        // Publish auth.login.success event
        const session = await db.session.findUnique({
          where: { id: sessionId },
          select: { deviceName: true, deviceType: true, country: true, city: true, organizationId: true },
        });
        const metadata = extractEventMetadata(request);
        if (session) {
          metadata.deviceName = session.deviceName || undefined;
          metadata.deviceType = session.deviceType || undefined;
          metadata.country = session.country || undefined;
          metadata.city = session.city || undefined;
        }
        await publishEventSafely({
          ...createBaseEvent('auth.login.success', user.id, session?.organizationId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'github',
            organizationId: session?.organizationId || undefined,
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);
        // Also publish user.logged_in for backward compatibility
        await publishEventSafely({
          ...createBaseEvent('auth.user.logged_in', user.id, session?.organizationId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'github',
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);

        // Set cookies
        reply.setCookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        // Redirect to frontend with token
        const frontendUrl = routeConfig.services?.main_app?.url ?? routeConfig.frontend_url ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
        if (process.env.FRONTEND_PROTOCOL) {
          reply.redirect(`${process.env.FRONTEND_PROTOCOL}://auth/callback?token=${accessToken}`);
        } else if (frontendUrl) {
          reply.redirect(`${frontendUrl}?token=${accessToken}`);
        } else {
          reply.code(500).send({ error: 'Frontend URL not configured. Set MAIN_APP_URL or config.services.main_app.url (or frontend_url).' });
        }
      } catch (error: any) {
        log.error('GitHub OAuth callback error', error, { route: '/api/v1/auth/oauth/github/callback', service: 'auth' });
        const errorMessage = error?.message || error?.toString() || 'Authentication failed';
        const statusCode = error?.statusCode || 500;
        reply.code(statusCode).send({ 
          error: 'Authentication failed',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
      }
    }
  );

  // Get current user
  fastify.get('/api/v1/auth/me', { preHandler: authenticateRequest }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const requestUser = (request as any).user;
      if (!requestUser || !requestUser.id) {
        log.error('Request user missing or invalid', undefined, { route: '/api/v1/auth/me', service: 'auth' });
        reply.code(401).send({ error: 'Not authenticated' });
        return;
      }
      log.debug('Fetching user from database', { route: '/api/v1/auth/me', userId: requestUser.id, service: 'auth' });
      const db = getDatabaseClient() as any;
      const user = await db.user.findUnique({
        where: { id: requestUser.id },
        include: {
          profile: true,
          competencies: {
            include: {
              competency: true,
            },
          },
        },
      });

      if (!user) {
        reply.code(404).send({ error: 'User not found' });
        return;
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        function: user.function,
        speciality: user.speciality,
        timezone: user.timezone,
        language: user.language,
        profile: user.profile,
        competencies: user.competencies.map((uc: { id: string; competency?: string; proficiency?: string }) => ({
          id: uc.id,
          competency: uc.competency,
          proficiency: uc.proficiency,
        })),
      };
    } catch (error: any) {
      log.error('Error getting current user', error, { route: '/api/v1/auth/me', service: 'auth' });
      reply.code(500).send({ error: 'Failed to get user information. Please try again.' });
      return;
    }
  });

  // MFA (guarded by features.multi_factor_auth)
  const mfaService = new MfaService();
  fastify.get(
    '/api/v1/auth/mfa/status',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const enrolled = await mfaService.isEnrolled(requestUser.id);
        return { enrolled };
      } catch (err: unknown) {
        log.error('MFA status error', err, { route: '/api/v1/auth/mfa/status', service: 'auth' });
        reply.code(500).send({ error: 'Failed to get MFA status' });
      }
    }
  );
  fastify.post(
    '/api/v1/auth/mfa/enroll',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const body = (request.body as { issuer?: string; accountName?: string }) ?? {};
        const { issuer, accountName } = body;
        const result = await mfaService.enroll(requestUser.id, issuer, accountName);
        return { secret: result.secret, provisioningUri: result.provisioningUri, label: result.label };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Enroll failed';
        if (message === 'MFA_ALREADY_ENROLLED') {
          reply.code(409).send({ error: 'MFA is already enrolled for this account' });
          return;
        }
        log.error('MFA enroll error', err, { route: '/api/v1/auth/mfa/enroll', service: 'auth' });
        reply.code(500).send({ error: 'Failed to enroll MFA' });
      }
    }
  );
  fastify.post(
    '/api/v1/auth/mfa/verify',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const code = (request.body as { code?: string })?.code?.trim();
        if (!code) {
          reply.code(400).send({ error: 'code is required' });
          return;
        }
        const valid = await mfaService.verify(requestUser.id, code);
        if (!valid) {
          reply.code(401).send({ error: 'Invalid or expired code' });
          return;
        }
        return { success: true };
      } catch (err: unknown) {
        log.error('MFA verify error', err, { route: '/api/v1/auth/mfa/verify', service: 'auth' });
        reply.code(500).send({ error: 'Verification failed' });
      }
    }
  );
  fastify.post(
    '/api/v1/auth/mfa/verify-backup',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const code = (request.body as { code?: string })?.code?.trim();
        if (!code) {
          reply.code(400).send({ error: 'code is required' });
          return;
        }
        const valid = await mfaService.verifyBackupCode(requestUser.id, code);
        if (!valid) {
          reply.code(401).send({ error: 'Invalid or already used backup code' });
          return;
        }
        return { success: true };
      } catch (err: unknown) {
        log.error('MFA verify-backup error', err, { route: '/api/v1/auth/mfa/verify-backup', service: 'auth' });
        reply.code(500).send({ error: 'Verification failed' });
      }
    }
  );
  fastify.post(
    '/api/v1/auth/mfa/disable',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const code = (request.body as { code?: string })?.code?.trim();
        if (!code) {
          reply.code(400).send({ error: 'code is required' });
          return;
        }
        const valid = await mfaService.verify(requestUser.id, code);
        if (!valid) {
          reply.code(401).send({ error: 'Invalid or expired code' });
          return;
        }
        await mfaService.disable(requestUser.id);
        return { success: true };
      } catch (err: unknown) {
        log.error('MFA disable error', err, { route: '/api/v1/auth/mfa/disable', service: 'auth' });
        reply.code(500).send({ error: 'Failed to disable MFA' });
      }
    }
  );
  fastify.post<{ Body: { name?: string; expiresInDays?: number } }>(
    '/api/v1/auth/api-keys',
    {
      preHandler: [authenticateRequest, tenantEnforcementMiddleware()],
      schema: {
        description: 'Create API key (JWT only; feature flag required)',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Key label' },
            expiresInDays: { type: 'number', description: 'Optional expiry in days' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              key: { type: 'string' },
              createdAt: { type: 'string' },
              expiresAt: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.api_keys) {
        reply.code(403).send({ error: 'API keys are not enabled' });
        return;
      }
      if ((request as any).apiKeyAuth) {
        reply.code(403).send({ error: 'Cannot create API keys when authenticated with an API key' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        const organizationId = (request as any).organizationId;
        const xTenantId = (request.headers['x-tenant-id'] as string)?.trim();
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const body = request.body as { name?: string; expiresInDays?: number };
        const name = body?.name?.trim();
        if (!name) {
          reply.code(400).send({ error: 'name is required' });
          return;
        }
        const tenantId = (request as any).tenantContext?.tenantId ?? organizationId ?? xTenantId ?? '';
        const { ApiKeyService } = await import('../services/ApiKeyService');
        const result = await new ApiKeyService().create(
          requestUser.id,
          tenantId,
          name,
          body?.expiresInDays
        );
        return result;
      } catch (err: unknown) {
        log.error('Create API key error', err, { route: '/api/v1/auth/api-keys', service: 'auth' });
        reply.code(500).send({ error: 'Failed to create API key' });
      }
    }
  );
  fastify.get(
    '/api/v1/auth/api-keys',
    {
      preHandler: [authenticateRequest, tenantEnforcementMiddleware()],
      schema: {
        description: 'List API keys for current user (feature flag required)',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    createdAt: { type: 'string' },
                    expiresAt: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.api_keys) {
        reply.code(403).send({ error: 'API keys are not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const { ApiKeyService } = await import('../services/ApiKeyService');
        const list = await new ApiKeyService().listByUser(requestUser.id);
        return { keys: list };
      } catch (err: unknown) {
        log.error('List API keys error', err, { route: 'GET /api/v1/auth/api-keys', service: 'auth' });
        reply.code(500).send({ error: 'Failed to list API keys' });
      }
    }
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/auth/api-keys/:id',
    {
      preHandler: [authenticateRequest, tenantEnforcementMiddleware()],
      schema: {
        description: 'Revoke an API key (own keys only; feature flag required)',
        tags: ['API Keys'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'API key id' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.api_keys) {
        reply.code(403).send({ error: 'API keys are not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        const id = (request.params as { id?: string })?.id?.trim();
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        if (!id) {
          reply.code(400).send({ error: 'Key id is required' });
          return;
        }
        const { ApiKeyService } = await import('../services/ApiKeyService');
        const revoked = await new ApiKeyService().revoke(id, requestUser.id);
        if (!revoked) {
          reply.code(404).send({ error: 'API key not found or you do not have permission to revoke it' });
          return;
        }
        return { success: true };
      } catch (err: unknown) {
        log.error('Revoke API key error', err, { route: 'DELETE /api/v1/auth/api-keys/:id', service: 'auth' });
        reply.code(500).send({ error: 'Failed to revoke API key' });
      }
    }
  );
  fastify.post(
    '/api/v1/auth/mfa/backup-codes/generate',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const requestUser = (request as any).user;
        if (!requestUser?.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }
        const code = (request.body as { code?: string })?.code?.trim();
        if (!code) {
          reply.code(400).send({ error: 'code is required' });
          return;
        }
        const valid = await mfaService.verify(requestUser.id, code);
        if (!valid) {
          reply.code(401).send({ error: 'Invalid or expired code' });
          return;
        }
        const codes = await mfaService.generateBackupCodes(requestUser.id);
        return { codes };
      } catch (err: unknown) {
        log.error('MFA backup codes generate error', err, { route: '/api/v1/auth/mfa/backup-codes/generate', service: 'auth' });
        reply.code(500).send({ error: 'Failed to generate backup codes' });
      }
    }
  );

  // Refresh token - uses session refresh
  fastify.post('/api/v1/auth/refresh', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const refreshToken = extractToken(request) || (request as any).cookies?.refreshToken;
      
      if (!refreshToken) {
        reply.code(401).send({ error: 'Refresh token required' });
        return;
      }

      const userAgent = request.headers['user-agent'] || null;
      const { refreshSession } = await import('../services/SessionService');
      const result = await refreshSession(refreshToken, userAgent, fastify);

      if (!result) {
        reply.code(401).send({ error: 'Invalid or expired refresh token' });
        return;
      }

      // Set cookies
      reply.setCookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return { token: result.accessToken };
    } catch (error: any) {
      log.error('Refresh token error', error, { route: '/api/v1/auth/refresh', service: 'auth' });
      reply.code(500).send({ error: 'Failed to refresh token' });
    }
  });

  // Logout — always clear cookies and return 200; revoke/log/event are best-effort
  fastify.post('/api/v1/auth/logout', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id;
      const sessionId = (request as any).sessionId;
      const organizationId = (request as any).organizationId;

      if (sessionId) {
        try {
          const { revokeSession } = await import('../services/SessionService');
          await revokeSession(sessionId);
        } catch (err: any) {
          log.warn('Logout: revokeSession failed (continuing)', { sessionId, error: err?.message, service: 'auth' });
        }
      }

      if (userId) {
        try {
          const loggingService = getLoggingService();
          await loggingService.logFromRequest(
            request,
            'logout',
            `User ${userId} logged out`,
            {
              category: 'ACCESS',
              severity: 'INFO',
              resourceType: 'user',
              resourceId: userId,
              metadata: {
                sessionId: sessionId || undefined,
                organizationId,
              },
            }
          );
        } catch (err: any) {
          log.warn('Logout: audit log failed (continuing)', { userId, error: err?.message, service: 'auth' });
        }

        try {
          await publishEventSafely({
            ...createBaseEvent('auth.user.logged_out', userId, organizationId, request.id, {
              userId,
              sessionId: sessionId || undefined,
              reason: 'user_initiated',
            }),
          } as AuthEvent);
        } catch (err: any) {
          log.warn('Logout: event publish failed (continuing)', { userId, error: err?.message, service: 'auth' });
        }
      }
    } catch (err: any) {
      log.warn('Logout: unexpected error (continuing)', { error: err?.message, service: 'auth' });
    } finally {
      reply.clearCookie('accessToken', { path: '/' });
      reply.clearCookie('refreshToken', { path: '/' });
    }
    return { message: 'Logged out successfully' };
  });

  // Register (email/password)
  fastify.post(
    '/api/v1/auth/register',
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
          firstName?: string;
          lastName?: string;
          name?: string;
          organizationId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password, firstName, lastName, name, organizationId } = request.body;

        // Validate input
        if (!email || !password) {
          reply.code(400).send({ error: 'Email and password are required' });
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          reply.code(400).send({ error: 'Invalid email format' });
          return;
        }

        // Validate password
        const passwordValidation = await validatePasswordUtils(password, {
          email,
          firstName,
          lastName,
        });

        if (!passwordValidation.valid) {
          reply.code(400).send({
            error: 'Password validation failed',
            errors: passwordValidation.errors,
          });
          return;
        }

        const db = getDatabaseClient() as any;

        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          reply.code(409).send({ error: 'User with this email already exists' });
          return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Generate username
        const displayName = name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];
        const baseUsername = generateUsername(email, displayName);
        let username = baseUsername;
        let counter = 1;
        
        // Ensure username is unique
        while (await db.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
          if (counter > 1000) {
            username = `${baseUsername}-${Date.now()}`;
            break;
          }
        }

        // Create user
        const user = await db.user.create({
          data: {
            email,
            username,
            passwordHash,
            firstName,
            lastName,
            name: displayName,
            isEmailVerified: false,
            isActive: true,
            authProviders: ['email'],
          },
        });
        
        // Create Account for user
        const accountService = getAccountService();
        await accountService.createUserAccount(user.id, username, displayName);

        // If organizationId provided, create membership
        let defaultOrgId = organizationId;
        if (organizationId) {
          // Verify organization exists
          const org = await db.organization.findUnique({
            where: { id: organizationId },
          });

          if (!org) {
            reply.code(404).send({ error: 'Organization not found' });
            return;
          }

          // Get default "Member" role for organization
          const memberRole = await db.role.findFirst({
            where: {
              organizationId,
              name: 'Member',
              isSystemRole: true,
            },
          });

          if (memberRole) {
            await db.organizationMembership.create({
              data: {
                userId: user.id,
                organizationId,
                roleId: memberRole.id,
                status: 'active',
                joinedAt: new Date(),
              },
            });
          }
        } else {
          // Create membership in default organization
          const defaultOrg = await db.organization.findFirst({
            where: { slug: 'default-org' },
          });

          if (defaultOrg) {
            defaultOrgId = defaultOrg.id;
            const memberRole = await db.role.findFirst({
              where: {
                organizationId: defaultOrg.id,
                name: 'Member',
                isSystemRole: true,
              },
            });

            if (memberRole) {
              await db.organizationMembership.create({
                data: {
                  userId: user.id,
                  organizationId: defaultOrg.id,
                  roleId: memberRole.id,
                  status: 'active',
                  joinedAt: new Date(),
                },
              });
            }
          }
        }

        // Create session
        const forwardedFor = request.headers['x-forwarded-for'];
        const ipAddress = request.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || null;
        const userAgentHeader = request.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || null;
        const acceptLanguageHeader = request.headers['accept-language'];
        const acceptLanguage = Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader || null;

        const { accessToken, refreshToken, sessionId } = await createSession(
          user.id,
          defaultOrgId ?? null,
          false,
          ipAddress,
          userAgent,
          acceptLanguage,
          fastify
        );

        // Set cookies
        reply.setCookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 8 * 60 * 60, // 8 hours
        });

        reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Record successful login attempt (legacy)
        await recordLoginAttemptLegacy(email, user.id, ipAddress, userAgent, true);

        // Log successful registration
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'user_registered',
          `New user registered: ${email}`,
          {
            category: 'ACTION',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: user.id,
            metadata: {
              email,
              username,
              organizationId: defaultOrgId || undefined,
            },
          }
        );

        // Publish user.registered event
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.user.registered', user.id, defaultOrgId || undefined, undefined, {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            provider: 'password',
            organizationId: defaultOrgId || undefined,
          }),
        } as AuthEvent);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          accessToken,
          refreshToken,
          sessionId,
        };
      } catch (error: any) {
        log.error('Registration error', error, { route: '/api/v1/auth/register', service: 'auth' });
        reply.code(500).send({
          error: 'Registration failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Login (email/password)
  fastify.post(
    '/api/v1/auth/login',
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
          rememberMe?: boolean;
          organizationId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password, rememberMe = false, organizationId } = request.body;

        // Validate input
        if (!email || !password) {
          reply.code(400).send({ error: 'Email and password are required' });
          return;
        }

        const forwardedFor = request.headers['x-forwarded-for'];
        const ipAddress = request.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || null;
        const userAgentHeader = request.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || null;
        const acceptLanguageHeader = request.headers['accept-language'];
        const acceptLanguage = Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader || null;

        // Check if account is locked
        const locked = await isAccountLocked(email);
        if (locked) {
          reply.code(423).send({
            error: 'Account is temporarily locked due to too many failed login attempts',
            message: 'Please try again later or reset your password',
          });
          return;
        }

        const db = getDatabaseClient() as any;

        // Find user
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            isActive: true,
            isEmailVerified: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        });

        // Always record login attempt (even if user doesn't exist - security)
        if (!user) {
          await recordLoginAttemptLegacy(email, null, ipAddress, userAgent, false);
          const geo = await getGeolocationFromIp(ipAddress || '');
          await recordLoginHistory(null, null, 'password', ipAddress, userAgent, null, geo.country || null, geo.city || null, false, 'User not found');
          // Publish auth.login.failed event
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.login.failed', undefined, undefined, undefined, {
              email,
              provider: 'password',
              reason: 'user_not_found',
            }),
          } as AuthEvent);
          reply.code(401).send({ error: 'Invalid email or password' });
          return;
        }

        // Check if user is active
        if (!user.isActive) {
          await recordLoginAttemptLegacy(email, user.id, ipAddress, userAgent, false);
          const geo = await getGeolocationFromIp(ipAddress || '');
          const deviceFingerprint = generateDeviceFingerprint(userAgent || '', acceptLanguage);
          await recordLoginHistory(user.id, null, 'password', ipAddress, userAgent, deviceFingerprint, geo.country || null, geo.city || null, false, 'Account deactivated');
          // Publish auth.login.failed event
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.login.failed', user.id, undefined, undefined, {
              userId: user.id,
              email,
              provider: 'password',
              reason: 'account_deactivated',
            }),
          } as AuthEvent);
          reply.code(403).send({ error: 'Account is deactivated' });
          return;
        }

        // Check if user has password set
        if (!user.passwordHash) {
          await recordLoginAttemptLegacy(email, user.id, ipAddress, userAgent, false);
          const geo = await getGeolocationFromIp(ipAddress || '');
          const deviceFingerprint = generateDeviceFingerprint(userAgent || '', acceptLanguage);
          await recordLoginHistory(user.id, null, 'password', ipAddress, userAgent, deviceFingerprint, geo.country || null, geo.city || null, false, 'No password set');
          // Publish auth.login.failed event
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.login.failed', user.id, undefined, undefined, {
              userId: user.id,
              email,
              provider: 'password',
              reason: 'no_password_set',
            }),
          } as AuthEvent);
          reply.code(401).send({
            error: 'No password set for this account',
            message: 'Please use OAuth login or reset your password',
          });
          return;
        }

        // Verify password
        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
          await recordLoginAttemptLegacy(email, user.id, ipAddress, userAgent, false);
          const geo = await getGeolocationFromIp(ipAddress || '');
          const deviceFingerprint = generateDeviceFingerprint(userAgent || '', acceptLanguage);
          await recordLoginHistory(user.id, null, 'password', ipAddress, userAgent, deviceFingerprint, geo.country || null, geo.city || null, false, 'Invalid password');
          // Log failed login attempt
          const loggingService = getLoggingService();
          await loggingService.logFromRequest(
            request,
            'login_failed',
            `Failed login attempt for user ${user.id} - invalid password`,
            {
              category: 'SECURITY',
              severity: 'WARN',
              resourceType: 'user',
              resourceId: user.id,
              metadata: {
                email,
                provider: 'password',
                reason: 'invalid_password',
              },
            }
          );

          // Publish auth.login.failed event
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.login.failed', user.id, undefined, request.id, {
              userId: user.id,
              email,
              provider: 'password',
              reason: 'invalid_password',
            }),
          } as AuthEvent);
          reply.code(401).send({ error: 'Invalid email or password' });
          return;
        }

        // Determine organization context
        let activeOrgId = organizationId || null;

        if (!activeOrgId) {
          // Get user's first active organization
          const membership = await db.organizationMembership.findFirst({
            where: {
              userId: user.id,
              status: 'active',
            },
            orderBy: { joinedAt: 'asc' },
            select: { organizationId: true },
          });

          if (membership) {
            activeOrgId = membership.organizationId;
          }
        } else {
          // Verify user is member of requested organization
          const membership = await db.organizationMembership.findFirst({
            where: {
              userId: user.id,
              organizationId: activeOrgId,
              status: 'active',
            },
          });

          if (!membership) {
            reply.code(403).send({ error: 'User is not a member of this organization' });
            return;
          }
        }

        // If MFA enabled and user has TOTP enrolled, require MFA step before creating session
        if (routeConfig.features?.multi_factor_auth) {
          const enrolled = await mfaService.isEnrolled(user.id);
          if (enrolled) {
            const mfaSessionId = randomUUID();
            const mfaPendingPayload = JSON.stringify({
              userId: user.id,
              rememberMe,
              organizationId: activeOrgId,
            });
            await redis.setex(`mfa_pending:${mfaSessionId}`, 300, mfaPendingPayload);
            reply.code(202).send({ requiresMfa: true, mfaSessionId });
            return;
          }
        }

        // Create session
        const { accessToken, refreshToken, sessionId } = await createSession(
          user.id,
          activeOrgId,
          rememberMe,
          ipAddress,
          userAgent,
          acceptLanguage,
          fastify
        );

        // Set cookies
        const accessTokenMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60; // 30 days or 8 hours
        reply.setCookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: accessTokenMaxAge,
        });

        reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60,
        });

        // Record successful login attempt (legacy)
        await recordLoginAttemptLegacy(email, user.id, ipAddress, userAgent, true);

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Log successful login
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'login',
          `User ${user.id} logged in successfully`,
          {
            category: 'ACCESS',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: user.id,
            metadata: {
              email,
              organizationId: activeOrgId,
              sessionId,
              provider: 'password',
            },
          }
        );

        // Publish auth.login.success and user.logged_in events
        const session = await db.session.findUnique({
          where: { id: sessionId },
          select: { deviceName: true, deviceType: true, country: true, city: true },
        });
        const metadata = extractEventMetadata(request);
        if (session) {
          metadata.deviceName = session.deviceName || undefined;
          metadata.deviceType = session.deviceType || undefined;
          metadata.country = session.country || undefined;
          metadata.city = session.city || undefined;
        }
        // Publish auth.login.success event
        await publishEventSafely({
          ...createBaseEvent('auth.login.success', user.id, activeOrgId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'password',
            organizationId: activeOrgId || undefined,
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);
        // Also publish user.logged_in event for backward compatibility
        await publishEventSafely({
          ...createBaseEvent('auth.user.logged_in', user.id, activeOrgId || undefined, undefined, {
            userId: user.id,
            sessionId,
            provider: 'password',
            deviceName: session?.deviceName,
            deviceType: session?.deviceType,
            country: session?.country,
            city: session?.city,
          }),
        } as AuthEvent);

        // Re-fetch user so response has latest isEmailVerified (e.g. after seed or verify-email)
        const freshUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, email: true, name: true, firstName: true, lastName: true, isEmailVerified: true },
        });
        const responseUser = freshUser ?? user;

        return {
          user: {
            id: responseUser.id,
            email: responseUser.email,
            name: responseUser.name,
            firstName: responseUser.firstName,
            lastName: responseUser.lastName,
            isEmailVerified: responseUser.isEmailVerified,
          },
          accessToken,
          refreshToken,
          sessionId,
          organizationId: activeOrgId,
        };
      } catch (error: any) {
        log.error('Login error', error, { route: '/api/v1/auth/login', service: 'auth' });
        reply.code(500).send({
          error: 'Login failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Complete login after MFA (TOTP or backup code)
  fastify.post(
    '/api/v1/auth/login/complete-mfa',
    async (
      request: FastifyRequest<{
        Body: { mfaSessionId: string; code: string };
      }>,
      reply: FastifyReply
    ) => {
      if (!routeConfig.features?.multi_factor_auth) {
        reply.code(403).send({ error: 'Multi-factor authentication is not enabled' });
        return;
      }
      try {
        const { mfaSessionId, code } = request.body || {};
        if (!mfaSessionId?.trim() || !code?.trim()) {
          reply.code(400).send({ error: 'mfaSessionId and code are required' });
          return;
        }
        const key = `mfa_pending:${mfaSessionId.trim()}`;
        const raw = await redis.get(key);
        if (!raw) {
          reply.code(401).send({ error: 'MFA session expired or invalid. Please sign in again.' });
          return;
        }
        let payload: { userId: string; rememberMe: boolean; organizationId: string | null };
        try {
          payload = JSON.parse(raw);
        } catch {
          await redis.del(key);
          reply.code(401).send({ error: 'Invalid MFA session. Please sign in again.' });
          return;
        }
        const { userId, rememberMe, organizationId: activeOrgId } = payload;
        const trimmedCode = code.trim();
        const totpValid = await mfaService.verify(userId, trimmedCode);
        const backupValid = !totpValid && (await mfaService.verifyBackupCode(userId, trimmedCode));
        if (!totpValid && !backupValid) {
          reply.code(401).send({ error: 'Invalid or expired code' });
          return;
        }
        await redis.del(key);

        const forwardedFor = request.headers['x-forwarded-for'];
        const ipAddress = request.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || null;
        const userAgentHeader = request.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || null;
        const acceptLanguageHeader = request.headers['accept-language'];
        const acceptLanguage = Array.isArray(acceptLanguageHeader) ? acceptLanguageHeader[0] : acceptLanguageHeader || null;

        const { accessToken, refreshToken, sessionId } = await createSession(
          userId,
          activeOrgId,
          rememberMe,
          ipAddress,
          userAgent,
          acceptLanguage,
          fastify
        );

        const accessTokenMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
        reply.setCookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: accessTokenMaxAge,
        });
        reply.setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60,
        });

        const db = getDatabaseClient() as any;
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, firstName: true, lastName: true, isEmailVerified: true },
        });
        if (user) {
          await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.login.success', userId, activeOrgId || undefined, undefined, {
              userId,
              sessionId,
              provider: 'password',
              organizationId: activeOrgId || undefined,
            }),
          } as AuthEvent);
          await publishEventSafely({
            ...createBaseEvent('auth.user.logged_in', userId, activeOrgId || undefined, undefined, {
              userId,
              sessionId,
              provider: 'password',
            }),
          } as AuthEvent);
        }

        return {
          user: user ? {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
          } : undefined,
          accessToken,
          refreshToken,
          sessionId,
          organizationId: activeOrgId,
        };
      } catch (err: unknown) {
        log.error('Complete MFA login error', err, { route: '/api/v1/auth/login/complete-mfa', service: 'auth' });
        reply.code(500).send({ error: 'Failed to complete sign-in' });
      }
    }
  );

  // Change password (authenticated)
  fastify.post(
    '/api/v1/auth/change-password',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          oldPassword: string;
          newPassword: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { oldPassword, newPassword } = request.body;

        if (!oldPassword || !newPassword) {
          reply.code(400).send({ error: 'Old password and new password are required' });
          return;
        }

        // Get user info for validation
        const db = getDatabaseClient() as any;
        const user = await db.user.findUnique({
          where: { id: requestUser.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!user) {
          reply.code(404).send({ error: 'User not found' });
          return;
        }

        const organizationId = (request as any).organizationId;

        // Change password with history validation
        await changePasswordWithHistory(
          requestUser.id,
          oldPassword,
          newPassword,
          {
            email: user.email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            organizationId: organizationId || null,
          }
        );

        // Log password change
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'change_password',
          `User ${requestUser.id} changed password`,
          {
            category: 'SECURITY',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: requestUser.id,
            metadata: {
              email: user.email,
              organizationId: organizationId || undefined,
            },
          }
        );

        // Publish user.password_changed event
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.user.password_changed', requestUser.id, organizationId, undefined, {
            userId: requestUser.id,
            initiatedBy: 'user',
          }),
        } as AuthEvent);

        return { message: 'Password changed successfully' };
      } catch (error: any) {
        log.error('Change password error', error, { route: '/api/v1/auth/change-password', userId: (request as any).user?.id, service: 'auth' });
        
        // Handle specific error messages
        if (error.message.includes('Current password is incorrect')) {
          reply.code(401).send({ error: error.message });
          return;
        }
        
        if (error.message.includes('Cannot reuse recent passwords') || 
            error.message.includes('Password validation failed')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to change password',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Forgot password (request reset)
  fastify.post(
    '/api/v1/auth/forgot-password',
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email } = request.body;

        if (!email) {
          reply.code(400).send({ error: 'Email is required' });
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          reply.code(400).send({ error: 'Invalid email format' });
          return;
        }

        // Request password reset (generates token)
        const resetToken = await requestPasswordReset(email);

        // Always return success message (don't reveal if user exists)
        // If user exists and token was generated, send email
        if (resetToken) {
          // Get user ID for email tracking
          const db = getDatabaseClient() as any;
          const user = await db.user.findUnique({
            where: { email },
            select: { id: true },
          });

          // Publish user.password_reset_requested event (triggers email notification)
          if (user?.id) {
            const metadata = extractEventMetadata(request);
            await publishEventSafely({
              ...createBaseEvent('auth.user.password_reset_requested', user.id, undefined, request.id, {
                userId: user.id,
                email,
                resetToken, // Include token in event data for email service
              }),
            } as AuthEvent);

            // Log password reset request
            const loggingService = getLoggingService();
            await loggingService.logFromRequest(
              request,
              'request_password_reset',
              `Password reset requested for user ${user.id}`,
              {
                category: 'SECURITY',
                severity: 'INFO',
                resourceType: 'user',
                resourceId: user.id,
                metadata: {
                  email,
                },
              }
            );
          }
        }

        // Return success message regardless of whether user exists
        // This prevents email enumeration attacks
        return {
          message: 'If an account with that email exists, a password reset link has been sent.',
        };
      } catch (error: any) {
        // Handle rate limiting errors
        if (error.message.includes('Too many password reset requests')) {
          reply.code(429).send({ error: error.message });
          return;
        }

        log.error('Forgot password error', error, { route: '/api/v1/auth/forgot-password', service: 'auth' });
        reply.code(500).send({
          error: 'Failed to process password reset request',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Reset password (with token)
  fastify.post(
    '/api/v1/auth/reset-password',
    async (
      request: FastifyRequest<{
        Body: {
          token: string;
          newPassword: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { token, newPassword } = request.body;

        if (!token || !newPassword) {
          reply.code(400).send({ error: 'Token and new password are required' });
          return;
        }

        // Get user info from token before reset (for event publishing)
        const { validateResetToken } = await import('../services/PasswordResetService');
        const tokenData = await validateResetToken(token);
        
        // Reset password with token
        await resetPasswordWithToken(token, newPassword);

        // Publish user.password_reset_success event (triggers confirmation email)
        if (tokenData) {
          const metadata = extractEventMetadata(request);
          await publishEventSafely({
            ...createBaseEvent('auth.user.password_reset_success', tokenData.userId, undefined, request.id, {
              userId: tokenData.userId,
              email: tokenData.email,
            }),
          } as AuthEvent);

          // Log password reset completion
          const loggingService = getLoggingService();
          await loggingService.logFromRequest(
            request,
            'reset_password',
            `Password reset completed for user ${tokenData.userId}`,
            {
              category: 'SECURITY',
              severity: 'INFO',
              resourceType: 'user',
              resourceId: tokenData.userId,
              metadata: {
                email: tokenData.email,
              },
            }
          );
        }

        return {
          message: 'Password has been reset successfully. Please log in with your new password.',
        };
      } catch (error: any) {
        log.error('Reset password error', error, { route: '/api/v1/auth/reset-password', service: 'auth' });

        // Handle specific error types
        if (error.message.includes('Invalid or expired reset token')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        if (error.message.includes('Password validation failed') ||
            error.message.includes('Cannot reuse recent passwords')) {
          reply.code(400).send({
            error: 'Password validation failed',
            details: error.message,
          });
          return;
        }

        reply.code(500).send({
          error: 'Failed to reset password',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Get linked authentication providers
  fastify.get(
    '/api/v1/auth/providers',
    { preHandler: authenticateRequest },
    (async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const providers = await getLinkedProviders(requestUser.id);
        return { providers };
      } catch (error: any) {
        log.error('Get providers error', error, { route: '/api/v1/auth/providers', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to get authentication providers',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Link Google OAuth provider
  fastify.post(
    '/api/v1/auth/link-google',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          accessToken: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { accessToken } = request.body;

        if (!accessToken) {
          reply.code(400).send({ error: 'Google access token is required' });
          return;
        }

        // Link Google provider
        await linkGoogleProvider(requestUser.id, accessToken);

        // Log provider linking
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'link_provider',
          `User ${requestUser.id} linked Google provider`,
          {
            category: 'SECURITY',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: requestUser.id,
            metadata: {
              provider: 'google',
            },
          }
        );

        // Publish user.provider_linked event (triggers confirmation notification)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.user.provider_linked', requestUser.id, organizationId, request.id, {
            userId: requestUser.id,
            provider: 'google',
            providerUserId: '', // Will be set by linkGoogleProvider
          }),
        } as AuthEvent);

        // Get updated provider list
        const providers = await getLinkedProviders(requestUser.id);

        return {
          message: 'Google account linked successfully',
          providers,
        };
      } catch (error: any) {
        log.error('Link Google error', error, { route: '/api/v1/auth/link-google', userId: (request as any).user?.id, service: 'auth' });

        // Handle specific errors
        if (error.message.includes('already linked')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        if (error.message.includes('already linked to another user')) {
          reply.code(409).send({ error: error.message });
          return;
        }

        if (error.message.includes('email must match')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to link Google account',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Unlink authentication provider
  fastify.post(
    '/api/v1/auth/unlink-provider',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          provider: 'google' | 'email' | 'password';
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { provider } = request.body;

        if (!provider || (provider !== 'google' && provider !== 'email' && provider !== 'password')) {
          reply.code(400).send({ error: 'Valid provider (google, email, or password) is required' });
          return;
        }

        // Unlink provider
        await unlinkProvider(requestUser.id, provider as AuthProvider);

        // Log provider unlinking
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'unlink_provider',
          `User ${requestUser.id} unlinked ${provider} provider`,
          {
            category: 'SECURITY',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: requestUser.id,
            metadata: {
              provider,
            },
          }
        );

        // Publish user.provider_unlinked event (triggers security notification)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.user.provider_unlinked', requestUser.id, organizationId, request.id, {
            userId: requestUser.id,
            provider,
          }),
        } as AuthEvent);

        // Get updated provider list
        const providers = await getLinkedProviders(requestUser.id);

        return {
          message: `${provider} account unlinked successfully`,
          providers,
        };
      } catch (error: any) {
        const { provider } = request.body as { provider?: string };
        log.error('Unlink provider error', error, { route: '/api/v1/auth/unlink-provider', userId: (request as any).user?.id, provider, service: 'auth' });

        // Handle specific errors
        if (error.message.includes('last authentication method')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        if (error.message.includes('not linked') || error.message.includes('not set up')) {
          reply.code(404).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to unlink provider',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Switch organization
  fastify.post(
    '/api/v1/auth/switch-organization',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          organizationId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { organizationId } = request.body;

        if (!organizationId || typeof organizationId !== 'string') {
          reply.code(400).send({ error: 'Organization ID is required' });
          return;
        }

        // Get current session from token
        const sessionId = (request as any).sessionId;
        if (!sessionId) {
          reply.code(401).send({ error: 'No session found' });
          return;
        }

        // Switch organization in session
        const updatedSession = await switchSessionOrganization(sessionId, organizationId);

        if (!updatedSession) {
          reply.code(403).send({ error: 'You are not a member of this organization' });
          return;
        }

        return {
          success: true,
          organizationId: updatedSession.organizationId,
        };
      } catch (error: any) {
        const body = request.body as { organizationId?: string };
        log.error('Switch organization error', error, { route: '/api/v1/auth/switch-organization', userId: (request as any).user?.id, organizationId: body?.organizationId, service: 'auth' });

        if (error.message.includes('not a member')) {
          reply.code(403).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to switch organization',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Email verification (unauthenticated — token from email link)
  fastify.get(
    '/api/v1/auth/verify-email',
    async (
      request: FastifyRequest<{ Querystring: { token?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const token = request.query.token;
        if (!token) {
          reply.code(400).send({ error: 'Verification token is required' });
          return;
        }
        const result = await verifyEmail(token);
        if (!result.success) {
          reply.code(400).send({ error: result.error ?? 'Invalid or expired verification token' });
          return;
        }
        return { message: 'Email verified successfully' };
      } catch (error: any) {
        log.error('Email verification error', error, { route: 'GET /api/v1/auth/verify-email', service: 'auth' });
        reply.code(500).send({
          error: 'Failed to verify email',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // Email verification (authenticated — in-session submit token)
  fastify.post(
    '/api/v1/auth/verify-email',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          token: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { token } = request.body;

        if (!token) {
          reply.code(400).send({ error: 'Verification token is required' });
          return;
        }

        const success = await verifyEmailWithToken(requestUser.id, token);

        if (!success) {
          reply.code(400).send({ error: 'Invalid or expired verification token' });
          return;
        }

        // Log email verification
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'email_verified',
          `User ${requestUser.id} verified email`,
          {
            category: 'SECURITY',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: requestUser.id,
            metadata: {
              email: (request as any).user?.email,
            },
          }
        );

        // Publish user.email_verified event (triggers confirmation notification)
        const organizationId = (request as any).organizationId;
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.user.email_verified', requestUser.id, organizationId, request.id, {
            userId: requestUser.id,
            email: (request as any).user?.email,
          }),
        } as AuthEvent);

        return { message: 'Email verified successfully' };
      } catch (error: any) {
        log.error('Email verification error', error, { route: '/api/v1/auth/verify-email', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to verify email',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Resend verification email
  fastify.post(
    '/api/v1/auth/resend-verification',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        await sendVerificationEmail(requestUser.id);

        return { message: 'Verification email sent' };
      } catch (error: any) {
        log.error('Resend verification error', error, { route: '/api/v1/auth/resend-verification', userId: (request as any).user?.id, service: 'auth' });
        
        if (error.message.includes('already verified')) {
          reply.code(400).send({ error: error.message });
          return;
        }

        reply.code(500).send({
          error: 'Failed to send verification email',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  );

  // SSO SAML ROUTES
  // SAML handlers have been migrated from server/src/auth/SAMLHandler.ts
  
  // Initiate SAML SSO flow
  fastify.post(
    '/api/v1/auth/sso/saml/initiate',
    { preHandler: authenticateRequest },
    (async (
      request: FastifyRequest<{
        Body: {
          organizationId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { organizationId } = request.body;

        if (!organizationId || typeof organizationId !== 'string') {
          reply.code(400).send({ error: 'Organization ID is required' });
          return;
        }

        // Generate SAML request
        const samlResult = await generateSAMLRequest(organizationId, undefined);
        
        reply.send({
          data: {
            samlRequest: samlResult.samlRequest,
            redirectUrl: samlResult.redirectUrl,
            relayState: samlResult.relayState,
          },
        });
      } catch (error: any) {
        log.error('SAML SSO initiation error', error, {
          route: '/api/v1/auth/sso/saml/initiate',
          userId: (request as any).user?.id,
          organizationId: request.body?.organizationId,
          service: 'auth',
        });

        reply.code(500).send({
          error: 'Failed to initiate SAML SSO',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // SAML SSO callback
  fastify.post(
    '/api/v1/auth/sso/saml/callback',
    (async (
      request: FastifyRequest<{
        Body: {
          SAMLResponse: string;
          RelayState?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { SAMLResponse, RelayState } = request.body;

        if (!SAMLResponse) {
          reply.code(400).send({ error: 'SAMLResponse is required' });
          return;
        }

        const ipAddress = request.ip || (request.headers['x-forwarded-for'] as string) || (request.headers['x-real-ip'] as string) || null;
        const userAgent = request.headers['user-agent'] || null;

        // Process SAML response
        const { user, session: samlSession } = await processSAMLResponse(
          SAMLResponse,
          RelayState || '',
          fastify,
          ipAddress,
          userAgent
        );

        // Log SAML login
        const loggingService = getLoggingService();
        await loggingService.logFromRequest(
          request,
          'saml_login',
          `User ${user.id} logged in via SAML SSO`,
          {
            category: 'ACCESS',
            severity: 'INFO',
            resourceType: 'user',
            resourceId: user.id,
            metadata: {
              provider: 'saml',
              sessionId: samlSession.sessionId,
            },
          }
        );

        // Set cookies
        reply.setCookie('accessToken', samlSession.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 8 * 60 * 60, // 8 hours
        });

        reply.setCookie('refreshToken', samlSession.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Publish auth.login.success event
        const metadata = extractEventMetadata(request);
        await publishEventSafely({
          ...createBaseEvent('auth.login.success', user.id, undefined, request.id, {
            userId: user.id,
            sessionId: samlSession.sessionId,
            provider: 'saml',
          }),
        } as AuthEvent);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          accessToken: samlSession.accessToken,
          refreshToken: samlSession.refreshToken,
        };
      } catch (error: any) {
        log.error('SAML SSO callback error', error, {
          route: '/api/v1/auth/sso/saml/callback',
          service: 'auth',
        });

        reply.code(500).send({
          error: 'Failed to process SAML SSO callback',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // SSO CONFIGURATION ROUTES
  // ============================================================================

  // Get SSO configuration (non-sensitive data only)
  fastify.get(
    '/api/v1/auth/organizations/:orgId/sso/config',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Querystring: {
          provider?: SSOProvider;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const { provider } = request.query;

        // Validate organization exists
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        const ssoService = getSSOConfigurationService();
        const ssoConfig = await ssoService.getSSOConfiguration(orgId, provider);

        if (!ssoConfig) {
          reply.code(404).send({ error: 'SSO not configured for this organization' });
          return;
        }

        reply.send({ data: ssoConfig });
      } catch (error: any) {
        log.error('Get SSO config error', error, { route: '/api/v1/auth/organizations/:orgId/sso/config', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to get SSO configuration',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Configure SSO (PUT for update)
  fastify.put(
    '/api/v1/auth/organizations/:orgId/sso/config',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          enabled: boolean;
          provider: SSOProvider;
          enforce?: boolean;
          config: {
            entityId?: string;
            ssoUrl?: string;
            sloUrl?: string;
            nameIdFormat?: string;
            attributeMappings?: Record<string, string>;
          };
          credentials: {
            certificate?: string;
            privateKey?: string;
            clientId?: string;
            clientSecret?: string;
            tenantId?: string;
            oktaDomain?: string;
            apiToken?: string;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const { enabled, provider, enforce, config, credentials } = request.body;

        // Validate organization exists
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        // Validate input
        if (!provider || !['azure_ad', 'okta'].includes(provider)) {
          reply.code(400).send({ error: 'Invalid SSO provider. Must be azure_ad or okta' });
          return;
        }

        // Validate required config fields
        if (!config) {
          reply.code(400).send({ error: 'Config is required' });
          return;
        }

        if (enabled && !config.ssoUrl) {
          reply.code(400).send({ error: 'SSO URL is required when enabling SSO' });
          return;
        }

        // Validate credentials based on provider
        if (enabled && credentials) {
          if (provider === 'azure_ad') {
            if (!credentials.clientId || !credentials.clientSecret) {
              reply.code(400).send({ error: 'Azure AD requires clientId and clientSecret' });
              return;
            }
          } else if (provider === 'okta') {
            if (!credentials.oktaDomain || !credentials.apiToken) {
              reply.code(400).send({ error: 'Okta requires oktaDomain and apiToken' });
              return;
            }
          }

          // For SAML, certificate is typically required
          if (config.ssoUrl && !credentials.certificate) {
            reply.code(400).send({ error: 'Certificate is required for SAML SSO' });
            return;
          }
        }

        const ssoService = getSSOConfigurationService();
        const result = await ssoService.configureSSO({
          organizationId: orgId,
          enabled,
          provider,
          enforce,
          config: {
            ...config,
            provider, // Add provider to config
          },
          credentials,
          createdBy: requestUser.id,
        });

        // Log SSO configuration update
        await logAuditAction(request, 'update_sso', 'organization', {
          resourceId: orgId,
          userId: requestUser.id,
          projectId: orgId,
          afterState: {
            enabled,
            provider,
            enforce,
            hasCredentials: !!credentials,
          },
        });

        // Publish organization.sso_configured event
        if (enabled) {
          await publishEventSafely({
            ...createBaseEvent('auth.organization.sso_configured', requestUser.id, orgId, request.id, {
              organizationId: orgId,
              provider,
              enabled: true,
              enforce: enforce || false,
              configuredBy: requestUser.id,
            }),
          } as AuthEvent);
        }

        reply.send({ data: result });
      } catch (error: any) {
        log.error('Update SSO config error', error, { route: '/api/v1/auth/organizations/:orgId/sso/config', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to update SSO configuration',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Configure SSO (POST for create)
  fastify.post(
    '/api/v1/auth/organizations/:orgId/sso/config',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          enabled: boolean;
          provider: SSOProvider;
          enforce?: boolean;
          config: {
            entityId?: string;
            ssoUrl?: string;
            sloUrl?: string;
            nameIdFormat?: string;
            attributeMappings?: Record<string, string>;
          };
          credentials: {
            certificate?: string;
            privateKey?: string;
            clientId?: string;
            clientSecret?: string;
            tenantId?: string;
            oktaDomain?: string;
            apiToken?: string;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const { enabled, provider, enforce, config, credentials } = request.body;

        // Validate organization exists
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        // Validate input
        if (!provider || !['azure_ad', 'okta'].includes(provider)) {
          reply.code(400).send({ error: 'Invalid SSO provider. Must be azure_ad or okta' });
          return;
        }

        // Validate required config fields
        if (!config) {
          reply.code(400).send({ error: 'Config is required' });
          return;
        }

        if (enabled && !config.ssoUrl) {
          reply.code(400).send({ error: 'SSO URL is required when enabling SSO' });
          return;
        }

        // Validate credentials based on provider
        if (enabled && credentials) {
          if (provider === 'azure_ad') {
            if (!credentials.clientId || !credentials.clientSecret) {
              reply.code(400).send({ error: 'Azure AD requires clientId and clientSecret' });
              return;
            }
          } else if (provider === 'okta') {
            if (!credentials.oktaDomain || !credentials.apiToken) {
              reply.code(400).send({ error: 'Okta requires oktaDomain and apiToken' });
              return;
            }
          }

          // For SAML, certificate is typically required
          if (config.ssoUrl && !credentials.certificate) {
            reply.code(400).send({ error: 'Certificate is required for SAML SSO' });
            return;
          }
        }

        const ssoService = getSSOConfigurationService();
        const result = await ssoService.configureSSO({
          organizationId: orgId,
          enabled,
          provider,
          enforce,
          config: {
            ...config,
            provider, // Add provider to config
          },
          credentials,
          createdBy: requestUser.id,
        });

        // Log SSO configuration
        await logAuditAction(request, 'configure_sso', 'organization', {
          resourceId: orgId,
          userId: requestUser.id,
          projectId: orgId,
          afterState: {
            enabled,
            provider,
            enforce,
            hasCredentials: !!credentials,
          },
        });

        // Publish organization.sso_configured event
        if (enabled) {
          await publishEventSafely({
            ...createBaseEvent('auth.organization.sso_configured', requestUser.id, orgId, request.id, {
              organizationId: orgId,
              provider,
              enabled: true,
              enforce: enforce || false,
              configuredBy: requestUser.id,
            }),
          } as AuthEvent);
        }

        reply.code(201).send({ data: result });
      } catch (error: any) {
        log.error('Configure SSO error', error, { route: '/api/v1/auth/organizations/:orgId/sso/config', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to configure SSO',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Test SSO connection
  fastify.post(
    '/api/v1/auth/organizations/:orgId/sso/test',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: { orgId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        // Validate organization exists
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        const ssoService = getSSOConfigurationService();

        // Get SSO configuration
        const ssoConfig = await ssoService.getSSOConfiguration(orgId);
        if (!ssoConfig || !ssoConfig.enabled) {
          reply.code(400).send({ error: 'SSO is not configured or not enabled' });
          return;
        }

        // Test connection by attempting to retrieve credentials
        // This validates that the secret exists and is accessible
        const serviceToken = process.env.SERVICE_AUTH_TOKEN || '';
        try {
          await ssoService.getSSOCredentials(orgId, serviceToken, 'auth-service');
          
          reply.send({
            data: {
              success: true,
              message: 'SSO connection test successful',
              provider: ssoConfig.provider,
            },
          });
        } catch (error: any) {
          reply.send({
            data: {
              success: false,
              message: 'SSO connection test failed',
              error: error.message,
              provider: ssoConfig.provider,
            },
          });
        }
      } catch (error: any) {
        log.error('Test SSO error', error, { route: '/api/v1/auth/organizations/:orgId/sso/test', service: 'auth' });
        reply.code(500).send({
          error: 'Failed to test SSO connection',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Disable SSO
  fastify.post(
    '/api/v1/auth/organizations/:orgId/sso/disable',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;

        // Validate organization exists
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        const ssoService = getSSOConfigurationService();
        
        // Get SSO config before disabling to get provider info
        const ssoConfig = await db.sSOConfiguration.findFirst({
          where: { organizationId: orgId },
          select: { provider: true },
        });

        await ssoService.disableSSO(orgId, requestUser.id);

        // Log SSO disable
        await logAuditAction(request, 'disable_sso', 'organization', {
          resourceId: orgId,
          userId: requestUser.id,
          projectId: orgId,
        });

        // Publish organization.sso_disabled event
        if (ssoConfig) {
          await publishEventSafely({
            ...createBaseEvent('auth.organization.sso_disabled', requestUser.id, orgId, request.id, {
              organizationId: orgId,
              provider: ssoConfig.provider,
              disabledBy: requestUser.id,
            }),
          } as AuthEvent);
        }

        reply.send({ data: { message: 'SSO disabled successfully' } });
      } catch (error: any) {
        log.error('Disable SSO error', error, { route: '/api/v1/auth/organizations/:orgId/sso/disable', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to disable SSO',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Get SSO credentials (service-to-service only)
  fastify.get(
    '/api/v1/auth/organizations/:orgId/sso/credentials',
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Verify service-to-service authentication
        const serviceToken = request.headers['x-service-token'] as string;
        const requestingService = request.headers['x-requesting-service'] as string;

        if (!serviceToken || serviceToken !== process.env.SERVICE_AUTH_TOKEN) {
          reply.code(401).send({ error: 'Invalid service token' });
          return;
        }

        if (!requestingService || !['auth-service', 'user-management'].includes(requestingService)) {
          reply.code(403).send({ error: 'Unauthorized service' });
          return;
        }

        const { orgId } = request.params;

        // Validate organization exists (for service-to-service calls)
        const db = getDatabaseClient() as any;
        const organization = await db.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        });

        if (!organization) {
          reply.code(404).send({ error: 'Organization not found' });
          return;
        }

        const ssoService = getSSOConfigurationService();
        const credentials = await ssoService.getSSOCredentials(
          orgId,
          serviceToken,
          requestingService
        );

        reply.send({ data: credentials });
      } catch (error: any) {
        log.error('Get SSO credentials error', error, { route: '/api/v1/auth/organizations/:orgId/sso/credentials', service: 'auth' });
        reply.code(500).send({
          error: 'Failed to get SSO credentials',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Rotate SSO certificate
  fastify.post(
    '/api/v1/auth/organizations/:orgId/sso/certificate/rotate',
    { preHandler: [authenticateRequest, requirePermission('organizations.sso.manage', 'organization')] },
    (async (
      request: FastifyRequest<{
        Params: {
          orgId: string;
        };
        Body: {
          newCertificate: string;
          newPrivateKey?: string;
          gracePeriodHours?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const requestUser = (request as any).user;
        if (!requestUser || !requestUser.id) {
          reply.code(401).send({ error: 'Not authenticated' });
          return;
        }

        const { orgId } = request.params;
        const { newCertificate, newPrivateKey, gracePeriodHours } = request.body;

        if (!newCertificate || typeof newCertificate !== 'string' || newCertificate.trim().length === 0) {
          reply.code(400).send({ error: 'newCertificate is required and must be a non-empty string' });
          return;
        }

        // Validate certificate format (basic check - should start with BEGIN CERTIFICATE)
        if (!newCertificate.includes('BEGIN CERTIFICATE') && !newCertificate.includes('-----BEGIN')) {
          reply.code(400).send({ error: 'Invalid certificate format. Certificate should be in PEM format' });
          return;
        }

        // Validate grace period if provided
        if (gracePeriodHours !== undefined) {
          if (typeof gracePeriodHours !== 'number' || gracePeriodHours < 0 || gracePeriodHours > 168) {
            reply.code(400).send({ error: 'gracePeriodHours must be a number between 0 and 168 (7 days)' });
            return;
          }
        }

        // Get SSO configuration to find secret ID
        const ssoService = getSSOConfigurationService();
        const ssoConfig = await ssoService.getSSOConfiguration(orgId);
        
        if (!ssoConfig || !ssoConfig.secretId) {
          reply.code(404).send({ error: 'SSO not configured for this organization' });
          return;
        }

        // Rotate certificate
        const result = await ssoService.rotateCertificate(
          orgId,
          ssoConfig.secretId,
          newCertificate,
          newPrivateKey,
          gracePeriodHours
        );

        // Log certificate rotation
        await logAuditAction(request, 'rotate_sso_certificate', 'organization', {
          resourceId: orgId,
          userId: requestUser.id,
          projectId: orgId,
          metadata: {
            secretId: ssoConfig.secretId,
            gracePeriodHours,
          },
        });

        reply.send({ data: result });
      } catch (error: any) {
        log.error('Rotate SSO certificate error', error, { route: '/api/v1/auth/organizations/:orgId/sso/certificate/rotate', userId: (request as any).user?.id, service: 'auth' });
        reply.code(500).send({
          error: 'Failed to rotate SSO certificate',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }) as any
  );

  // Health check
  fastify.get('/api/v1/auth/health', async () => {
    return { status: 'ok', service: 'auth-service' };
  });
}
