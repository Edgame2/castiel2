import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { randomBytes, createHash } from 'crypto';
import { KeyVaultService } from '@castiel/key-vault';
import {
  IntegrationConnectionRepository,
  IntegrationProviderRepository,
  IntegrationRepository,
} from '../repositories/integration.repository.js';
import {
  IntegrationConnection,
  IntegrationProviderDocument,
  IntegrationDocument,
  ConnectionCredentials,
  OAuthState,
  OAuthConfig,
  ConnectionScope,
} from '../types/integration.types.js';
import type { NotificationService } from './notification.service.js';
import type { UserService } from './auth/user.service.js';
import type { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';
import type { AdapterManagerService } from './adapter-manager.service.js';
import { MAX_USER_CONNECTIONS_PER_INTEGRATION } from '../integrations/constants.js';
import { ExternalUserIdStatus } from '../types/user.types.js';

interface ConnectionServiceOptions {
  monitoring: IMonitoringProvider;
  redis?: Redis;
  connectionRepository: IntegrationConnectionRepository;
  providerRepository: IntegrationProviderRepository;
  integrationRepository: IntegrationRepository;
  keyVault: KeyVaultService;
  notificationService?: NotificationService;
  userService?: UserService;
  externalUserIdService?: IntegrationExternalUserIdService;
  adapterManager?: AdapterManagerService;
}

/**
 * Integration Connection Service
 * Manages OAuth flows and credential storage using Azure Key Vault
 */
export class IntegrationConnectionService {
  private monitoring: IMonitoringProvider;
  private redis?: Redis;
  private connectionRepo: IntegrationConnectionRepository;
  private providerRepo: IntegrationProviderRepository;
  private integrationRepo: IntegrationRepository;
  private keyVault: KeyVaultService;
  private notificationService?: NotificationService;
  private userService?: UserService;
  private externalUserIdService?: IntegrationExternalUserIdService;
  private adapterManager?: AdapterManagerService;

  // OAuth state TTL (10 minutes)
  private readonly OAUTH_STATE_TTL = 600;

  constructor(options: ConnectionServiceOptions) {
    this.monitoring = options.monitoring;
    this.redis = options.redis;
    this.connectionRepo = options.connectionRepository;
    this.providerRepo = options.providerRepository;
    this.integrationRepo = options.integrationRepository;
    this.keyVault = options.keyVault;
    this.notificationService = options.notificationService;
    this.userService = options.userService;
    this.externalUserIdService = options.externalUserIdService;
    this.adapterManager = options.adapterManager;
  }

  /**
   * Helper: Get tenant admin user IDs
   */
  private async getTenantAdminUserIds(tenantId: string): Promise<string[]> {
    if (!this.userService) {
      return [];
    }

    try {
      const result = await this.userService.listUsers(tenantId, {
        page: 1,
        limit: 1000,
      });

      const adminUserIds = result.users
        .filter(user => {
          const roles = user.roles || [];
          return roles.some(role =>
            ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase())
          );
        })
        .map(user => user.id);

      return adminUserIds;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'integration.connection.getTenantAdminUserIds',
        tenantId,
      });
      return [];
    }
  }

  // =====================
  // Key Vault Helpers
  // =====================

  private getSecretName(prefix: string, ...parts: string[]): string {
    // Sanitizes parts to be Key Vault compatible (alphanumeric and dashes)
    const safeParts = parts.map(p => p.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase());
    return `${prefix}-${safeParts.join('-')}`;
  }

  private async storeSecret(name: string, value: string, tags?: Record<string, string>): Promise<string> {
    await this.keyVault.setSecret(name, value, { tags });
    return name;
  }

  private async retrieveSecret(name: string): Promise<string | null> {
    try {
      const secret = await this.keyVault.getSecret(name);
      return secret.value;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error('Key Vault Retrieval Failed'), { secretName: name });
      return null;
    }
  }

  // =====================
  // OAuth Flow
  // =====================

  async startOAuthFlow(
    integrationId: string,
    tenantId: string,
    userId: string,
    returnUrl: string
  ): Promise<{ authorizationUrl: string; state: string }> {
    // integrationId here is likely the ID of the tenant integration document
    const integration = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const provider = await this.providerRepo.findByIdAcrossCategories(integration.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    if (provider.authType !== 'oauth2' || !provider.oauthConfig) {
      throw new Error('Integration does not support OAuth');
    }

    const oauthConfig = provider.oauthConfig;

    const state = randomBytes(32).toString('hex');
    const codeVerifier = oauthConfig.pkce ? randomBytes(32).toString('base64url') : undefined;

    const oauthState: OAuthState = {
      integrationId: integration.id,
      tenantId,
      userId,
      returnUrl,
      nonce: state,
      codeVerifier,
      expiresAt: new Date(Date.now() + this.OAUTH_STATE_TTL * 1000),
    };

    if (this.redis) {
      await this.redis.setex(
        `oauth:state:${state}`,
        this.OAUTH_STATE_TTL,
        JSON.stringify(oauthState)
      );
    }

    const authUrl = new URL(oauthConfig.authorizationUrl);
    authUrl.searchParams.set('client_id', this.getClientId(oauthConfig));
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    if (oauthConfig.pkce && codeVerifier) {
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    }

    if (oauthConfig.additionalParams) {
      for (const [key, value] of Object.entries(oauthConfig.additionalParams)) {
        authUrl.searchParams.set(key, value);
      }
    }

    this.monitoring.trackEvent('integration.oauth.started', {
      integrationId: integration.id,
      tenantId,
      userId,
    });

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  }

  async startOAuthFlowForIntegration(
    integration: IntegrationDocument,
    userId: string,
    returnUrl: string
  ): Promise<{ authorizationUrl: string; state: string }> {
    const provider = await this.providerRepo.findByIdAcrossCategories(integration.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    if (provider.authType !== 'oauth2' || !provider.oauthConfig) {
      throw new Error('Integration does not support OAuth');
    }

    const oauthConfig = provider.oauthConfig;
    const state = randomBytes(32).toString('hex');
    const codeVerifier = oauthConfig.pkce ? randomBytes(32).toString('base64url') : undefined;

    const oauthState: OAuthState = {
      integrationId: integration.id,
      tenantId: integration.tenantId,
      userId,
      returnUrl,
      nonce: state,
      codeVerifier,
      expiresAt: new Date(Date.now() + this.OAUTH_STATE_TTL * 1000),
    };

    if (this.redis) {
      await this.redis.setex(
        `oauth:state:${state}`,
        this.OAUTH_STATE_TTL,
        JSON.stringify(oauthState)
      );
    }

    const authUrl = new URL(oauthConfig.authorizationUrl);
    authUrl.searchParams.set('client_id', this.getClientId(oauthConfig));
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    if (oauthConfig.pkce && codeVerifier) {
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    }

    if (oauthConfig.additionalParams) {
      for (const [key, value] of Object.entries(oauthConfig.additionalParams)) {
        authUrl.searchParams.set(key, value);
      }
    }

    this.monitoring.trackEvent('integration.oauth.started', {
      integrationId: integration.id,
      tenantId: integration.tenantId,
      userId,
    });

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  }

  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{
    success: boolean;
    returnUrl: string;
    error?: string;
    connectionId?: string;
  }> {
    if (!this.redis) {
      throw new Error('Redis required for OAuth flow');
    }

    const stateData = await this.redis.get(`oauth:state:${state}`);
    if (!stateData) {
      return {
        success: false,
        returnUrl: '/',
        error: 'Invalid or expired OAuth state',
      };
    }

    let oauthState: OAuthState;
    try {
      oauthState = JSON.parse(stateData);
    } catch (parseError) {
      // Invalid JSON in state data - clear it and return error
      await this.redis.del(`oauth:state:${state}`);
      this.monitoring.trackException(
        parseError instanceof Error ? parseError : new Error(String(parseError)),
        {
          operation: 'integration.connection.handleOAuthCallback.parseState',
          state,
        }
      );
      return {
        success: false,
        returnUrl: '/',
        error: 'Invalid OAuth state data',
      };
    }

    await this.redis.del(`oauth:state:${state}`);

    try {
      if (!oauthState.tenantId) {
        throw new Error('Tenant ID missing in OAuth state');
      }

      const integration = await this.integrationRepo.findById(
        oauthState.integrationId,
        oauthState.tenantId
      );

      if (!integration) {
        throw new Error('Integration not found');
      }

      const provider = await this.providerRepo.findByIdAcrossCategories(integration.integrationId);
      if (!provider || !provider.oauthConfig) {
        throw new Error('Integration provider not found or does not support OAuth');
      }

      const tokens = await this.exchangeCodeForTokens(
        provider.oauthConfig,
        code,
        oauthState.codeVerifier
      );

      const connection = await this.createOrUpdateConnectionForIntegration(
        integration,
        oauthState.userId,
        {
          type: 'oauth2',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        }
      );

      await this.integrationRepo.update(
        integration.id,
        integration.tenantId,
        {
          connectionStatus: 'active',
          lastConnectionTestAt: new Date(),
          lastConnectionTestResult: 'success',
        }
      );

      this.monitoring.trackEvent('integration.oauth.completed', {
        integrationId: integration.id,
        tenantId: oauthState.tenantId,
        connectionId: connection.id,
      });

      // Try to retrieve and store external user ID
      if (this.externalUserIdService && integration.userScoped && oauthState.userId) {
        try {
          // First, try to get user profile from adapter
          if (this.adapterManager) {
            try {
              const adapter = await this.adapterManager.getAdapter(
                integration.providerName,
                integration,
                oauthState.userId
              );

              if (adapter && adapter.getUserProfile) {
                const userProfile = await adapter.getUserProfile();
                if (userProfile && userProfile.id) {
                  await this.externalUserIdService.storeExternalUserId(
                    oauthState.userId,
                    oauthState.tenantId,
                    {
                      integrationId: integration.id,
                      externalUserId: userProfile.id,
                      integrationName: integration.name || integration.providerName,
                      connectionId: connection.id,
                      metadata: {
                        email: userProfile.email,
                        name: userProfile.name,
                        ...userProfile,
                      },
                      status: ExternalUserIdStatus.ACTIVE,
                    }
                  );
                  this.monitoring.trackEvent('external_user_id.retrieved_from_adapter', {
                    userId: oauthState.userId,
                    tenantId: oauthState.tenantId,
                    integrationId: integration.id,
                  });
                }
              }
            } catch (adapterError) {
              // Log but don't fail - external user ID retrieval is optional
              this.monitoring.trackException(
                adapterError instanceof Error ? adapterError : new Error(String(adapterError)),
                {
                  operation: 'integration.oauth.retrieve_external_user_id',
                  integrationId: integration.id,
                  userId: oauthState.userId,
                }
              );
            }
          }

          // Fallback: Try OAuth userInfo endpoint if available
          if (provider.oauthConfig?.userInfoUrl && tokens.accessToken) {
            try {
              const axios = (await import('axios')).default;
              const userInfoResponse = await axios.get(provider.oauthConfig.userInfoUrl, {
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                  Accept: 'application/json',
                },
              });

              // Extract user ID from response (provider-specific)
              const userInfo = userInfoResponse.data;
              let externalUserId: string | undefined;

              // Common field names for user ID
              if (userInfo.id) {
                externalUserId = userInfo.id;
              } else if (userInfo.sub) {
                externalUserId = userInfo.sub;
              } else if (userInfo.user_id) {
                externalUserId = userInfo.user_id;
              } else if (userInfo.uid) {
                externalUserId = userInfo.uid;
              }

              if (externalUserId) {
                await this.externalUserIdService.storeExternalUserId(
                  oauthState.userId,
                  oauthState.tenantId,
                  {
                    integrationId: integration.id,
                    externalUserId,
                    integrationName: integration.name || integration.providerName,
                    connectionId: connection.id,
                    metadata: {
                      email: userInfo.email,
                      name: userInfo.name || userInfo.display_name,
                      ...userInfo,
                    },
                    status: ExternalUserIdStatus.ACTIVE,
                  }
                );
                this.monitoring.trackEvent('external_user_id.retrieved_from_userinfo', {
                  userId: oauthState.userId,
                  tenantId: oauthState.tenantId,
                  integrationId: integration.id,
                });
              }
            } catch (userInfoError) {
              // Log but don't fail - external user ID retrieval is optional
              this.monitoring.trackException(
                userInfoError instanceof Error ? userInfoError : new Error(String(userInfoError)),
                {
                  operation: 'integration.oauth.retrieve_external_user_id_from_userinfo',
                  integrationId: integration.id,
                  userId: oauthState.userId,
                }
              );
            }
          }
        } catch (error) {
          // Log but don't fail - external user ID retrieval should not break OAuth flow
          this.monitoring.trackException(
            error instanceof Error ? error : new Error(String(error)),
            {
              operation: 'integration.oauth.store_external_user_id',
              integrationId: integration.id,
              userId: oauthState.userId,
            }
          );
        }
      }

      if (this.notificationService && this.userService) {
        try {
          const adminUserIds = await this.getTenantAdminUserIds(oauthState.tenantId);
          for (const userId of adminUserIds) {
            await this.notificationService.createSystemNotification({
              tenantId: oauthState.tenantId,
              userId,
              name: 'Integration Connected',
              content: `Integration "${integration.name}" has been successfully connected via OAuth.`,
              link: `/integrations/${integration.id}`,
              type: 'information',
              metadata: {
                source: 'integration_system',
                integrationId: integration.id,
                integrationName: integration.name,
                providerName: integration.providerName,
                connectionId: connection.id,
                eventType: 'integration.connection.connected',
              },
            });
          }
        } catch (error) {
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'integration.connection.sendOAuthNotification',
            integrationId: connection.integrationId,
            connectionId: connection.id,
          });
        }
      }

      return {
        success: true,
        returnUrl: oauthState.returnUrl,
        connectionId: connection.id,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'integration.oauth.callback',
        integrationId: oauthState.integrationId,
      });

      try {
        if (oauthState.tenantId) {
          const integration = await this.integrationRepo.findById(
            oauthState.integrationId,
            oauthState.tenantId
          );
          if (integration) {
            await this.integrationRepo.update(oauthState.integrationId, oauthState.tenantId, {
              connectionStatus: 'error',
              connectionError: error.message,
              lastConnectionTestAt: new Date(),
              lastConnectionTestResult: 'failed',
            });
          }
        }
      } catch (updateError) {
        this.monitoring.trackException(updateError instanceof Error ? updateError : new Error(String(updateError)), {
          operation: 'integration.connection.updateStatusAfterOAuthError',
          integrationId: oauthState.integrationId,
        });
      }

      return {
        success: false,
        returnUrl: oauthState.returnUrl,
        error: error.message,
      };
    }
  }

  private async exchangeCodeForTokens(
    oauthConfig: OAuthConfig,
    code: string,
    codeVerifier?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string[];
  }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauthConfig.redirectUri,
      client_id: this.getClientId(oauthConfig),
      client_secret: this.getClientSecret(oauthConfig),
    });

    if (oauthConfig.pkce && codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    const response = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    const tokenData = data as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      scope: tokenData.scope?.split(' '),
    };
  }

  async refreshTokens(connectionId: string, integrationId: string): Promise<boolean> {
    const connection = await this.connectionRepo.findById(connectionId, integrationId);
    if (!connection || !connection.oauth?.refreshTokenEncrypted) {
      return false;
    }

    // integrationId passed here is likely the Provider ID if called from a context that only knows provider + connection
    // BUT the connection object stores integrationId as its partition key.
    // If connection.integrationId refers to specific IntegrationDocument (tenant instance), then we need to fetch that first.
    // Or does connection.integrationId refer to Provider?
    // In `IntegrationConnection` type, `integrationId` is "reference to integrations.id".
    // So it refers to the tenant integration instance.

    // We need the Provider to get OAuth Config (endpoints etc).
    const integrationDoc = await this.integrationRepo.findById(integrationId, connection.tenantId!);
    if (!integrationDoc) {return false;}

    const provider = await this.providerRepo.findByIdAcrossCategories(integrationDoc.integrationId);
    if (!provider || !provider.oauthConfig) {
      return false;
    }

    try {
      const refreshToken = await this.retrieveSecret(connection.oauth.refreshTokenEncrypted);
      if (!refreshToken) {
        throw new Error('Refresh token not found in Key Vault');
      }

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.getClientId(provider.oauthConfig),
        client_secret: this.getClientSecret(provider.oauthConfig),
      });

      const response = await fetch(provider.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      const accessTokenSecretName = this.getSecretName('int-oauth', connection.id, 'access');
      const refreshTokenSecretName = this.getSecretName('int-oauth', connection.id, 'refresh');

      const tokenData = data as {
        access_token: string;
        refresh_token?: string;
      };
      await this.storeSecret(accessTokenSecretName, tokenData.access_token);
      let newRefreshTokenSecretName = connection.oauth.refreshTokenEncrypted;

      if (tokenData.refresh_token) {
        await this.storeSecret(refreshTokenSecretName, tokenData.refresh_token);
        newRefreshTokenSecretName = refreshTokenSecretName;
      }

      await this.connectionRepo.updateOAuthTokens(connectionId, integrationId, {
        accessTokenEncrypted: accessTokenSecretName,
        refreshTokenEncrypted: newRefreshTokenSecretName,
        tokenType: (data as any).token_type || 'Bearer',
        expiresAt: (data as any).expires_in
          ? new Date(Date.now() + (data as any).expires_in * 1000)
          : undefined,
        scope: ((data as any).scope as string | undefined)?.split(' ') || connection.oauth.scope,
      });

      this.monitoring.trackEvent('integration.oauth.refreshed', {
        connectionId,
        integrationId,
      });

      return true;
    } catch (error: any) {
      await this.connectionRepo.markExpired(connectionId, integrationId);

      this.monitoring.trackException(error, {
        operation: 'integration.oauth.refresh',
        connectionId,
      });

      return false;
    }
  }

  // =====================
  // API Key / Basic Auth
  // =====================

  /**
   * Connect with API key
   */
  async connectWithApiKey(
    integrationId: string,
    tenantId: string,
    userId: string,
    apiKey: string,
    displayName?: string
  ): Promise<IntegrationConnection> {
    const integrationDoc = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integrationDoc) {
      throw new Error('Integration instance not found for API key connection');
    }

    const provider = await this.providerRepo.findByIdAcrossCategories(integrationDoc.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    if (provider.authType !== 'api_key') {
      throw new Error('Integration does not support API key authentication');
    }

    return this.createOrUpdateConnectionForIntegration(
      integrationDoc,
      userId,
      { type: 'api_key', apiKey },
      displayName
    );
  }

  /**
   * Connect with basic auth
   */
  async connectWithBasicAuth(
    integrationId: string,
    tenantId: string,
    userId: string,
    username: string,
    password: string,
    displayName?: string
  ): Promise<IntegrationConnection> {
    const integrationDoc = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integrationDoc) {
      throw new Error('Integration instance not found for basic auth connection');
    }

    const provider = await this.providerRepo.findByIdAcrossCategories(integrationDoc.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    if (provider.authType !== 'basic') {
      throw new Error('Integration does not support basic authentication');
    }

    return this.createOrUpdateConnectionForIntegration(
      integrationDoc,
      userId,
      { type: 'basic', username, password },
      displayName
    );
  }

  /**
   * Connect with custom credentials
   */
  async connectWithCustomCredentials(
    integrationId: string,
    tenantId: string,
    userId: string,
    credentials: Record<string, any>,
    displayName?: string
  ): Promise<IntegrationConnection> {
    const integrationDoc = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integrationDoc) {
      throw new Error('Integration instance not found for custom credentials connection');
    }

    return this.createOrUpdateConnectionForIntegration(
      integrationDoc,
      userId,
      { type: 'custom', data: credentials },
      displayName
    );
  }

  // =====================
  // Connection Management
  // =====================

  /**
   * Create or update connection for integration instance (new container-based)
   */
  private async createOrUpdateConnectionForIntegration(
    integration: IntegrationDocument,
    userId: string,
    credentials: ConnectionCredentials,
    displayName?: string
  ): Promise<IntegrationConnection> {
    const scope: ConnectionScope = integration.userScoped ? 'user' : 'tenant';

    // Get provider to get authType
    const provider = await this.providerRepo.findByIdAcrossCategories(integration.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    // Check if connection already exists
    let existing: IntegrationConnection | null = null;
    let connectionId: string;

    if (scope === 'user') {
      const userConnections = await this.connectionRepo.findUserScoped(
        integration.id,
        integration.tenantId,
        userId
      );
      existing = userConnections[0] || null;
      
      // Check connection limit only when creating a NEW connection (not updating existing)
      if (!existing) {
        if (userConnections.length >= MAX_USER_CONNECTIONS_PER_INTEGRATION) {
          throw new Error(
            `Maximum number of connections (${MAX_USER_CONNECTIONS_PER_INTEGRATION}) reached for this integration. Please delete an existing connection before creating a new one.`
          );
        }
      }
    } else {
      const tenantConnections = await this.connectionRepo.findByIntegration(
        integration.id,
        'tenant',
        integration.tenantId
      );
      existing = tenantConnections; // Method returns single or null
    }

    if (existing) {
      connectionId = existing.id;
    } else {
      connectionId = crypto.randomUUID();
    }

    // Prepare Secret Names
    const secretPrefix = `int-${scope}-${connectionId}`;
    let encryptedCredentials = '';
    let oauth: IntegrationConnection['oauth'];

    if (credentials.type === 'oauth2') {
      const accessTokenName = `${secretPrefix}-acc`;
      await this.storeSecret(accessTokenName, credentials.accessToken, { integrationId: integration.id });

      let refreshTokenName;
      if (credentials.refreshToken) {
        refreshTokenName = `${secretPrefix}-ref`;
        await this.storeSecret(refreshTokenName, credentials.refreshToken, { integrationId: integration.id });
      }

      oauth = {
        accessTokenEncrypted: accessTokenName,
        refreshTokenEncrypted: refreshTokenName,
        tokenType: 'Bearer',
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
      };
    } else {
      const credsName = `${secretPrefix}-creds`;
      await this.storeSecret(credsName, JSON.stringify(credentials), { integrationId: integration.id });
      encryptedCredentials = credsName;
    }

    if (existing) {
      return await this.connectionRepo.update(
        existing.id,
        integration.id,
        {
          encryptedCredentials,
          oauth,
          status: 'active',
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        }
      ) as IntegrationConnection;
    } else {
      return this.connectionRepo.create({
        id: connectionId,
        integrationId: integration.id,
        tenantId: integration.tenantId,
        userId: scope === 'user' ? userId : undefined,
        scope,
        authType: provider.authType,
        encryptedCredentials,
        oauth,
        status: 'active',
        usageCount: 0,
        displayName: displayName || integration.name,
        createdBy: userId,
      });
    }
  }

  // Supporting legacy/system implementations
  private async createOrUpdateConnection(
    provider: IntegrationProviderDocument,
    tenantId: string,
    userId: string,
    credentials: ConnectionCredentials,
    displayName?: string
  ): Promise<IntegrationConnection> {
    const scope: ConnectionScope = provider.audience === 'system' ? 'system' : 'tenant';

    // For System scope, we might only have one connection per provider globally?
    // Repo `findSystemConnection` takes integrationId. 
    // Here `provider.id` acts as the integrationId key for the connection.

    let existing: IntegrationConnection | null = null;

    if (scope === 'system') {
      existing = await this.connectionRepo.findSystemConnection(provider.id);
    } else {
      existing = await this.connectionRepo.findByIntegration(provider.id, 'tenant', tenantId);
    }

    const connectionId = existing?.id || crypto.randomUUID();
    const secretPrefix = `int-${scope}-${connectionId}`;

    let encryptedCredentials = '';
    let oauth: IntegrationConnection['oauth'];

    if (credentials.type === 'oauth2') {
      const accessTokenName = `${secretPrefix}-acc`;
      await this.storeSecret(accessTokenName, credentials.accessToken);

      let refreshTokenName;
      if (credentials.refreshToken) {
        refreshTokenName = `${secretPrefix}-ref`;
        await this.storeSecret(refreshTokenName, credentials.refreshToken);
      }

      oauth = {
        accessTokenEncrypted: accessTokenName,
        refreshTokenEncrypted: refreshTokenName,
        tokenType: 'Bearer',
        expiresAt: credentials.expiresAt,
        scope: credentials.scope,
      };
    } else {
      const credsName = `${secretPrefix}-creds`;
      await this.storeSecret(credsName, JSON.stringify(credentials));
      encryptedCredentials = credsName;
    }

    if (existing) {
      const updated = await this.connectionRepo.update(existing.id, provider.id, {
        encryptedCredentials,
        oauth,
        status: 'active',
        lastValidatedAt: new Date(),
        displayName: displayName || existing.displayName,
      });
      return updated!;
    }

    return this.connectionRepo.create({
      id: connectionId,
      integrationId: provider.id,
      scope,
      tenantId: scope === 'tenant' ? tenantId : undefined,
      authType: provider.authType,
      encryptedCredentials,
      encryptionKeyId: 'keyvault',
      oauth,
      status: 'active',
      displayName,
      createdBy: userId,
    });
  }

  async getConnection(integrationId: string, tenantId: string): Promise<IntegrationConnection | null> {
    // This looks up tenant Integration instance first
    const integration = await this.integrationRepo.findById(integrationId, tenantId);
    // If found, find its connection
    if (integration) {
      // Determine scope based on integration settings?
      // Assuming this method returns the 'default' connection (tenant level) or checks context?
      // This method signature doesn't take userId, so likely specific for API that needs non-user scoped
      // OR it's just a helper.
      // Let's assume tenant scope for simplicity if checking an IntegrationDocument.
      return this.connectionRepo.findByIntegration(integration.id, 'tenant', tenantId);
    }

    // If not found, maybe it was a provider level check? NO, integrationId usually means Tenant Integration ID.
    return null;
  }

  /**
   * Get all user-scoped connections for an integration
   */
  async getUserConnections(
    integrationId: string,
    tenantId: string,
    userId: string
  ): Promise<IntegrationConnection[]> {
    return this.connectionRepo.findUserScoped(integrationId, tenantId, userId);
  }

  /**
   * Get a specific user connection by ID
   */
  async getUserConnection(
    integrationId: string,
    connectionId: string,
    tenantId: string,
    userId: string
  ): Promise<IntegrationConnection | null> {
    const connections = await this.connectionRepo.findUserScoped(integrationId, tenantId, userId);
    return connections.find((c) => c.id === connectionId) || null;
  }

  /**
   * Get user OAuth token for a specific integration
   * Tries user-scoped connection first, then falls back to tenant-level connection
   */
  async getUserOAuthToken(
    integrationId: string,
    tenantId: string,
    userId?: string
  ): Promise<string> {
    const integration = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Try user-scoped connection first if userId provided
    let connection: IntegrationConnection | null = null;
    if (userId) {
      connection = await this.connectionRepo.findByIntegration(
        integration.id,
        'user',
        tenantId,
        userId
      );
    }

    // Fall back to tenant-level connection
    if (!connection) {
      connection = await this.connectionRepo.findByIntegration(
        integration.id,
        'tenant',
        tenantId
      );
    }

    if (!connection) {
      throw new Error(`No OAuth connection found for integration ${integrationId}`);
    }

    // Get decrypted credentials
    const credentials = await this.getDecryptedCredentials(connection.id, integration.id);
    if (!credentials || credentials.type !== 'oauth2' || !credentials.accessToken) {
      throw new Error(`OAuth access token not available for integration ${integrationId}`);
    }

    return credentials.accessToken;
  }

  async getDecryptedCredentials(connectionId: string, integrationId: string): Promise<ConnectionCredentials | null> {
    const connection = await this.connectionRepo.findById(connectionId, integrationId);
    if (!connection) { return null; }

    try {
      if (connection.authType === 'oauth2' && connection.oauth) {
        // connection.oauth.accessTokenEncrypted is string.
        const accessToken = await this.retrieveSecret(connection.oauth.accessTokenEncrypted);
        if (!accessToken) {throw new Error('Access token missing in Key Vault');}

        let refreshToken;
        if (connection.oauth.refreshTokenEncrypted) {
          refreshToken = await this.retrieveSecret(connection.oauth.refreshTokenEncrypted);
        }

        return {
          type: 'oauth2',
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: connection.oauth.expiresAt,
          scope: connection.oauth.scope,
        };
      } else if (connection.encryptedCredentials) {
        const raw = await this.retrieveSecret(connection.encryptedCredentials);
        if (!raw) {return null;}
        return JSON.parse(raw);
      }
    } catch (e) {
      this.monitoring.trackException(e instanceof Error ? e : new Error(String(e)), {
        operation: 'integration.connection.getDecryptedCredentials',
        connectionId,
        integrationId,
      });
    }
    return null;
  }

  async deleteConnection(connectionId: string, integrationId: string): Promise<void> {
    const connection = await this.connectionRepo.findById(connectionId, integrationId);
    if (connection) {
      // Cleanup secrets
      if (connection.oauth) {
        await this.keyVault.deleteSecret(connection.oauth.accessTokenEncrypted).catch((error) => {
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'integration.connection.deleteSecret',
            connectionId,
            integrationId,
            secretType: 'accessToken',
          });
        });
        if (connection.oauth.refreshTokenEncrypted) {
          await this.keyVault.deleteSecret(connection.oauth.refreshTokenEncrypted).catch((error) => {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
              operation: 'integration.connection.deleteSecret',
              connectionId,
              integrationId,
              secretType: 'refreshToken',
            });
          });
        }
      }
      if (connection.encryptedCredentials) {
        await this.keyVault.deleteSecret(connection.encryptedCredentials).catch((error) => {
          this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'integration.connection.deleteSecret',
            connectionId,
            integrationId,
            secretType: 'credentials',
          });
        });
      }
    }
    await this.connectionRepo.delete(connectionId, integrationId);
  }

  async testConnection(
    integrationId: string,
    tenantId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const integration = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integration) {return { success: false, error: 'Integration not found' };}

    const scope = userId ? 'user' : 'tenant';
    let connection;
    if (scope === 'user') {
      // findUserScoped returns array, we take first?
      connection = (await this.connectionRepo.findUserScoped(integrationId, tenantId, userId))[0];
    } else {
      connection = await this.connectionRepo.findByIntegration(integrationId, 'tenant', tenantId);
    }

    if (!connection) {return { success: false, error: 'No connection found' };}

    const creds = await this.getDecryptedCredentials(connection.id, integrationId);
    if (!creds) {return { success: false, error: 'Could not retrieve credentials from Vault' };}

    return { success: true };
  }

  /**
   * Test a specific connection by connectionId
   */
  async testSpecificConnection(
    integrationId: string,
    connectionId: string,
    tenantId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const integration = await this.integrationRepo.findById(integrationId, tenantId);
    if (!integration) {
      return { success: false, error: 'Integration not found' };
    }

    // Get the specific connection
    let connection: IntegrationConnection | null = null;
    if (userId) {
      // For user-scoped connections, verify it belongs to the user
      connection = await this.getUserConnection(integrationId, connectionId, tenantId, userId);
    } else {
      // For tenant-scoped connections, get by integration
      connection = await this.connectionRepo.findByIntegration(integrationId, 'tenant', tenantId);
      if (connection && connection.id !== connectionId) {
        return { success: false, error: 'Connection ID mismatch' };
      }
    }

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    // Verify the connection belongs to the specified integration
    if (connection.integrationId !== integrationId) {
      return { success: false, error: 'Connection does not belong to this integration' };
    }

    // Test credentials retrieval
    try {
      const creds = await this.getDecryptedCredentials(connection.id, integrationId);
      if (!creds) {
        const errorMessage = 'Could not retrieve credentials from Key Vault';
        // Update status to error on failure
        await this.connectionRepo.update(connection.id, integrationId, {
          status: 'error',
          validationError: errorMessage,
          updatedAt: new Date(),
        });
        return { success: false, error: errorMessage };
      }

      // Update status to active and clear validation error on successful test
      await this.connectionRepo.update(connection.id, integrationId, {
        status: 'active',
        lastValidatedAt: new Date(),
        validationError: undefined, // Clear any previous errors
        updatedAt: new Date(),
      });

      return { success: true, details: { connectionId: connection.id, authType: connection.authType } };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to test connection';
      
      // Update status to error on failure
      try {
        await this.connectionRepo.update(connection.id, integrationId, {
          status: 'error',
          validationError: errorMessage,
          updatedAt: new Date(),
        });
      } catch (updateError) {
        // Log but don't fail if status update fails
        this.monitoring.trackException(updateError as Error, {
          operation: 'testSpecificConnection.updateStatus',
          integrationId,
          connectionId,
        });
      }

      this.monitoring.trackException(error as Error, {
        operation: 'testSpecificConnection',
        integrationId,
        connectionId,
        tenantId,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Record connection usage (called when connection is used for operations)
   * Also proactively refreshes OAuth tokens if they are expired or about to expire
   */
  async recordConnectionUsage(
    connectionId: string,
    integrationId: string
  ): Promise<void> {
    try {
      const connection = await this.connectionRepo.findById(connectionId, integrationId);
      if (!connection) {
        return; // Connection not found, skip tracking
      }

      // Check if OAuth token needs refresh (expired or expiring within 5 minutes)
      if (connection.oauth?.expiresAt && connection.status === 'active') {
        const expiresAt = new Date(connection.oauth.expiresAt);
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        // If token is expired or expiring soon, attempt to refresh
        if (expiresAt <= fiveMinutesFromNow) {
          try {
            const refreshed = await this.refreshTokens(connectionId, integrationId);
            if (refreshed) {
              this.monitoring.trackEvent('integration.connection.token_refreshed_on_usage', {
                connectionId,
                integrationId,
                wasExpired: expiresAt <= now,
              });
            } else {
              // Refresh failed, mark as expired
              await this.connectionRepo.update(connectionId, integrationId, {
                status: 'expired',
                updatedAt: new Date(),
              });
              this.monitoring.trackEvent('integration.connection.token_refresh_failed_on_usage', {
                connectionId,
                integrationId,
              });
            }
          } catch (refreshError) {
            // Log but don't fail - we'll still record usage
            this.monitoring.trackException(refreshError as Error, {
              operation: 'recordConnectionUsage.refreshToken',
              connectionId,
              integrationId,
            });
            // Mark as expired if refresh failed
            try {
              await this.connectionRepo.update(connectionId, integrationId, {
                status: 'expired',
                updatedAt: new Date(),
              });
            } catch (updateError) {
              // Log but don't fail
              this.monitoring.trackException(updateError as Error, {
                operation: 'recordConnectionUsage.markExpired',
                connectionId,
                integrationId,
              });
            }
          }
        }
      }

      const currentUsageCount = connection.usageCount || 0;
      await this.connectionRepo.update(connectionId, integrationId, {
        lastUsedAt: new Date(),
        usageCount: currentUsageCount + 1,
        updatedAt: new Date(),
      });

      this.monitoring.trackEvent('integration.connection.used', {
        connectionId,
        integrationId,
        usageCount: currentUsageCount + 1,
      });
    } catch (error) {
      // Don't fail operations if usage tracking fails
      this.monitoring.trackException(error as Error, {
        operation: 'recordConnectionUsage',
        connectionId,
        integrationId,
      });
    }
  }

  /**
   * Bulk delete user connections
   */
  async bulkDeleteUserConnections(
    integrationId: string,
    connectionIds: string[],
    tenantId: string,
    userId: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      connectionId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{ connectionId: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const connectionId of connectionIds) {
      try {
        // Verify connection belongs to user and integration
        const connection = await this.getUserConnection(integrationId, connectionId, tenantId, userId);
        if (!connection) {
          results.push({
            connectionId,
            success: false,
            error: 'Connection not found or access denied',
          });
          failureCount++;
          continue;
        }

        // Delete connection
        await this.deleteConnection(connectionId, integrationId);
        results.push({ connectionId, success: true });
        successCount++;
      } catch (error: any) {
        results.push({
          connectionId,
          success: false,
          error: error.message || 'Failed to delete connection',
        });
        failureCount++;
        this.monitoring.trackException(error as Error, {
          operation: 'bulkDeleteUserConnections',
          connectionId,
          integrationId,
          tenantId,
          userId,
        });
      }
    }

    return { successCount, failureCount, results };
  }

  /**
   * Bulk test user connections
   */
  async bulkTestUserConnections(
    integrationId: string,
    connectionIds: string[],
    tenantId: string,
    userId: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      connectionId: string;
      success: boolean;
      error?: string;
      details?: any;
    }>;
  }> {
    const results: Array<{ connectionId: string; success: boolean; error?: string; details?: any }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const connectionId of connectionIds) {
      try {
        // Test connection
        const result = await this.testSpecificConnection(integrationId, connectionId, tenantId, userId);
        results.push({
          connectionId,
          success: result.success,
          error: result.error,
          details: result.details,
        });
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error: any) {
        results.push({
          connectionId,
          success: false,
          error: error.message || 'Failed to test connection',
        });
        failureCount++;
        this.monitoring.trackException(error as Error, {
          operation: 'bulkTestUserConnections',
          connectionId,
          integrationId,
          tenantId,
          userId,
        });
      }
    }

    return { successCount, failureCount, results };
  }

  /**
   * Get connection usage statistics for a user
   */
  async getConnectionUsageStats(
    tenantId: string,
    userId: string,
    integrationId?: string
  ): Promise<{
    totalConnections: number;
    activeConnections: number;
    inactiveConnections: number;
    totalUsageCount: number;
    connectionsByStatus: {
      active: number;
      expired: number;
      error: number;
      revoked: number;
      archived: number;
    };
    mostUsedConnections: Array<{
      connectionId: string;
      integrationId: string;
      displayName?: string;
      usageCount: number;
      lastUsedAt?: Date;
    }>;
    recentlyUsedConnections: Array<{
      connectionId: string;
      integrationId: string;
      displayName?: string;
      lastUsedAt: Date;
    }>;
    unusedConnections: Array<{
      connectionId: string;
      integrationId: string;
      displayName?: string;
      createdAt: Date;
    }>;
  }> {
    try {
      let allConnections: IntegrationConnection[] = [];

      if (integrationId) {
        // Get connections for a specific integration
        allConnections = await this.connectionRepo.findUserScoped(
          integrationId,
          tenantId,
          userId
        );
      } else {
        // Get all user connections across all integrations
        allConnections = await this.connectionRepo.findAllUserConnections(tenantId, userId);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeConnections = allConnections.filter(
        (c) => c.status === 'active' && (!c.lastUsedAt || new Date(c.lastUsedAt) >= thirtyDaysAgo)
      );
      const inactiveConnections = allConnections.filter(
        (c) => c.status !== 'active' || (c.lastUsedAt && new Date(c.lastUsedAt) < thirtyDaysAgo)
      );
      const totalUsageCount = allConnections.reduce((sum, c) => sum + (c.usageCount || 0), 0);

      // Most used connections (top 10)
      const mostUsedConnections = allConnections
        .filter((c) => (c.usageCount || 0) > 0)
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10)
        .map((c) => ({
          connectionId: c.id,
          integrationId: c.integrationId,
          displayName: c.displayName,
          usageCount: c.usageCount || 0,
          lastUsedAt: c.lastUsedAt,
        }));

      // Recently used connections (last 30 days, top 10)
      const recentlyUsedConnections = allConnections
        .filter((c) => c.lastUsedAt && new Date(c.lastUsedAt) >= thirtyDaysAgo)
        .sort((a, b) => {
          const dateA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const dateB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10)
        .map((c) => ({
          connectionId: c.id,
          integrationId: c.integrationId,
          displayName: c.displayName,
          lastUsedAt: c.lastUsedAt!,
        }));

      // Unused connections (never used, older than 30 days)
      const unusedConnections = allConnections
        .filter(
          (c) =>
            (!c.lastUsedAt || new Date(c.lastUsedAt) < thirtyDaysAgo) &&
            (c.usageCount || 0) === 0 &&
            new Date(c.createdAt) < thirtyDaysAgo
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((c) => ({
          connectionId: c.id,
          integrationId: c.integrationId,
          displayName: c.displayName,
          createdAt: c.createdAt,
        }));

      // Check for expired OAuth tokens and update connection status
      for (const connection of allConnections) {
        if (connection.oauth?.expiresAt && connection.status === 'active') {
          const expiresAt = new Date(connection.oauth.expiresAt);
          if (expiresAt <= now) {
            // Token is expired, mark connection as expired
            try {
              await this.connectionRepo.update(connection.id, connection.integrationId, {
                status: 'expired',
                updatedAt: new Date(),
              });
            } catch (updateError) {
              // Log but don't fail
              this.monitoring.trackException(updateError as Error, {
                operation: 'getConnectionUsageStats.markExpired',
                connectionId: connection.id,
                integrationId: connection.integrationId,
              });
            }
          }
        }
      }

      // Re-fetch connections to get updated statuses
      if (integrationId) {
        allConnections = await this.connectionRepo.findUserScoped(
          integrationId,
          tenantId,
          userId
        );
      } else {
        allConnections = await this.connectionRepo.findAllUserConnections(tenantId, userId);
      }

      // Recalculate active/inactive with updated statuses
      const updatedActiveConnections = allConnections.filter(
        (c) => c.status === 'active' && (!c.lastUsedAt || new Date(c.lastUsedAt) >= thirtyDaysAgo)
      );
      const updatedInactiveConnections = allConnections.filter(
        (c) => c.status !== 'active' || (c.lastUsedAt && new Date(c.lastUsedAt) < thirtyDaysAgo)
      );

      // Count connections by status
      const connectionsByStatus = {
        active: allConnections.filter((c) => c.status === 'active').length,
        expired: allConnections.filter((c) => c.status === 'expired').length,
        error: allConnections.filter((c) => c.status === 'error').length,
        revoked: allConnections.filter((c) => c.status === 'revoked').length,
        archived: allConnections.filter((c) => c.status === 'archived').length,
      };

      return {
        totalConnections: allConnections.length,
        activeConnections: updatedActiveConnections.length,
        inactiveConnections: updatedInactiveConnections.length,
        totalUsageCount,
        connectionsByStatus,
        mostUsedConnections,
        recentlyUsedConnections,
        unusedConnections,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getConnectionUsageStats',
        tenantId,
        userId,
        integrationId,
      });
      throw error;
    }
  }

  // Helpers for OAuth Config
  private getClientId(config: OAuthConfig): string {
    return process.env[config.clientIdEnvVar || ''] || config.additionalParams?.client_id || '';
  }

  private getClientSecret(config: OAuthConfig): string {
    return process.env[config.clientSecretEnvVar || ''] || config.additionalParams?.client_secret || '';
  }
}