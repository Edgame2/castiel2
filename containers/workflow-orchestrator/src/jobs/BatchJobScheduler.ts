/**
 * Batch job scheduler (Plan §9.3, §915). Publishes workflow.job.trigger on cron.
 * risk-snapshot-backfill: batch_jobs.risk_snapshot_backfill_cron (default 0 1 * * 0).
 * outcome-sync: batch_jobs.outcome_sync_cron (default 0 1 * * *).
 * industry-benchmarks: batch_jobs.industry_benchmarks_cron (default 0 4 * * *); worker: risk-analytics.
 * risk-clustering: batch_jobs.risk_clustering_cron (default 0 2 * * *); worker: risk-analytics.
 * account-health: batch_jobs.account_health_cron (default 0 3 * * *); worker: risk-analytics.
 * propagation: batch_jobs.propagation_cron (default 0 5 * * *); worker: risk-analytics.
 * model-monitoring (Plan §9.3, §940): batch_jobs.model_monitoring_cron (default 0 6 * * 0 = Sun 6 AM); worker: ml-service or risk-analytics.
 */

import { schedule as cronSchedule, validate as cronValidate } from 'node-cron';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { publishJobTrigger } from '../events/publishers/WorkflowEventPublisher';
import { batchJobTriggersTotal } from '../metrics';

type CronTask = ReturnType<typeof cronSchedule>;
const cronJobs: CronTask[] = [];

/**
 * Start the batch job scheduler. No-op if batch_jobs.enabled is false.
 */
export async function startBatchJobScheduler(): Promise<void> {
  const config = loadConfig();
  const bj = config.batch_jobs;
  if (bj?.enabled === false) {
    log.info('Batch job scheduler disabled', { service: 'workflow-orchestrator' });
    return;
  }

  if (bj?.risk_snapshot_backfill_cron && cronValidate(bj.risk_snapshot_backfill_cron)) {
    const expr = bj.risk_snapshot_backfill_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('risk-snapshot-backfill', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'risk-snapshot-backfill' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'risk-snapshot-backfill',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: risk-snapshot-backfill scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.risk_snapshot_backfill_cron) {
    log.warn('Invalid risk_snapshot_backfill_cron, skipping', { cron: bj.risk_snapshot_backfill_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.outcome_sync_cron && cronValidate(bj.outcome_sync_cron)) {
    const expr = bj.outcome_sync_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('outcome-sync', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'outcome-sync' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'outcome-sync',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: outcome-sync scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.outcome_sync_cron) {
    log.warn('Invalid outcome_sync_cron, skipping', { cron: bj.outcome_sync_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.industry_benchmarks_cron && cronValidate(bj.industry_benchmarks_cron)) {
    const expr = bj.industry_benchmarks_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('industry-benchmarks', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'industry-benchmarks' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'industry-benchmarks',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: industry-benchmarks scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.industry_benchmarks_cron) {
    log.warn('Invalid industry_benchmarks_cron, skipping', { cron: bj.industry_benchmarks_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.risk_clustering_cron && cronValidate(bj.risk_clustering_cron)) {
    const expr = bj.risk_clustering_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('risk-clustering', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'risk-clustering' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'risk-clustering',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: risk-clustering scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.risk_clustering_cron) {
    log.warn('Invalid risk_clustering_cron, skipping', { cron: bj.risk_clustering_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.account_health_cron && cronValidate(bj.account_health_cron)) {
    const expr = bj.account_health_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('account-health', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'account-health' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'account-health',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: account-health scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.account_health_cron) {
    log.warn('Invalid account_health_cron, skipping', { cron: bj.account_health_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.propagation_cron && cronValidate(bj.propagation_cron)) {
    const expr = bj.propagation_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('propagation', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'propagation' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'propagation',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: propagation scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.propagation_cron) {
    log.warn('Invalid propagation_cron, skipping', { cron: bj.propagation_cron, service: 'workflow-orchestrator' });
  }

  if (bj?.model_monitoring_cron && cronValidate(bj.model_monitoring_cron)) {
    const expr = bj.model_monitoring_cron;
    cronJobs.push(cronSchedule(expr, async () => {
      try {
        await publishJobTrigger('model-monitoring', { schedule: expr, triggeredAt: new Date().toISOString() });
        batchJobTriggersTotal.inc({ job: 'model-monitoring' });
      } catch (e) {
        log.error('BatchJobScheduler: publishJobTrigger failed', e instanceof Error ? e : new Error(String(e)), {
          job: 'model-monitoring',
          service: 'workflow-orchestrator',
        });
      }
    }));
    log.info('Batch job: model-monitoring scheduled', { cron: expr, service: 'workflow-orchestrator' });
  } else if (bj?.model_monitoring_cron) {
    log.warn('Invalid model_monitoring_cron, skipping', { cron: bj.model_monitoring_cron, service: 'workflow-orchestrator' });
  }

  if (cronJobs.length === 0) {
    log.info('Batch job scheduler: no valid crons, idle', { service: 'workflow-orchestrator' });
  }
}

/**
 * Stop the batch job scheduler.
 */
export function stopBatchJobScheduler(): void {
  for (const j of cronJobs) {
    j.stop();
  }
  cronJobs.length = 0;
  log.info('Batch job scheduler stopped', { service: 'workflow-orchestrator' });
}
