/**
 * Event Consumer
 * Consumes events from RabbitMQ
 * @module @coder/shared/events
 */
import { DomainEvent } from '../types/events.types';
/**
 * RabbitMQ consumer configuration
 */
export interface RabbitMQConsumerConfig {
    url: string;
    exchange?: string;
    exchangeType?: 'topic' | 'direct' | 'fanout';
    queue?: string;
    routingKeys?: string[];
    prefetch?: number;
}
/**
 * Event handler function
 */
export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;
/**
 * Event Consumer
 * Consumes events from RabbitMQ queue
 */
export declare class EventConsumer {
    private connection;
    private channel;
    private config;
    private exchange;
    private queue;
    private handlers;
    constructor(config: RabbitMQConsumerConfig);
    /**
     * Connect to RabbitMQ and setup queue
     */
    connect(): Promise<void>;
    /**
     * Register event handler
     */
    on(eventType: string, handler: EventHandler): void;
    /**
     * Start consuming events
     */
    start(): Promise<void>;
    /**
     * Stop consuming
     */
    stop(): Promise<void>;
    /**
     * Close connection
     */
    close(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
}
//# sourceMappingURL=EventConsumer.d.ts.map