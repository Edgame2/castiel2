/**
 * Environment Variable Validation Utilities
 * 
 * Shared validation functions for worker applications
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables for worker applications
 */
export function validateWorkerEnv(required: Record<string, { required: boolean; description: string }>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];
    
    if (config.required && (!value || value.trim() === '')) {
      errors.push(`Missing required environment variable: ${key} (${config.description})`);
    } else if (!config.required && !value) {
      warnings.push(`Optional environment variable not set: ${key} (${config.description})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Cosmos DB configuration
 */
export function validateCosmosConfig(): ValidationResult {
  return validateWorkerEnv({
    COSMOS_DB_ENDPOINT: {
      required: true,
      description: 'Azure Cosmos DB endpoint URL',
    },
    COSMOS_DB_KEY: {
      required: true,
      description: 'Azure Cosmos DB primary key',
    },
    COSMOS_DB_DATABASE: {
      required: false,
      description: 'Cosmos DB database name (default: castiel)',
    },
  });
}

/**
 * Validate Redis configuration
 */
export function validateRedisConfig(): ValidationResult {
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasRedisHost = !!process.env.REDIS_HOST;

  if (!hasRedisUrl && !hasRedisHost) {
    return {
      valid: false,
      errors: [
        'Missing Redis configuration: Either REDIS_URL or REDIS_HOST must be set',
      ],
      warnings: [],
    };
  }

  if (hasRedisHost && !process.env.REDIS_PASSWORD) {
    return {
      valid: false,
      errors: [
        'Missing required environment variable: REDIS_PASSWORD (Redis authentication password)',
      ],
      warnings: [],
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(): ValidationResult {
  const monitoringEnabled = process.env.MONITORING_ENABLED !== 'false';
  
  if (monitoringEnabled && !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    return {
      valid: false,
      errors: [
        'Missing required environment variable: APPLICATIONINSIGHTS_CONNECTION_STRING (required when monitoring is enabled)',
      ],
      warnings: [],
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
  };
}

/**
 * Validate all common worker configuration
 */
export function validateCommonWorkerConfig(): ValidationResult {
  const cosmosResult = validateCosmosConfig();
  const redisResult = validateRedisConfig();
  const monitoringResult = validateMonitoringConfig();

  const allErrors = [
    ...cosmosResult.errors,
    ...redisResult.errors,
    ...monitoringResult.errors,
  ];

  const allWarnings = [
    ...cosmosResult.warnings,
    ...redisResult.warnings,
    ...monitoringResult.warnings,
  ];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}



