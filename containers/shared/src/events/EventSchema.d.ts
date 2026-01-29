/**
 * Event Schema Validation
 * @module @coder/shared/events
 */
import { DomainEvent, PublishEventOptions } from '../types/events.types';
/**
 * Validate event structure
 */
export declare function validateEvent(event: unknown): event is DomainEvent;
/**
 * Create event with validation
 */
export declare function createEvent<T>(type: string, tenantId: string, data: T, source: {
    service: string;
    instance: string;
}, options?: PublishEventOptions): DomainEvent<T>;
//# sourceMappingURL=EventSchema.d.ts.map