/**
 * Startup Validation Service
 * Phase 4.1: Service Initialization Refactoring
 * 
 * Validates system state at startup before serving requests.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ServiceRegistryService } from './service-registry.service.js';
import type { ConfigurationService } from './configuration.service.js';
import type { Redis } from 'ioredis';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  checks: ValidationCheck[];
  errors: string[];
  warnings: string[];
}

/**
 * Individual validation check
 */
export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Startup validation configuration
 */
export interface StartupValidationConfig {
  validateConfiguration: boolean;
  validateServices: boolean;
  validateDatabase: boolean;
  validateExternalAPIs: boolean;
  failFast: boolean; // Fail fast on validation errors
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: StartupValidationConfig = {
  validateConfiguration: true,
  validateServices: true,
  validateDatabase: true,
  validateExternalAPIs: false, // Optional - can be enabled per deployment
  failFast: true,
};

export class StartupValidationService {
  private config: StartupValidationConfig;

  constructor(
    private monitoring: IMonitoringProvider,
    private serviceRegistry?: ServiceRegistryService,
    private configurationService?: ConfigurationService,
    config?: Partial<StartupValidationConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Phase 4.1: Validate system state at startup
   */
  async validateStartup(options: {
    redis?: Redis | null;
    databaseConnected?: boolean;
  }): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate configuration
    if (this.config.validateConfiguration) {
      const configCheck = this.validateConfiguration();
      checks.push(configCheck);
      if (configCheck.status === 'fail') {
        errors.push(configCheck.message);
      } else if (configCheck.status === 'warning') {
        warnings.push(configCheck.message);
      }
      
      // Phase 4.2: Use ConfigurationService if available for enhanced validation
      if (this.configurationService) {
        try {
          const validation = this.configurationService.validateConfig(options as any);
          if (!validation.valid) {
            const configErrors = validation.errors.map(e => `${e.envVar}: ${e.message}`).join('; ');
            checks.push({
              name: 'configuration-schema',
              status: 'fail',
              message: `Schema validation failed: ${configErrors}`,
              details: { errors: validation.errors },
            });
            errors.push(`Configuration schema validation failed: ${configErrors}`);
          }
          
          if (validation.warnings.length > 0) {
            const configWarnings = validation.warnings.map(w => `${w.envVar}: ${w.message}`).join('; ');
            checks.push({
              name: 'configuration-warnings',
              status: 'warning',
              message: `Configuration warnings: ${configWarnings}`,
              details: { warnings: validation.warnings },
            });
            warnings.push(`Configuration warnings: ${configWarnings}`);
          }
        } catch (err) {
          checks.push({
            name: 'configuration-schema',
            status: 'warning',
            message: `Configuration schema validation unavailable: ${(err as Error).message}`,
          });
        }
      }
    }

    // 2. Validate services
    if (this.config.validateServices && this.serviceRegistry) {
      const servicesCheck = this.validateServices();
      checks.push(servicesCheck);
      if (servicesCheck.status === 'fail') {
        errors.push(servicesCheck.message);
      } else if (servicesCheck.status === 'warning') {
        warnings.push(servicesCheck.message);
      }
    }

    // 3. Validate database connectivity
    if (this.config.validateDatabase) {
      const dbCheck = this.validateDatabase(options.databaseConnected);
      checks.push(dbCheck);
      if (dbCheck.status === 'fail') {
        errors.push(dbCheck.message);
      } else if (dbCheck.status === 'warning') {
        warnings.push(dbCheck.message);
      }
    }

    // 4. Validate Redis connection
    if (options.redis) {
      const redisCheck = await this.validateRedis(options.redis);
      checks.push(redisCheck);
      if (redisCheck.status === 'fail') {
        errors.push(redisCheck.message);
      } else if (redisCheck.status === 'warning') {
        warnings.push(redisCheck.message);
      }
    }

    // 5. Validate external APIs (if enabled)
    if (this.config.validateExternalAPIs) {
      const apiCheck = await this.validateExternalAPIs();
      checks.push(apiCheck);
      if (apiCheck.status === 'fail') {
        errors.push(apiCheck.message);
      } else if (apiCheck.status === 'warning') {
        warnings.push(apiCheck.message);
      }
    }

    const valid = errors.length === 0;

    // Log validation results
    this.monitoring.trackEvent('startup-validation.completed', {
      valid,
      checksPassed: checks.filter(c => c.status === 'pass').length,
      checksFailed: checks.filter(c => c.status === 'fail').length,
      checksWarning: checks.filter(c => c.status === 'warning').length,
      errors: errors.length,
      warnings: warnings.length,
    });

    // Fail fast if configured
    if (!valid && this.config.failFast) {
      throw new Error(
        `Startup validation failed: ${errors.join('; ')}`
      );
    }

    return {
      valid,
      checks,
      errors,
      warnings,
    };
  }

