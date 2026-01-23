/**
 * Event types and interfaces
 * @module @coder/shared/types/events
 */

/**
 * Base event structure
 */
export interface DomainEvent<T = unknown> {
  id: string; // UUID
  type: string; // Format: {module}.{resource}.{action}
  version: string; // Schema version (e.g., '1.0')
  timestamp: string; // ISO 8601
  tenantId: string; // REQUIRED for tenant isolation
  source: {
    service: string; // Service that emitted event
    instance: string; // Instance ID
  };
  data: T; // Event payload
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}

/**
 * Event publishing options
 */
export interface PublishEventOptions {
  correlationId?: string;
  causationId?: string;
  userId?: string;
}

