import type { Container } from '@azure/cosmos';
import { randomBytes, createHash } from 'crypto';
import type {
  OAuth2Client,
  OAuth2GrantType,
  CreateOAuth2ClientRequest,
  UpdateOAuth2ClientRequest,
  OAuth2ClientResponse,
  OAuth2ClientWithSecret,
} from '../../types/oauth2.types.js';
import { OAuth2ClientStatus } from '../../types/oauth2.types.js';

/**
 * OAuth2 Client Service
 * Manages OAuth2 client registration and storage in Cosmos DB
 */
export class OAuth2ClientService {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Create a new OAuth2 client
   */
  async createClient(
    data: CreateOAuth2ClientRequest,
    tenantId: string,
    createdBy: string
  ): Promise<OAuth2ClientWithSecret> {
    // Generate client ID and secret
    const clientId = `oauth2_${randomBytes(16).toString('hex')}`;
    const clientSecret = randomBytes(32).toString('hex');
    const hashedSecret = this.hashSecret(clientSecret);

    const now = new Date().toISOString();

    const client: OAuth2Client = {
      id: clientId,
      clientSecret: data.type === 'confidential' ? hashedSecret : undefined,
      name: data.name,
      type: data.type,
      status: OAuth2ClientStatus.ACTIVE,
      tenantId,
      createdBy,
      redirectUris: data.redirectUris,
      allowedGrantTypes: data.allowedGrantTypes,
      allowedScopes: data.allowedScopes,
      accessTokenTTL: data.accessTokenTTL || 3600, // Default: 1 hour
      refreshTokenTTL: data.refreshTokenTTL || 2592000, // Default: 30 days
      description: data.description,
      logoUri: data.logoUri,
      metadata: {
        createdAt: now,
      },
    };

    // Validate redirect URIs
    this.validateRedirectUris(client.redirectUris);

    // Validate scopes
    this.validateScopes(client.allowedScopes);

    // Store in Cosmos DB
    await this.container.items.create(client);

    // Return response with plain text secret (only shown once)
    return {
      ...this.toClientResponse(client),
      clientSecret, // Plain text secret
    };
  }

  /**
   * Get OAuth2 client by ID
   */
  async getClientById(clientId: string, tenantId: string): Promise<OAuth2Client | null> {
    try {
      const { resource } = await this.container.item(clientId, tenantId).read<OAuth2Client>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get OAuth2 client response (public view without secret)
   */
  async getClientResponseById(clientId: string, tenantId: string): Promise<OAuth2ClientResponse | null> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return null;
    }
    return this.toClientResponse(client);
  }

