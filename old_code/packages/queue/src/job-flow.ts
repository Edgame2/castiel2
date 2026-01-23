/**
 * Job Flow Utilities
 * 
 * Provides utilities for managing sequential job flows and dependencies
 * Uses correlation IDs to track related jobs across queues
 */

import type { QueueProducerService } from './producers.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { generateCorrelationId, ensureCorrelationId } from './correlation-id.js';
import { QueueName } from './types.js';
import type {
  EmbeddingJobMessage,
  DocumentChunkJobMessage,
  DocumentCheckJobMessage,
  EnrichmentJobMessage,
  ShardEmissionMessage,
} from './types.js';

/**
 * Job flow step definition
 */
export interface JobFlowStep<T = any> {
  /**
   * Step name/identifier
   */
  name: string;
  
  /**
   * Job data for this step
   */
  jobData: T;
  
  /**
   * Queue name to enqueue to
   */
  queueName: string;
  
  /**
   * Job name/type
   */
  jobName: string;
  
  /**
   * Options for this job
   */
  options?: {
    delay?: number;
    priority?: number;
  };
  
  /**
   * Whether this step is optional (failure doesn't stop the flow)
   */
  optional?: boolean;
  
  /**
   * Condition function to determine if this step should run
   */
  condition?: (previousResults: any[]) => boolean;
}

/**
 * Job flow result
 */
export interface JobFlowResult {
  /**
   * Correlation ID for the flow
   */
  correlationId: string;
  
  /**
   * Results from each step
   */
  steps: Array<{
    name: string;
    success: boolean;
    jobId?: string;
    error?: string;
  }>;
  
  /**
   * Overall flow status
   */
  success: boolean;
}

/**
 * Job Flow Manager
 * 
 * Manages sequential job flows with dependency tracking
 */
export class JobFlowManager {
  constructor(
    private queueProducer: QueueProducerService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * Execute a sequential job flow
   * Each step waits for the previous to complete (conceptually)
   * In practice, jobs are enqueued with correlation IDs for tracking
   */
  async executeFlow(
    steps: JobFlowStep[],
    correlationId?: string
  ): Promise<JobFlowResult> {
    const flowCorrelationId = correlationId || generateCorrelationId();
    const results: JobFlowResult['steps'] = [];
    let flowSuccess = true;

    this.monitoring.trackEvent('job-flow.started', {
      correlationId: flowCorrelationId,
      stepCount: steps.length,
    });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Check condition if provided
      if (step.condition && !step.condition(results.map(r => r.success))) {
        this.monitoring.trackEvent('job-flow.step-skipped', {
          correlationId: flowCorrelationId,
          stepName: step.name,
          stepIndex: i,
        });
        continue;
      }

      try {
        // Ensure correlation ID is in job data
        ensureCorrelationId(step.jobData);
        if (step.jobData && typeof step.jobData === 'object') {
          (step.jobData as any).correlationId = flowCorrelationId;
        }

        // Enqueue the job using the appropriate producer method based on queue name
        // Map queue names to producer methods
        let enqueued = false;
        
        if (step.queueName === QueueName.DOCUMENT_CHECK_JOBS) {
          await this.queueProducer.enqueueDocumentCheckJob(step.jobData as DocumentCheckJobMessage, {
            delay: step.options?.delay,
            priority: step.options?.priority,
            correlationId: flowCorrelationId,
          });
          enqueued = true;
        } else if (step.queueName === QueueName.DOCUMENT_CHUNK_JOBS) {
          await this.queueProducer.enqueueDocumentChunkJob(step.jobData as DocumentChunkJobMessage, {
            delay: step.options?.delay,
            priority: step.options?.priority,
            correlationId: flowCorrelationId,
          });
          enqueued = true;
        } else if (step.queueName === QueueName.EMBEDDING_JOBS) {
          await this.queueProducer.enqueueEmbeddingJob(step.jobData as EmbeddingJobMessage, {
            delay: step.options?.delay,
            priority: step.options?.priority,
            correlationId: flowCorrelationId,
          });
          enqueued = true;
        } else if (step.queueName === QueueName.ENRICHMENT_JOBS) {
          await this.queueProducer.enqueueEnrichmentJob(step.jobData as EnrichmentJobMessage, {
            delay: step.options?.delay,
            priority: step.options?.priority,
            correlationId: flowCorrelationId,
          });
          enqueued = true;
        } else if (step.queueName === QueueName.SHARD_EMISSION) {
          await this.queueProducer.enqueueShardEmission(step.jobData as ShardEmissionMessage, {
            delay: step.options?.delay,
            priority: step.options?.priority,
          });
          enqueued = true;
        }

        if (!enqueued) {
          throw new Error(`Unsupported queue name: ${step.queueName}`);
        }

        results.push({
          name: step.name,
          success: true,
        });

        this.monitoring.trackEvent('job-flow.step-enqueued', {
          correlationId: flowCorrelationId,
          stepName: step.name,
          stepIndex: i,
          queueName: step.queueName,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        results.push({
          name: step.name,
          success: false,
          error: errorMessage,
        });

        this.monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
          context: 'JobFlowManager.executeFlow',
          correlationId: flowCorrelationId,
          stepName: step.name,
          stepIndex: i,
        });

        // If step is not optional, mark flow as failed
        if (!step.optional) {
          flowSuccess = false;
          break; // Stop flow on required step failure
        }
      }
    }

    const result: JobFlowResult = {
      correlationId: flowCorrelationId,
      steps: results,
      success: flowSuccess,
    };

    this.monitoring.trackEvent('job-flow.completed', {
      correlationId: flowCorrelationId,
      success: flowSuccess,
      completedSteps: results.filter(r => r.success).length,
      totalSteps: steps.length,
    });

    return result;
  }

