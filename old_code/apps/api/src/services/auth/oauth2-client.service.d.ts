import type { Container } from '@azure/cosmos';
import type { OAuth2Client, OAuth2GrantType, CreateOAuth2ClientRequest, UpdateOAuth2ClientRequest, OAuth2ClientResponse, OAuth2ClientWithSecret } from '../../types/oauth2.types.js';
/**
 * OAuth2 Client Service
 * Manages OAuth2 client registration and storage in Cosmos DB
 */
export declare class OAuth2ClientService {
    private container;
    constructor(container: Container);
    /**
     * Create a new OAuth2 client
     */
    createClient(data: CreateOAuth2ClientRequest, tenantId: string, createdBy: string): Promise<OAuth2ClientWithSecret>;
    /**
     * Get OAuth2 client by ID
     */
    getClientById(clientId: string, tenantId: string): Promise<OAuth2Client | null>;
    /**
     * Get OAuth2 client response (public view without secret)
     */
    getClientResponseById(clientId: string, tenantId: string): Promise<OAuth2ClientResponse | null>;
    /**
     * List OAuth2 clients for a tenant
     */
    listClients(tenantId: string, limit?: number): Promise<OAuth2ClientResponse[]>;
    /**
     * Update OAuth2 client
     */
    updateClient(clientId: string, tenantId: string, updates: UpdateOAuth2ClientRequest): Promise<OAuth2ClientResponse>;
    /**
     * Delete OAuth2 client
     */
    deleteClient(clientId: string, tenantId: string): Promise<void>;
    /**
     * Regenerate client secret (confidential clients only)
     */
    regenerateSecret(clientId: string, tenantId: string): Promise<OAuth2ClientWithSecret>;
    /**
     * Verify client credentials
     */
    verifyClientCredentials(clientId: string, clientSecret: string, tenantId: string): Promise<boolean>;
    /**
     * Validate client can use a specific grant type
     */
    validateGrantType(clientId: string, tenantId: string, grantType: OAuth2GrantType): Promise<boolean>;
    /**
     * Validate client can use specific scopes
     */
    validateClientScopes(clientId: string, tenantId: string, requestedScopes: string[]): Promise<boolean>;
    /**
     * Validate redirect URI
     */
    validateRedirectUri(clientId: string, tenantId: string, redirectUri: string): Promise<boolean>;
    /**
     * Update last used timestamp
     */
    updateLastUsed(clientId: string, tenantId: string): Promise<void>;
    /**
     * Hash client secret using SHA-256
     */
    private hashSecret;
    /**
     * Validate redirect URIs
     */
    private validateRedirectUris;
    /**
     * Validate scopes
     */
    private validateScopes;
    /**
     * Convert OAuth2Client to public response (exclude secret)
     */
    private toClientResponse;
}
//# sourceMappingURL=oauth2-client.service.d.ts.map