import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
  // Server
  port: number;
  host: string;
  nodeEnv: 'development' | 'staging' | 'production';
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

  // API
  api: {
    publicUrl: string;
  };

  // Frontend (used for invitation links)
  frontend: {
    baseUrl: string;
  };

  // Redis
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

  // JWT Configuration
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

  // Google Workspace Integration OAuth
  googleWorkspace?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  // Cosmos DB
  cosmosDb: {
    endpoint: string;
    key: string;
    databaseId: string;
    queryPerformance: {
      slowQueryThresholdMs: number; // Log queries exceeding this duration (default: 1000ms)
      expensiveQueryThresholdRU: number; // Log queries exceeding this RU consumption (default: 10 RUs)
      enableSlowQueryLogging: boolean; // Enable slow query logging (default: true)
      enablePerformanceMetrics: boolean; // Enable performance metrics tracking (default: true)
    };
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
      // Integration containers
      integrations: string;
      tenantIntegrations: string;
      integrationConnections: string;
      conversionSchemas: string;
      syncTasks: string;
      syncExecutions: string;
      syncConflicts: string;
      // AI configuration containers
      aiModels: string;
      aiConnections: string;
      // Web search / deep search containers
      search: string;
      webPages: string;
      // AI Insights advanced containers
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
      // Content Generation
      documentTemplates: string;
      // Feature Flags
      featureFlags: string;
      // Adaptive Learning containers
      adaptiveWeights: string;
      modelSelectionHistory: string;
      signalWeights: string;
      learningOutcomes: string;
      parameterHistory: string;
      conflictResolutionLearning: string;
      hierarchicalMemory: string;
      adversarialTests: string;
      communicationAnalysis: string;
      calendarIntelligence: string;
      socialSignals: string;
      productUsage: string;
      anomalyDetections: string;
      explanationQuality: string;
      explanationMonitoring: string;
      collaborativeIntelligence: string;
      forecastDecompositions: string;
      consensusForecasts: string;
      forecastCommitments: string;
      pipelineHealth: string;
      playbookExecutions: string;
      negotiationIntelligence: string;
      relationshipEvolution: string;
      competitiveIntelligence: string;
      customerSuccessIntegration: string;
      selfHealing: string;
      federatedLearning: string;
    };
  };

  // Monitoring
  monitoring: {
    enabled: boolean;
    provider: 'application-insights' | 'mock';
    instrumentationKey?: string;
    samplingRate: number;
  };

  // CORS
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
  };

  // Security toggles
  security: {
    loginRateLimitEnabled: boolean;
  };

  // GraphQL
  graphql: {
    enabled: boolean;
    playground: boolean;
    path: string;
  };

  // Azure Key Vault
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

  // Azure Blob Storage for document management
  azureStorage?: {
    connectionString: string;
    accountName: string;
    accountKey: string;
    documentsContainer: string;
    quarantineContainer: string;
    verifyVirus: boolean;
  };

  // Email settings
  email: {
    provider: 'console' | 'resend' | 'azure-acs';
    fromEmail: string;
    fromName: string;
    resend?: { apiKey: string };
    azureAcs?: { connectionString: string };
  };

  // Resend email settings (legacy - use email config instead)
  resend: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };

  // Tenant membership / invitation settings
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

  // Content Generation System
  contentGeneration: {
    enabled: boolean;
  };

  // Embedding Job Configuration
  embeddingJob: {
    enabled: boolean;
    ignoredShardTypes: string[];
  };

  // Service Bus configuration removed - replaced by BullMQ/Redis

  // Azure OpenAI
  ai: {
    azureOpenAI: {
      endpoint: string;
      apiKey: string;
      deploymentName: string;
      apiVersion: string;
    }
  };
};

/**
 * Helper to extract account name from Azure Storage connection string
 */