  /**
   * Validate configuration completeness
   */
  private validateConfiguration(): ValidationCheck {
    const requiredEnvVars = [
      'COSMOS_DB_ENDPOINT',
      'COSMOS_DB_KEY',
      'COSMOS_DB_DATABASE_NAME',
    ];

    const missing: string[] = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'configuration',
        status: 'fail',
        message: `Missing required environment variables: ${missing.join(', ')}`,
        details: { missing },
      };
    }

    return {
      name: 'configuration',
      status: 'pass',
      message: 'All required configuration variables are set',
    };
  }

  /**
   * Validate required services are initialized
   */
  private validateServices(): ValidationCheck {
    if (!this.serviceRegistry) {
      return {
        name: 'services',
        status: 'warning',
        message: 'Service registry not available - skipping service validation',
      };
    }

    const validation = this.serviceRegistry.validateRequiredServices();
    
    if (!validation.valid) {
      return {
        name: 'services',
        status: 'fail',
        message: `Required services not initialized: ${validation.missing.join(', ')}`,
        details: { missing: validation.missing },
      };
    }

    const systemHealth = this.serviceRegistry.getSystemHealth();
    
    return {
      name: 'services',
      status: 'pass',
      message: `All required services initialized (${systemHealth.requiredHealthy}/${systemHealth.requiredTotal})`,
      details: {
        requiredHealthy: systemHealth.requiredHealthy,
        requiredTotal: systemHealth.requiredTotal,
      },
    };
  }

  /**
   * Validate database connectivity
   */
  private validateDatabase(databaseConnected?: boolean): ValidationCheck {
    // Phase 4.1: Basic check - can be enhanced with actual database ping
    if (databaseConnected === false) {
      return {
        name: 'database',
        status: 'fail',
        message: 'Database connection not established',
      };
    }

    if (databaseConnected === undefined) {
      return {
        name: 'database',
        status: 'warning',
        message: 'Database connection status unknown - assuming connected',
      };
    }

    return {
      name: 'database',
      status: 'pass',
      message: 'Database connection established',
    };
  }

  /**
   * Validate Redis connection
   */
  private async validateRedis(redis: Redis): Promise<ValidationCheck> {
    try {
      const result = await redis.ping();
      if (result === 'PONG') {
        return {
          name: 'redis',
          status: 'pass',
          message: 'Redis connection established',
        };
      } else {
        return {
          name: 'redis',
          status: 'fail',
          message: 'Redis ping returned unexpected response',
          details: { response: result },
        };
      }
    } catch (error) {
      return {
        name: 'redis',
        status: 'fail',
        message: `Redis connection failed: ${(error as Error).message}`,
        details: { error: (error as Error).message },
      };
    }
  }

  /**
   * Validate external API accessibility
   */
  private async validateExternalAPIs(): Promise<ValidationCheck> {
    // Phase 4.1: Placeholder - can be enhanced with actual API checks
    // This would check connectivity to external services like Azure OpenAI, etc.
    
    return {
      name: 'external-apis',
      status: 'warning',
      message: 'External API validation not implemented - skipping',
    };
  }
}
