#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 *
 * Validates all required and optional environment variables for the API service.
 * Can be run independently before starting the service to catch configuration errors early.
 *
 * Usage:
 *   pnpm --filter @castiel/api run validate:env
 *   tsx src/scripts/validate-env.ts
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Load environment variables from .env or .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Validate environment variables
 */
function validateEnvironment() {
    const errors = [];
    const warnings = [];
    const info = [];
    const nodeEnv = (process.env.NODE_ENV || 'development');
    const isProduction = nodeEnv === 'production';
    // Server configuration
    const port = process.env.PORT || '3001';
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`Invalid PORT: "${port}" - must be between 1 and 65535`);
    }
    // Redis configuration (required)
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl && !redisHost) {
        errors.push('Missing Redis configuration: Either REDIS_URL or REDIS_HOST must be set');
    }
    else if (redisHost) {
        const redisPortNum = parseInt(redisPort, 10);
        if (isNaN(redisPortNum) || redisPortNum < 1 || redisPortNum > 65535) {
            errors.push(`Invalid REDIS_PORT: "${redisPort}" - must be between 1 and 65535`);
        }
        if (!process.env.REDIS_PASSWORD && isProduction) {
            warnings.push('REDIS_PASSWORD not set - Redis may require authentication in production');
        }
    }
    // JWT Configuration (required)
    if (!process.env.JWT_ACCESS_SECRET) {
        errors.push('Missing required environment variable: JWT_ACCESS_SECRET');
    }
    else if (process.env.JWT_ACCESS_SECRET.length < 32 && isProduction) {
        warnings.push('JWT_ACCESS_SECRET is less than 32 characters - consider using a longer secret in production');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('Missing required environment variable: JWT_REFRESH_SECRET');
    }
    else if (process.env.JWT_REFRESH_SECRET.length < 32 && isProduction) {
        warnings.push('JWT_REFRESH_SECRET is less than 32 characters - consider using a longer secret in production');
    }
    // Cosmos DB Configuration (required)
    if (!process.env.COSMOS_DB_ENDPOINT) {
        errors.push('Missing required environment variable: COSMOS_DB_ENDPOINT');
    }
    if (!process.env.COSMOS_DB_KEY) {
        errors.push('Missing required environment variable: COSMOS_DB_KEY');
    }
    if (!process.env.COSMOS_DB_DATABASE_ID) {
        errors.push('Missing required environment variable: COSMOS_DB_DATABASE_ID');
    }
    // Required Cosmos DB containers
    const requiredContainers = [
        'COSMOS_DB_USERS_CONTAINER',
        'COSMOS_DB_ROLES_CONTAINER',
        'COSMOS_DB_TENANTS_CONTAINER',
        'COSMOS_DB_JOIN_REQUESTS_CONTAINER',
        'COSMOS_DB_TENANT_INVITATIONS_CONTAINER',
        'COSMOS_DB_SHARDS_CONTAINER',
        'COSMOS_DB_SHARD_TYPES_CONTAINER',
    ];
    for (const containerVar of requiredContainers) {
        if (!process.env[containerVar]) {
            errors.push(`Missing required environment variable: ${containerVar}`);
        }
    }
    // Public API URL (required in production)
    if (isProduction && !process.env.PUBLIC_API_BASE_URL) {
        errors.push('Missing required environment variable: PUBLIC_API_BASE_URL (required in production)');
    }
    // Monitoring configuration (conditional)
    const monitoringEnabled = process.env.MONITORING_ENABLED !== 'false';
    if (monitoringEnabled) {
        if (process.env.MONITORING_PROVIDER === 'application-insights') {
            if (!process.env.APPINSIGHTS_INSTRUMENTATION_KEY && !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
                errors.push('Missing monitoring configuration: APPINSIGHTS_INSTRUMENTATION_KEY or APPLICATIONINSIGHTS_CONNECTION_STRING required when monitoring is enabled');
            }
        }
    }
    else {
        info.push('Monitoring is disabled (MONITORING_ENABLED=false)');
    }
    // Email configuration (required for production)
    if (isProduction) {
        const emailProvider = process.env.EMAIL_PROVIDER || 'console';
        if (emailProvider === 'resend' && !process.env.RESEND_API_KEY) {
            errors.push('Missing required environment variable: RESEND_API_KEY (required when EMAIL_PROVIDER=resend)');
        }
        if (emailProvider === 'azure-acs' && !process.env.AZURE_ACS_CONNECTION_STRING) {
            errors.push('Missing required environment variable: AZURE_ACS_CONNECTION_STRING (required when EMAIL_PROVIDER=azure-acs)');
        }
        if (!process.env.EMAIL_FROM_EMAIL) {
            errors.push('Missing required environment variable: EMAIL_FROM_EMAIL');
        }
    }
    else {
        if (!process.env.EMAIL_FROM_EMAIL) {
            warnings.push('EMAIL_FROM_EMAIL not set - email features may not work');
        }
    }
    // Azure OpenAI (optional but recommended)
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
        warnings.push('Azure OpenAI not configured - AI features (embeddings, insights, content generation) will be disabled');
    }
    // Azure Blob Storage (optional but required for document management)
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        warnings.push('Azure Blob Storage not configured - document upload/download features will be disabled');
    }
    // Azure Key Vault (optional)
    if (process.env.AZURE_KEY_VAULT_URL && process.env.AZURE_KEY_VAULT_ENABLED === 'true') {
        if (!process.env.AZURE_KEY_VAULT_USE_MANAGED_IDENTITY) {
            if (!process.env.AZURE_KEY_VAULT_TENANT_ID || !process.env.AZURE_KEY_VAULT_CLIENT_ID || !process.env.AZURE_KEY_VAULT_CLIENT_SECRET) {
                warnings.push('Azure Key Vault enabled but service principal credentials not set - will attempt managed identity');
            }
        }
    }
    // OAuth configuration (optional)
    const oauthProviders = ['google', 'github', 'microsoft'];
    for (const provider of oauthProviders) {
        const clientId = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_ID`];
        const clientSecret = process.env[`OAUTH_${provider.toUpperCase()}_CLIENT_SECRET`];
        if (clientId && !clientSecret) {
            warnings.push(`OAuth ${provider} client ID set but client secret missing - OAuth login for ${provider} will not work`);
        }
        if (clientSecret && !clientId) {
            warnings.push(`OAuth ${provider} client secret set but client ID missing - OAuth login for ${provider} will not work`);
        }
    }
    // Tenant membership configuration validation
    const minExpiryDays = parseInt(process.env.INVITE_MIN_EXPIRY_DAYS || '1', 10);
    const maxExpiryDays = parseInt(process.env.INVITE_MAX_EXPIRY_DAYS || '30', 10);
    const defaultExpiryDays = parseInt(process.env.INVITE_DEFAULT_EXPIRY_DAYS || '7', 10);
    const perTenantLimit = parseInt(process.env.INVITE_PER_TENANT_DAILY_LIMIT || '10', 10);
    const perAdminLimit = parseInt(process.env.INVITE_PER_ADMIN_DAILY_LIMIT || '100', 10);
    if (minExpiryDays <= 0) {
        errors.push('INVITE_MIN_EXPIRY_DAYS must be greater than 0');
    }
    if (maxExpiryDays < minExpiryDays) {
        errors.push('INVITE_MAX_EXPIRY_DAYS must be >= INVITE_MIN_EXPIRY_DAYS');
    }
    if (defaultExpiryDays < minExpiryDays || defaultExpiryDays > maxExpiryDays) {
        errors.push('INVITE_DEFAULT_EXPIRY_DAYS must be between INVITE_MIN_EXPIRY_DAYS and INVITE_MAX_EXPIRY_DAYS');
    }
    if (perTenantLimit <= 0) {
        errors.push('INVITE_PER_TENANT_DAILY_LIMIT must be greater than 0');
    }
    if (perAdminLimit <= 0) {
        errors.push('INVITE_PER_ADMIN_DAILY_LIMIT must be greater than 0');
    }
    // CORS configuration
    if (isProduction && !process.env.CORS_ORIGIN) {
        warnings.push('CORS_ORIGIN not set in production - CORS may be too permissive');
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
    };
}
/**
 * Main execution
 */
function main() {
    console.log('🔍 Validating environment variables for API service...\n');
    const result = validateEnvironment();
    // Print info messages
    if (result.info.length > 0) {
        console.log('ℹ️  Information:');
        result.info.forEach(msg => console.log(`   ${msg}`));
        console.log();
    }
    // Print warnings
    if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach(msg => console.log(`   ${msg}`));
        console.log();
    }
    // Print errors
    if (result.errors.length > 0) {
        console.error('❌ Validation failed:');
        result.errors.forEach(msg => console.error(`   ${msg}`));
        console.error('\nPlease set the required environment variables and try again.');
        console.error('See apps/api/.env.example for a complete list of environment variables.\n');
        process.exit(1);
    }
    // Success
    if (result.warnings.length === 0 && result.info.length === 0) {
        console.log('✅ All environment variables are valid!\n');
    }
    else {
        console.log('✅ Required environment variables are valid.');
        console.log('   (Some optional variables are missing - see warnings above)\n');
    }
    process.exit(0);
}
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export { validateEnvironment };
//# sourceMappingURL=validate-env.js.map