/**
 * Configuration for Azure Key Vault service
 */
export interface KeyVaultConfig {
  /**
   * The URL of the Azure Key Vault (e.g., https://my-vault.vault.azure.net/)
   */
  vaultUrl: string;

  /**
   * Whether to use Managed Identity for authentication
   * @default true in production, false in development
   */
  useManagedIdentity?: boolean;

  /**
   * Service Principal credentials for local development
   * Only required if useManagedIdentity is false
   */
  servicePrincipal?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };

  /**
   * Cache TTL in milliseconds for secrets
   * @default 300000 (5 minutes)
   */
  cacheTTL?: number;

  /**
   * Whether to fall back to environment variables if Key Vault is unavailable
   * @default true in development, false in production
   */
  enableFallback?: boolean;
}

/**
 * Standard secret names used across the application
 */
export enum SecretName {
  // Redis
  REDIS_PRIMARY_CONNECTION_STRING = 'redis-primary-connection-string',
  REDIS_SECONDARY_CONNECTION_STRING = 'redis-secondary-connection-string',

  // Cosmos DB
  COSMOS_DB_PRIMARY_KEY = 'cosmos-db-primary-key',
  COSMOS_DB_SECONDARY_KEY = 'cosmos-db-secondary-key',
  COSMOS_DB_ENDPOINT = 'cosmos-db-endpoint',

  // Azure AD B2C
  AZURE_AD_B2C_CLIENT_SECRET = 'azure-ad-b2c-client-secret',
  AZURE_AD_B2C_TENANT_NAME = 'azure-ad-b2c-tenant-name',
  AZURE_AD_B2C_CLIENT_ID = 'azure-ad-b2c-client-id',

  // SendGrid
  SENDGRID_API_KEY = 'sendgrid-api-key',
  SENDGRID_FROM_EMAIL = 'sendgrid-from-email',

  // JWT
  JWT_ACCESS_SECRET = 'jwt-access-secret',
  JWT_REFRESH_SECRET = 'jwt-refresh-secret',

  // OAuth Providers
  GOOGLE_CLIENT_ID = 'google-oauth-client-id',
  GOOGLE_CLIENT_SECRET = 'google-oauth-client-secret',
  GITHUB_CLIENT_ID = 'github-oauth-client-id',
  GITHUB_CLIENT_SECRET = 'github-oauth-client-secret',

  // Application Insights
  APP_INSIGHTS_CONNECTION_STRING = 'app-insights-connection-string',
  APP_INSIGHTS_INSTRUMENTATION_KEY = 'app-insights-instrumentation-key',

  // SAML Certificates (for enterprise SSO)
  SAML_CERTIFICATE = 'saml-certificate',
  SAML_PRIVATE_KEY = 'saml-private-key',

  // AI Provider API Keys (System-level)
  OPENAI_API_KEY = 'openai-api-key',
  AZURE_OPENAI_API_KEY = 'azure-openai-api-key',
  ANTHROPIC_API_KEY = 'anthropic-api-key',
  GOOGLE_AI_API_KEY = 'google-ai-api-key',
  MISTRAL_API_KEY = 'mistral-api-key',
  COHERE_API_KEY = 'cohere-api-key',
  HUGGINGFACE_API_KEY = 'huggingface-api-key',
  REPLICATE_API_KEY = 'replicate-api-key',
}

/**
 * Cached secret value with metadata
 */
export interface CachedSecret {
  value: string;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Result of a secret retrieval operation
 */
export interface SecretResult {
  /**
   * The secret value
   */
  value: string;

  /**
   * Whether the value was retrieved from cache
   */
  fromCache: boolean;

  /**
   * Whether the value was retrieved from Key Vault or fallback (env var)
   */
  fromFallback: boolean;
}

/**
 * Secret retrieval options
 */
export interface GetSecretOptions {
  /**
   * Whether to bypass cache and fetch fresh from Key Vault
   * @default false
   */
  bypassCache?: boolean;

  /**
   * Environment variable name to use as fallback
   */
  fallbackEnvVar?: string;

  /**
   * Whether this secret is required (throw if not found)
   * @default true
   */
  required?: boolean;
}
