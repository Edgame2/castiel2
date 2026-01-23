import { KeyVaultService } from '@castiel/key-vault';
import { IMonitoringProvider } from '@castiel/monitoring';
import { IntegrationConnectionRepository, IntegrationRepository } from '../repositories/integration.repository.js';
/**
 * Credential types supported by the secure credential service
 */
export declare enum CredentialType {
    OAUTH_ACCESS_TOKEN = "oauth_access_token",
    OAUTH_REFRESH_TOKEN = "oauth_refresh_token",
    API_KEY = "api_key",
    BASIC_AUTH_USERNAME = "basic_auth_username",
    BASIC_AUTH_PASSWORD = "basic_auth_password",
    CLIENT_CERTIFICATE = "client_certificate",
    CLIENT_PRIVATE_KEY = "client_private_key",
    WEBHOOK_SECRET = "webhook_secret",
    CUSTOM_SECRET = "custom_secret"
}
/**
 * Credential metadata stored in Cosmos DB (not the actual secret)
 */
export interface CredentialMetadata {
    credentialId: string;
    tenantId: string;
    integrationId: string;
    connectionId: string;
    credentialType: CredentialType;
    keyVaultSecretName: string;
    createdAt: Date;
    expiresAt?: Date;
    rotatedAt?: Date;
    lastAccessedAt?: Date;
    rotationPolicy?: CredentialRotationPolicy;
    tags?: Record<string, string>;
}
/**
 * Rotation policy for credentials
 */
export interface CredentialRotationPolicy {
    enabled: boolean;
    rotateAfterDays: number;
    warnBeforeDays: number;
    autoRotate: boolean;
    notifyOnExpiry: boolean;
}
/**
 * Certificate-based authentication configuration
 */
export interface CertificateAuthConfig {
    certificate: string;
    privateKey: string;
    passphrase?: string;
    ca?: string[];
}
/**
 * Credential storage result
 */
export interface StoreCredentialResult {
    credentialId: string;
    keyVaultSecretName: string;
    version: string;
    expiresAt?: Date;
}
/**
 * Credential retrieval result
 */
export interface CredentialResult {
    value: string;
    metadata: CredentialMetadata;
    fromCache: boolean;
}
/**
 * Expiring credential warning
 */
export interface ExpiringCredential {
    credentialId: string;
    tenantId: string;
    integrationId: string;
    connectionId: string;
    credentialType: CredentialType;
    expiresAt: Date;
    daysUntilExpiry: number;
}
interface SecureCredentialServiceOptions {
    keyVault: KeyVaultService;
    monitoring: IMonitoringProvider;
    connectionRepository: IntegrationConnectionRepository;
    integrationRepository: IntegrationRepository;
    localEncryptionKey?: string;
}
/**
 * Secure Credential Service
 *
 * Manages integration credentials with Azure Key Vault, providing:
 * - Encrypted credential storage in Key Vault
 * - Automatic OAuth token refresh
 * - Credential rotation policies
 * - Expiry monitoring
 * - Certificate-based authentication support
 * - Audit logging
 *
 * Architecture:
 * - Actual secrets stored in Azure Key Vault
 * - Metadata (non-sensitive) stored in Cosmos DB for fast queries
 * - Key Vault secret names follow pattern: integration-{tenantId}-{integrationId}-{credentialType}-{connectionId}
 */
export declare class SecureCredentialService {
    private keyVault;
    private monitoring;
    private connectionRepo;
    private integrationRepo;
    private localEncryptionKey?;
    private metadataCache;
    private readonly METADATA_CACHE_TTL;
    private readonly DEFAULT_ROTATION_POLICIES;
    constructor(options: SecureCredentialServiceOptions);
    /**
     * Store a credential securely in Azure Key Vault
     */
    storeCredential(tenantId: string, integrationId: string, connectionId: string, credentialType: CredentialType, credentialValue: string, options?: {
        expiresAt?: Date;
        rotationPolicy?: Partial<CredentialRotationPolicy>;
        tags?: Record<string, string>;
    }): Promise<StoreCredentialResult>;
    /**
     * Store OAuth credentials (access + refresh tokens)
     */
    storeOAuthCredentials(tenantId: string, integrationId: string, connectionId: string, accessToken: string, refreshToken: string, expiresIn: number, // seconds
    options?: {
        scope?: string[];
        tags?: Record<string, string>;
    }): Promise<{
        accessTokenCredentialId: string;
        refreshTokenCredentialId: string;
    }>;
    /**
     * Store certificate-based authentication credentials
     */
    storeCertificateAuth(tenantId: string, integrationId: string, connectionId: string, config: CertificateAuthConfig, options?: {
        expiresAt?: Date;
        tags?: Record<string, string>;
    }): Promise<{
        certificateCredentialId: string;
        privateKeyCredentialId: string;
    }>;
    /**
     * Get a credential from Key Vault
     */
    getCredential(credentialId: string, options?: {
        bypassCache?: boolean;
    }): Promise<CredentialResult>;
    /**
     * Get OAuth access token (with automatic refresh if expired)
     */
    getOAuthAccessToken(tenantId: string, integrationId: string, connectionId: string, options?: {
        autoRefresh?: boolean;
    }): Promise<string>;
    /**
     * Refresh OAuth access token using refresh token
     */
    refreshOAuthToken(tenantId: string, integrationId: string, connectionId: string): Promise<boolean>;
    /**
     * Rotate a credential (generates new value and stores it)
     */
    rotateCredential(credentialId: string, newValue: string): Promise<StoreCredentialResult>;
    /**
     * Rotate webhook secret (generates random value automatically)
     */
    rotateWebhookSecret(tenantId: string, integrationId: string, connectionId: string): Promise<{
        credentialId: string;
        secret: string;
    }>;
    /**
     * Delete a credential from Key Vault
     */
    deleteCredential(credentialId: string): Promise<void>;
    /**
     * Delete all credentials for a connection
     */
    deleteConnectionCredentials(tenantId: string, integrationId: string, connectionId: string): Promise<number>;
    /**
     * List credentials expiring within a given number of days
     */
    listExpiringCredentials(daysUntilExpiry: number, options?: {
        tenantId?: string;
        integrationId?: string;
        credentialTypes?: CredentialType[];
    }): Promise<ExpiringCredential[]>;
    /**
     * Check for credentials requiring rotation
     */
    checkRotationRequired(): Promise<ExpiringCredential[]>;
    /**
     * Build Key Vault secret name from components
     */
    private buildSecretName;
    /**
     * Generate unique credential ID
     */
    private generateCredentialId;
    /**
     * Get client ID from OAuth config or Key Vault
     */
    private getClientId;
    /**
     * Get client secret from OAuth config or Key Vault
     */
    private getClientSecret;
    /**
     * Health check for Key Vault connectivity
     */
    healthCheck(): Promise<{
        healthy: boolean;
        keyVaultConnected: boolean;
        cachedCredentials: number;
    }>;
    /**
     * Get statistics for monitoring
     */
    getStatistics(): {
        totalCredentials: number;
        byType: Record<CredentialType, number>;
        byIntegration: Record<string, number>;
        expiringWithin7Days: number;
        expiringWithin30Days: number;
    };
}
export {};
//# sourceMappingURL=secure-credential.service.d.ts.map