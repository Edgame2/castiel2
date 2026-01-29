/**
 * Event types and interfaces
 * @module @coder/shared/types/events
 */
/**
 * Base event structure
 */
export interface DomainEvent<T = unknown> {
    id: string;
    type: string;
    version: string;
    timestamp: string;
    tenantId: string;
    source: {
        service: string;
        instance: string;
    };
    data: T;
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
//# sourceMappingURL=events.types.d.ts.map