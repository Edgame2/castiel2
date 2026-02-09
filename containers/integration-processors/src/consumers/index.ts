/**
 * Consumer starter
 * Starts consumers based on CONSUMER_TYPE environment variable
 * @module integration-processors/consumers
 */

import { ServiceClient, EventPublisher, PolicyResolver } from '@coder/shared';
import { log } from '../utils/logger.js';
import { CRMDataMappingConsumer } from './CRMDataMappingConsumer.js';
import { MLFieldAggregationConsumer } from './MLFieldAggregationConsumer.js';
import { EntityLinkingConsumer } from './EntityLinkingConsumer.js';
import { DocumentProcessorConsumer } from './DocumentProcessorConsumer.js';
import { EmailProcessorConsumer } from './EmailProcessorConsumer.js';
import { MessageProcessorConsumer } from './MessageProcessorConsumer.js';
import { EventProcessorConsumer } from './EventProcessorConsumer.js';
import { MeetingProcessorConsumer } from './MeetingProcessorConsumer.js';
import { ActivityAggregationConsumer } from './ActivityAggregationConsumer.js';
import { UsageIngestionConsumer } from './UsageIngestionConsumer.js';

export interface ConsumerDependencies {
  shardManager: ServiceClient;
  eventPublisher: EventPublisher;
  integrationManager: ServiceClient;
  aiService?: ServiceClient; // Optional AI service for entity linking
  policyResolver?: PolicyResolver; // Optional; when set, detection steps respect integration_processing_settings
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
      new ActivityAggregationConsumer(deps),
      new UsageIngestionConsumer(deps)
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
