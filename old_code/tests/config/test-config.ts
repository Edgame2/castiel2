/**
 * Test Configuration
 * 
 * Centralized configuration for test suite
 */

export const TestConfig = {
  // Service URLs
  mainApiUrl: process.env.MAIN_API_URL || 'http://localhost:3001',

  // Test timeouts
  defaultTimeout: 30000,
  healthCheckTimeout: 60000,

  // Retry configuration
  maxRetries: 30,
  retryDelay: 1000,

  // Test user configuration
  testEmailDomain: process.env.TEST_EMAIL_DOMAIN || 'test.local',
  testPasswordPrefix: 'TestPass',

  // Default tenant
  defaultTenantId: 'default',

  // Password requirements (should match main-api config)
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },

  // Rate limiting
  rateLimitMaxAttempts: 20,
  rateLimitWindow: 60000, // 1 minute

  // Token configuration
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',

  // Test data cleanup
  cleanupAfterTests: process.env.CLEANUP_AFTER_TESTS !== 'false',

  // Logging
  verbose: process.env.VERBOSE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Feature flags (for conditional testing)
  features: {
    emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
    mfaEnabled: process.env.MFA_ENABLED === 'true',
    rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    multiTenantEnabled: true,
  },

  // Database configuration (for cleanup if needed)
  database: {
    cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT || '',
    cosmosKey: process.env.COSMOS_DB_KEY || '',
    database: process.env.COSMOS_DB_DATABASE || 'castiel',
    usersContainer: process.env.COSMOS_DB_USERS_CONTAINER || 'users',
  },

  // Redis configuration (for session cleanup if needed)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

/**
 * Get test environment info
 */
export function getTestEnvironment(): string {
  return process.env.NODE_ENV || 'test';
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
}

/**
 * Get test concurrency level
 */
export function getTestConcurrency(): number {
  if (process.env.TEST_CONCURRENCY) {
    return parseInt(process.env.TEST_CONCURRENCY);
  }

  return isCI() ? 1 : 4;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof TestConfig.features): boolean {
  return TestConfig.features[feature];
}
