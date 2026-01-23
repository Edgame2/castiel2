import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { OAuthService, type OAuthUserInfo, type OAuthProvider } from '../services/auth/oauth.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
import { UserStatus, type User } from '../types/user.types.js';
import { SessionManagementService } from '../services/auth/session-management.service.js';

export interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface OAuthInitiateQuery {
  tenantId?: string;
  redirectUrl?: string;
}

const DEFAULT_TENANT_ID = 'default';

/**
 * OAuth Controller
 * Handles Google and GitHub OAuth flows for first-party authentication
 */
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly userService: UserService,
    private readonly cacheManager: CacheManager,
    private readonly accessTokenExpiry: string = '15m'
  ) { }

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogle(
    request: FastifyRequest<{ Querystring: OAuthInitiateQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.initiateProviderOAuth('google', request, reply);
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.handleProviderCallback('google', request, reply);
  }

  /**
   * Initiate GitHub OAuth flow
   */
  async initiateGitHub(
    request: FastifyRequest<{ Querystring: OAuthInitiateQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.initiateProviderOAuth('github', request, reply);
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.handleProviderCallback('github', request, reply);
  }

  /**
   * Initiate Microsoft OAuth flow
   */
  async initiateMicrosoft(
    request: FastifyRequest<{ Querystring: OAuthInitiateQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.initiateProviderOAuth('microsoft', request, reply);
  }

  /**
   * Handle Microsoft OAuth callback
   */
  async handleMicrosoftCallback(
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    return this.handleProviderCallback('microsoft', request, reply);
  }

  private async initiateProviderOAuth(
    provider: OAuthProvider,
    request: FastifyRequest<{ Querystring: OAuthInitiateQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!this.oauthService.isReady(provider)) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: `${provider === 'google' ? 'Google' : 'GitHub'} OAuth is not configured`,
        });
      }

      const { tenantId, redirectUrl } = request.query;
      const state = await this.oauthService.createState(provider, tenantId, redirectUrl);
      const authUrl = this.oauthService.buildAuthorizationUrl(provider, state);

      return reply.redirect(authUrl);
    } catch (error) {
      request.log.error({ error, provider }, 'Failed to initiate OAuth flow');
      return reply.status(500).send({
        error: 'OAUTH_INIT_FAILED',
        message: `Failed to initiate ${provider === 'google' ? 'Google' : 'GitHub'} OAuth`,
      });
    }
  }

  private async handleProviderCallback(
    provider: OAuthProvider,
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { code, state, error, error_description } = request.query;

      if (error) {
        request.log.warn({ error, error_description, provider }, 'OAuth provider returned an error');
        return reply.status(400).send({
          error: 'OAUTH_ERROR',
          message: error_description || error,
        });
      }

      if (!code || !state) {
        return reply.status(400).send({
          error: 'INVALID_REQUEST',
          message: 'Missing code or state parameter',
        });
      }

      const stateData = await this.oauthService.validateState(state);
      if (!stateData) {
        return reply.status(400).send({
          error: 'INVALID_STATE',
          message: 'Invalid or expired OAuth state',
        });
      }

      const tokenResponse = await this.oauthService.exchangeCode(provider, code);
      const userInfo = await this.oauthService.getUserInfo(provider, tokenResponse.access_token);
      const { user, isNewUser } = await this.handleOAuthUser(userInfo, stateData.tenantId);

      const accessToken = (request.server as any).jwt.sign(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roles?.[0] || 'user',
          roles: user.roles || [],
          organizationId: user.organizationId,
          status: user.status,
          provider,
          type: 'access',
        },
        { expiresIn: this.accessTokenExpiry }
      );

      const refreshResult = await this.cacheManager.tokens.createRefreshToken(
        user.id,
        user.tenantId
      );

      const metadata = SessionManagementService.extractSessionMetadata(request);
      await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
        email: user.email,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        provider,
        deviceInfo: metadata.deviceInfo,
        locationInfo: metadata.locationInfo,
        metadata: {
          provider,
          createdVia: 'oauth',
        },
      });

      if (stateData.redirectUrl) {
        const redirectUrl = new URL(stateData.redirectUrl);
        redirectUrl.searchParams.set('accessToken', accessToken);
        redirectUrl.searchParams.set('refreshToken', refreshResult.token);
        redirectUrl.searchParams.set('isNewUser', String(isNewUser));
        return reply.redirect(redirectUrl.toString());
      }

      return reply.send({
        success: true,
        accessToken,
        refreshToken: refreshResult.token,
        expiresIn: this.accessTokenExpiry,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          status: user.status,
        },
        isNewUser,
      });
    } catch (err) {
      request.log.error({ err, provider }, 'Failed to handle OAuth callback');
      return reply.status(500).send({
        error: 'OAUTH_CALLBACK_FAILED',
        message: `Failed to complete ${provider === 'google' ? 'Google' : 'GitHub'} OAuth`,
      });
    }
  }

  private async handleOAuthUser(
    userInfo: OAuthUserInfo,
    tenantId?: string
  ): Promise<{ user: User; isNewUser: boolean }> {
    const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

    const existingUser = await this.userService.findByEmail(userInfo.email, effectiveTenantId);

    if (existingUser) {
      const providers = existingUser.oauthProviders || [];
      const providerAlreadyLinked = providers.some(
        (p) => p.provider === userInfo.provider && p.providerId === userInfo.id
      );

      let latestUser: User = existingUser;

      if (!providerAlreadyLinked) {
        const updatedProviders = [
          ...providers,
          {
            provider: userInfo.provider,
            providerId: userInfo.id,
            connectedAt: new Date(),
          },
        ];

        const updated = await this.userService.updateUser(existingUser.id, effectiveTenantId, {
          oauthProviders: updatedProviders,
          providers: updatedProviders,
          lastLoginAt: new Date(),
        });
        if (updated) {
          latestUser = updated;
        }
      } else {
        const updated = await this.userService.updateUser(existingUser.id, effectiveTenantId, {
          lastLoginAt: new Date(),
        });
        if (updated) {
          latestUser = updated;
        }
      }

      return { user: latestUser, isNewUser: false };
    }

    const tempPassword = crypto.randomBytes(32).toString('hex');
    const newUser = await this.userService.createUser({
      email: userInfo.email,
      password: tempPassword,
      firstName: userInfo.firstName ?? userInfo.name,
      lastName: userInfo.lastName,
      tenantId: effectiveTenantId,
    });

    const updatedUser = await this.userService.updateUser(newUser.id, effectiveTenantId, {
      oauthProviders: [
        {
          provider: userInfo.provider,
          providerId: userInfo.id,
          connectedAt: new Date(),
        },
      ],
      providers: [
        {
          provider: userInfo.provider,
          providerId: userInfo.id,
          connectedAt: new Date(),
        },
      ],
      status: UserStatus.ACTIVE,
      emailVerified: userInfo.emailVerified,
    });

    if (!updatedUser) {
      throw new Error('Failed to finalize OAuth user creation');
    }

    return { user: updatedUser, isNewUser: true };
  }
}
