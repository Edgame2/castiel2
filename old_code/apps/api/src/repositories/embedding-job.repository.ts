import { CosmosClient, Container } from '@azure/cosmos'
import { config } from '../config/env.js'
import type { EmbeddingJob } from '../types/embedding-job.model.js'
import type { IMonitoringProvider } from '@castiel/monitoring'

export class EmbeddingJobRepository {
  private client: CosmosClient
  private container: Container
  private monitoring?: IMonitoringProvider

  constructor(monitoring?: IMonitoringProvider) {
    this.monitoring = monitoring
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    })
    const database = this.client.database(config.cosmosDb.databaseId)
    const containerId = process.env.COSMOS_DB_EMBEDDING_JOBS_CONTAINER || 'embedding-jobs'
    // Ensure container exists
    database.containers.createIfNotExists({
      id: containerId,
      partitionKey: '/tenantId',
      defaultTtl: -1,
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent' as any,
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/_etag/?' }],
        compositeIndexes: [
          [
            { path: '/tenantId', order: 'ascending' as any },
            { path: '/status', order: 'ascending' as any },
            { path: '/createdAt', order: 'descending' as any },
          ],
        ],
      } as any,
      throughput: 400,
    }).catch((error: unknown) => {
      this.monitoring?.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'embedding-job.repository.create-container',
          containerId,
        }
      );
      return undefined;
    })

    this.container = database.container(containerId)
  }

  async create(job: EmbeddingJob): Promise<EmbeddingJob> {
    const { resource } = await this.container.items.create(job)
    return resource as EmbeddingJob
  }

  async update(jobId: string, tenantId: string, updates: Partial<EmbeddingJob>): Promise<EmbeddingJob> {
    const { resource: existing } = await this.container.item(jobId, tenantId).read<EmbeddingJob>()
    if (!existing) {throw new Error(`EmbeddingJob ${jobId} not found`)}
    const merged: EmbeddingJob = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    const { resource } = await this.container.item(jobId, tenantId).replace(merged)
    return resource as EmbeddingJob
  }

  async findByStatus(status: EmbeddingJob['status'], tenantId: string): Promise<EmbeddingJob[]> {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@status', value: status },
      ],
    }
    const { resources } = await this.container.items.query(querySpec).fetchAll()
    return resources as EmbeddingJob[]
  }

  async findById(jobId: string, tenantId: string): Promise<EmbeddingJob | null> {
    try {
      const { resource } = await this.container.item(jobId, tenantId).read<EmbeddingJob>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw error
    }
  }

  async list(tenantId: string, options?: {
    status?: EmbeddingJob['status'];
    shardId?: string;
    shardTypeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: EmbeddingJob[]; total: number }> {
    const conditions: string[] = ['c.tenantId = @tenantId']
    const parameters: Array<{ name: string; value: any }> = [
      { name: '@tenantId', value: tenantId }
    ]

    if (options?.status) {
      conditions.push('c.status = @status')
      parameters.push({ name: '@status', value: options.status })
    }

    if (options?.shardId) {
      conditions.push('c.shardId = @shardId')
      parameters.push({ name: '@shardId', value: options.shardId })
    }

    if (options?.shardTypeId) {
      conditions.push('c.shardTypeId = @shardTypeId')
      parameters.push({ name: '@shardTypeId', value: options.shardTypeId })
    }

    const whereClause = conditions.join(' AND ')
    const querySpec = {
      query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c.createdAt DESC`,
      parameters,
    }

    const { resources } = await this.container.items.query(querySpec).fetchAll()
    
    // Get total count
    const countQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
      parameters,
    }
    const { resources: countResources } = await this.container.items.query(countQuerySpec).fetchAll()
    const total = (countResources)[0] || 0

    // Apply pagination
    const limit = options?.limit || 100
    const offset = options?.offset || 0
    const jobs = (resources as EmbeddingJob[]).slice(offset, offset + limit)

    return { jobs, total }
  }

  async getStats(tenantId: string): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const statuses: EmbeddingJob['status'][] = ['pending', 'processing', 'completed', 'failed']
    const counts: Record<string, number> = {}
    for (const status of statuses) {
      const querySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@status', value: status },
        ],
      }
      const { resources } = await this.container.items.query(querySpec).fetchAll()
      counts[status] = (resources)[0] || 0
    }
    return {
      pending: counts['pending'] || 0,
      processing: counts['processing'] || 0,
      completed: counts['completed'] || 0,
      failed: counts['failed'] || 0,
    }
  }
}
