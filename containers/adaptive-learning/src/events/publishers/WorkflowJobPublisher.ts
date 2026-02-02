/**
 * Workflow job publisher (Phase 12). Publishes workflow.job.completed and workflow.job.failed
 * for the cais-learning batch job.
 */

import { EventPublisher } from '@coder/shared';
import { loadConfig } from '../../config';

const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000001';
let publisher: EventPublisher | null = null;

export async function initializeWorkflowJobPublisher(): Promise<void> {
  const config = loadConfig();
  if (!config.rabbitmq?.url) return;
  try {
    publisher = new EventPublisher(
      {
        url: config.rabbitmq.url,
        exchange: config.rabbitmq.exchange || 'coder_events',
        exchangeType: 'topic',
      },
      'adaptive-learning'
    );
    await publisher.connect();
  } catch (e) {
    console.warn('WorkflowJobPublisher init failed', (e as Error).message);
  }
}

export async function publishJobCompleted(job: string, completedAt?: string): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('workflow.job.completed', SYSTEM_TENANT_ID, {
      job,
      status: 'success',
      completedAt: completedAt || new Date().toISOString(),
    });
  } catch (e) {
    console.warn('publish workflow.job.completed failed', (e as Error).message);
  }
}

export async function publishJobFailed(job: string, error: string, failedAt?: string): Promise<void> {
  if (!publisher) return;
  try {
    await publisher.publish('workflow.job.failed', SYSTEM_TENANT_ID, {
      job,
      error,
      failedAt: failedAt || new Date().toISOString(),
    });
  } catch (e) {
    console.warn('publish workflow.job.failed failed', (e as Error).message);
  }
}
