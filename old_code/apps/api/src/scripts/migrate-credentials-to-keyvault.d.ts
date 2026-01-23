import { KeyVaultService } from '@castiel/key-vault';
import { IMonitoringProvider } from '@castiel/monitoring';
import { SecureCredentialService } from '../services/secure-credential.service';
import { IntegrationConnectionRepository, IntegrationDefinitionRepository } from '../repositories/integration.repository';
import { IntegrationConnection } from '../types/integration.types';
/**
 * Migration result for a single connection
 */
interface MigrationResult {
    connectionId: string;
    tenantId: string;
    integrationId: string;
    success: boolean;
    credentialsMigrated: number;
    error?: string;
}
/**
 * Migration summary
 */
interface MigrationSummary {
    totalConnections: number;
    successfulMigrations: number;
    failedMigrations: number;
    totalCredentialsMigrated: number;
    errors: Array<{
        connectionId: string;
        error: string;
    }>;
    durationMs: number;
}
interface MigrationOptions {
    keyVault: KeyVaultService;
    monitoring: IMonitoringProvider;
    connectionRepository: IntegrationConnectionRepository;
    integrationRepository: IntegrationDefinitionRepository;
    secureCredentialService: SecureCredentialService;
    legacyEncryptionKey: string;
    dryRun?: boolean;
    deleteAfterMigration?: boolean;
    batchSize?: number;
}
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
export declare class CredentialMigration {
    private keyVault;
    private monitoring;
    private connectionRepo;
    private integrationRepo;
    private secureCredentialService;
    private legacyEncryptionKey;
    private dryRun;
    private deleteAfterMigration;
    private batchSize;
    constructor(options: MigrationOptions);
    /**
     * Migrate all connections
     */
    migrateAll(options?: {
        tenantId?: string;
        integrationId?: string;
    }): Promise<MigrationSummary>;
    /**
     * Migrate a single connection
     */
    migrateConnection(connection: IntegrationConnection): Promise<MigrationResult>;
    /**
     * Migrate OAuth credentials
     */
    private migrateOAuthCredentials;
    /**
     * Migrate API key
     */
    private migrateApiKey;
    /**
     * Migrate basic auth credentials
     */
    private migrateBasicAuth;
    /**
     * Check if connection has encrypted credentials
     */
    private hasEncryptedCredentials;
    /**
     * Decrypt data using legacy encryption key (AES-256-GCM)
     */
    private decrypt;
    /**
     * Get all connections (stub - needs implementation in repository)
     */
    private getAllConnections;
    /**
     * Rollback migration for a connection (restore from Key Vault to encrypted fields)
     */
    rollbackConnection(connectionId: string, integrationId: string): Promise<void>;
    /**
     * Verify migration for a connection
     */
    verifyConnection(connectionId: string, integrationId: string): Promise<boolean>;
}
/**
 * CLI runner for migration script
 */
export declare function runMigration(options: MigrationOptions & {
    tenantId?: string;
    integrationId?: string;
}): Promise<void>;
export {};
//# sourceMappingURL=migrate-credentials-to-keyvault.d.ts.map