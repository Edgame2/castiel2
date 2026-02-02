/**
 * CAIS learning batch job consumer (Phase 12). Listens for workflow.job.trigger with job cais-learning,
 * runs CaisLearningService.runLearningJob(), publishes workflow.job.completed or workflow.job.failed.
 */

import { EventConsumer } from '@coder/shared';
import { loadConfig } from '../../config';
import { CaisLearningService } from '../../services/CaisLearningService';
import { initializeWorkflowJobPublisher, publishJobCompleted, publishJobFailed } from '../publishers/WorkflowJobPublisher';

let consumer: EventConsumer | null = null;

export async function initializeCaisLearningJobConsumer(): Promise<void> {
  const config = loadConfig();
  const bj = config.rabbitmq?.batch_jobs;
  if (!config.rabbitmq?.url || !bj?.queue || !bj.routing_keys?.length) {
    console.log('CaisLearningJobConsumer: batch_jobs not configured, skipping');
    return;
  }

  await initializeWorkflowJobPublisher();

  consumer = new EventConsumer({
    url: config.rabbitmq.url,
    exchange: config.rabbitmq.exchange || 'coder_events',
    queue: bj.queue,
    routingKeys: bj.routing_keys,
  });

  consumer.on(
    'workflow.job.trigger',
    async (event: { data?: { job?: string; metadata?: Record<string, unknown> } }) => {
      const job = event.data?.job;
      if (job !== 'cais-learning') return;
      try {
        const svc = new CaisLearningService();
        const result = await svc.runLearningJob(
          event.data?.metadata?.outcomesDays != null
            ? { outcomesDays: Number(event.data.metadata.outcomesDays) }
            : undefined
        );
        console.log('cais-learning completed', {
          tenantsProcessed: result.tenantsProcessed,
          weightsUpdated: result.weightsUpdated,
          service: 'adaptive-learning',
        });
        await publishJobCompleted('cais-learning', new Date().toISOString());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('cais-learning failed', { error: msg, service: 'adaptive-learning' });
        await publishJobFailed('cais-learning', msg, new Date().toISOString());
      }
    }
  );

  await consumer.start();
  console.log('CaisLearningJobConsumer started', { queue: bj.queue, service: 'adaptive-learning' });
}

export async function closeCaisLearningJobConsumer(): Promise<void> {
  if (consumer) {
    try {
      await consumer.stop();
    } catch (e) {
      console.warn('CaisLearningJobConsumer close error', (e as Error).message);
    }
    consumer = null;
  }
}
