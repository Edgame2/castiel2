/**
 * Proactive Insights Event Subscriber Service
 *
 * Subscribes to shard events via Redis pub/sub and evaluates event-driven triggers
 * for proactive insights. When a shard is created, updated, or deleted, this service
 * checks if any triggers have matching eventTriggers and evaluates them.
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ProactiveInsightService } from './proactive-insight.service.js';
/**
 * Proactive Insights Event Subscriber Service
 */
export declare class ProactiveInsightsEventSubscriberService {
    private redis;
    private subscriber;
    private monitoring;
    private proactiveInsightService;
    private isListening;
    constructor(redis: Redis, monitoring: IMonitoringProvider, proactiveInsightService: ProactiveInsightService);
    /**
     * Initialize the subscriber service
     * Sets up Redis subscriber for shard events
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the subscriber service
     */
    shutdown(): Promise<void>;
    /**
     * Handle incoming Redis message
     */
    private handleRedisMessage;
    /**
     * Process a shard event and evaluate event-driven triggers
     */
    private processShardEvent;
    /**
     * Map ShardEventType enum to event trigger string format
     * Event triggers use strings like "shard.updated", "shard.created"
     */
    private mapEventTypeToTriggerString;
    /**
     * Check if the subscriber is listening
     */
    getIsListening(): boolean;
}
//# sourceMappingURL=proactive-insights-event-subscriber.service.d.ts.map