function extractAccountName(connectionString: string): string {
  const match = connectionString.match(/AccountName=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Helper to extract account key from Azure Storage connection string
 */
function extractAccountKey(connectionString: string): string {
  const match = connectionString.match(/AccountKey=([^;]+)/);
  return match ? match[1] : '';
}

/**
 * Load and validate environment configuration
 */
export function loadConfig(): ServiceConfig {
  // In production, require explicit configuration - no localhost fallbacks
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production';
  const defaultApiBaseUrl = process.env.PUBLIC_API_BASE_URL || 
    (nodeEnv === 'production' 
      ? (() => { throw new Error('PUBLIC_API_BASE_URL is required in production'); })()
      : `http://localhost:${process.env.PORT || '3000'}`);

  const config: ServiceConfig = {
    // Server configuration
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',

    api: {
      publicUrl: process.env.PUBLIC_API_BASE_URL || defaultApiBaseUrl,
    },

    frontend: {
      baseUrl:
        process.env.FRONTEND_URL ||
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
            retryStrategy: (times: number) => {
              if (times > 10) {
                return undefined; // Stop retrying
              }
              return Math.min(times * 50, 2000);
            },
          };
        } catch (error) {
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
        retryStrategy: (times: number) => {
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
        clientId:
          process.env.GOOGLE_CLIENT_ID ||
          process.env.OAUTH_GOOGLE_CLIENT_ID ||
          '',
        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET ||
          process.env.OAUTH_GOOGLE_CLIENT_SECRET ||
          '',
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI ||
          process.env.OAUTH_GOOGLE_REDIRECT_URI ||
          `${defaultApiBaseUrl}/auth/google/callback`,
        authorizationUrl:
          process.env.GOOGLE_AUTHORIZATION_URL ||
          'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl:
          process.env.GOOGLE_TOKEN_URL ||
          'https://oauth2.googleapis.com/token',
        userInfoUrl:
          process.env.GOOGLE_USERINFO_URL ||
          'https://openidconnect.googleapis.com/v1/userinfo',
        scope: process.env.GOOGLE_OAUTH_SCOPE || 'openid email profile',
      },
      github: {
        clientId:
          process.env.GITHUB_CLIENT_ID ||
          process.env.OAUTH_GITHUB_CLIENT_ID ||
          '',
        clientSecret:
          process.env.GITHUB_CLIENT_SECRET ||
          process.env.OAUTH_GITHUB_CLIENT_SECRET ||
          '',
        redirectUri:
          process.env.GITHUB_REDIRECT_URI ||
          process.env.OAUTH_GITHUB_REDIRECT_URI ||
          `${defaultApiBaseUrl}/auth/github/callback`,
        authorizationUrl:
          process.env.GITHUB_AUTHORIZATION_URL ||
          'https://github.com/login/oauth/authorize',
        tokenUrl:
          process.env.GITHUB_TOKEN_URL ||
          'https://github.com/login/oauth/access_token',
        userInfoUrl:
          process.env.GITHUB_USERINFO_URL ||
          'https://api.github.com/user',
        scope: process.env.GITHUB_OAUTH_SCOPE || 'read:user user:email',
      },
      microsoft: {
        clientId:
          process.env.MICROSOFT_CLIENT_ID ||
          process.env.OAUTH_MICROSOFT_CLIENT_ID ||
          '',
        clientSecret:
          process.env.MICROSOFT_CLIENT_SECRET ||
          process.env.OAUTH_MICROSOFT_CLIENT_SECRET ||
          '',
        redirectUri:
          process.env.MICROSOFT_REDIRECT_URI ||
          process.env.OAUTH_MICROSOFT_REDIRECT_URI ||
          `${defaultApiBaseUrl}/auth/microsoft/callback`,
        authorizationUrl:
          process.env.MICROSOFT_AUTHORIZATION_URL ||
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl:
          process.env.MICROSOFT_TOKEN_URL ||
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl:
          process.env.MICROSOFT_USERINFO_URL ||
          'https://graph.microsoft.com/v1.0/me',
        scope: process.env.MICROSOFT_OAUTH_SCOPE || 'openid email profile User.Read',
      },
    },

    // Cosmos DB configuration
    cosmosDb: {
      endpoint: process.env.COSMOS_DB_ENDPOINT || '',
      key: process.env.COSMOS_DB_KEY || '',
      databaseId: process.env.COSMOS_DB_DATABASE_ID || 'castiel',
      queryPerformance: {
        slowQueryThresholdMs: parseInt(process.env.COSMOS_DB_SLOW_QUERY_THRESHOLD_MS || '1000', 10),
        expensiveQueryThresholdRU: parseInt(process.env.COSMOS_DB_EXPENSIVE_QUERY_THRESHOLD_RU || '10', 10),
        enableSlowQueryLogging: process.env.COSMOS_DB_ENABLE_SLOW_QUERY_LOGGING !== 'false',
        enablePerformanceMetrics: process.env.COSMOS_DB_ENABLE_PERFORMANCE_METRICS !== 'false',
      },
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
        // Adaptive Learning containers
        adaptiveWeights: process.env.COSMOS_DB_ADAPTIVE_WEIGHTS_CONTAINER || 'adaptive_weights',
        modelSelectionHistory: process.env.COSMOS_DB_MODEL_SELECTION_HISTORY_CONTAINER || 'model_selection_history',
        signalWeights: process.env.COSMOS_DB_SIGNAL_WEIGHTS_CONTAINER || 'signal_weights',
        learningOutcomes: process.env.COSMOS_DB_LEARNING_OUTCOMES_CONTAINER || 'learning_outcomes',
        parameterHistory: process.env.COSMOS_DB_PARAMETER_HISTORY_CONTAINER || 'parameter_history',
        conflictResolutionLearning: process.env.COSMOS_DB_CONFLICT_RESOLUTION_LEARNING_CONTAINER || 'conflict_resolution_learning',
        hierarchicalMemory: process.env.COSMOS_DB_HIERARCHICAL_MEMORY_CONTAINER || 'hierarchical_memory',
        adversarialTests: process.env.COSMOS_DB_ADVERSARIAL_TESTS_CONTAINER || 'adversarial_tests',
        communicationAnalysis: process.env.COSMOS_DB_COMMUNICATION_ANALYSIS_CONTAINER || 'communication_analysis',
        calendarIntelligence: process.env.COSMOS_DB_CALENDAR_INTELLIGENCE_CONTAINER || 'calendar_intelligence',
        socialSignals: process.env.COSMOS_DB_SOCIAL_SIGNALS_CONTAINER || 'social_signals',
        productUsage: process.env.COSMOS_DB_PRODUCT_USAGE_CONTAINER || 'product_usage',
        anomalyDetections: process.env.COSMOS_DB_ANOMALY_DETECTIONS_CONTAINER || 'anomaly_detections',
        explanationQuality: process.env.COSMOS_DB_EXPLANATION_QUALITY_CONTAINER || 'explanation_quality',
        explanationMonitoring: process.env.COSMOS_DB_EXPLANATION_MONITORING_CONTAINER || 'explanation_monitoring',
        collaborativeIntelligence: process.env.COSMOS_DB_COLLABORATIVE_INTELLIGENCE_CONTAINER || 'collaborative_intelligence',
        forecastDecompositions: process.env.COSMOS_DB_FORECAST_DECOMPOSITIONS_CONTAINER || 'forecast_decompositions',
        consensusForecasts: process.env.COSMOS_DB_CONSENSUS_FORECASTS_CONTAINER || 'consensus_forecasts',
        forecastCommitments: process.env.COSMOS_DB_FORECAST_COMMITMENTS_CONTAINER || 'forecast_commitments',
        pipelineHealth: process.env.COSMOS_DB_PIPELINE_HEALTH_CONTAINER || 'pipeline_health',
        playbookExecutions: process.env.COSMOS_DB_PLAYBOOK_EXECUTIONS_CONTAINER || 'playbook_executions',
        negotiationIntelligence: process.env.COSMOS_DB_NEGOTIATION_INTELLIGENCE_CONTAINER || 'negotiation_intelligence',
        relationshipEvolution: process.env.COSMOS_DB_RELATIONSHIP_EVOLUTION_CONTAINER || 'relationship_evolution',
        competitiveIntelligence: process.env.COSMOS_DB_COMPETITIVE_INTELLIGENCE_CONTAINER || 'competitive_intelligence',
        customerSuccessIntegration: process.env.COSMOS_DB_CUSTOMER_SUCCESS_INTEGRATION_CONTAINER || 'customer_success_integration',
        selfHealing: process.env.COSMOS_DB_SELF_HEALING_CONTAINER || 'self_healing',
        federatedLearning: process.env.COSMOS_DB_FEDERATED_LEARNING_CONTAINER || 'federated_learning',
      },
    },

    // Monitoring configuration
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === 'true',
      provider: (process.env.MONITORING_PROVIDER as any) || 'mock',
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
      provider: (process.env.EMAIL_PROVIDER as any) || 'console',
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
 * Validate configuration with comprehensive checks
 */
function validateConfig(config: ServiceConfig): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = config.nodeEnv === 'production';

  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('Invalid PORT: must be between 1 and 65535');
  }

  // Validate Redis configuration
  if (!config.redis.host) {
    errors.push('REDIS_HOST is required (or provide REDIS_URL)');
  }

  if (isNaN(config.redis.port) || config.redis.port < 1 || config.redis.port > 65535) {
    errors.push('Invalid REDIS_PORT: must be between 1 and 65535');
  }

  // Validate JWT secrets
  if (!config.jwt.accessTokenSecret) {
    errors.push('JWT_ACCESS_SECRET is required');
  } else if (config.jwt.accessTokenSecret.length < 32 && isProduction) {
    warnings.push('JWT_ACCESS_SECRET is less than 32 characters - consider using a longer secret in production');
  }

  if (!config.jwt.refreshTokenSecret) {
    errors.push('JWT_REFRESH_SECRET is required');
  } else if (config.jwt.refreshTokenSecret.length < 32 && isProduction) {
    warnings.push('JWT_REFRESH_SECRET is less than 32 characters - consider using a longer secret in production');
  }

  // Validate Cosmos DB configuration
  if (!config.cosmosDb.endpoint) {
    errors.push('COSMOS_DB_ENDPOINT is required');
  } else {
    // Validate endpoint URL format
    try {
      const url = new URL(config.cosmosDb.endpoint);
      if (!url.protocol.startsWith('https')) {
        warnings.push('COSMOS_DB_ENDPOINT should use HTTPS protocol');
      }
    } catch (e) {
      errors.push('COSMOS_DB_ENDPOINT must be a valid URL');
    }
  }

  if (!config.cosmosDb.key) {
    errors.push('COSMOS_DB_KEY is required');
  }

  if (!config.cosmosDb.databaseId) {
    errors.push('COSMOS_DB_DATABASE_ID is required');
  }

  // Validate required containers
  const requiredContainers = [
    { key: 'users', name: 'COSMOS_DB_USERS_CONTAINER' },
    { key: 'roles', name: 'COSMOS_DB_ROLES_CONTAINER' },
    { key: 'tenants', name: 'COSMOS_DB_TENANTS_CONTAINER' },
    { key: 'shards', name: 'COSMOS_DB_SHARDS_CONTAINER' },
    { key: 'shardTypes', name: 'COSMOS_DB_SHARD_TYPES_CONTAINER' },
    { key: 'joinRequests', name: 'COSMOS_DB_JOIN_REQUESTS_CONTAINER' },
    { key: 'tenantInvitations', name: 'COSMOS_DB_TENANT_INVITATIONS_CONTAINER' },
  ];

  for (const container of requiredContainers) {
    if (!config.cosmosDb.containers[container.key as keyof typeof config.cosmosDb.containers]) {
      errors.push(`${container.name} is required`);
    }
  }

  // Validate API URL
  if (isProduction && !config.api.publicUrl) {
    errors.push('PUBLIC_API_BASE_URL is required in production');
  } else if (config.api.publicUrl) {
    try {
      const url = new URL(config.api.publicUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('PUBLIC_API_BASE_URL must use http:// or https:// protocol');
      }
      if (isProduction && url.protocol !== 'https:') {
        warnings.push('PUBLIC_API_BASE_URL should use HTTPS in production');
      }
    } catch (e) {
      errors.push('PUBLIC_API_BASE_URL must be a valid URL');
    }
  }

  // Validate monitoring configuration
  if (config.monitoring.enabled && config.monitoring.provider === 'application-insights') {
    if (!config.monitoring.instrumentationKey && !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      errors.push('APPINSIGHTS_INSTRUMENTATION_KEY or APPLICATIONINSIGHTS_CONNECTION_STRING is required when monitoring is enabled');
    }
  }

  // Validate email configuration in production
  if (isProduction) {
    if (!config.email.fromEmail) {
      errors.push('EMAIL_FROM_EMAIL is required in production');
    }
    if (config.email.provider === 'resend' && !config.email.resend?.apiKey) {
      errors.push('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }
    if (config.email.provider === 'azure-acs' && !config.email.azureAcs?.connectionString) {
      errors.push('AZURE_ACS_CONNECTION_STRING is required when EMAIL_PROVIDER=azure-acs');
    }
  }

  // Validate Azure OpenAI (optional but recommended)
  if (!config.ai.azureOpenAI.endpoint || !config.ai.azureOpenAI.apiKey) {
    warnings.push('Azure OpenAI not configured - AI features (embeddings, insights, content generation) will be disabled');
  } else {
    // Validate Azure OpenAI endpoint format
    try {
      const url = new URL(config.ai.azureOpenAI.endpoint);
      if (!url.hostname.includes('openai.azure.com') && !url.hostname.includes('cognitiveservices.azure.com')) {
        warnings.push('Azure OpenAI endpoint format may be incorrect');
      }
    } catch (e) {
      errors.push('AZURE_OPENAI_ENDPOINT must be a valid URL');
    }
  }

  // Validate Azure Blob Storage (optional but recommended for documents)
  if (!config.storage?.azureBlob?.connectionString) {
    warnings.push('Azure Blob Storage not configured - document upload/download features will be disabled');
  }

  // Validate invitation configuration
  const invitationConfig = config.membership.invitations;
  if (invitationConfig.minExpiryDays <= 0) {
    errors.push('INVITE_MIN_EXPIRY_DAYS must be greater than 0');
  }
  if (invitationConfig.maxExpiryDays < invitationConfig.minExpiryDays) {
    errors.push('INVITE_MAX_EXPIRY_DAYS must be >= INVITE_MIN_EXPIRY_DAYS');
  }
  if (invitationConfig.defaultExpiryDays < invitationConfig.minExpiryDays || invitationConfig.defaultExpiryDays > invitationConfig.maxExpiryDays) {
    errors.push('INVITE_DEFAULT_EXPIRY_DAYS must be between INVITE_MIN_EXPIRY_DAYS and INVITE_MAX_EXPIRY_DAYS');
  }
  if (invitationConfig.perTenantDailyLimit <= 0) {
    errors.push('INVITE_PER_TENANT_DAILY_LIMIT must be greater than 0');
  }
  if (invitationConfig.perAdminDailyLimit <= 0) {
    errors.push('INVITE_PER_ADMIN_DAILY_LIMIT must be greater than 0');
  }

  // Validate CORS in production
  if (isProduction && !process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN not set in production - CORS may be too permissive');
  }

  // Log warnings (non-blocking)
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  // Throw errors (blocking)
  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }
}

/**
 * Export validateConfig for use in validation scripts and tests
 */
export { validateConfig };

/**
 * Export singleton instance
 */
export const config = loadConfig();
