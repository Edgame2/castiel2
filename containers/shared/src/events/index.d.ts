/**
 * Event system
 * @module @coder/shared/events
 */
import { EventPublisher, RabbitMQConfig } from './EventPublisher';
import { EventConsumer, RabbitMQConsumerConfig, EventHandler } from './EventConsumer';
import { createEvent, validateEvent } from './EventSchema';
/**
 * Get or create event publisher
 */
export declare function getEventPublisher(config: RabbitMQConfig, serviceName: string): EventPublisher;
/**
 * Get or create event consumer
 */
export declare function getEventConsumer(config: RabbitMQConsumerConfig): EventConsumer;
/**
 * Initialize event publisher connection
 */
export declare function connectEventPublisher(config: RabbitMQConfig, serviceName: string): Promise<void>;
/**
 * Initialize event consumer connection
 */
export declare function connectEventConsumer(config: RabbitMQConsumerConfig): Promise<void>;
/**
 * Close event connections
 */
export declare function closeConnection(): Promise<void>;
export type { RabbitMQConfig, RabbitMQConsumerConfig, EventHandler };
export { EventPublisher, EventConsumer, createEvent, validateEvent };
//# sourceMappingURL=index.d.ts.map