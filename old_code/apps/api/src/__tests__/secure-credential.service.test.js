import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { SecureCredentialService, CredentialType, } from '../services/secure-credential.service';
describe('SecureCredentialService', () => {
    let service;
    let mockKeyVault;
    let mockMonitoring;
    let mockConnectionRepo;
    let mockIntegrationRepo;
    beforeEach(() => {
        // Mock KeyVaultService
        mockKeyVault = {
            setSecret: vi.fn().mockResolvedValue({
                name: 'test-secret',
                version: 'v1',
            }),
            getSecret: vi.fn().mockResolvedValue({
                value: 'test-credential-value',
                fromCache: false,
                fromFallback: false,
            }),
            deleteSecret: vi.fn().mockResolvedValue(undefined),
            healthCheck: vi.fn().mockResolvedValue(true),
        };
        // Mock monitoring
        mockMonitoring = {
            trackEvent: vi.fn(),
            trackException: vi.fn(),
            trackMetric: vi.fn(),
        };
        // Mock repositories
        mockConnectionRepo = {};
        mockIntegrationRepo = {
            findByName: vi.fn().mockResolvedValue({
                id: 'salesforce',
                name: 'Salesforce',
                authType: 'oauth2',
                oauthConfig: {
                    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
                    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
                    scopes: ['api', 'refresh_token'],
                    clientIdEnvVar: 'SALESFORCE_CLIENT_ID',
                    clientSecretEnvVar: 'SALESFORCE_CLIENT_SECRET',
                    redirectUri: 'http://localhost:3000/callback',
                },
            }),
        };
        service = new SecureCredentialService({
            keyVault: mockKeyVault,
            monitoring: mockMonitoring,
            connectionRepository: mockConnectionRepo,
            integrationRepository: mockIntegrationRepo,
            localEncryptionKey: 'test-encryption-key-for-local-dev',
        });
    });
    describe('storeCredential', () => {
        it('should store a credential in Key Vault', async () => {
            const result = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345');
            expect(result).toHaveProperty('credentialId');
            expect(result).toHaveProperty('keyVaultSecretName');
            expect(result).toHaveProperty('version', 'v1');
            expect(mockKeyVault.setSecret).toHaveBeenCalledWith(expect.stringContaining('integration-tenant-123-salesforce'), 'sk_test_12345', expect.objectContaining({
                contentType: CredentialType.API_KEY,
                enabled: true,
            }));
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('credential.stored', expect.objectContaining({
                tenantId: 'tenant-123',
                integrationId: 'salesforce',
                credentialType: CredentialType.API_KEY,
            }));
        });
        it('should store credential with expiry date', async () => {
            const expiryDate = new Date(Date.now() + 86400000); // 1 day
            const result = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345', { expiresAt: expiryDate });
            expect(result.expiresAt).toEqual(expiryDate);
            expect(mockKeyVault.setSecret).toHaveBeenCalledWith(expect.any(String), 'sk_test_12345', expect.objectContaining({
                expiresOn: expiryDate,
            }));
        });
        it('should apply default rotation policy for API keys', async () => {
            const result = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345');
            expect(result).toBeDefined();
            // Metadata should have rotation policy
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('credential.stored', expect.any(Object));
        });
        it('should handle Key Vault errors gracefully', async () => {
            mockKeyVault.setSecret = vi.fn().mockRejectedValue(new Error('Key Vault unavailable'));
            await expect(service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345')).rejects.toThrow('Failed to store credential in Key Vault');
            expect(mockMonitoring.trackException).toHaveBeenCalled();
        });
    });
    describe('storeOAuthCredentials', () => {
        it('should store both access and refresh tokens', async () => {
            const result = await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'access_token_xyz', 'refresh_token_abc', 3600 // 1 hour
            );
            expect(result).toHaveProperty('accessTokenCredentialId');
            expect(result).toHaveProperty('refreshTokenCredentialId');
            expect(mockKeyVault.setSecret).toHaveBeenCalledTimes(2);
        });
        it('should set expiry for access token based on expiresIn', async () => {
            const expiresIn = 3600; // 1 hour
            const beforeCall = Date.now();
            await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'access_token_xyz', 'refresh_token_abc', expiresIn);
            const afterCall = Date.now();
            // Access token should expire in approximately 1 hour
            const setSecretCalls = mockKeyVault.setSecret.mock.calls;
            const accessTokenCall = setSecretCalls[0];
            const expiryDate = accessTokenCall[2].expiresOn;
            expect(expiryDate.getTime()).toBeGreaterThanOrEqual(beforeCall + expiresIn * 1000);
            expect(expiryDate.getTime()).toBeLessThanOrEqual(afterCall + expiresIn * 1000);
        });
    });
    describe('storeCertificateAuth', () => {
        it('should store certificate and private key', async () => {
            const result = await service.storeCertificateAuth('tenant-123', 'custom-api', 'conn-456', {
                certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
            });
            expect(result).toHaveProperty('certificateCredentialId');
            expect(result).toHaveProperty('privateKeyCredentialId');
            expect(mockKeyVault.setSecret).toHaveBeenCalledTimes(2);
        });
        it('should store private key with passphrase', async () => {
            await service.storeCertificateAuth('tenant-123', 'custom-api', 'conn-456', {
                certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
                privateKey: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
                passphrase: 'secret-passphrase',
            });
            const setSecretCalls = mockKeyVault.setSecret.mock.calls;
            const privateKeyCall = setSecretCalls[1];
            const privateKeyValue = privateKeyCall[1];
            // Should be JSON stringified with passphrase
            expect(privateKeyValue).toContain('secret-passphrase');
            expect(() => JSON.parse(privateKeyValue)).not.toThrow();
        });
    });
    describe('getCredential', () => {
        it('should retrieve credential from Key Vault', async () => {
            // First store a credential
            const storeResult = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345');
            // Then retrieve it
            const result = await service.getCredential(storeResult.credentialId);
            expect(result.value).toBe('test-credential-value');
            expect(result).toHaveProperty('metadata');
            expect(result.metadata.credentialId).toBe(storeResult.credentialId);
            expect(mockKeyVault.getSecret).toHaveBeenCalled();
        });
        it('should throw error if credential is expired', async () => {
            const expiredDate = new Date(Date.now() - 86400000); // 1 day ago
            const storeResult = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345', { expiresAt: expiredDate });
            await expect(service.getCredential(storeResult.credentialId)).rejects.toThrow('Credential expired');
        });
        it('should throw error if credential metadata not found', async () => {
            await expect(service.getCredential('nonexistent-id')).rejects.toThrow('Credential metadata not found');
        });
        it('should bypass cache when requested', async () => {
            const storeResult = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345');
            await service.getCredential(storeResult.credentialId, {
                bypassCache: true,
            });
            expect(mockKeyVault.getSecret).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ bypassCache: true }));
        });
    });
    describe('getOAuthAccessToken', () => {
        beforeEach(() => {
            // Mock successful token refresh
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    access_token: 'new_access_token',
                    refresh_token: 'new_refresh_token',
                    expires_in: 3600,
                }),
            });
            // Set environment variables for OAuth
            process.env.SALESFORCE_CLIENT_ID = 'client-123';
            process.env.SALESFORCE_CLIENT_SECRET = 'secret-456';
        });
        it('should return valid access token', async () => {
            await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'access_token_xyz', 'refresh_token_abc', 3600);
            const token = await service.getOAuthAccessToken('tenant-123', 'salesforce', 'conn-456');
            expect(token).toBe('test-credential-value');
        });
        it('should refresh token if expired', async () => {
            // Store with very short expiry (should be expired immediately)
            await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'old_access_token', 'refresh_token_abc', 1 // 1 second
            );
            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));
            const token = await service.getOAuthAccessToken('tenant-123', 'salesforce', 'conn-456', { autoRefresh: true });
            expect(global.fetch).toHaveBeenCalledWith('https://login.salesforce.com/services/oauth2/token', expect.objectContaining({
                method: 'POST',
            }));
        });
        it('should throw error if refresh fails and autoRefresh is enabled', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                statusText: 'Unauthorized',
            });
            await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'old_access_token', 'refresh_token_abc', 1);
            await new Promise((resolve) => setTimeout(resolve, 1100));
            await expect(service.getOAuthAccessToken('tenant-123', 'salesforce', 'conn-456', {
                autoRefresh: true,
            })).rejects.toThrow('Failed to refresh expired OAuth token');
        });
    });
    describe('rotateCredential', () => {
        it('should rotate credential with new value', async () => {
            const storeResult = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'old_key_12345');
            const rotateResult = await service.rotateCredential(storeResult.credentialId, 'new_key_67890');
            expect(rotateResult.credentialId).not.toBe(storeResult.credentialId);
            expect(mockKeyVault.deleteSecret).toHaveBeenCalled();
            expect(mockKeyVault.setSecret).toHaveBeenCalledWith(expect.any(String), 'new_key_67890', expect.any(Object));
        });
    });
    describe('rotateWebhookSecret', () => {
        it('should generate and store new webhook secret', async () => {
            const result = await service.rotateWebhookSecret('tenant-123', 'salesforce', 'conn-456');
            expect(result).toHaveProperty('credentialId');
            expect(result).toHaveProperty('secret');
            expect(result.secret).toHaveLength(64); // 32 bytes hex = 64 chars
            expect(mockKeyVault.setSecret).toHaveBeenCalled();
        });
        it('should rotate existing webhook secret', async () => {
            // Store initial secret
            const initial = await service.rotateWebhookSecret('tenant-123', 'salesforce', 'conn-456');
            // Rotate
            const rotated = await service.rotateWebhookSecret('tenant-123', 'salesforce', 'conn-456');
            expect(rotated.secret).not.toBe(initial.secret);
            expect(mockKeyVault.deleteSecret).toHaveBeenCalled();
        });
    });
    describe('deleteCredential', () => {
        it('should delete credential from Key Vault', async () => {
            const storeResult = await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'sk_test_12345');
            await service.deleteCredential(storeResult.credentialId);
            expect(mockKeyVault.deleteSecret).toHaveBeenCalled();
            expect(mockMonitoring.trackEvent).toHaveBeenCalledWith('credential.deleted', expect.any(Object));
        });
        it('should throw error if credential not found', async () => {
            await expect(service.deleteCredential('nonexistent-id')).rejects.toThrow('Credential metadata not found');
        });
    });
    describe('deleteConnectionCredentials', () => {
        it('should delete all credentials for a connection', async () => {
            await service.storeOAuthCredentials('tenant-123', 'salesforce', 'conn-456', 'access_token', 'refresh_token', 3600);
            await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.WEBHOOK_SECRET, 'webhook_secret');
            const deletedCount = await service.deleteConnectionCredentials('tenant-123', 'salesforce', 'conn-456');
            expect(deletedCount).toBe(3); // access token + refresh token + webhook secret
            expect(mockKeyVault.deleteSecret).toHaveBeenCalledTimes(3);
        });
    });
    describe('listExpiringCredentials', () => {
        it('should list credentials expiring within specified days', async () => {
            const expiresIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            const expiresIn10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'key1', { expiresAt: expiresIn5Days });
            await service.storeCredential('tenant-123', 'notion', 'conn-789', CredentialType.API_KEY, 'key2', { expiresAt: expiresIn10Days });
            const expiring = await service.listExpiringCredentials(7);
            expect(expiring).toHaveLength(1);
            expect(expiring[0].integrationId).toBe('salesforce');
            expect(expiring[0].daysUntilExpiry).toBeLessThanOrEqual(5);
        });
        it('should filter by tenant and integration', async () => {
            const expiresIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            await service.storeCredential('tenant-123', 'salesforce', 'conn-456', CredentialType.API_KEY, 'key1', { expiresAt: expiresIn5Days });
            await service.storeCredential('tenant-456', 'notion', 'conn-789', CredentialType.API_KEY, 'key2', { expiresAt: expiresIn5Days });
            const expiring = await service.listExpiringCredentials(7, {
                tenantId: 'tenant-123',
            });
            expect(expiring).toHaveLength(1);
            expect(expiring[0].tenantId).toBe('tenant-123');
        });
    });
    describe('healthCheck', () => {
        it('should return healthy when Key Vault is connected', async () => {
            const health = await service.healthCheck();
            expect(health.healthy).toBe(true);
            expect(health.keyVaultConnected).toBe(true);
            expect(mockKeyVault.healthCheck).toHaveBeenCalled();
        });
        it('should return unhealthy when Key Vault is disconnected', async () => {
            mockKeyVault.healthCheck = vi.fn().mockResolvedValue(false);
            const health = await service.healthCheck();
            expect(health.healthy).toBe(false);
            expect(health.keyVaultConnected).toBe(false);
        });
    });
    describe('getStatistics', () => {
        it('should return credential statistics', async () => {
            await service.storeCredential('tenant-123', 'salesforce', 'conn-1', CredentialType.API_KEY, 'key1');
            await service.storeCredential('tenant-123', 'notion', 'conn-2', CredentialType.API_KEY, 'key2');
            await service.storeOAuthCredentials('tenant-123', 'google', 'conn-3', 'access', 'refresh', 3600);
            const stats = service.getStatistics();
            expect(stats.totalCredentials).toBe(4); // 2 API keys + access + refresh
            expect(stats.byType[CredentialType.API_KEY]).toBe(2);
            expect(stats.byType[CredentialType.OAUTH_ACCESS_TOKEN]).toBe(1);
            expect(stats.byIntegration['salesforce']).toBe(1);
            expect(stats.byIntegration['notion']).toBe(1);
            expect(stats.byIntegration['google']).toBe(2);
        });
        it('should count expiring credentials correctly', async () => {
            const expiresIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            const expiresIn20Days = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
            await service.storeCredential('tenant-123', 'salesforce', 'conn-1', CredentialType.API_KEY, 'key1', { expiresAt: expiresIn5Days });
            await service.storeCredential('tenant-123', 'notion', 'conn-2', CredentialType.API_KEY, 'key2', { expiresAt: expiresIn20Days });
            const stats = service.getStatistics();
            expect(stats.expiringWithin7Days).toBe(1);
            expect(stats.expiringWithin30Days).toBe(2);
        });
    });
});
//# sourceMappingURL=secure-credential.service.test.js.map