  /**
   * List OAuth2 clients for a tenant
   */
  async listClients(tenantId: string, limit: number = 100): Promise<OAuth2ClientResponse[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.metadata.createdAt DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@limit', value: limit },
      ],
    };

    const { resources } = await this.container.items.query<OAuth2Client>(query).fetchAll();
    return resources.map(client => this.toClientResponse(client));
  }

  /**
   * Update OAuth2 client
   */
  async updateClient(
    clientId: string,
    tenantId: string,
    updates: UpdateOAuth2ClientRequest
  ): Promise<OAuth2ClientResponse> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      throw new Error('OAuth2 client not found');
    }

    // Validate redirect URIs if provided
    if (updates.redirectUris) {
      this.validateRedirectUris(updates.redirectUris);
    }

    // Validate scopes if provided
    if (updates.allowedScopes) {
      this.validateScopes(updates.allowedScopes);
    }

    const updatedClient: OAuth2Client = {
      ...client,
      ...(updates.name && { name: updates.name }),
      ...(updates.status && { status: updates.status }),
      ...(updates.redirectUris && { redirectUris: updates.redirectUris }),
      ...(updates.allowedGrantTypes && { allowedGrantTypes: updates.allowedGrantTypes }),
      ...(updates.allowedScopes && { allowedScopes: updates.allowedScopes }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.logoUri !== undefined && { logoUri: updates.logoUri }),
      ...(updates.accessTokenTTL && { accessTokenTTL: updates.accessTokenTTL }),
      ...(updates.refreshTokenTTL && { refreshTokenTTL: updates.refreshTokenTTL }),
      metadata: {
        ...client.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.container.item(clientId, tenantId).replace(updatedClient);
    return this.toClientResponse(updatedClient);
  }

  /**
   * Delete OAuth2 client
   */
  async deleteClient(clientId: string, tenantId: string): Promise<void> {
    await this.container.item(clientId, tenantId).delete();
  }

  /**
   * Regenerate client secret (confidential clients only)
   */
  async regenerateSecret(clientId: string, tenantId: string): Promise<OAuth2ClientWithSecret> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      throw new Error('OAuth2 client not found');
    }

    if (client.type !== 'confidential') {
      throw new Error('Cannot regenerate secret for public clients');
    }

    // Generate new secret
    const clientSecret = randomBytes(32).toString('hex');
    const hashedSecret = this.hashSecret(clientSecret);

    const updatedClient: OAuth2Client = {
      ...client,
      clientSecret: hashedSecret,
      metadata: {
        ...client.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.container.item(clientId, tenantId).replace(updatedClient);

    // Return response with plain text secret (only shown once)
    return {
      ...this.toClientResponse(updatedClient),
      clientSecret, // Plain text secret
    };
  }

  /**
   * Verify client credentials
   */
  async verifyClientCredentials(clientId: string, clientSecret: string, tenantId: string): Promise<boolean> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return false;
    }

    // Check if client is active
    if (client.status !== OAuth2ClientStatus.ACTIVE) {
      return false;
    }

    // Public clients don't have secrets
    if (client.type === 'public') {
      return true; // No secret to verify
    }

    // Verify hashed secret
    if (!client.clientSecret) {
      return false;
    }

    const hashedSecret = this.hashSecret(clientSecret);
    return hashedSecret === client.clientSecret;
  }

  /**
   * Validate client can use a specific grant type
   */
  async validateGrantType(
    clientId: string,
    tenantId: string,
    grantType: OAuth2GrantType
  ): Promise<boolean> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return false;
    }

    if (client.status !== OAuth2ClientStatus.ACTIVE) {
      return false;
    }

    return client.allowedGrantTypes.includes(grantType);
  }

  /**
   * Validate client can use specific scopes
   */
  async validateClientScopes(clientId: string, tenantId: string, requestedScopes: string[]): Promise<boolean> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return false;
    }

    // Check if all requested scopes are allowed
    return requestedScopes.every(scope => client.allowedScopes.includes(scope));
  }

  /**
   * Validate redirect URI
   */
  async validateRedirectUri(clientId: string, tenantId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return false;
    }

    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(clientId: string, tenantId: string): Promise<void> {
    const client = await this.getClientById(clientId, tenantId);
    if (!client) {
      return;
    }

    const updatedClient: OAuth2Client = {
      ...client,
      metadata: {
        ...client.metadata,
        lastUsedAt: new Date().toISOString(),
      },
    };

    await this.container.item(clientId, tenantId).replace(updatedClient);
  }

  /**
   * Hash client secret using SHA-256
   */
  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Validate redirect URIs
   */
  private validateRedirectUris(redirectUris: string[]): void {
    if (redirectUris.length === 0) {
      throw new Error('At least one redirect URI is required');
    }

    for (const uri of redirectUris) {
      try {
        const url = new URL(uri);
        // Must be HTTPS in production (or http://localhost for development)
        if (url.protocol !== 'https:' && !uri.startsWith('http://localhost')) {
          throw new Error(`Redirect URI must use HTTPS: ${uri}`);
        }
      } catch (error) {
        throw new Error(`Invalid redirect URI: ${uri}`);
      }
    }
  }

  /**
   * Validate scopes
   */
  private validateScopes(scopes: string[]): void {
    if (scopes.length === 0) {
      throw new Error('At least one scope is required');
    }

    // Validate scope format (alphanumeric, underscore, colon, dot)
    const scopeRegex = /^[a-z0-9_:\.]+$/;
    for (const scope of scopes) {
      if (!scopeRegex.test(scope)) {
        throw new Error(`Invalid scope format: ${scope}`);
      }
    }
  }

  /**
   * Convert OAuth2Client to public response (exclude secret)
   */
  private toClientResponse(client: OAuth2Client): OAuth2ClientResponse {
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      status: client.status,
      tenantId: client.tenantId,
      redirectUris: client.redirectUris,
      allowedGrantTypes: client.allowedGrantTypes,
      allowedScopes: client.allowedScopes,
      accessTokenTTL: client.accessTokenTTL,
      refreshTokenTTL: client.refreshTokenTTL,
      description: client.description,
      logoUri: client.logoUri,
      metadata: client.metadata,
    };
  }
}
