/**
 * SSO Controller
 * 
 * HTTP handlers for Single Sign-On (SAML) authentication
 */

import crypto from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SAMLService } from '../services/auth/saml.service.js';
import type { SSOConfigService } from '../services/auth/sso-config.service.js';
import type { UserService } from '../services/auth/user.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { SSOConfiguration, SAMLProfile, SAMLConfig, SSOProvider } from '../types/sso.types.js';
import type { AuthUser } from '../types/auth.types.js';
import { SessionManagementService } from '../services/auth/session-management.service.js';
import { SSOConfigStatus } from '../types/sso.types.js';
import { UserStatus } from '../types/user.types.js';
import type { SSOTeamSyncService, IntegrationService } from '@castiel/api-core';

/**
 * SSO Controller for handling SAML authentication
 */
export class SSOController {
  constructor(
    private readonly samlService: SAMLService,
    private readonly ssoConfigService: SSOConfigService,
    private readonly userService: UserService,
    private readonly cacheManager: CacheManager,
    private readonly accessTokenExpiry: string = '9h',
    private readonly frontendUrl: string = 'http://localhost:3000',
    private readonly ssoTeamSyncService?: SSOTeamSyncService,
    private readonly integrationService?: IntegrationService
  ) {}

  /**
   * GET /auth/sso/:tenantId/login
   * Initiate SAML login for an organization
   */
  async initiateLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.params as { tenantId: string };
      const { returnUrl } = request.query as { returnUrl?: string };

