/**
 * Event Publisher
 * Publishes events to RabbitMQ
 * @module @coder/shared/events
 */
import type { PublishEventOptions } from '../types/events.types';
/**
 * RabbitMQ configuration
 */
export interface RabbitMQConfig {
    url: string;
    exchange?: string;
    exchangeType?: 'topic' | 'direct' | 'fanout';
}
/**
 * Event Publisher
 * Publishes events to RabbitMQ topic exchange
 */
export declare class EventPublisher {
    private connection;
    private channel;
    private config;
    private exchange;
    private instanceId;
    constructor(config: RabbitMQConfig, serviceName: string);
    /**
     * Connect to RabbitMQ
     */
    connect(): Promise<void>;
    /**
     * Publish event
     */
    publish<T>(eventType: string, tenantId: string, data: T, options?: PublishEventOptions): Promise<void>;
    /**
     * Close connection
     */
    close(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
}
//# sourceMappingURL=EventPublisher.d.ts.map