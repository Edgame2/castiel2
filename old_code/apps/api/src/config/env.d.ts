/**
 * Service configuration interface
 */
interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string;
}
export interface ServiceConfig {
    port: number;
    host: string;
    nodeEnv: 'development' | 'staging' | 'production';
    logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    api: {
        publicUrl: string;
    };
    frontend: {
        baseUrl: string;
    };
    redis: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        tls: boolean;
        db: number;
        maxRetriesPerRequest: number;
        connectTimeout: number;
        retryStrategy?: (times: number) => number | void;
    };
    jwt: {
        validationCacheEnabled: boolean;
        validationCacheTTL: number;
        accessTokenSecret: string;
        accessTokenExpiry: string;
        refreshTokenSecret: string;
        refreshTokenExpiry: string;
        issuer: string;
        audience?: string;
    };
    oauth: {
        google: OAuthProviderConfig;
        github: OAuthProviderConfig;
        microsoft: OAuthProviderConfig;
    };
    googleWorkspace?: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
    cosmosDb: {
        endpoint: string;
        key: string;
        databaseId: string;
        containers: {
            shards: string;
            shardTypes: string;
            revisions: string;
            roles: string;
            users: string;
            tenants: string;
            ssoConfigs: string;
            oauth2Clients: string;
            joinRequests: string;
            tenantInvitations: string;
            webhooks: string;
            webhookDeliveries: string;
            schemaMigrations: string;
            shardEdges: string;
            bulkJobs: string;
            integrations: string;
            tenantIntegrations: string;
            integrationConnections: string;
            conversionSchemas: string;
            syncTasks: string;
            syncExecutions: string;
            syncConflicts: string;
            aiModels: string;
            aiConnections: string;
            search: string;
            webPages: string;
            feedback: string;
            learning: string;
            experiments: string;
            media: string;
            collaboration: string;
            templates: string;
            proactiveInsights: string;
            proactiveTriggers: string;
            audit: string;
            graph: string;
            exports: string;
            backups: string;
            documentTemplates: string;
            featureFlags: string;
        };
    };
    monitoring: {
        enabled: boolean;
        provider: 'application-insights' | 'mock';
        instrumentationKey?: string;
        samplingRate: number;
    };
    cors: {
        origin: string | string[] | boolean;
        credentials: boolean;
    };
    security: {
        loginRateLimitEnabled: boolean;
    };
    graphql: {
        enabled: boolean;
        playground: boolean;
        path: string;
    };
    keyVault: {
        url: string;
        enabled: boolean;
        useManagedIdentity: boolean;
        servicePrincipal?: {
            tenantId: string;
            clientId: string;
            clientSecret: string;
        };
        cacheTTL: number;
        enableFallback: boolean;
    };
    azureStorage?: {
        connectionString: string;
        accountName: string;
        accountKey: string;
        documentsContainer: string;
        quarantineContainer: string;
        verifyVirus: boolean;
    };
    email: {
        provider: 'console' | 'resend' | 'azure-acs';
        fromEmail: string;
        fromName: string;
        resend?: {
            apiKey: string;
        };
        azureAcs?: {
            connectionString: string;
        };
    };
    resend: {
        apiKey: string;
        fromEmail: string;
        fromName: string;
    };
    membership: {
        invitations: {
            defaultExpiryDays: number;
            minExpiryDays: number;
            maxExpiryDays: number;
            reminderLeadHours: number;
            lifecycleIntervalMs: number;
            perTenantDailyLimit: number;
            perAdminDailyLimit: number;
            expiringSoonHours: number;
        };
    };
    contentGeneration: {
        enabled: boolean;
    };
    embeddingJob: {
        enabled: boolean;
        ignoredShardTypes: string[];
    };
    ai: {
        azureOpenAI: {
            endpoint: string;
            apiKey: string;
            deploymentName: string;
            apiVersion: string;
        };
    };
}
/**
 * Load and validate environment configuration
 */
export declare function loadConfig(): ServiceConfig;
/**
 * Export singleton instance
 */
export declare const config: ServiceConfig;
export {};
//# sourceMappingURL=env.d.ts.map