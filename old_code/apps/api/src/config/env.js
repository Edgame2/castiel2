import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
;
/**
 * Helper to extract account name from Azure Storage connection string
 */
function extractAccountName(connectionString) {
    const match = connectionString.match(/AccountName=([^;]+)/);
    return match ? match[1] : '';
}
/**
 * Helper to extract account key from Azure Storage connection string
 */
function extractAccountKey(connectionString) {
    const match = connectionString.match(/AccountKey=([^;]+)/);
    return match ? match[1] : '';
}
/**
 * Load and validate environment configuration
 */
export function loadConfig() {
    // In production, require explicit configuration - no localhost fallbacks
    const nodeEnv = (process.env.NODE_ENV || 'development');
    const defaultApiBaseUrl = process.env.PUBLIC_API_BASE_URL ||
        (nodeEnv === 'production'
            ? (() => { throw new Error('PUBLIC_API_BASE_URL is required in production'); })()
            : `http://localhost:${process.env.PORT || '3000'}`);
    const config = {
        // Server configuration
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info',
        api: {
            publicUrl: process.env.PUBLIC_API_BASE_URL || defaultApiBaseUrl,
        },
        frontend: {
            baseUrl: process.env.FRONTEND_URL ||
                process.env.PUBLIC_APP_BASE_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                process.env.NEXT_PUBLIC_SITE_URL ||
                defaultApiBaseUrl,
        },
        // Redis configuration
        // Support both REDIS_URL (for Azure Redis Cache) and individual components
        redis: (() => {
            // If REDIS_URL is provided, parse it
            if (process.env.REDIS_URL) {
                try {
                    const url = new URL(process.env.REDIS_URL);
                    const password = url.password || decodeURIComponent(url.password || '');
                    return {
                        host: url.hostname,
                        port: parseInt(url.port || '6379', 10),
                        username: url.username || undefined,
                        password: password || undefined,
                        tls: url.protocol === 'rediss:' || url.protocol === 'redis+ssl:',
                        db: parseInt((url.pathname?.slice(1)) || '0', 10),
                        maxRetriesPerRequest: 3,
                        connectTimeout: 10000,
                        retryStrategy: (times) => {
                            if (times > 10) {
                                return undefined; // Stop retrying
                            }
                            return Math.min(times * 50, 2000);
                        },
                    };
                }
                catch (error) {
                    console.warn('Failed to parse REDIS_URL, falling back to individual components:', error);
                }
            }
            // Fall back to individual components
            return {
                host: process.env.REDIS_HOST ||
                    (nodeEnv === 'production'
                        ? (() => { throw new Error('REDIS_HOST or REDIS_URL is required in production'); })()
                        : 'localhost'),
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                username: process.env.REDIS_USERNAME,
                password: process.env.REDIS_PASSWORD,
                tls: process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS_ENABLED === 'true',
                db: parseInt(process.env.REDIS_DB || '0', 10),
                maxRetriesPerRequest: 3,
                connectTimeout: 10000,
                retryStrategy: (times) => {
                    if (times > 10) {
                        return undefined; // Stop retrying
                    }
                    return Math.min(times * 50, 2000);
                },
            };
        })(),
        // JWT configuration
        jwt: {
            validationCacheEnabled: process.env.JWT_VALIDATION_CACHE_ENABLED !== 'false',
            validationCacheTTL: parseInt(process.env.JWT_VALIDATION_CACHE_TTL || '300', 10), // 5 minutes
            accessTokenSecret: process.env.JWT_ACCESS_SECRET || '',
            accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h',
            refreshTokenSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_TOKEN_SECRET || '',
            refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
            issuer: process.env.JWT_ISSUER || 'castiel',
            audience: process.env.JWT_AUDIENCE,
        },
        oauth: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID ||
                    process.env.OAUTH_GOOGLE_CLIENT_ID ||
                    '',
                clientSecret: process.env.GOOGLE_CLIENT_SECRET ||
                    process.env.OAUTH_GOOGLE_CLIENT_SECRET ||
                    '',
                redirectUri: process.env.GOOGLE_REDIRECT_URI ||
                    process.env.OAUTH_GOOGLE_REDIRECT_URI ||
                    `${defaultApiBaseUrl}/auth/google/callback`,
                authorizationUrl: process.env.GOOGLE_AUTHORIZATION_URL ||
                    'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: process.env.GOOGLE_TOKEN_URL ||
                    'https://oauth2.googleapis.com/token',
                userInfoUrl: process.env.GOOGLE_USERINFO_URL ||
                    'https://openidconnect.googleapis.com/v1/userinfo',
                scope: process.env.GOOGLE_OAUTH_SCOPE || 'openid email profile',
            },
            github: {
                clientId: process.env.GITHUB_CLIENT_ID ||
                    process.env.OAUTH_GITHUB_CLIENT_ID ||
                    '',
                clientSecret: process.env.GITHUB_CLIENT_SECRET ||
                    process.env.OAUTH_GITHUB_CLIENT_SECRET ||
                    '',
                redirectUri: process.env.GITHUB_REDIRECT_URI ||
                    process.env.OAUTH_GITHUB_REDIRECT_URI ||
                    `${defaultApiBaseUrl}/auth/github/callback`,
                authorizationUrl: process.env.GITHUB_AUTHORIZATION_URL ||
                    'https://github.com/login/oauth/authorize',
                tokenUrl: process.env.GITHUB_TOKEN_URL ||
                    'https://github.com/login/oauth/access_token',
                userInfoUrl: process.env.GITHUB_USERINFO_URL ||
                    'https://api.github.com/user',
                scope: process.env.GITHUB_OAUTH_SCOPE || 'read:user user:email',
            },
            microsoft: {
                clientId: process.env.MICROSOFT_CLIENT_ID ||
                    process.env.OAUTH_MICROSOFT_CLIENT_ID ||
                    '',
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET ||
                    process.env.OAUTH_MICROSOFT_CLIENT_SECRET ||
                    '',
                redirectUri: process.env.MICROSOFT_REDIRECT_URI ||
                    process.env.OAUTH_MICROSOFT_REDIRECT_URI ||
                    `${defaultApiBaseUrl}/auth/microsoft/callback`,
                authorizationUrl: process.env.MICROSOFT_AUTHORIZATION_URL ||
                    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                tokenUrl: process.env.MICROSOFT_TOKEN_URL ||
                    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                userInfoUrl: process.env.MICROSOFT_USERINFO_URL ||
                    'https://graph.microsoft.com/v1.0/me',
                scope: process.env.MICROSOFT_OAUTH_SCOPE || 'openid email profile User.Read',
            },
        },
        // Cosmos DB configuration
        cosmosDb: {
            endpoint: process.env.COSMOS_DB_ENDPOINT || '',
            key: process.env.COSMOS_DB_KEY || '',
            databaseId: process.env.COSMOS_DB_DATABASE_ID || 'castiel',
            containers: {
                shards: process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards',
                shardTypes: process.env.COSMOS_DB_SHARD_TYPES_CONTAINER || 'shard-types',
                revisions: process.env.COSMOS_DB_REVISIONS_CONTAINER || 'revisions',
                roles: process.env.COSMOS_DB_ROLES_CONTAINER || 'roles',
                users: process.env.COSMOS_DB_USERS_CONTAINER || 'users',
                tenants: process.env.COSMOS_DB_TENANTS_CONTAINER || 'tenants',
                ssoConfigs: process.env.COSMOS_DB_SSO_CONFIGS_CONTAINER || 'sso-configs',
                oauth2Clients: process.env.COSMOS_DB_OAUTH2_CLIENTS_CONTAINER || 'oauth2-clients',
                joinRequests: process.env.COSMOS_DB_JOIN_REQUESTS_CONTAINER || 'tenant-join-requests',
                tenantInvitations: process.env.COSMOS_DB_TENANT_INVITATIONS_CONTAINER || 'tenant-invitations',
                webhooks: process.env.COSMOS_DB_WEBHOOKS_CONTAINER || 'webhooks',
                webhookDeliveries: process.env.COSMOS_DB_WEBHOOK_DELIVERIES_CONTAINER || 'webhook-deliveries',
                schemaMigrations: process.env.COSMOS_DB_SCHEMA_MIGRATIONS_CONTAINER || 'schema-migrations',
                shardEdges: process.env.COSMOS_DB_SHARD_EDGES_CONTAINER || 'shard-edges',
                bulkJobs: process.env.COSMOS_DB_BULK_JOBS_CONTAINER || 'bulk-jobs',
                // Integration containers
                integrations: process.env.COSMOS_DB_INTEGRATIONS_CONTAINER || 'integrations',
                tenantIntegrations: process.env.COSMOS_DB_TENANT_INTEGRATIONS_CONTAINER || 'tenant-integrations',
                integrationConnections: process.env.COSMOS_DB_INTEGRATION_CONNECTIONS_CONTAINER || 'integration-connections',
                conversionSchemas: process.env.COSMOS_DB_CONVERSION_SCHEMAS_CONTAINER || 'conversion-schemas',
                syncTasks: process.env.COSMOS_DB_SYNC_TASKS_CONTAINER || 'sync-tasks',
                syncExecutions: process.env.COSMOS_DB_SYNC_EXECUTIONS_CONTAINER || 'sync-executions',
                syncConflicts: process.env.COSMOS_DB_SYNC_CONFLICTS_CONTAINER || 'sync-conflicts',
                // AI configuration containers
                aiModels: process.env.COSMOS_DB_AI_MODELS_CONTAINER || 'aimodel',
                aiConnections: process.env.COSMOS_DB_AI_CONNECTIONS_CONTAINER || 'aiconnexion',
                // Web search / deep search containers
                search: process.env.COSMOS_DB_SEARCH_CONTAINER || 'c_search',
                webPages: process.env.COSMOS_DB_WEBPAGES_CONTAINER || 'c_webpages',
                // AI Insights advanced containers
                feedback: process.env.COSMOS_DB_FEEDBACK_CONTAINER || 'feedback',
                learning: process.env.COSMOS_DB_LEARNING_CONTAINER || 'learning',
                experiments: process.env.COSMOS_DB_EXPERIMENTS_CONTAINER || 'experiments',
                media: process.env.COSMOS_DB_MEDIA_CONTAINER || 'media',
                collaboration: process.env.COSMOS_DB_COLLABORATION_CONTAINER || 'collaborative-insights',
                templates: process.env.COSMOS_DB_TEMPLATES_CONTAINER || 'templates',
                proactiveInsights: process.env.COSMOS_DB_PROACTIVE_INSIGHTS_CONTAINER || 'proactive-insights',
                proactiveTriggers: process.env.COSMOS_DB_PROACTIVE_TRIGGERS_CONTAINER || 'proactive-triggers',
                audit: process.env.COSMOS_DB_AUDIT_CONTAINER || 'audit',
                graph: process.env.COSMOS_DB_GRAPH_CONTAINER || 'graph',
                exports: process.env.COSMOS_DB_EXPORTS_CONTAINER || 'exports',
                backups: process.env.COSMOS_DB_BACKUPS_CONTAINER || 'backups',
                // Content Generation
                documentTemplates: process.env.COSMOS_DB_DOCUMENT_TEMPLATES_CONTAINER || 'document-templates',
                // Feature Flags
                featureFlags: process.env.COSMOS_DB_FEATURE_FLAGS_CONTAINER || 'feature-flags',
            },
        },
        // Monitoring configuration
        monitoring: {
            enabled: process.env.MONITORING_ENABLED === 'true',
            provider: process.env.MONITORING_PROVIDER || 'mock',
            instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATION_KEY,
            samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0'),
        },
        // CORS configuration
        cors: {
            origin: process.env.CORS_ORIGIN || true,
            credentials: process.env.CORS_CREDENTIALS !== 'false', // Default to true for dev
        },
        // Security configuration
        security: {
            // Default: enabled outside dev; allow explicit override via env
            loginRateLimitEnabled: process.env.LOGIN_RATE_LIMIT_ENABLED
                ? process.env.LOGIN_RATE_LIMIT_ENABLED === 'true'
                : process.env.NODE_ENV !== 'development',
        },
        // GraphQL configuration
        graphql: {
            enabled: process.env.GRAPHQL_ENABLED !== 'false',
            playground: process.env.GRAPHQL_PLAYGROUND !== 'false',
            path: process.env.GRAPHQL_PATH || '/graphql',
        },
        // Azure Key Vault configuration
        keyVault: {
            url: process.env.AZURE_KEY_VAULT_URL || '',
            enabled: process.env.ENABLE_KEY_VAULT === 'true' || process.env.NODE_ENV === 'production',
            useManagedIdentity: process.env.KEY_VAULT_USE_MANAGED_IDENTITY === 'true' || process.env.NODE_ENV === 'production',
            servicePrincipal: process.env.KEY_VAULT_USE_MANAGED_IDENTITY !== 'true' && process.env.NODE_ENV !== 'production' ? {
                tenantId: process.env.AZURE_TENANT_ID || '',
                clientId: process.env.AZURE_CLIENT_ID || '',
                clientSecret: process.env.AZURE_CLIENT_SECRET || '',
            } : undefined,
            cacheTTL: parseInt(process.env.KEY_VAULT_CACHE_TTL || '300000', 10), // 5 minutes
            enableFallback: process.env.NODE_ENV !== 'production',
        },
        // Azure Blob Storage for document management
        azureStorage: process.env.AZURE_STORAGE_CONNECTION_STRING ? {
            connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || extractAccountName(process.env.AZURE_STORAGE_CONNECTION_STRING),
            accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || extractAccountKey(process.env.AZURE_STORAGE_CONNECTION_STRING),
            documentsContainer: process.env.AZURE_STORAGE_DOCUMENTS_CONTAINER || 'documents',
            quarantineContainer: process.env.AZURE_STORAGE_QUARANTINE_CONTAINER || 'quarantine',
            verifyVirus: process.env.DOCUMENT_VIRUS_VERIFICATION === 'true',
        } : undefined,
        // Unified email configuration
        email: {
            provider: process.env.EMAIL_PROVIDER || 'console',
            fromEmail: process.env.EMAIL_FROM_ADDRESS || process.env.RESEND_FROM_EMAIL || 'no-reply@castiel.local',
            fromName: process.env.EMAIL_FROM_NAME || process.env.RESEND_FROM_NAME || 'Castiel',
            resend: process.env.RESEND_API_KEY ? {
                apiKey: process.env.RESEND_API_KEY,
            } : undefined,
            azureAcs: process.env.AZURE_ACS_CONNECTION_STRING ? {
                connectionString: process.env.AZURE_ACS_CONNECTION_STRING,
            } : undefined,
        },
        // Legacy resend config (for backward compatibility)
        resend: {
            apiKey: process.env.RESEND_API_KEY || '',
            fromEmail: process.env.RESEND_FROM_EMAIL || 'no-reply@castiel.local',
            fromName: process.env.RESEND_FROM_NAME || 'Castiel',
        },
        membership: {
            invitations: {
                defaultExpiryDays: parseInt(process.env.INVITE_DEFAULT_EXPIRY_DAYS || '7', 10),
                minExpiryDays: parseInt(process.env.INVITE_MIN_EXPIRY_DAYS || '1', 10),
                maxExpiryDays: parseInt(process.env.INVITE_MAX_EXPIRY_DAYS || '30', 10),
                reminderLeadHours: parseInt(process.env.INVITE_REMINDER_LEAD_HOURS || '48', 10),
                lifecycleIntervalMs: parseInt(process.env.INVITE_LIFECYCLE_INTERVAL_MS || `${15 * 60 * 1000}`, 10),
                perTenantDailyLimit: parseInt(process.env.INVITE_PER_TENANT_DAILY_LIMIT || '100', 10),
                perAdminDailyLimit: parseInt(process.env.INVITE_PER_ADMIN_DAILY_LIMIT || '20', 10),
                expiringSoonHours: parseInt(process.env.INVITE_EXPIRING_SOON_HOURS || '72', 10),
            },
        },
        // Content Generation System
        contentGeneration: {
            enabled: process.env.ENABLE_CONTENT_GENERATION === 'true',
        },
        // Embedding Job configuration
        embeddingJob: {
            enabled: process.env.EMBEDDING_JOB_ENABLED !== 'false',
            ignoredShardTypes: (process.env.EMBEDDING_JOB_IGNORED_SHARD_TYPES || 'c_dashboardVersion,c_dashboard')
                .split(',')
                .map(t => t.trim())
                .filter(Boolean),
        },
        // Service Bus configuration removed - replaced by BullMQ/Redis
        // Legacy Service Bus config available in deprecated AzureServiceBusService for legacy functions only
        // Google Workspace Integration OAuth
        googleWorkspace: (process.env.GOOGLE_WORKSPACE_CLIENT_ID || process.env.GOOGLE_WORKSPACE_CLIENT_SECRET) ? {
            clientId: process.env.GOOGLE_WORKSPACE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET || '',
            redirectUri: process.env.GOOGLE_WORKSPACE_REDIRECT_URI || `${defaultApiBaseUrl}/api/tenant/integrations/google-workspace/oauth/callback`,
        } : undefined,
        // Azure OpenAI
        ai: {
            azureOpenAI: {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT_CHAT || process.env.AZURE_OPENAI_ENDPOINT_EMBEDDING || '',
                apiKey: process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY_CHAT || process.env.AZURE_OPENAI_API_KEY_EMBEDDING || '',
                deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT_NAME_CHAT || process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME_EMBEDDING || 'gpt-4o',
                apiVersion: process.env.AZURE_OPENAI_API_VERSION || process.env.AZURE_OPENAI_API_VERSION_CHAT || process.env.AZURE_OPENAI_API_VERSION_EMBEDDING || '2024-02-15-preview',
            }
        },
    };
    // Validate required configuration
    validateConfig(config);
    return config;
}
/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    // Validate port
    if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
        errors.push('Invalid PORT: must be between 1 and 65535');
    }
    // Validate Redis configuration
    if (!config.redis.host) {
        errors.push('REDIS_HOST is required');
    }
    if (isNaN(config.redis.port) || config.redis.port < 1 || config.redis.port > 65535) {
        errors.push('Invalid REDIS_PORT: must be between 1 and 65535');
    }
    // Validate JWT secrets
    if (!config.jwt.accessTokenSecret) {
        errors.push('JWT_ACCESS_SECRET is required');
    }
    // Validate Cosmos DB configuration
    if (!config.cosmosDb.endpoint) {
        errors.push('COSMOS_DB_ENDPOINT is required');
    }
    if (!config.cosmosDb.key) {
        errors.push('COSMOS_DB_KEY is required');
    }
    if (!config.cosmosDb.containers.users) {
        errors.push('COSMOS_DB_USERS_CONTAINER is required');
    }
    if (!config.cosmosDb.containers.roles) {
        errors.push('COSMOS_DB_ROLES_CONTAINER is required');
    }
    if (!config.cosmosDb.containers.tenants) {
        errors.push('COSMOS_DB_TENANTS_CONTAINER is required');
    }
    if (!config.cosmosDb.containers.joinRequests) {
        errors.push('COSMOS_DB_JOIN_REQUESTS_CONTAINER is required');
    }
    if (!config.cosmosDb.containers.tenantInvitations) {
        errors.push('COSMOS_DB_TENANT_INVITATIONS_CONTAINER is required');
    }
    // Validate monitoring configuration
    if (config.monitoring.enabled && config.monitoring.provider === 'application-insights') {
        if (!config.monitoring.instrumentationKey) {
            errors.push('APPINSIGHTS_INSTRUMENTATION_KEY is required when monitoring is enabled');
        }
    }
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    const invitationConfig = config.membership.invitations;
    if (invitationConfig.minExpiryDays <= 0) {
        throw new Error('INVITE_MIN_EXPIRY_DAYS must be greater than 0');
    }
    if (invitationConfig.maxExpiryDays < invitationConfig.minExpiryDays) {
        throw new Error('INVITE_MAX_EXPIRY_DAYS must be >= INVITE_MIN_EXPIRY_DAYS');
    }
    if (invitationConfig.defaultExpiryDays < invitationConfig.minExpiryDays || invitationConfig.defaultExpiryDays > invitationConfig.maxExpiryDays) {
        throw new Error('INVITE_DEFAULT_EXPIRY_DAYS must be between INVITE_MIN_EXPIRY_DAYS and INVITE_MAX_EXPIRY_DAYS');
    }
    if (invitationConfig.perTenantDailyLimit <= 0) {
        throw new Error('INVITE_PER_TENANT_DAILY_LIMIT must be greater than 0');
    }
    if (invitationConfig.perAdminDailyLimit <= 0) {
        throw new Error('INVITE_PER_ADMIN_DAILY_LIMIT must be greater than 0');
    }
}
/**
 * Export singleton instance
 */
export const config = loadConfig();
//# sourceMappingURL=env.js.map