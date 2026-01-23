/**
 * Document Management Migration Script
 *
 * Production-ready script to:
 * 1. Initialize tenant documentSettings with defaults (from global settings)
 * 2. Create Azure Blob containers programmatically
 * 3. Verify container permissions
 * 4. Migrate existing tenants
 *
 * Usage:
 *   tsx apps/api/src/scripts/migrate-document-settings.ts
 *
 * Environment Variables Required:
 *   - AZURE_STORAGE_CONNECTION_STRING
 *   - COSMOS_DB_ENDPOINT
 *   - COSMOS_DB_KEY
 *   - COSMOS_DB_DATABASE
 *   - COSMOS_DB_TENANTS_CONTAINER
 *   - COSMOS_DB_SYSTEM_CONFIG_CONTAINER
 *   - AZURE_STORAGE_DOCUMENTS_CONTAINER
 *   - AZURE_STORAGE_QUARANTINE_CONTAINER
 */
import 'dotenv/config';
//# sourceMappingURL=migrate-document-settings.d.ts.map