      // Get SSO configuration for the tenant
      const config = await this.ssoConfigService.getConfigByOrgId(tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotConfigured',
          message: 'SSO is not configured for this organization',
        });
      }

      if (config.status !== SSOConfigStatus.ACTIVE) {
        return reply.code(403).send({
          error: 'Inactive',
          message: 'SSO is not active for this organization',
        });
      }

      // Validate configuration
      const validation = this.ssoConfigService.validateConfig(config);
      if (!validation.valid) {
        request.log.error({ tenantId, errors: validation.errors }, 'Invalid SSO configuration');
        return reply.code(500).send({
          error: 'ConfigurationError',
          message: 'SSO configuration is invalid',
        });
      }

      // Create SAML instance
      const saml = this.samlService.createSAMLInstance(config.samlConfig);

      // Generate auth request
      const { url, requestId } = await this.samlService.generateAuthRequest(
        saml,
        tenantId,
        returnUrl
      );

      request.log.info({ tenantId, requestId }, 'SSO login initiated');

      // Redirect to IdP
      return reply.redirect(url);
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to initiate SSO login');
      return reply.code(500).send({
        error: 'SSOError',
        message: 'Failed to initiate SSO login',
      });
    }
  }

  /**
   * POST /auth/sso/:tenantId/callback
   * Handle SAML assertion callback from IdP
   */
  async handleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.params as { tenantId: string };
      const body = request.body as any;

      request.log.info({ tenantId }, 'SSO callback received');

      // Get SSO configuration
      const config = await this.ssoConfigService.getConfigByOrgId(tenantId);

      if (!config || config.status !== SSOConfigStatus.ACTIVE) {
        return reply.code(403).send({
          error: 'Inactive',
          message: 'SSO is not active for this organization',
        });
      }

      // Create SAML instance
      const saml = this.samlService.createSAMLInstance(config.samlConfig);

      // Validate SAML response
      let profile: SAMLProfile;
      try {
        profile = await this.samlService.validateResponse(saml, body, config.samlConfig);
      } catch (error: unknown) {
        request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'SAML validation failed');
        return this.redirectWithError(reply, 'saml_validation_failed');
      }

      if (!profile.email) {
        request.log.error({ profile }, 'SAML profile missing email');
        return this.redirectWithError(reply, 'missing_email');
      }

      // Validate session (if relay state contains request ID)
      const relayState = body.RelayState;

      // Find or create user
      let user = await this.userService.findByEmail(profile.email.toLowerCase(), tenantId);

      if (!user) {
        // JIT provisioning
        if (!config.jitProvisioning?.enabled) {
          request.log.warn({ email: profile.email, tenantId }, 'JIT provisioning disabled, user not found');
          return this.redirectWithError(reply, 'user_not_found');
        }

        // Check allowed domains if configured
        if (config.jitProvisioning.allowedDomains?.length) {
          // Safely extract email domain
          const emailDomain = profile.email?.includes('@') 
            ? profile.email.split('@')[1]?.toLowerCase() 
            : undefined;
          
          // If email domain cannot be extracted or is not in allowed domains, reject
          if (!emailDomain || !config.jitProvisioning.allowedDomains.includes(emailDomain)) {
            request.log.warn({ email: profile.email, domain: emailDomain }, 'Email domain not allowed or invalid email format');
            return this.redirectWithError(reply, 'domain_not_allowed');
          }
        }

        // Generate random password for SSO user (they won't use it)
        const randomPassword = crypto.randomBytes(32).toString('hex');

        // Create user with JIT provisioning
        user = await this.userService.createUser({
          email: profile.email.toLowerCase(),
          password: randomPassword,
          firstName: profile.firstName,
          lastName: profile.lastName,
          tenantId,
          status: config.jitProvisioning.autoActivate ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
          emailVerified: true, // SSO users are considered verified
          roles: config.jitProvisioning.defaultRole ? [config.jitProvisioning.defaultRole] : ['user'],
        });

        // Update user with SSO info
        await this.userService.updateUser(user.id, tenantId, {
          ssoProvider: 'saml',
          ssoSubject: profile.nameID,
        });

        request.log.info({ userId: user.id, email: profile.email }, 'User created via JIT provisioning');
      } else {
        // Update user with SSO info if not already set
        if (!user.ssoProvider || !user.ssoSubject) {
          await this.userService.updateUser(user.id, tenantId, {
            ssoProvider: 'saml',
            ssoSubject: profile.nameID,
          });
        }
      }

      // Check if user is active
      if (user.status !== 'active') {
        return this.redirectWithError(reply, 'account_inactive');
      }

      // Generate tokens
      const accessToken = (request.server as any).jwt.sign(
        {
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
          loginMethod: 'sso',
          ssoProvider: 'saml',
        },
        {
          expiresIn: this.accessTokenExpiry,
        }
      );

      // Create refresh token
      const refreshTokenResult = await this.cacheManager.tokens.createRefreshToken(
        user.id,
        user.tenantId
      );

      // Extract device and location metadata
      const metadata = SessionManagementService.extractSessionMetadata(request);

      // Create session
      await this.cacheManager.sessions.createSession(user.id, user.tenantId, {
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        provider: 'sso_saml',
        deviceInfo: metadata.deviceInfo,
        locationInfo: metadata.locationInfo,
      });

      request.log.info({ userId: user.id, email: user.email }, 'SSO login successful');

      // Sync teams from SSO groups if available
      // Try to get services from server decoration if not injected
      const ssoTeamSyncService = this.ssoTeamSyncService || (request.server as any).ssoTeamSyncService;
      const integrationService = this.integrationService || (request.server as any).integrationService;

      if (ssoTeamSyncService && integrationService && profile.groups && profile.groups.length > 0) {
        try {
          // Find integration for this SSO provider
          const integrationId = await this.findIntegrationForSSOProvider(config.provider, tenantId, integrationService, request.log);
          if (integrationId) {
            // Sync teams asynchronously (don't block login)
            ssoTeamSyncService.syncTeamsOnLogin(
              user.id,
              tenantId,
              profile.groups,
              integrationId
            ).catch((error: unknown) => {
              // Log but don't fail login
              request.log.error({ error: error instanceof Error ? error : new Error(String(error)), userId: user.id }, 'Failed to sync teams on SSO login');
            });
          }
        } catch (error: unknown) {
          // Log but don't fail login
          request.log.error({ error: error instanceof Error ? error : new Error(String(error)), userId: user.id }, 'Error during team sync on SSO login');
        }
      }

      // Redirect to frontend with tokens
      const returnUrl = relayState || '/dashboard';
      const redirectUrl = new URL(`${this.frontendUrl}/api/auth/sso-callback`);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshTokenResult.token);
      redirectUrl.searchParams.set('returnUrl', returnUrl);

      return reply.redirect(redirectUrl.toString());
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'SSO callback failed');
      return this.redirectWithError(reply, 'sso_error');
    }
  }

  /**
   * GET /auth/sso/:tenantId/metadata
   * Get SAML service provider metadata
   */
  async getMetadata(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { tenantId } = request.params as { tenantId: string };

      // Get SSO configuration
      const config = await this.ssoConfigService.getConfigByOrgId(tenantId);

      if (!config) {
        return reply.code(404).send({
          error: 'NotConfigured',
          message: 'SSO is not configured for this organization',
        });
      }

      // Create SAML instance
      const saml = this.samlService.createSAMLInstance(config.samlConfig);

      // Generate metadata
      const metadata = await this.samlService.generateMetadata(saml);

      return reply.header('Content-Type', 'application/xml').send(metadata);
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'Failed to generate SSO metadata');
      return reply.code(500).send({
        error: 'MetadataError',
        message: 'Failed to generate SSO metadata',
      });
    }
  }

  /**
   * POST /auth/sso/:tenantId/logout
   * Initiate SAML single logout
   */
  async initiateLogout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user as AuthUser | undefined;
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { tenantId } = request.params as { tenantId: string };
      const { nameID, sessionIndex } = request.body as { nameID?: string; sessionIndex?: string };

      // Get SSO configuration
      const config = await this.ssoConfigService.getConfigByOrgId(tenantId);

      if (!config || config.status !== SSOConfigStatus.ACTIVE) {
        // No SSO config, just do local logout
        await this.cacheManager.logoutUser(user.tenantId, user.id);
        return reply.code(200).send({ success: true, message: 'Logged out locally' });
      }

      // If we have SAML session info, do federated logout
      if (nameID && sessionIndex) {
        const saml = this.samlService.createSAMLInstance(config.samlConfig);
        const logoutUrl = await this.samlService.generateLogoutRequest(saml, nameID, sessionIndex);

        // Clear local session
        await this.cacheManager.logoutUser(user.tenantId, user.id);

        return reply.redirect(logoutUrl);
      }

      // No SAML session info, just do local logout
      await this.cacheManager.logoutUser(user.tenantId, user.id);
      return reply.code(200).send({ success: true, message: 'Logged out' });
    } catch (error: unknown) {
      request.log.error({ error: error instanceof Error ? error : new Error(String(error)) }, 'SSO logout failed');
      return reply.code(500).send({
        error: 'LogoutError',
        message: 'Failed to logout',
      });
    }
  }

  /**
   * Find integration for SSO provider
   */
  private async findIntegrationForSSOProvider(
    provider: string,
    tenantId: string,
    integrationService: IntegrationService,
    logger: { error: (obj: any, msg: string) => void }
  ): Promise<string | null> {
    try {
      // Map SSO provider to integration provider name
      let providerName: string;
      switch (provider?.toLowerCase()) {
        case 'saml2':
        case 'saml':
          // SAML could be from various providers, try common ones
          // Check for Azure AD first (most common)
          const azureResult = await integrationService.listIntegrations({
            tenantId,
            providerName: 'azure_ad',
            status: 'connected',
            limit: 1,
          });
          if (azureResult.integrations.length > 0) {
            return azureResult.integrations[0].id;
          }
          // Try Okta
          const oktaResult = await integrationService.listIntegrations({
            tenantId,
            providerName: 'okta',
            status: 'connected',
            limit: 1,
          });
          if (oktaResult.integrations.length > 0) {
            return oktaResult.integrations[0].id;
          }
          return null;
        case 'azure_ad':
        case 'azuread':
        case 'microsoft':
          providerName = 'azure_ad';
          break;
        case 'okta':
          providerName = 'okta';
          break;
        case 'google':
        case 'google_workspace':
          providerName = 'google_workspace';
          break;
        default:
          return null;
      }

      const result = await integrationService.listIntegrations({
        tenantId,
        providerName,
        status: 'connected',
        limit: 1,
      });

      return result.integrations.length > 0 ? result.integrations[0].id : null;
    } catch (error: unknown) {
      // Log but don't throw - team sync is optional
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: error instanceof Error ? error : new Error(errorMessage) }, 'Failed to find integration for SSO provider');
      return null;
    }
  }

  /**
   * Redirect with error to frontend
   */
  private redirectWithError(reply: FastifyReply, error: string) {
    const errorUrl = new URL(`${this.frontendUrl}/login`);
    errorUrl.searchParams.set('sso_error', error);
    return reply.redirect(errorUrl.toString());
  }
}

