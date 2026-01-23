/**
 * @deprecated This test uses deprecated Service Bus architecture.
 * Should be updated to test workers-processing Container App with BullMQ instead.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CosmosClient } from '@azure/cosmos'
import dotenv from 'dotenv'
import path from 'path'
// Service Bus removed - using QueueService (BullMQ) instead
import { QueueService } from '../../src/services/queue.service.js'
import { MockMonitoringProvider } from '@castiel/monitoring'
import { EmbeddingTemplateService } from '../../src/services/embedding-template.service.js'
import { EmbeddingService } from '../../src/services/ai-insights/embedding.service.js'
import { ShardEmbeddingService } from '../../src/services/shard-embedding.service.js'
import { ShardEmbeddingChangeFeedService } from '../../src/services/embedding-processor/change-feed.service.js'

// E2E test for: Cosmos change feed -> enqueue embedding job -> Service Bus -> worker generates vectors

describe.skip('Embedding Pipeline E2E', () => {
  // SKIPPED: This test uses deprecated Service Bus architecture
  // ServiceBusClient is no longer available - test should be updated to use QueueService (BullMQ)
  // See: tests/embedding/embedding-jobs.e2e.test.ts for updated implementation
  // Ensure env variables from .env files are loaded for E2E
  const cwd = process.cwd()
  const appDir = path.resolve(__dirname, '../..') // apps/api
  dotenv.config({ path: path.join(cwd, '.env') })
  dotenv.config({ path: path.join(cwd, '.env.local') })
  dotenv.config({ path: path.join(appDir, '.env') })
  const TENANT_ID = process.env.E2E_TENANT_ID || 'tenant-e2e'
  const QUEUE_NAME = 'shards-to-vectorize'
  const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT
  const cosmosKey = process.env.COSMOS_DB_KEY
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel'
  const shardsContainerId = process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards'
  const shardTypesContainerId = process.env.COSMOS_DB_SHARD_TYPES_CONTAINER || 'shard-types'
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST

  if (!cosmosEndpoint || !cosmosKey || !redisUrl) {
    throw new Error('E2E requires COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, and REDIS_URL or REDIS_HOST env vars')
  }

  const monitoring = new MockMonitoringProvider({ enabled: true })
  const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey })
  const db = cosmos.database(databaseId)
  const shardsContainer = db.container(shardsContainerId)
  const shardTypesContainer = db.container(shardTypesContainerId)

  let queueService: QueueService
  let shardRepo: any
  let shardTypeRepo: any
  let embeddingService: EmbeddingService
  let templateService: EmbeddingTemplateService
  let shardEmbeddingService: ShardEmbeddingService
  let changeFeed: ShardEmbeddingChangeFeedService
  let worker: any
  let createdShardId: string | undefined
  let sbClient: any // Service Bus client (deprecated - test should be updated to use QueueService)

  beforeAll(async () => {
    // Ensure containers exist
    await db.containers.createIfNotExists({ id: shardsContainerId, partitionKey: { paths: ['/tenantId'] } })
    await db.containers.createIfNotExists({ id: shardTypesContainerId, partitionKey: { paths: ['/tenantId'] } })

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

    // Initialize repos/services (real, no mocks)
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
        // Try tenant partition, then system
        try {
          const { resource } = await shardTypesContainer.item(id, tenantId).read()
          if (resource) return resource
        } catch {}
        const { resource: sys } = await shardTypesContainer.item(id, 'system').read()
        return sys || null
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

    // Service Bus and change feed (DEPRECATED - Service Bus removed, should use QueueService)
    // Skip this test if Service Bus dependencies are not available
    const sbConnection = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
    if (!sbConnection) {
      throw new Error('This deprecated test requires AZURE_SERVICE_BUS_CONNECTION_STRING. Test should be updated to use QueueService instead.')
    }
    // ServiceBusClient import removed - test is deprecated
    // sbClient = new ServiceBusClient(sbConnection)
    sbClient = null // Placeholder - test needs to be updated to use QueueService

    // Start worker
    const { EmbeddingWorker } = await import('../../src/services/embedding-processor/embedding-worker.js')
    worker = new EmbeddingWorker(sbClient, shardRepo, shardEmbeddingService, monitoring, undefined, QUEUE_NAME)
    await worker.start()

    // Start change feed in enqueue mode with short poll interval
    // Minimal ServiceBus sender wrapper matching interface used by change-feed
    const sbSender = {
      async sendEmbeddingJob(jobMessage: any) {
        const sender = sbClient.createSender(QUEUE_NAME)
        await sender.sendMessages({ body: jobMessage, contentType: 'application/json', messageId: jobMessage.dedupeKey, sessionId: jobMessage.tenantId })
        await sender.close()
        return true
      },
      isShardTypeIgnored: () => false,
    }

    changeFeed = new ShardEmbeddingChangeFeedService(
      shardsContainer,
      shardEmbeddingService,
      monitoring,
      sbSender as any,
      { mode: 'enqueue', pollIntervalMs: 1000, maxItemsPerBatch: 50, maxConcurrency: 5 }
    )
    await changeFeed.start()
  })

  afterAll(async () => {
    try {
      if (worker) await worker.stop()
    } catch {}
    try {
      if (changeFeed) await changeFeed.stop()
    } catch {}

    // Cleanup shard created
    if (createdShardId) {
      await shardsContainer.item(createdShardId, TENANT_ID).delete().catch(() => {})
    }
    await sbClient?.close()
  })

  it('processes a shard end-to-end and generates vectors', async () => {
    // Create a real shard (skip direct enqueue; rely on change feed)
    const shard = await shardRepo.create({
      tenantId: TENANT_ID,
      userId: 'user-e2e',
      shardTypeId: 'c_document',
      shardTypeName: 'Document',
      structuredData: { title: 'E2E Doc', content: 'This is an end-to-end test document for embeddings.' },
      skipEnqueueing: true,
    } as any)

    createdShardId = shard.id

    // Wait for vectors to be generated by worker (up to 60s)
    const deadline = Date.now() + 60_000
    let updated: any = null
    while (Date.now() < deadline) {
      updated = await shardRepo.findById(shard.id, TENANT_ID)
      if (updated && Array.isArray(updated.vectors) && updated.vectors.length > 0) {
        break
      }
      await new Promise(r => setTimeout(r, 1000))
    }

    expect(updated).toBeTruthy()
    expect(updated.vectors).toBeDefined()
    expect(updated.vectors.length).toBeGreaterThan(0)

    const stats = changeFeed.getStats()
    expect(stats.jobsEnqueued).toBeGreaterThanOrEqual(1)
  })
})
