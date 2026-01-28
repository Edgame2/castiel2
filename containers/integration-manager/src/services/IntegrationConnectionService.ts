/**
 * Integration Connection Service
 * Manages OAuth flows and credential storage using Secret Management service
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { IntegrationService } from './IntegrationService';
import { IntegrationProviderService } from './IntegrationProviderService';
import {
  IntegrationConnection,
  OAuthState,
  OAuthTokens,
  ConnectionCredentials,
  CreateConnectionInput,
  UpdateConnectionInput,
  OAuthConfig,
} from '../types/integration-connection.types';
import { Integration } from '../types/integration.types';

export class IntegrationConnectionService {
  private config: ReturnType<typeof loadConfig>;
  private secretManagementClient: ServiceClient;
  private integrationService: IntegrationService;
  private providerService: IntegrationProviderService;
  private app: FastifyInstance | null = null;
  private readonly OAUTH_STATE_TTL = 600; // 10 minutes
  private oauthStates: Map<string, OAuthState> = new Map(); // In-memory cache (could use Redis in production)

  constructor(
    app?: FastifyInstance,
    integrationService?: IntegrationService,
    providerService?: IntegrationProviderService
  ) {
    this.app = app || null;
    this.config = loadConfig();

    if (!this.config.services?.secret_management?.url) {
      throw new Error('Secret management service URL must be configured');
    }

    this.secretManagementClient = new ServiceClient({
      baseURL: this.config.services.secret_management.url,
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.integrationService = integrationService || new IntegrationService(this.config.services.secret_management.url);
    this.providerService = providerService || new IntegrationProviderService();
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'integration-manager',
      serviceName: 'integration-manager',
      tenantId,
    });
  }

  // =====================
  // OAuth Flow
  // =====================

  /**
   * Start OAuth flow
   */
  async startOAuthFlow(
    integrationId: string,
    tenantId: string,
    userId: string,
    returnUrl: string
  ): Promise<{ authorizationUrl: string; state: string }> {
    // Get integration instance
    const integration = await this.integrationService.getById(integrationId, tenantId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Get provider
    const provider = await this.providerService.getById(integration.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    // Check if provider supports OAuth
    if (!provider.authMethods.includes('oauth')) {
      throw new Error('Integration does not support OAuth');
    }

    // Get OAuth config from provider
    if (!provider.oauthConfig) {
      throw new Error('OAuth configuration not found for provider');
    }

    const oauthConfig: OAuthProviderConfig = {
      authorizationUrl: provider.oauthConfig.authorizationUrl,
      tokenUrl: provider.oauthConfig.tokenUrl,
      revokeUrl: provider.oauthConfig.revokeUrl,
      userInfoUrl: provider.oauthConfig.userInfoUrl,
      scopes: provider.oauthConfig.scopes,
      clientIdEnvVar: provider.oauthConfig.clientIdEnvVar,
      clientSecretEnvVar: provider.oauthConfig.clientSecretEnvVar,
      redirectUri: provider.oauthConfig.redirectUri || `${this.config.server.host}/api/v1/integrations/oauth/callback`,
      pkce: provider.oauthConfig.pkce,
      additionalParams: provider.oauthConfig.additionalParams,
    };

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

    // Store state (in-memory for now, should use Redis in production)
    this.oauthStates.set(state, oauthState);
    setTimeout(() => this.oauthStates.delete(state), this.OAUTH_STATE_TTL * 1000);

    const authUrl = new URL(oauthConfig.authorizationUrl);
    authUrl.searchParams.set('client_id', this.getClientId(oauthConfig));
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    if (oauthConfig.pkce && codeVerifier) {
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    }

    if (oauthConfig.additionalParams) {
      for (const [key, value] of Object.entries(oauthConfig.additionalParams)) {
        authUrl.searchParams.set(key, value);
      }
    }

    log.info('OAuth flow started', {
      integrationId: integration.id,
      tenantId,
      userId,
      service: 'integration-manager',
    });

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{
    success: boolean;
    returnUrl: string;
    error?: string;
    connectionId?: string;
    integrationId?: string;
  }> {
    const oauthState = this.oauthStates.get(state);
    if (!oauthState) {
      return {
        success: false,
        returnUrl: '/',
        error: 'Invalid or expired OAuth state',
      };
    }

    this.oauthStates.delete(state);

    try {
      const integration = await this.integrationService.getById(oauthState.integrationId, oauthState.tenantId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const provider = await this.providerService.getById(integration.integrationId);
      if (!provider) {
        throw new Error('Integration provider not found');
      }

      // TODO: Get OAuth config from provider
      const oauthConfig: OAuthProviderConfig = {
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: `${this.config.server.host}/api/v1/integrations/oauth/callback`,
        scopes: [],
        pkce: true,
      };

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(oauthConfig, code, oauthState.codeVerifier);

      // Create or update connection
      const connection = await this.createOrUpdateConnection(
        {
          integrationId: integration.id,
          tenantId: oauthState.tenantId,
          userId: oauthState.userId,
          credentials: {
            type: 'oauth2',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            scope: tokens.scope,
          },
        },
        integration
      );

      // Update integration status
      await this.integrationService.update(integration.id, oauthState.tenantId, {
        status: 'connected',
        connectionStatus: 'active',
        lastConnectionTestAt: new Date(),
        lastConnectionTestResult: 'success',
      });

      log.info('OAuth flow completed', {
        integrationId: integration.id,
        tenantId: oauthState.tenantId,
        connectionId: connection.id,
        service: 'integration-manager',
      });

      return {
        success: true,
        returnUrl: oauthState.returnUrl,
        connectionId: connection.id,
        integrationId: integration.id, // Include integrationId for easier lookup
      };
    } catch (error: any) {
      log.error('OAuth callback failed', error, {
        tenantId: oauthState.tenantId,
        integrationId: oauthState.integrationId,
        service: 'integration-manager',
      });

      try {
        await this.integrationService.update(oauthState.integrationId, oauthState.tenantId, {
          connectionStatus: 'error',
          connectionError: error.message,
          lastConnectionTestAt: new Date(),
          lastConnectionTestResult: 'failed',
        });
      } catch (updateError) {
        log.warn('Failed to update integration status after OAuth error', {
          error: updateError,
          service: 'integration-manager',
        });
      }

      return {
        success: false,
        returnUrl: oauthState.returnUrl,
        error: error.message,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    oauthConfig: OAuthProviderConfig,
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokens> {
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

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(connectionId: string, integrationId: string, tenantId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(connectionId, integrationId, tenantId);
      if (!connection || !connection.oauth?.refreshTokenSecretName) {
        return false;
      }

      const integration = await this.integrationService.getById(integrationId, tenantId);
      if (!integration) {
        return false;
      }

      const provider = await this.providerService.getById(integration.integrationId);
      if (!provider || !provider.oauthConfig) {
        return false;
      }

      const oauthConfig: OAuthProviderConfig = {
        authorizationUrl: provider.oauthConfig.authorizationUrl,
        tokenUrl: provider.oauthConfig.tokenUrl,
        revokeUrl: provider.oauthConfig.revokeUrl,
        userInfoUrl: provider.oauthConfig.userInfoUrl,
        scopes: provider.oauthConfig.scopes,
        clientIdEnvVar: provider.oauthConfig.clientIdEnvVar,
        clientSecretEnvVar: provider.oauthConfig.clientSecretEnvVar,
        redirectUri: provider.oauthConfig.redirectUri || `${this.config.server.host}/api/v1/integrations/oauth/callback`,
        pkce: provider.oauthConfig.pkce,
        additionalParams: provider.oauthConfig.additionalParams,
      };

      // Get refresh token from secret management
      const token = this.getServiceToken(tenantId);
      const refreshTokenResponse = await this.secretManagementClient.get<string>(
        `/api/v1/secrets/${connection.oauth.refreshTokenSecretName}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!refreshTokenResponse) {
        throw new Error('Refresh token not found');
      }

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenResponse,
        client_id: this.getClientId(oauthConfig),
        client_secret: this.getClientSecret(oauthConfig),
      });

      const response = await fetch(oauthConfig.tokenUrl, {
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
      const tokenData = data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      // Store new tokens in secret management
      const accessTokenSecretName = `int-oauth-${connectionId}-access`;
      const refreshTokenSecretName = `int-oauth-${connectionId}-refresh`;

      await this.secretManagementClient.post(
        `/api/v1/secrets/${accessTokenSecretName}`,
        {
          value: tokenData.access_token,
          tags: { integrationId, connectionId },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (tokenData.refresh_token) {
        await this.secretManagementClient.post(
          `/api/v1/secrets/${refreshTokenSecretName}`,
          {
            value: tokenData.refresh_token,
            tags: { integrationId, connectionId },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );
      }

      // Update connection
      const container = getContainer('integration_connections');
      await container.item(connectionId, integrationId).replace({
        ...connection,
        oauth: {
          ...connection.oauth,
          accessTokenSecretName,
          refreshTokenSecretName: tokenData.refresh_token ? refreshTokenSecretName : connection.oauth.refreshTokenSecretName,
          expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        },
        updatedAt: new Date(),
      });

      log.info('OAuth tokens refreshed', {
        connectionId,
        integrationId,
        tenantId,
        service: 'integration-manager',
      });

      return true;
    } catch (error: any) {
      log.error('Failed to refresh tokens', error, {
        connectionId,
        integrationId,
        tenantId,
        service: 'integration-manager',
      });
      return false;
    }
  }

  // =====================
  // Connection Management
  // =====================

  /**
   * Create or update connection
   */
  async createOrUpdateConnection(
    input: CreateConnectionInput,
    integration: Integration
  ): Promise<IntegrationConnection> {
    const scope = integration.userScoped ? 'user' : 'tenant';
    const connectionId = uuidv4();

    // Store credentials in secret management
    const token = this.getServiceToken(input.tenantId);
    let credentialSecretName = '';
    let oauth: IntegrationConnection['oauth'];

    if (input.credentials.type === 'oauth2') {
      const accessTokenSecretName = `int-oauth-${connectionId}-access`;
      const refreshTokenSecretName = input.credentials.refreshToken
        ? `int-oauth-${connectionId}-refresh`
        : undefined;

      await this.secretManagementClient.post(
        `/api/v1/secrets/${accessTokenSecretName}`,
        {
          value: input.credentials.accessToken!,
          tags: { integrationId: input.integrationId, connectionId },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': input.tenantId,
          },
        }
      );

      if (input.credentials.refreshToken) {
        await this.secretManagementClient.post(
          `/api/v1/secrets/${refreshTokenSecretName!}`,
          {
            value: input.credentials.refreshToken,
            tags: { integrationId: input.integrationId, connectionId },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': input.tenantId,
            },
          }
        );
      }

      oauth = {
        accessTokenSecretName,
        refreshTokenSecretName,
        tokenType: 'Bearer',
        expiresAt: input.credentials.expiresAt,
        scope: input.credentials.scope,
      };
    } else {
      credentialSecretName = `int-${scope}-${connectionId}-creds`;
      await this.secretManagementClient.post(
        `/api/v1/secrets/${credentialSecretName}`,
        {
          value: JSON.stringify(input.credentials),
          tags: { integrationId: input.integrationId, connectionId },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': input.tenantId,
          },
        }
      );
    }

    const connection: IntegrationConnection = {
      id: connectionId,
      integrationId: input.integrationId,
      tenantId: input.tenantId,
      userId: scope === 'user' ? input.userId : undefined,
      scope,
      authType: integration.authMethod,
      credentialSecretName,
      oauth,
      status: 'active',
      lastValidatedAt: new Date(),
      displayName: input.displayName || integration.name,
      createdBy: input.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const container = getContainer('integration_connections');
    const { resource } = await container.items.create(connection);
    return resource as IntegrationConnection;
  }

  /**
   * Get connection
   */
  async getConnection(
    connectionId: string,
    integrationId: string,
    tenantId: string
  ): Promise<IntegrationConnection | null> {
    try {
      const container = getContainer('integration_connections');
      const { resource } = await container.item(connectionId, integrationId).read();
      if (resource && resource.tenantId === tenantId) {
        return resource as IntegrationConnection;
      }
      return null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update connection
   */
  async updateConnection(
    connectionId: string,
    integrationId: string,
    tenantId: string,
    input: UpdateConnectionInput
  ): Promise<IntegrationConnection | null> {
    const existing = await this.getConnection(connectionId, integrationId, tenantId);
    if (!existing) {
      return null;
    }

    const updated: IntegrationConnection = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const container = getContainer('integration_connections');
    const { resource } = await container.item(connectionId, integrationId).replace(updated);
    return resource as IntegrationConnection;
  }

  /**
   * Delete connection
   */
  async deleteConnection(connectionId: string, integrationId: string, tenantId: string): Promise<void> {
    const connection = await this.getConnection(connectionId, integrationId, tenantId);
    if (!connection) {
      return;
    }

    // Delete secrets from secret management
    const token = this.getServiceToken(tenantId);
    try {
      if (connection.oauth) {
        await this.secretManagementClient.delete(`/api/v1/secrets/${connection.oauth.accessTokenSecretName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });
        if (connection.oauth.refreshTokenSecretName) {
          await this.secretManagementClient.delete(`/api/v1/secrets/${connection.oauth.refreshTokenSecretName}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          });
        }
      }
      if (connection.credentialSecretName) {
        await this.secretManagementClient.delete(`/api/v1/secrets/${connection.credentialSecretName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });
      }
    } catch (error: any) {
      log.warn('Failed to delete secrets', {
        error: error.message,
        connectionId,
        service: 'integration-manager',
      });
    }

    // Delete connection
    const container = getContainer('integration_connections');
    await container.item(connectionId, integrationId).delete();
  }

  /**
   * Test connection
   */
  async testConnection(
    integrationId: string,
    tenantId: string,
    connectionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const integration = await this.integrationService.getById(integrationId, tenantId);
      if (!integration) {
        return { success: false, error: 'Integration not found' };
      }

      let connection: IntegrationConnection | null = null;
      if (connectionId) {
        connection = await this.getConnection(connectionId, integrationId, tenantId);
      } else {
        // Get default connection for integration
        const container = getContainer('integration_connections');
        const { resources } = await container.items
          .query<IntegrationConnection>({
            query:
              'SELECT * FROM c WHERE c.integrationId = @integrationId AND c.tenantId = @tenantId AND c.status = "active" LIMIT 1',
            parameters: [
              { name: '@integrationId', value: integrationId },
              { name: '@tenantId', value: tenantId },
            ],
          })
          .fetchNext();
        connection = resources[0] || null;
      }

      if (!connection) {
        return { success: false, error: 'No connection found' };
      }

      // Verify credentials exist in secret management
      const token = this.getServiceToken(tenantId);
      if (connection.oauth?.accessTokenSecretName) {
        await this.secretManagementClient.get(`/api/v1/secrets/${connection.oauth.accessTokenSecretName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });
      } else if (connection.credentialSecretName) {
        await this.secretManagementClient.get(`/api/v1/secrets/${connection.credentialSecretName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection test failed' };
    }
  }

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
    const integration = await this.integrationService.getById(integrationId, tenantId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return this.createOrUpdateConnection(
      {
        integrationId,
        tenantId,
        userId,
        credentials: {
          type: 'api_key',
          apiKey,
        },
        displayName,
      },
      integration
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
    const integration = await this.integrationService.getById(integrationId, tenantId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return this.createOrUpdateConnection(
      {
        integrationId,
        tenantId,
        userId,
        credentials: {
          type: 'basic',
          username,
          password,
        },
        displayName,
      },
      integration
    );
  }

  // =====================
  // Helpers
  // =====================

  private getClientId(config: OAuthConfig): string {
    return process.env[config.clientIdEnvVar || ''] || config.additionalParams?.client_id || '';
  }

  private getClientSecret(config: OAuthConfig): string {
    return process.env[config.clientSecretEnvVar || ''] || config.additionalParams?.client_secret || '';
  }
}
