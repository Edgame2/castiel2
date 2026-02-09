/**
 * Ensure all RabbitMQ queues exist
 * Creates queues upfront before consumers start
 * @module integration-processors/startup/ensureQueues
 */

import * as amqp from 'amqplib';
import { log } from '../utils/logger.js';

/**
 * Queue definition with routing keys
 */
interface QueueDefinition {
  name: string;
  routingKeys: string[];
  options?: {
    durable?: boolean;
    arguments?: Record<string, any>;
  };
}

/**
 * All queues that need to be created
 */
const QUEUE_DEFINITIONS: QueueDefinition[] = [
  {
    name: 'integration_data_raw',
    routingKeys: ['integration.data.raw', 'integration.data.raw.batch'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'integration.data.raw.dlq',
        'x-message-ttl': 86400000, // 24 hours
      },
    },
  },
  {
    name: 'integration_data_raw.dlq',
    routingKeys: ['integration.data.raw.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days (messages stay in DLQ for 7 days)
      },
    },
  },
  {
    name: 'integration_documents',
    routingKeys: ['integration.document.detected', 'integration.document.ready'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'integration.document.dlq',
        'x-message-ttl': 172800000, // 48 hours
        'x-max-length': 1000, // Max 1000 messages in queue
      },
    },
  },
  {
    name: 'integration_documents.dlq',
    routingKeys: ['integration.document.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days
      },
    },
  },
  {
    name: 'integration_communications',
    routingKeys: ['integration.email.received', 'integration.message.received', 'integration.communication.ready'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'integration.communication.dlq',
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 5000, // Max 5000 messages in queue
      },
    },
  },
  {
    name: 'integration_communications.dlq',
    routingKeys: ['integration.communication.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days
      },
    },
  },
  {
    name: 'integration_meetings',
    routingKeys: ['integration.meeting.completed', 'integration.meeting.ready'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'integration.meeting.dlq',
        'x-message-ttl': 172800000, // 48 hours (meetings take longer to process)
        'x-max-length': 100, // Max 100 messages in queue (meetings are slow to process)
      },
    },
  },
  {
    name: 'integration_meetings.dlq',
    routingKeys: ['integration.meeting.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days
      },
    },
  },
  {
    name: 'integration_events',
    routingKeys: ['integration.event.created', 'integration.event.ready'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'integration.event.dlq',
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 10000, // Max 10000 messages in queue (calendar events are frequent)
      },
    },
  },
  {
    name: 'integration_events.dlq',
    routingKeys: ['integration.event.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days
      },
    },
  },
  {
    name: 'shard_ml_aggregation',
    routingKeys: ['shard.created', 'ml_field_aggregation.recalculate'],
    options: {
      durable: true,
    },
  },
  {
    name: 'entity_linking',
    routingKeys: ['shard.created'],
    options: {
      durable: true,
    },
  },
  {
    name: 'activity_aggregation',
    routingKeys: ['shard.created'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'activity.aggregation.dlq',
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 5000, // Max 5000 messages in queue
      },
    },
  },
  {
    name: 'activity_aggregation.dlq',
    routingKeys: ['activity.aggregation.dlq'],
    options: {
      durable: true,
      arguments: {
        'x-message-ttl': 604800000, // 7 days
      },
    },
  },
  {
    name: 'usage_ingestion',
    routingKeys: ['usage.ingested'],
    options: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'coder_events.dlx',
        'x-dead-letter-routing-key': 'usage.ingestion.dlq',
        'x-message-ttl': 86400000,
      },
    },
  },
  {
    name: 'usage_ingestion.dlq',
    routingKeys: ['usage.ingestion.dlq'],
    options: {
      durable: true,
      arguments: { 'x-message-ttl': 604800000 },
    },
  },
];

/**
 * Ensure all queues exist in RabbitMQ
 * Idempotent - safe to run multiple times
 */
export async function ensureQueues(rabbitmqUrl: string, exchange: string = 'coder_events'): Promise<void> {
  if (!rabbitmqUrl) {
    log.warn('RabbitMQ URL not configured, skipping queue initialization', {
      service: 'integration-processors',
    });
    return;
  }

  log.info('Ensuring all RabbitMQ queues exist...', {
    queueCount: QUEUE_DEFINITIONS.length,
    service: 'integration-processors',
  });

  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;

  try {
    // Connect to RabbitMQ (promise API returns ChannelModel)
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    if (!channel) {
      throw new Error('Failed to create channel');
    }

    // Ensure main exchange exists
    await channel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    log.info('Main exchange ensured', { exchange, service: 'integration-processors' });

    // Ensure DLQ exchange exists
    const dlxExchange = `${exchange}.dlx`;
    await channel.assertExchange(dlxExchange, 'direct', {
      durable: true,
    });

    log.info('DLQ exchange ensured', { dlxExchange, service: 'integration-processors' });

    // Create all queues
    for (const queueDef of QUEUE_DEFINITIONS) {
      await ensureSingleQueue(channel, exchange, queueDef);
    }

    log.info('All queues ensured', {
      queueCount: QUEUE_DEFINITIONS.length,
      service: 'integration-processors',
    });
  } catch (error: any) {
    log.error('Failed to ensure queues', error, {
      service: 'integration-processors',
    });
    throw error;
  } finally {
    // Close channel then connection
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * Ensure a single queue exists
 */
async function ensureSingleQueue(
  channel: amqp.Channel,
  exchange: string,
  queueDef: QueueDefinition
): Promise<void> {
  try {
    // Assert queue exists
    await channel.assertQueue(queueDef.name, {
      durable: queueDef.options?.durable ?? true,
      arguments: queueDef.options?.arguments,
    });

    // Determine which exchange to bind to (DLQ queues bind to DLX exchange)
    const isDlq = queueDef.name.includes('.dlq');
    const targetExchange = isDlq ? `${exchange}.dlx` : exchange;

    // Bind queue to exchange with routing keys
    for (const routingKey of queueDef.routingKeys) {
      await channel.bindQueue(queueDef.name, targetExchange, routingKey);
    }

    log.debug('Queue ensured', {
      queue: queueDef.name,
      exchange: targetExchange,
      routingKeys: queueDef.routingKeys,
      service: 'integration-processors',
    });
  } catch (error: any) {
    log.error(`Failed to ensure queue ${queueDef.name}`, error, {
      queue: queueDef.name,
      service: 'integration-processors',
    });
    throw error;
  }
}
