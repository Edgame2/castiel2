import { createDecipheriv, createHash } from 'crypto';
import { CredentialType, } from '../services/secure-credential.service';
/**
 * Credential Migration Script
 *
 * Migrates existing encrypted credentials from Cosmos DB to Azure Key Vault.
 *
 * Steps:
 * 1. Query all integration connections
 * 2. For each connection with encrypted credentials:
 *    - Decrypt credentials using legacy encryption key
 *    - Store in Azure Key Vault using SecureCredentialService
 *    - Update connection record with credential IDs
 *    - Optionally clear encrypted fields
 * 3. Report migration results
 *
 * Usage:
 * ```typescript
 * const migrator = new CredentialMigration(options);
 * const summary = await migrator.migrateAll();
 * console.log(summary);
 * ```
 */
export class CredentialMigration {
    keyVault;
    monitoring;
    connectionRepo;
    integrationRepo;
    secureCredentialService;
    legacyEncryptionKey;
    dryRun;
    deleteAfterMigration;
    batchSize;
    constructor(options) {
        this.keyVault = options.keyVault;
        this.monitoring = options.monitoring;
        this.connectionRepo = options.connectionRepository;
        this.integrationRepo = options.integrationRepository;
        this.secureCredentialService = options.secureCredentialService;
        this.dryRun = options.dryRun ?? false;
        this.deleteAfterMigration = options.deleteAfterMigration ?? false;
        this.batchSize = options.batchSize ?? 10;
        // Derive legacy encryption key
        this.legacyEncryptionKey = createHash('sha256')
            .update(options.legacyEncryptionKey)
            .digest();
    }
    /**
     * Migrate all connections
     */
    async migrateAll(options) {
        const startTime = Date.now();
        console.log('🔄 Starting credential migration to Azure Key Vault...');
        if (this.dryRun) {
            console.log('📋 DRY RUN MODE - No changes will be made');
        }
        const summary = {
            totalConnections: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            totalCredentialsMigrated: 0,
            errors: [],
            durationMs: 0,
        };
        try {
            // Get all connections (would need to implement in repository)
            // For now, assuming we can query all connections
            const connections = await this.getAllConnections(options);
            summary.totalConnections = connections.length;
            console.log(`📊 Found ${connections.length} connections to process`);
            // Process in batches
            for (let i = 0; i < connections.length; i += this.batchSize) {
                const batch = connections.slice(i, i + this.batchSize);
                console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(connections.length / this.batchSize)}`);
                const results = await Promise.allSettled(batch.map((conn) => this.migrateConnection(conn)));
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const migrationResult = result.value;
                        if (migrationResult.success) {
                            summary.successfulMigrations++;
                            summary.totalCredentialsMigrated += migrationResult.credentialsMigrated;
                            console.log(`  ✅ ${migrationResult.integrationId} (${migrationResult.connectionId}): ${migrationResult.credentialsMigrated} credentials`);
                        }
                        else {
                            summary.failedMigrations++;
                            summary.errors.push({
                                connectionId: migrationResult.connectionId,
                                error: migrationResult.error || 'Unknown error',
                            });
                            console.log(`  ❌ ${migrationResult.integrationId} (${migrationResult.connectionId}): ${migrationResult.error}`);
                        }
                    }
                    else {
                        summary.failedMigrations++;
                        console.log(`  ❌ Migration rejected: ${result.reason}`);
                    }
                }
            }
            summary.durationMs = Date.now() - startTime;
            // Print summary
            console.log('\n' + '='.repeat(60));
            console.log('📋 MIGRATION SUMMARY');
            console.log('='.repeat(60));
            console.log(`Total Connections: ${summary.totalConnections}`);
            console.log(`✅ Successful: ${summary.successfulMigrations}`);
            console.log(`❌ Failed: ${summary.failedMigrations}`);
            console.log(`🔑 Total Credentials Migrated: ${summary.totalCredentialsMigrated}`);
            console.log(`⏱️  Duration: ${(summary.durationMs / 1000).toFixed(2)}s`);
            if (summary.errors.length > 0) {
                console.log('\n❌ Errors:');
                summary.errors.forEach((err) => {
                    console.log(`  - ${err.connectionId}: ${err.error}`);
                });
            }
            console.log('='.repeat(60));
            return summary;
        }
        catch (error) {
            console.error('❌ Migration failed:', error);
            this.monitoring.trackException(error, {
                operation: 'credential.migration',
            });
            throw error;
        }
    }
    /**
     * Migrate a single connection
     */
    async migrateConnection(connection) {
        const result = {
            connectionId: connection.id,
            tenantId: connection.tenantId,
            integrationId: connection.integrationId,
            success: false,
            credentialsMigrated: 0,
        };
        try {
            // Skip if no encrypted credentials
            if (!this.hasEncryptedCredentials(connection)) {
                result.success = true;
                return result;
            }
            // Migrate OAuth credentials
            if (connection.oauth?.accessTokenEncrypted) {
                await this.migrateOAuthCredentials(connection);
                result.credentialsMigrated += 2; // access + refresh tokens
            }
            // Migrate API key
            if (connection.apiKey?.keyEncrypted) {
                await this.migrateApiKey(connection);
                result.credentialsMigrated += 1;
            }
            // Migrate basic auth
            if (connection.basicAuth?.usernameEncrypted ||
                connection.basicAuth?.passwordEncrypted) {
                await this.migrateBasicAuth(connection);
                result.credentialsMigrated += 2; // username + password
            }
            result.success = true;
            this.monitoring.trackEvent('credential.migration.connection', {
                connectionId: connection.id,
                tenantId: connection.tenantId,
                integrationId: connection.integrationId,
                credentialsMigrated: result.credentialsMigrated,
            });
        }
        catch (error) {
            result.error = error.message;
            this.monitoring.trackException(error, {
                operation: 'credential.migration.connection',
                connectionId: connection.id,
            });
        }
        return result;
    }
    /**
     * Migrate OAuth credentials
     */
    async migrateOAuthCredentials(connection) {
        if (!connection.oauth) {
            return;
        }
        const accessToken = this.decrypt(connection.oauth.accessTokenEncrypted);
        const refreshToken = connection.oauth.refreshTokenEncrypted
            ? this.decrypt(connection.oauth.refreshTokenEncrypted)
            : '';
        if (!this.dryRun) {
            // Calculate expires_in from expiresAt
            const expiresIn = connection.oauth.expiresAt
                ? Math.floor((connection.oauth.expiresAt.getTime() - Date.now()) / 1000)
                : 3600;
            await this.secureCredentialService.storeOAuthCredentials(connection.tenantId, connection.integrationId, connection.id, accessToken, refreshToken, Math.max(expiresIn, 60), // At least 60 seconds
            {
                scope: connection.oauth.scope,
            });
            // Clear encrypted fields if requested
            if (this.deleteAfterMigration) {
                await this.connectionRepo.update(connection.id, connection.integrationId, {
                    oauth: {
                        ...connection.oauth,
                        accessTokenEncrypted: undefined,
                        refreshTokenEncrypted: undefined,
                    },
                });
            }
        }
    }
    /**
     * Migrate API key
     */
    async migrateApiKey(connection) {
        if (!connection.apiKey?.keyEncrypted) {
            return;
        }
        const apiKey = this.decrypt(connection.apiKey.keyEncrypted);
        if (!this.dryRun) {
            await this.secureCredentialService.storeCredential(connection.tenantId, connection.integrationId, connection.id, CredentialType.API_KEY, apiKey);
            // Clear encrypted field if requested
            if (this.deleteAfterMigration) {
                await this.connectionRepo.update(connection.id, connection.integrationId, {
                    apiKey: {
                        ...connection.apiKey,
                        keyEncrypted: undefined,
                    },
                });
            }
        }
    }
    /**
     * Migrate basic auth credentials
     */
    async migrateBasicAuth(connection) {
        if (!connection.basicAuth) {
            return;
        }
        if (connection.basicAuth.usernameEncrypted) {
            const username = this.decrypt(connection.basicAuth.usernameEncrypted);
            if (!this.dryRun) {
                await this.secureCredentialService.storeCredential(connection.tenantId, connection.integrationId, connection.id, CredentialType.BASIC_AUTH_USERNAME, username);
            }
        }
        if (connection.basicAuth.passwordEncrypted) {
            const password = this.decrypt(connection.basicAuth.passwordEncrypted);
            if (!this.dryRun) {
                await this.secureCredentialService.storeCredential(connection.tenantId, connection.integrationId, connection.id, CredentialType.BASIC_AUTH_PASSWORD, password);
            }
        }
        // Clear encrypted fields if requested
        if (this.deleteAfterMigration && !this.dryRun) {
            await this.connectionRepo.update(connection.id, connection.integrationId, {
                basicAuth: {
                    ...connection.basicAuth,
                    usernameEncrypted: undefined,
                    passwordEncrypted: undefined,
                },
            });
        }
    }
    /**
     * Check if connection has encrypted credentials
     */
    hasEncryptedCredentials(connection) {
        return !!(connection.oauth?.accessTokenEncrypted ||
            connection.apiKey?.keyEncrypted ||
            connection.basicAuth?.usernameEncrypted ||
            connection.basicAuth?.passwordEncrypted);
    }
    /**
     * Decrypt data using legacy encryption key (AES-256-GCM)
     */
    decrypt(encryptedData) {
        const [ivHex, authTagHex, data] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = createDecipheriv('aes-256-gcm', this.legacyEncryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Get all connections (stub - needs implementation in repository)
     */
    async getAllConnections(options) {
        // This would need to be implemented in the repository
        // For now, returning empty array as placeholder
        console.warn('⚠️  getAllConnections needs implementation in IntegrationConnectionRepository');
        // Example query structure:
        // SELECT * FROM c 
        // WHERE c.type = 'integration-connection'
        // AND (c.oauth.accessTokenEncrypted != null 
        //      OR c.apiKey.keyEncrypted != null 
        //      OR c.basicAuth.usernameEncrypted != null
        //      OR c.basicAuth.passwordEncrypted != null)
        // AND (@tenantId = null OR c.tenantId = @tenantId)
        // AND (@integrationId = null OR c.integrationId = @integrationId)
        return [];
    }
    /**
     * Rollback migration for a connection (restore from Key Vault to encrypted fields)
     */
    async rollbackConnection(connectionId, integrationId) {
        console.log(`🔄 Rolling back migration for connection ${connectionId}...`);
        // This would retrieve credentials from Key Vault and re-encrypt them
        // into Cosmos DB fields. Implementation depends on rollback strategy.
        throw new Error('Rollback not implemented yet');
    }
    /**
     * Verify migration for a connection
     */
    async verifyConnection(connectionId, integrationId) {
        console.log(`🔍 Verifying migration for connection ${connectionId}...`);
        // This would:
        // 1. Get connection from repository
        // 2. Verify credentials exist in Key Vault
        // 3. Optionally verify encrypted fields are cleared
        // 4. Test credential retrieval
        throw new Error('Verification not implemented yet');
    }
}
/**
 * CLI runner for migration script
 */
export async function runMigration(options) {
    const migrator = new CredentialMigration(options);
    try {
        const summary = await migrator.migrateAll({
            tenantId: options.tenantId,
            integrationId: options.integrationId,
        });
        if (summary.failedMigrations > 0) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=migrate-credentials-to-keyvault.js.map