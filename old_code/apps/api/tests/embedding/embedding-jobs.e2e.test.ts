/**
 * E2E Test for Embedding Jobs
 * 
 * Tests the API-side embedding job workflow:
 * - Job creation in Cosmos DB
 * - Job enqueueing via QueueService (BullMQ)
 * - Change feed service integration
 * 
 * Note: This test focuses on API-side functionality. The actual job processing
 * by workers-processing Container App is tested separately in that app's test suite.
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
// Load env from repo root and app envs BEFORE any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CosmosClient } from '@azure/cosmos'
// Service Bus removed - using QueueService (BullMQ) instead
// Note: This test still uses deprecated EmbeddingWorker - needs update
import { QueueService } from '../../src/services/queue.service.js'
import { MockMonitoringProvider } from '@castiel/monitoring'
import { EmbeddingTemplateService } from '../../src/services/embedding-template.service.js'
import { EmbeddingService } from '../../src/services/ai-insights/embedding.service.js'
import { ShardEmbeddingService } from '../../src/services/shard-embedding.service.js'
import { ShardEmbeddingChangeFeedService } from '../../src/services/embedding-processor/change-feed.service.js'

const TENANT_ID = 'tenant-e2e-jobs'
const QUEUE_NAME = 'shards-to-vectorize'

// Check for required services - skip test if unavailable
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT
const cosmosKey = process.env.COSMOS_DB_KEY
const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST
const hasRequiredServices = !!(cosmosEndpoint && cosmosKey && redisUrl)

// Conditionally define the test suite - if services are unavailable, use describe.skip
// This prevents hooks from running when services are missing
if (!hasRequiredServices) {
  console.warn('⚠️  Skipping E2E test: Missing required services. Need: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, and REDIS_URL or REDIS_HOST')
  describe.skip('Embedding Jobs E2E', () => {
    // Empty test suite when services are unavailable
  })
} else {
  describe('Embedding Jobs E2E', () => {

  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel'
  const shardsContainerId = process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards'
  const shardTypesContainerId = process.env.COSMOS_DB_SHARD_TYPES_CONTAINER || 'shard-types'
  const jobsContainerId = 'embedding-jobs'

  const monitoring = new MockMonitoringProvider({ enabled: true })
  let cosmos: CosmosClient
  let db: any
  let shardsContainer: any
  let shardTypesContainer: any
  let jobsContainer: any

  let queueService: QueueService
  let shardRepo: any
  let shardTypeRepo: any
  let embeddingService: EmbeddingService
  let templateService: EmbeddingTemplateService
  let shardEmbeddingService: ShardEmbeddingService
  let changeFeed: ShardEmbeddingChangeFeedService
  let worker: any
  let jobRepo: any
  let createdShardId: string | undefined

  beforeAll(async () => {
    // Guard: Return early if services are not available (defensive check)
    if (!cosmosEndpoint || !cosmosKey || !redisUrl) {
      return
    }

    // Initialize Cosmos DB client and containers
    cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey })
    db = cosmos.database(databaseId)
    shardsContainer = db.container(shardsContainerId)
    shardTypesContainer = db.container(shardTypesContainerId)
    jobsContainer = db.container(jobsContainerId)

    // Ensure containers exist
    await db.containers.createIfNotExists({ id: shardsContainerId, partitionKey: { paths: ['/tenantId'] } })
    await db.containers.createIfNotExists({ id: shardTypesContainerId, partitionKey: { paths: ['/tenantId'] } })
    await db.containers.createIfNotExists({ id: jobsContainerId, partitionKey: { paths: ['/tenantId'] } })

    // Upsert a system shard type for c_document (minimal)
    await shardTypesContainer.items.upsert({
      id: 'c_document',
      tenantId: 'system',
      name: 'Document',
      isCustom: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Minimal real repository implementations using Cosmos directly (no config import)
    shardRepo = {
      async create(input: any) {
        const shard = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          tenantId: input.tenantId,
          userId: input.userId,
          shardTypeId: input.shardTypeId,
          shardTypeName: input.shardTypeName,
          structuredData: input.structuredData,
          vectors: [],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          revisionNumber: 1,
        }
        const { resource } = await shardsContainer.items.create(shard as any)
        return resource
      },
      async findById(id: string, tenantId: string) {
        try {
          const { resource } = await shardsContainer.item(id, tenantId).read()
          return resource
        } catch (e: any) {
          if (e.code === 404) return null
          throw e
        }
      },
      async updateVectors(id: string, tenantId: string, vectors: any[]) {
        const current = await this.findById(id, tenantId)
        if (!current) throw new Error('Shard not found')
        const updated = { ...current, vectors, updatedAt: new Date().toISOString() }
        await shardsContainer.items.upsert(updated)
      },
    }
    shardTypeRepo = {
      async findById(id: string, tenantId: string) {
        try {
          const { resource } = await shardTypesContainer.item(id, tenantId).read()
          if (resource) return resource
        } catch {}
        const { resource: sys } = await shardTypesContainer.item(id, 'system').read()
        return sys || null
      },
    }

    // Minimal job repository
    jobRepo = {
      async create(job: any) {
        const { resource } = await jobsContainer.items.create(job)
        return resource
      },
      async update(jobId: string, tenantId: string, updates: any) {
        const { resource: existing } = await jobsContainer.item(jobId, tenantId).read()
        if (!existing) throw new Error(`EmbeddingJob ${jobId} not found`)
        const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() }
        const { resource } = await jobsContainer.item(jobId, tenantId).replace(merged)
        return resource
      },
      async findByStatus(status: string, tenantId: string) {
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.status = @status ORDER BY c.createdAt DESC',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@status', value: status },
          ],
        }
        const { resources } = await jobsContainer.items.query(querySpec).fetchAll()
        return resources
      },
      async getStats(tenantId: string) {
        const statuses = ['pending', 'processing', 'completed', 'failed']
        const counts: Record<string, number> = {}
        for (const status of statuses) {
          const querySpec = {
            query: 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.status = @status',
            parameters: [
              { name: '@tenantId', value: tenantId },
              { name: '@status', value: status },
            ],
          }
          const { resources } = await jobsContainer.items.query(querySpec).fetchAll()
          counts[status] = (resources as any[])[0] || 0
        }
        return {
          pending: counts['pending'] || 0,
          processing: counts['processing'] || 0,
          completed: counts['completed'] || 0,
          failed: counts['failed'] || 0,
        }
      },
    }

    templateService = new EmbeddingTemplateService(monitoring)
    embeddingService = new EmbeddingService(
      monitoring,
      process.env.AZURE_OPENAI_ENDPOINT,
      process.env.AZURE_OPENAI_API_KEY,
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002'
    )
    shardEmbeddingService = new ShardEmbeddingService(
      templateService,
      embeddingService,
      shardTypeRepo,
      shardRepo,
      monitoring
    )

    // QueueService (BullMQ) is now used instead of deprecated Service Bus
    // This test verifies the API-side embedding job creation and enqueueing
    // The actual job processing by workers-processing Container App is tested separately
    queueService = new QueueService(monitoring)

    // EmbeddingWorker is deprecated - job processing is now handled by workers-processing Container App
    // This E2E test focuses on API-side functionality (job creation, enqueueing, change feed)
    // Worker processing would be tested in the workers-processing app's own test suite

    const queueSender = {
      async sendEmbeddingJob(jobMessage: any) {
        await queueService.sendEmbeddingJob(jobMessage)
        return true
      },
      isShardTypeIgnored: () => false,
    }

    changeFeed = new ShardEmbeddingChangeFeedService(
      shardsContainer,
      shardEmbeddingService,
      monitoring,
      queueSender as any,
      { mode: 'enqueue', pollIntervalMs: 1000, maxItemsPerBatch: 50, maxConcurrency: 5 }
    )
    await changeFeed.start()
  })

  afterAll(async () => {
    try {
      // worker removed - EmbeddingWorker deprecated
      // if (worker) await worker.stop()
    } catch {}
    try {
      if (changeFeed) await changeFeed.stop()
    } catch {}

    if (createdShardId) {
      await shardsContainer.item(createdShardId, TENANT_ID).delete().catch(() => {})
    }
    // Service Bus client removed
  })

  it('creates and completes an embedding job record', async () => {
    const shard = await shardRepo.create({
      tenantId: TENANT_ID,
      userId: 'user-e2e',
      shardTypeId: 'c_document',
      shardTypeName: 'Document',
      structuredData: { title: 'Job E2E', content: 'Embedding jobs tracking end-to-end test.' },
      skipEnqueueing: true,
    } as any)

    createdShardId = shard.id

    // Wait for job completion (up to 30s)
    const deadline = Date.now() + 30_000
    let completed = false
    while (Date.now() < deadline) {
      const stats = await jobRepo.getStats(TENANT_ID)
      if ((stats.completed || 0) > 0) {
        completed = true
        break
      }
      await new Promise(r => setTimeout(r, 500))
    }

    expect(completed).toBe(true)
    const jobs = await jobRepo.findByStatus('completed', TENANT_ID)
    expect(jobs.length).toBeGreaterThan(0)
    const job = jobs[0]
    expect(job.shardId).toBe(shard.id)
    expect(job.status).toBe('completed')
    expect(job.metadata?.vectorCount).toBeGreaterThanOrEqual(0)
  })
  })
}
