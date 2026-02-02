/**
 * Secret Management Service
 * 
 * Main entry point exports for the Secret Management Service.
 */

// Services
export * from './services/SecretService';
export * from './services/SecretResolver';
export * from './services/VaultService';
export * from './services/AuditService';
export { ComplianceService } from './services/ComplianceService';
export * from './services/health/HealthService';

// Access Control
export * from './services/access';

// Lifecycle Management
export * from './services/lifecycle/ExpirationManager';
export * from './services/lifecycle/RotationManager';
export * from './services/lifecycle/VersionManager';
export * from './services/lifecycle/SoftDeleteManager';

// Import/Export
export * from './services/import/ImportService';
export * from './services/export/ExportService';
export * from './services/migration/MigrationService';

// Events
export * from './services/events/SecretEventPublisher';

// Logging
export * from './services/logging/LoggingClient';

// Types
export * from './types';

// Errors
export * from './errors/SecretErrors';

// Utils
export * from './utils';

// Config
export * from './config';