  /**
   * Create a document processing flow
   * Document Check → Document Chunk → Embedding
   */
  async createDocumentProcessingFlow(
    documentCheckJob: DocumentCheckJobMessage,
    documentChunkJob: DocumentChunkJobMessage,
    embeddingJobs: EmbeddingJobMessage[],
    correlationId?: string
  ): Promise<JobFlowResult> {
    const steps: JobFlowStep[] = [
      {
        name: 'document-check',
        jobData: documentCheckJob,
        queueName: QueueName.DOCUMENT_CHECK_JOBS,
        jobName: 'document-check',
        options: { priority: 8 }, // High priority for security checks
      },
      {
        name: 'document-chunk',
        jobData: documentChunkJob,
        queueName: QueueName.DOCUMENT_CHUNK_JOBS,
        jobName: 'document-chunk',
        options: { priority: 5 },
        // Note: In practice, document-chunk-worker enqueues embedding jobs
        // This flow tracks the conceptual sequence
      },
      // Embedding jobs are enqueued by document-chunk-worker, but we can track them
      // Note: In practice, these are enqueued by the document-chunk-worker after chunking
      // This is included for flow tracking purposes
      ...embeddingJobs.map((job, index) => ({
        name: `embedding-${index}`,
        jobData: job,
        queueName: QueueName.EMBEDDING_JOBS,
        jobName: 'embedding-job',
        options: { priority: 3 },
        optional: true, // Embedding failures don't block document processing
      })) as JobFlowStep[],
    ];

    return this.executeFlow(steps, correlationId);
  }

  /**
   * Create a shard enrichment flow
   * Shard Emission → Enrichment
   */
  async createEnrichmentFlow(
    shardEmission: ShardEmissionMessage,
    enrichmentJob: EnrichmentJobMessage,
    correlationId?: string
  ): Promise<JobFlowResult> {
    const steps: JobFlowStep[] = [
      {
        name: 'shard-emission',
        jobData: shardEmission,
        queueName: 'shard-emission',
        jobName: 'shard-emission',
        options: { priority: 5 },
      },
      {
        name: 'enrichment',
        jobData: enrichmentJob,
        queueName: 'enrichment-jobs',
        jobName: 'enrichment-job',
        options: { priority: 5 },
        optional: true, // Enrichment failures don't block shard operations
      },
    ];

    return this.executeFlow(steps, correlationId);
  }
}
