/**
 * Azure AD B2C Controller
 * 
 * HTTP handlers for Azure AD B2C authentication flows
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AzureADB2CService } from '../services/auth/azure-ad-b2c.service.js';
import type { UserService, SSOTeamSyncService, IntegrationService } from '@castiel/api-core';
import type { CacheManager } from '../cache/manager.js';
import { UserStatus } from '../types/user.types.js';
import { SessionDeviceInfo } from '../types/index.js';
import { randomBytes } from 'crypto';
import ms from 'ms';

interface AzureADB2CInitiateParams {
  tenantId?: string;
}

interface AzureADB2CInitiateQuery {
  returnUrl?: string;
}

interface AzureADB2CCallbackBody {
  code?: string;
  id_token?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Azure AD B2C Controller
 */
export class AzureADB2CController {
  constructor(
    private readonly azureService: AzureADB2CService,
    private readonly userService: UserService,
    private readonly cacheManager: CacheManager,
    private readonly accessTokenExpiry: string,
    private readonly frontendUrl: string,
    private readonly ssoTeamSyncService?: SSOTeamSyncService,
    private readonly integrationService?: IntegrationService
  ) {}

  /**
   * GET /auth/azure-b2c/:tenantId?/login
   * Initiate Azure AD B2C login
   */
  async initiateLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!this.azureService.isConfigured()) {
        return reply.code(503).send({
          error: 'ServiceUnavailable',
          message: 'Azure AD B2C is not configured',
        });
      }

      const { tenantId = 'default' } = request.params as AzureADB2CInitiateParams;
      const { returnUrl } = request.query as AzureADB2CInitiateQuery;

      const { authUrl } = await this.azureService.createAuthState(tenantId, returnUrl);

      return reply.redirect(authUrl);
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to initiate Azure AD B2C login');
      return reply.redirect(`${this.frontendUrl}/login?error=azure_init_failed`);
    }
  }

  /**
   * POST /auth/azure-b2c/callback
   * Handle Azure AD B2C callback (form_post response mode)
   */
  async handleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as AzureADB2CCallbackBody;

      // Check for errors
      if (body.error) {
        request.log.warn({ error: body.error, description: body.error_description }, 'Azure AD B2C auth error');
        return reply.redirect(`${this.frontendUrl}/login?error=${body.error}`);
      }

      const { state, id_token, code } = body;

      if (!state) {
        return reply.redirect(`${this.frontendUrl}/login?error=missing_state`);
      }

      // Validate state
      const stateData = await this.azureService.validateState(state);
      if (!stateData) {
        return reply.redirect(`${this.frontendUrl}/login?error=invalid_state`);
      }

      let userInfo;

      // If we have an ID token, validate and extract user info directly
      if (id_token) {
        try {
          const claims = await this.azureService.validateIdToken(id_token, stateData.nonce);
          userInfo = this.azureService.extractUserInfo(claims);
        } catch (error: unknown) {
          request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to validate ID token');
          return reply.redirect(`${this.frontendUrl}/login?error=invalid_token`);
        }
      } else if (code) {
        // Exchange code for tokens
        try {
          const tokens = await this.azureService.exchangeCode(code);
          const claims = await this.azureService.validateIdToken(tokens.id_token, stateData.nonce);
          userInfo = this.azureService.extractUserInfo(claims);
        } catch (error: unknown) {
          request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to exchange code');
          return reply.redirect(`${this.frontendUrl}/login?error=token_exchange_failed`);
        }
      } else {
        return reply.redirect(`${this.frontendUrl}/login?error=no_credentials`);
      }

      // Find or create user
      let user = await this.userService.findByEmail(userInfo.email, stateData.tenantId);

      if (!user) {
        // Auto-provision user (JIT provisioning)
        user = await this.userService.createUser({
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          tenantId: stateData.tenantId,
          status: UserStatus.ACTIVE,
          emailVerified: true, // Azure AD B2C handles email verification
          password: randomBytes(32).toString('hex'), // Random password for SSO users
          metadata: {
            ssoProvider: 'azure_ad_b2c',
            ssoSubject: userInfo.id,
            displayName: userInfo.displayName,
          },
        });

        request.log.info({ userId: user.id, email: user.email }, 'User provisioned via Azure AD B2C');
      } else {
        // Update SSO info if needed
        if (!user.metadata?.ssoProvider) {
          await this.userService.updateUser(user.id, stateData.tenantId, {
            metadata: {
              ...user.metadata,
              ssoProvider: 'azure_ad_b2c',
              ssoSubject: userInfo.id,
            },
          });
        }
      }

      // Check if user is allowed to sign in
      if (!user || user.status === 'suspended') {
        return reply.redirect(`${this.frontendUrl}/login?error=account_suspended`);
      }

      // Generate tokens
      // Calculate expiry time - accessTokenExpiry is already a string like "1h" or number in ms
      let accessTokenExpiryMs: number;
      if (typeof this.accessTokenExpiry === 'string') {
        // Use ms() to convert string to milliseconds
        // ms() can return number | undefined, we need to handle both
        // @ts-expect-error - ms() type definition issue, but it works at runtime
        const result: number | undefined = ms(this.accessTokenExpiry);
        accessTokenExpiryMs = result ?? 3600000;
      } else {
        accessTokenExpiryMs = Number(this.accessTokenExpiry) || 3600000;
      }
      const accessTokenExpirySeconds = Math.floor(accessTokenExpiryMs / 1000);

      const accessToken = await (reply as any).jwtSign(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          roles: user.roles || [],
        },
        { expiresIn: this.accessTokenExpiry }
      );

      // Generate and store refresh token
      const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(
        user.id,
        user.tenantId
      );
      const refreshToken = refreshTokenResult.token;

      // Create session
      const userAgent = request.headers['user-agent'] || 'unknown';
      const deviceInfo: SessionDeviceInfo = {
        userAgent,
        isMobile: /Mobile|Android|iPhone|iPad/i.test(userAgent),
      };
      await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
        email: user.email,
        provider: 'azure_ad_b2c',
        deviceInfo,
        metadata: {
          ipAddress: request.ip,
        },
      });

      // Update last login
      await this.userService.updateUser(user.id, user.tenantId, {
        lastLoginAt: new Date(),
      });

      // Sync teams from SSO groups if available
      // Try to get services from server decoration if not injected
      const ssoTeamSyncService = this.ssoTeamSyncService || (request.server as any).ssoTeamSyncService;
      const integrationService = this.integrationService || (request.server as any).integrationService;

      if (ssoTeamSyncService && integrationService && userInfo.groups && userInfo.groups.length > 0) {
        try {
          // Find Azure AD integration
          const result = await integrationService.listIntegrations({
            tenantId: stateData.tenantId,
            providerName: 'azure_ad',
            status: 'connected',
            limit: 1,
          });

          if (result.integrations.length > 0) {
            const integrationId = result.integrations[0].id;
            // Sync teams asynchronously (don't block login)
            ssoTeamSyncService.syncTeamsOnLogin(
              user.id,
              stateData.tenantId,
              userInfo.groups,
              integrationId
            ).catch((error: any) => {
              // Log but don't fail login
              request.log.error({ error, userId: user.id }, 'Failed to sync teams on Azure AD B2C login');
            });
          }
        } catch (error: unknown) {
          // Log but don't fail login
          request.log.error({ error: error instanceof Error ? error : new Error(String(error)), userId: user.id }, 'Error during team sync on Azure AD B2C login');
        }
      }

      // Determine redirect URL
      const redirectUrl = stateData.returnUrl || `${this.frontendUrl}/dashboard`;

      // Redirect with tokens (using fragment for security)
      const tokenParams = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: accessTokenExpirySeconds.toString(),
        redirect_uri: redirectUrl,
      });

      return reply.redirect(`${this.frontendUrl}/auth/callback#${tokenParams.toString()}`);
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Azure AD B2C callback failed');
      return reply.redirect(`${this.frontendUrl}/login?error=callback_failed`);
    }
  }

  /**
   * GET /auth/azure-b2c/logout
   * Initiate logout from Azure AD B2C
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const postLogoutRedirectUri = `${this.frontendUrl}/login?logout=success`;
      const logoutUrl = this.azureService.getLogoutUrl(postLogoutRedirectUri);
      return reply.redirect(logoutUrl);
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to initiate Azure AD B2C logout');
      return reply.redirect(`${this.frontendUrl}/login`);
    }
  }
}

