/**
 * Service Registry Types
 * Phase 4.1: Service Initialization Refactoring
 */

/**
 * Service status
 */
export enum ServiceStatus {
  UNREGISTERED = 'unregistered',
  REGISTERING = 'registering',
  REGISTERED = 'registered',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

/**
 * Service health status
 */
export interface ServiceHealth {
  status: ServiceStatus;
  healthy: boolean;
  lastChecked: Date;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  name: string;
  version?: string;
  description?: string;
  category: ServiceCategory;
  required: boolean;
  dependencies: string[]; // Service names this service depends on
  optionalDependencies: string[]; // Optional dependencies
  initializationPhase: number; // Phase number for orchestrated initialization
  featureFlag?: string; // Feature flag to enable/disable service
  healthCheck?: () => Promise<ServiceHealth> | ServiceHealth; // Health check function
  lifecycle?: {
    onInitialize?: () => Promise<void> | void;
    onShutdown?: () => Promise<void> | void;
  };
}

/**
 * Service categories
 */
export enum ServiceCategory {
  CORE = 'core', // Required for basic functionality
  DATABASE = 'database', // Database services
  CACHE = 'cache', // Caching services
  AI = 'ai', // AI/ML services
  SECURITY = 'security', // Security services
  MONITORING = 'monitoring', // Monitoring and logging
  INTEGRATION = 'integration', // External integrations
  OPTIONAL = 'optional', // Optional features
}

/**
 * Registered service entry
 */
export interface RegisteredService {
  metadata: ServiceMetadata;
  instance: unknown;
  status: ServiceStatus;
  health: ServiceHealth;
  registeredAt: Date;
  initializedAt?: Date;
  error?: Error;
}

/**
 * Service registry configuration
 */
export interface ServiceRegistryConfig {
  failFastOnRequired: boolean; // Fail fast if required service fails
  validateDependencies: boolean; // Validate dependencies before initialization
  enableHealthChecks: boolean; // Enable periodic health checks
  healthCheckInterval: number; // Health check interval in milliseconds
}
