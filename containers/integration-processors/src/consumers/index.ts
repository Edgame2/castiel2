/**
 * Consumer starter
 * Starts consumers based on CONSUMER_TYPE environment variable
 * @module integration-processors/consumers
 */

import { ServiceClient, EventPublisher } from '@coder/shared';
import { log } from '../utils/logger';
import { CRMDataMappingConsumer } from './CRMDataMappingConsumer';
import { MLFieldAggregationConsumer } from './MLFieldAggregationConsumer';
import { EntityLinkingConsumer } from './EntityLinkingConsumer';
import { DocumentProcessorConsumer } from './DocumentProcessorConsumer';
import { EmailProcessorConsumer } from './EmailProcessorConsumer';
import { MessageProcessorConsumer } from './MessageProcessorConsumer';
import { EventProcessorConsumer } from './EventProcessorConsumer';
import { MeetingProcessorConsumer } from './MeetingProcessorConsumer';
import { ActivityAggregationConsumer } from './ActivityAggregationConsumer';

export interface ConsumerDependencies {
  shardManager: ServiceClient;
  eventPublisher: EventPublisher;
  integrationManager: ServiceClient;
  aiService?: ServiceClient; // Optional AI service for entity linking
  redis?: any; // Redis client (optional)
}

/**
 * Base consumer interface
 */
export interface BaseConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Start consumers based on type
 * Returns array of started consumers for graceful shutdown
 */
export async function startConsumers(
  type: string,
  deps: ConsumerDependencies
): Promise<BaseConsumer[]> {
  const consumers: BaseConsumer[] = [];

  log.info(`Starting consumers (type: ${type})...`, { service: 'integration-processors' });

  if (type === 'light' || type === 'all') {
    // Light processors (fast processing)
    consumers.push(
      new CRMDataMappingConsumer(deps),
      new MLFieldAggregationConsumer(deps),
      new EntityLinkingConsumer(deps),
      new EmailProcessorConsumer(deps),
      new MessageProcessorConsumer(deps),
      new EventProcessorConsumer(deps),
      new ActivityAggregationConsumer(deps)
    );
  }

  if (type === 'heavy' || type === 'all') {
    // Heavy processors (slow processing)
    consumers.push(new DocumentProcessorConsumer(deps));
    consumers.push(new MeetingProcessorConsumer(deps));
  }

  // Start all consumers
  await Promise.all(consumers.map((c) => c.start()));

  log.info(`Started ${consumers.length} consumers`, {
    type,
    count: consumers.length,
    service: 'integration-processors',
  });

  return consumers;
}
