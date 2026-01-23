import { randomBytes, createHash } from 'crypto';
/**
 * Credential types supported by the secure credential service
 */
export var CredentialType;
(function (CredentialType) {
    CredentialType["OAUTH_ACCESS_TOKEN"] = "oauth_access_token";
    CredentialType["OAUTH_REFRESH_TOKEN"] = "oauth_refresh_token";
    CredentialType["API_KEY"] = "api_key";
    CredentialType["BASIC_AUTH_USERNAME"] = "basic_auth_username";
    CredentialType["BASIC_AUTH_PASSWORD"] = "basic_auth_password";
    CredentialType["CLIENT_CERTIFICATE"] = "client_certificate";
    CredentialType["CLIENT_PRIVATE_KEY"] = "client_private_key";
    CredentialType["WEBHOOK_SECRET"] = "webhook_secret";
    CredentialType["CUSTOM_SECRET"] = "custom_secret";
})(CredentialType || (CredentialType = {}));
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
export class SecureCredentialService {
    keyVault;
    monitoring;
    connectionRepo;
    integrationRepo;
    localEncryptionKey;
    // In-memory cache for credential metadata (not secrets)
    metadataCache = new Map();
    METADATA_CACHE_TTL = 300000; // 5 minutes
    // Default rotation policies
    DEFAULT_ROTATION_POLICIES = {
        [CredentialType.OAUTH_ACCESS_TOKEN]: {
            enabled: false, // OAuth tokens refresh automatically
            rotateAfterDays: 0,
            warnBeforeDays: 0,
            autoRotate: false,
            notifyOnExpiry: false,
        },
        [CredentialType.OAUTH_REFRESH_TOKEN]: {
            enabled: true,
            rotateAfterDays: 90,
            warnBeforeDays: 14,
            autoRotate: false, // Requires re-auth
            notifyOnExpiry: true,
        },
        [CredentialType.API_KEY]: {
            enabled: true,
            rotateAfterDays: 90,
            warnBeforeDays: 14,
            autoRotate: false, // Requires provider API call
            notifyOnExpiry: true,
        },
        [CredentialType.BASIC_AUTH_PASSWORD]: {
            enabled: true,
            rotateAfterDays: 90,
            warnBeforeDays: 14,
            autoRotate: false,
            notifyOnExpiry: true,
        },
        [CredentialType.BASIC_AUTH_USERNAME]: {
            enabled: false,
            rotateAfterDays: 0,
            warnBeforeDays: 0,
            autoRotate: false,
            notifyOnExpiry: false,
        },
        [CredentialType.CLIENT_CERTIFICATE]: {
            enabled: true,
            rotateAfterDays: 365,
            warnBeforeDays: 30,
            autoRotate: false,
            notifyOnExpiry: true,
        },
        [CredentialType.CLIENT_PRIVATE_KEY]: {
            enabled: true,
            rotateAfterDays: 365,
            warnBeforeDays: 30,
            autoRotate: false,
            notifyOnExpiry: true,
        },
        [CredentialType.WEBHOOK_SECRET]: {
            enabled: true,
            rotateAfterDays: 180,
            warnBeforeDays: 14,
            autoRotate: true, // Can be rotated automatically
            notifyOnExpiry: false,
        },
        [CredentialType.CUSTOM_SECRET]: {
            enabled: true,
            rotateAfterDays: 90,
            warnBeforeDays: 14,
            autoRotate: false,
            notifyOnExpiry: true,
        },
    };
    constructor(options) {
        this.keyVault = options.keyVault;
        this.monitoring = options.monitoring;
        this.connectionRepo = options.connectionRepository;
        this.integrationRepo = options.integrationRepository;
        if (options.localEncryptionKey) {
            this.localEncryptionKey = createHash('sha256')
                .update(options.localEncryptionKey)
                .digest();
        }
    }
    // =====================
    // Credential Storage
    // =====================
    /**
     * Store a credential securely in Azure Key Vault
     */
    async storeCredential(tenantId, integrationId, connectionId, credentialType, credentialValue, options) {
        const credentialId = this.generateCredentialId();
        const keyVaultSecretName = this.buildSecretName(tenantId, integrationId, connectionId, credentialType);
        try {
            // Store in Key Vault
            const secretResult = await this.keyVault.setSecret(keyVaultSecretName, credentialValue, {
                contentType: credentialType,
                tags: {
                    tenantId,
                    integrationId,
                    connectionId,
                    credentialType,
                    credentialId,
                    ...options?.tags,
                },
                enabled: true,
                expiresOn: options?.expiresAt,
            });
            // Create metadata record
            const metadata = {
                credentialId,
                tenantId,
                integrationId,
                connectionId,
                credentialType,
                keyVaultSecretName,
                createdAt: new Date(),
                expiresAt: options?.expiresAt,
                rotationPolicy: {
                    ...this.DEFAULT_ROTATION_POLICIES[credentialType],
                    ...options?.rotationPolicy,
                },
                tags: options?.tags,
            };
            // Cache metadata
            this.metadataCache.set(credentialId, metadata);
            this.monitoring.trackEvent('credential.stored', {
                tenantId,
                integrationId,
                connectionId,
                credentialType,
                credentialId,
                keyVaultSecretName,
            });
            return {
                credentialId,
                keyVaultSecretName: secretResult.name,
                version: secretResult.version,
                expiresAt: options?.expiresAt,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'credential.store',
                tenantId,
                integrationId,
                credentialType,
            });
            throw new Error(`Failed to store credential in Key Vault: ${error.message}`);
        }
    }
    /**
     * Store OAuth credentials (access + refresh tokens)
     */
    async storeOAuthCredentials(tenantId, integrationId, connectionId, accessToken, refreshToken, expiresIn, // seconds
    options) {
        const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
        // Store access token
        const accessTokenResult = await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.OAUTH_ACCESS_TOKEN, accessToken, {
            expiresAt: accessTokenExpiresAt,
            tags: {
                scope: options?.scope?.join(',') || '',
                ...options?.tags,
            },
        });
        // Store refresh token (no expiry unless provider specifies)
        const refreshTokenResult = await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.OAUTH_REFRESH_TOKEN, refreshToken, {
            tags: options?.tags,
        });
        return {
            accessTokenCredentialId: accessTokenResult.credentialId,
            refreshTokenCredentialId: refreshTokenResult.credentialId,
        };
    }
    /**
     * Store certificate-based authentication credentials
     */
    async storeCertificateAuth(tenantId, integrationId, connectionId, config, options) {
        // Store certificate
        const certificateResult = await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.CLIENT_CERTIFICATE, config.certificate, {
            expiresAt: options?.expiresAt,
            tags: options?.tags,
        });
        // Store private key (with passphrase if provided)
        const privateKeyValue = config.passphrase
            ? JSON.stringify({ key: config.privateKey, passphrase: config.passphrase })
            : config.privateKey;
        const privateKeyResult = await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.CLIENT_PRIVATE_KEY, privateKeyValue, {
            expiresAt: options?.expiresAt,
            tags: options?.tags,
        });
        return {
            certificateCredentialId: certificateResult.credentialId,
            privateKeyCredentialId: privateKeyResult.credentialId,
        };
    }
    // =====================
    // Credential Retrieval
    // =====================
    /**
     * Get a credential from Key Vault
     */
    async getCredential(credentialId, options) {
        // Get metadata
        const metadata = this.metadataCache.get(credentialId);
        if (!metadata) {
            throw new Error(`Credential metadata not found: ${credentialId}`);
        }
        // Check if expired
        if (metadata.expiresAt && metadata.expiresAt < new Date()) {
            this.monitoring.trackEvent('credential.expired', {
                credentialId,
                tenantId: metadata.tenantId,
                integrationId: metadata.integrationId,
                credentialType: metadata.credentialType,
            });
            throw new Error(`Credential expired: ${credentialId}`);
        }
        try {
            // Retrieve from Key Vault
            const secretResult = await this.keyVault.getSecret(metadata.keyVaultSecretName, {
                bypassCache: options?.bypassCache,
                required: true,
            });
            // Update last accessed timestamp
            metadata.lastAccessedAt = new Date();
            this.metadataCache.set(credentialId, metadata);
            this.monitoring.trackEvent('credential.retrieved', {
                credentialId,
                tenantId: metadata.tenantId,
                integrationId: metadata.integrationId,
                credentialType: metadata.credentialType,
                fromCache: secretResult.fromCache,
            });
            return {
                value: secretResult.value,
                metadata,
                fromCache: secretResult.fromCache,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'credential.retrieve',
                credentialId,
                tenantId: metadata.tenantId,
            });
            throw new Error(`Failed to retrieve credential from Key Vault: ${error.message}`);
        }
    }
    /**
     * Get OAuth access token (with automatic refresh if expired)
     */
    async getOAuthAccessToken(tenantId, integrationId, connectionId, options) {
        const autoRefresh = options?.autoRefresh ?? true;
        // Find access token credential
        const accessTokenMetadata = Array.from(this.metadataCache.values()).find((m) => m.tenantId === tenantId &&
            m.integrationId === integrationId &&
            m.connectionId === connectionId &&
            m.credentialType === CredentialType.OAUTH_ACCESS_TOKEN);
        if (!accessTokenMetadata) {
            throw new Error('OAuth access token not found');
        }
        // Check if token is expired or expiring soon (within 5 minutes)
        const isExpired = accessTokenMetadata.expiresAt &&
            accessTokenMetadata.expiresAt.getTime() - Date.now() < 300000;
        if (isExpired && autoRefresh) {
            // Attempt to refresh token
            const refreshed = await this.refreshOAuthToken(tenantId, integrationId, connectionId);
            if (refreshed) {
                // Get the new access token
                const newAccessTokenMetadata = Array.from(this.metadataCache.values()).find((m) => m.tenantId === tenantId &&
                    m.integrationId === integrationId &&
                    m.connectionId === connectionId &&
                    m.credentialType === CredentialType.OAUTH_ACCESS_TOKEN);
                if (!newAccessTokenMetadata) {
                    throw new Error('Failed to retrieve refreshed access token');
                }
                const result = await this.getCredential(newAccessTokenMetadata.credentialId);
                return result.value;
            }
            else {
                throw new Error('Failed to refresh expired OAuth token');
            }
        }
        // Get current access token
        const result = await this.getCredential(accessTokenMetadata.credentialId);
        return result.value;
    }
    /**
     * Refresh OAuth access token using refresh token
     */
    async refreshOAuthToken(tenantId, integrationId, connectionId) {
        try {
            // Get integration definition
            // Note: IntegrationRepository doesn't have findByName
            // We need to use IntegrationProviderRepository.findByProviderName instead
            // But we only have integrationId, so we'll need to look it up differently
            // For now, we'll use a workaround - this method should receive providerName instead
            // TODO: Refactor to use providerName or find integration by ID properly
            const { IntegrationProviderRepository } = await import('../repositories/integration.repository.js');
            const providerRepo = new IntegrationProviderRepository(this.integrationRepo['container'].database.client, this.integrationRepo['container'].database.id, 'integration_providers');
            // Try to find by provider name (assuming integrationId is actually providerName)
            const integration = await providerRepo.findByProviderName(integrationId);
            if (!integration || !integration.oauthConfig) {
                throw new Error('Integration OAuth configuration not found');
            }
            // Find refresh token credential
            const refreshTokenMetadata = Array.from(this.metadataCache.values()).find((m) => m.tenantId === tenantId &&
                m.integrationId === integrationId &&
                m.connectionId === connectionId &&
                m.credentialType === CredentialType.OAUTH_REFRESH_TOKEN);
            if (!refreshTokenMetadata) {
                throw new Error('OAuth refresh token not found');
            }
            // Get refresh token
            const refreshTokenResult = await this.getCredential(refreshTokenMetadata.credentialId);
            // Request new tokens from provider
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshTokenResult.value,
                client_id: this.getClientId(integration.oauthConfig),
                client_secret: this.getClientSecret(integration.oauthConfig),
            });
            const response = await fetch(integration.oauthConfig.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });
            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }
            const data = await response.json();
            // Delete old access token
            await this.deleteCredential(Array.from(this.metadataCache.values()).find((m) => m.tenantId === tenantId &&
                m.integrationId === integrationId &&
                m.connectionId === connectionId &&
                m.credentialType === CredentialType.OAUTH_ACCESS_TOKEN)?.credentialId || '');
            // Store new access token
            await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.OAUTH_ACCESS_TOKEN, data.access_token, {
                expiresAt: data.expires_in
                    ? new Date(Date.now() + data.expires_in * 1000)
                    : undefined,
            });
            // Update refresh token if provided
            if (data.refresh_token) {
                await this.deleteCredential(refreshTokenMetadata.credentialId);
                await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.OAUTH_REFRESH_TOKEN, data.refresh_token);
            }
            this.monitoring.trackEvent('credential.oauth.refreshed', {
                tenantId,
                integrationId,
                connectionId,
            });
            return true;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'credential.oauth.refresh',
                tenantId,
                integrationId,
                connectionId,
            });
            return false;
        }
    }
    // =====================
    // Credential Rotation
    // =====================
    /**
     * Rotate a credential (generates new value and stores it)
     */
    async rotateCredential(credentialId, newValue) {
        const metadata = this.metadataCache.get(credentialId);
        if (!metadata) {
            throw new Error(`Credential metadata not found: ${credentialId}`);
        }
        // Delete old credential
        await this.deleteCredential(credentialId);
        // Store new credential
        const result = await this.storeCredential(metadata.tenantId, metadata.integrationId, metadata.connectionId, metadata.credentialType, newValue, {
            expiresAt: metadata.rotationPolicy?.enabled
                ? new Date(Date.now() +
                    metadata.rotationPolicy.rotateAfterDays * 24 * 60 * 60 * 1000)
                : undefined,
            rotationPolicy: metadata.rotationPolicy,
            tags: metadata.tags,
        });
        this.monitoring.trackEvent('credential.rotated', {
            credentialId,
            newCredentialId: result.credentialId,
            tenantId: metadata.tenantId,
            integrationId: metadata.integrationId,
            credentialType: metadata.credentialType,
        });
        return result;
    }
    /**
     * Rotate webhook secret (generates random value automatically)
     */
    async rotateWebhookSecret(tenantId, integrationId, connectionId) {
        // Generate new webhook secret
        const newSecret = randomBytes(32).toString('hex');
        // Find existing webhook secret
        const existingMetadata = Array.from(this.metadataCache.values()).find((m) => m.tenantId === tenantId &&
            m.integrationId === integrationId &&
            m.connectionId === connectionId &&
            m.credentialType === CredentialType.WEBHOOK_SECRET);
        if (existingMetadata) {
            // Rotate existing
            const result = await this.rotateCredential(existingMetadata.credentialId, newSecret);
            return { credentialId: result.credentialId, secret: newSecret };
        }
        else {
            // Create new
            const result = await this.storeCredential(tenantId, integrationId, connectionId, CredentialType.WEBHOOK_SECRET, newSecret);
            return { credentialId: result.credentialId, secret: newSecret };
        }
    }
    // =====================
    // Credential Deletion
    // =====================
    /**
     * Delete a credential from Key Vault
     */
    async deleteCredential(credentialId) {
        const metadata = this.metadataCache.get(credentialId);
        if (!metadata) {
            throw new Error(`Credential metadata not found: ${credentialId}`);
        }
        try {
            // Delete from Key Vault
            await this.keyVault.deleteSecret(metadata.keyVaultSecretName);
            // Remove from cache
            this.metadataCache.delete(credentialId);
            this.monitoring.trackEvent('credential.deleted', {
                credentialId,
                tenantId: metadata.tenantId,
                integrationId: metadata.integrationId,
                credentialType: metadata.credentialType,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'credential.delete',
                credentialId,
            });
            throw new Error(`Failed to delete credential from Key Vault: ${error.message}`);
        }
    }
    /**
     * Delete all credentials for a connection
     */
    async deleteConnectionCredentials(tenantId, integrationId, connectionId) {
        const credentials = Array.from(this.metadataCache.values()).filter((m) => m.tenantId === tenantId &&
            m.integrationId === integrationId &&
            m.connectionId === connectionId);
        let deletedCount = 0;
        for (const credential of credentials) {
            try {
                await this.deleteCredential(credential.credentialId);
                deletedCount++;
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'credential.delete_connection',
                    credentialId: credential.credentialId,
                });
            }
        }
        return deletedCount;
    }
    // =====================
    // Expiry Monitoring
    // =====================
    /**
     * List credentials expiring within a given number of days
     */
    async listExpiringCredentials(daysUntilExpiry, options) {
        const now = Date.now();
        const expiryThreshold = now + daysUntilExpiry * 24 * 60 * 60 * 1000;
        const expiring = [];
        for (const metadata of this.metadataCache.values()) {
            // Apply filters
            if (options?.tenantId && metadata.tenantId !== options.tenantId) {
                continue;
            }
            if (options?.integrationId && metadata.integrationId !== options.integrationId) {
                continue;
            }
            if (options?.credentialTypes &&
                !options.credentialTypes.includes(metadata.credentialType)) {
                continue;
            }
            // Check expiry
            if (metadata.expiresAt && metadata.expiresAt.getTime() <= expiryThreshold) {
                expiring.push({
                    credentialId: metadata.credentialId,
                    tenantId: metadata.tenantId,
                    integrationId: metadata.integrationId,
                    connectionId: metadata.connectionId,
                    credentialType: metadata.credentialType,
                    expiresAt: metadata.expiresAt,
                    daysUntilExpiry: Math.floor((metadata.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000)),
                });
            }
        }
        // Sort by days until expiry (ascending)
        expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        return expiring;
    }
    /**
     * Check for credentials requiring rotation
     */
    async checkRotationRequired() {
        const requiresRotation = [];
        const now = Date.now();
        for (const metadata of this.metadataCache.values()) {
            if (!metadata.rotationPolicy?.enabled) {
                continue;
            }
            const rotationDeadline = metadata.rotatedAt?.getTime() || (metadata.createdAt.getTime() +
                metadata.rotationPolicy.rotateAfterDays * 24 * 60 * 60 * 1000);
            const warnThreshold = rotationDeadline -
                (metadata.rotationPolicy.warnBeforeDays * 24 * 60 * 60 * 1000);
            if (now >= warnThreshold) {
                requiresRotation.push({
                    credentialId: metadata.credentialId,
                    tenantId: metadata.tenantId,
                    integrationId: metadata.integrationId,
                    connectionId: metadata.connectionId,
                    credentialType: metadata.credentialType,
                    expiresAt: new Date(rotationDeadline),
                    daysUntilExpiry: Math.floor((rotationDeadline - now) / (24 * 60 * 60 * 1000)),
                });
            }
        }
        return requiresRotation;
    }
    // =====================
    // Utility Methods
    // =====================
    /**
     * Build Key Vault secret name from components
     */
    buildSecretName(tenantId, integrationId, connectionId, credentialType) {
        // Format: integration-{tenantId}-{integrationId}-{credentialType}-{connectionId}
        // Key Vault names: lowercase, alphanumeric, hyphens only
        return `integration-${tenantId}-${integrationId}-${credentialType}-${connectionId}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .substring(0, 127); // Key Vault name limit
    }
    /**
     * Generate unique credential ID
     */
    generateCredentialId() {
        return `cred_${Date.now()}_${randomBytes(8).toString('hex')}`;
    }
    /**
     * Get client ID from OAuth config or Key Vault
     */
    getClientId(oauthConfig) {
        if (oauthConfig.clientIdEnvVar) {
            return process.env[oauthConfig.clientIdEnvVar] || '';
        }
        return oauthConfig.clientId || '';
    }
    /**
     * Get client secret from OAuth config or Key Vault
     */
    getClientSecret(oauthConfig) {
        if (oauthConfig.clientSecretEnvVar) {
            return process.env[oauthConfig.clientSecretEnvVar] || '';
        }
        return oauthConfig.clientSecret || '';
    }
    /**
     * Health check for Key Vault connectivity
     */
    async healthCheck() {
        const keyVaultConnected = await this.keyVault.healthCheck();
        return {
            healthy: keyVaultConnected,
            keyVaultConnected,
            cachedCredentials: this.metadataCache.size,
        };
    }
    /**
     * Get statistics for monitoring
     */
    getStatistics() {
        const stats = {
            totalCredentials: this.metadataCache.size,
            byType: {},
            byIntegration: {},
            expiringWithin7Days: 0,
            expiringWithin30Days: 0,
        };
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        for (const metadata of this.metadataCache.values()) {
            // By type
            stats.byType[metadata.credentialType] =
                (stats.byType[metadata.credentialType] || 0) + 1;
            // By integration
            stats.byIntegration[metadata.integrationId] =
                (stats.byIntegration[metadata.integrationId] || 0) + 1;
            // Expiring soon
            if (metadata.expiresAt) {
                const timeUntilExpiry = metadata.expiresAt.getTime() - now;
                if (timeUntilExpiry <= sevenDays && timeUntilExpiry > 0) {
                    stats.expiringWithin7Days++;
                }
                if (timeUntilExpiry <= thirtyDays && timeUntilExpiry > 0) {
                    stats.expiringWithin30Days++;
                }
            }
        }
        return stats;
    }
}
//# sourceMappingURL=secure-credential.service.js.map