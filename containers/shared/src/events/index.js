/**
 * Event system
 * @module @coder/shared/events
 */
import { EventPublisher } from './EventPublisher';
import { EventConsumer } from './EventConsumer';
import { createEvent, validateEvent } from './EventSchema';
// Singleton instances
let eventPublisher = null;
let eventConsumer = null;
/**
 * Get or create event publisher
 */
export function getEventPublisher(config, serviceName) {
    if (!eventPublisher) {
        eventPublisher = new EventPublisher(config, serviceName);
    }
    return eventPublisher;
}
/**
 * Get or create event consumer
 */
export function getEventConsumer(config) {
    if (!eventConsumer) {
        eventConsumer = new EventConsumer(config);
    }
    return eventConsumer;
}
/**
 * Initialize event publisher connection
 */
export async function connectEventPublisher(config, serviceName) {
    const publisher = getEventPublisher(config, serviceName);
    await publisher.connect();
}
/**
 * Initialize event consumer connection
 */
export async function connectEventConsumer(config) {
    const consumer = getEventConsumer(config);
    await consumer.connect();
    await consumer.start();
}
/**
 * Close event connections
 */
export async function closeConnection() {
    if (eventPublisher) {
        await eventPublisher.close();
        eventPublisher = null;
    }
    if (eventConsumer) {
        await eventConsumer.close();
        eventConsumer = null;
    }
}
export { EventPublisher, EventConsumer, createEvent, validateEvent };
//# sourceMappingURL=index.js.map