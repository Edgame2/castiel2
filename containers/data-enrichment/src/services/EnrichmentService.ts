/**
 * Data Enrichment Service
 * AI enrichment and vectorization pipeline for shards
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { publishEnrichmentEvent } from '../events/publishers/EnrichmentEventPublisher';
import { v4 as uuidv4 } from 'uuid';

export interface EnrichmentJob {
  jobId: string;
  tenantId: string;
  shardId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  enrichmentResults?: any;
  vectorizationResults?: any;
  startedAt?: Date | string;
  completedAt?: Date | string;
  error?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class EnrichmentService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private aiServiceClient: ServiceClient;
  private runningJobs = new Set<string>();
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'data-enrichment',
      serviceName: 'data-enrichment',
      tenantId,
    });
  }

  /**
   * Trigger enrichment for a shard
   */
  async triggerEnrichment(shardId: string, tenantId: string): Promise<EnrichmentJob> {
    const jobId = uuidv4();

    if (this.runningJobs.has(jobId)) {
      throw new Error('Enrichment job is already running for this shard');
    }

    this.runningJobs.add(jobId);

    try {
      log.info('Starting enrichment job', {
        jobId,
        shardId,
        tenantId,
        service: 'data-enrichment',
      });

      // Publish started event
      await publishEnrichmentEvent('enrichment.job.started', tenantId, {
        jobId,
        shardId,
      });

      // Get shard data
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${shardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Create enrichment job
      const job: EnrichmentJob = {
        jobId,
        tenantId,
        shardId,
        status: 'running',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store job
      const container = getContainer('enrichment_jobs');
      await container.items.create(
        {
          id: jobId,
          tenantId,
          ...job,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Perform AI enrichment
      let enrichmentResults: any = {
        enriched: false,
        fieldsEnriched: [],
      };

      try {
        // Call AI service for enrichment
        const aiEnrichment = await this.aiServiceClient.post<any>(
          '/api/v1/enrich',
          {
            shardId,
            shardData: shard,
            enrichmentType: 'full',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        if (aiEnrichment.enriched) {
          enrichmentResults = {
            enriched: true,
            fieldsEnriched: aiEnrichment.fieldsEnriched || ['description', 'summary'],
            enrichmentData: aiEnrichment.enrichmentData,
          };

          // Update shard with enriched data
          await this.shardManagerClient.put<any>(
            `/api/v1/shards/${shardId}`,
            {
              ...shard,
              ...enrichmentResults.enrichmentData,
              updatedAt: new Date(),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        }
      } catch (error: any) {
        log.error('AI enrichment failed', error, {
          shardId,
          tenantId,
          service: 'data-enrichment',
        });
        // Continue without enrichment
      }

      // Perform vectorization
      let vectorizationResults: any = {
        vectorized: false,
        embeddingDimensions: 0,
      };

      try {
        // Generate embeddings
        const embeddings = await this.embeddingsClient.post<any>(
          '/api/v1/embeddings',
          {
            text: JSON.stringify(shard),
            model: 'text-embedding-ada-002',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        if (embeddings.embedding) {
          vectorizationResults = {
            vectorized: true,
            embeddingDimensions: embeddings.embedding.length || 1536,
            embedding: embeddings.embedding,
          };

          // Store embedding in shard metadata
          await this.shardManagerClient.put<any>(
            `/api/v1/shards/${shardId}`,
            {
              ...shard,
              metadata: {
                ...shard.metadata,
                embedding: embeddings.embedding,
                embeddingModel: 'text-embedding-ada-002',
                vectorizedAt: new Date(),
              },
              updatedAt: new Date(),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': tenantId,
              },
            }
          );
        }
      } catch (error: any) {
        log.error('Vectorization failed', error, {
          shardId,
          tenantId,
          service: 'data-enrichment',
        });
        // Continue without vectorization
      }

      // Update job
      job.status = 'completed';
      job.enrichmentResults = enrichmentResults;
      job.vectorizationResults = vectorizationResults;
      job.completedAt = new Date();

      await container.item(jobId, tenantId).replace({
        id: jobId,
        tenantId,
        ...job,
        updatedAt: new Date(),
      });

      // Store results
      const resultsContainer = getContainer('enrichment_results');
      await resultsContainer.items.create(
        {
          id: uuidv4(),
          tenantId,
          jobId,
          shardId,
          enrichmentResults,
          vectorizationResults,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Publish completion events
      await publishEnrichmentEvent('enrichment.job.completed', tenantId, {
        jobId,
        shardId,
        results: enrichmentResults,
      });

      await publishEnrichmentEvent('vectorization.job.completed', tenantId, {
        jobId,
        shardId,
        results: vectorizationResults,
      });

      log.info('Enrichment job completed', {
        jobId,
        shardId,
        tenantId,
        service: 'data-enrichment',
      });

      return job;
    } catch (error: any) {
      log.error('Enrichment job failed', error, {
        jobId,
        shardId,
        tenantId,
        service: 'data-enrichment',
      });

      // Update job status
      try {
        const container = getContainer('enrichment_jobs');
        const { resource: job } = await container.item(jobId, tenantId).read<EnrichmentJob>();
        if (job) {
          job.status = 'failed';
          job.error = error.message;
          job.completedAt = new Date();
          await container.item(jobId, tenantId).replace({
            id: jobId,
            tenantId,
            ...job,
            updatedAt: new Date(),
          });
        }
      } catch (updateError) {
        log.error('Failed to update job status', updateError, { service: 'data-enrichment' });
      }

      throw error;
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  /**
   * Get enrichment job status
   */
  async getEnrichmentJob(jobId: string, tenantId: string): Promise<EnrichmentJob | null> {
    try {
      const container = getContainer('enrichment_jobs');
      const { resource } = await container.item(jobId, tenantId).read<EnrichmentJob>();
      return resource || null;
    } catch (error: any) {
      log.error('Failed to get enrichment job', error, {
        jobId,
        tenantId,
        service: 'data-enrichment',
      });
      return null;
    }
  }
}
