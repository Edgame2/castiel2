/**
 * Event system
 * @module @coder/shared/events
 */

import { EventPublisher, RabbitMQConfig } from './EventPublisher';
import { EventConsumer, RabbitMQConsumerConfig, EventHandler } from './EventConsumer';
import { createEvent, validateEvent } from './EventSchema';

// Singleton instances
let eventPublisher: EventPublisher | null = null;
let eventConsumer: EventConsumer | null = null;

/**
 * Get or create event publisher
 */
export function getEventPublisher(config: RabbitMQConfig, serviceName: string): EventPublisher {
  if (!eventPublisher) {
    eventPublisher = new EventPublisher(config, serviceName);
  }
  return eventPublisher;
}

/**
 * Get or create event consumer
 */
export function getEventConsumer(config: RabbitMQConsumerConfig): EventConsumer {
  if (!eventConsumer) {
    eventConsumer = new EventConsumer(config);
  }
  return eventConsumer;
}

/**
 * Initialize event publisher connection
 */
export async function connectEventPublisher(
  config: RabbitMQConfig,
  serviceName: string
): Promise<void> {
  const publisher = getEventPublisher(config, serviceName);
  await publisher.connect();
}

/**
 * Initialize event consumer connection
 */
export async function connectEventConsumer(config: RabbitMQConsumerConfig): Promise<void> {
  const consumer = getEventConsumer(config);
  await consumer.connect();
  await consumer.start();
}

/**
 * Close event connections
 */
export async function closeConnection(): Promise<void> {
  if (eventPublisher) {
    await eventPublisher.close();
    eventPublisher = null;
  }
  if (eventConsumer) {
    await eventConsumer.close();
    eventConsumer = null;
  }
}

// Re-export types and classes
export type { RabbitMQConfig, RabbitMQConsumerConfig, EventHandler };
export { EventPublisher, EventConsumer, createEvent, validateEvent };
