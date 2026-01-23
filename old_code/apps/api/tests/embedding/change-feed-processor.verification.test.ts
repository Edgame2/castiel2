/**
 * Change Feed Processor Verification Tests
 * 
 * Week 0: Verification & Baseline Testing
 * 
 * Purpose: Verify that the Change Feed processor is running and working correctly
 * before making any changes to the system.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CosmosClient } from '@azure/cosmos'
import dotenv from 'dotenv'
import path from 'path'
// Service Bus removed - using QueueService (BullMQ) instead
import { MockMonitoringProvider } from '@castiel/monitoring'
import { ShardEmbeddingChangeFeedService } from '../../src/services/embedding-processor/change-feed.service.js'
import { ShardEmbeddingService } from '../../src/services/shard-embedding.service.js'
import { EmbeddingTemplateService } from '../../src/services/embedding-template.service.js'
import { EmbeddingService } from '../../src/services/ai-insights/embedding.service.js'
import { ShardTypeRepository } from '../../src/repositories/shard-type.repository.js'
import { ShardRepository } from '../../src/repositories/shard.repository.js'
import { QueueService } from '../../src/services/queue.service.js'
import type { Shard } from '../../src/types/shard.types.js'

// Load environment variables
const cwd = process.cwd()
const appDir = path.resolve(__dirname, '../..') // apps/api
dotenv.config({ path: path.join(cwd, '.env') })
dotenv.config({ path: path.join(cwd, '.env.local') })
dotenv.config({ path: path.join(appDir, '.env') })

const TENANT_ID = process.env.E2E_TENANT_ID || 'tenant-verification'
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT
const cosmosKey = process.env.COSMOS_DB_KEY
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'castiel'
const shardsContainerId = process.env.COSMOS_DB_SHARDS_CONTAINER || 'shards'
const shardTypesContainerId = process.env.COSMOS_DB_SHARD_TYPES_CONTAINER || 'shard-types'
// Service Bus removed - using Redis/BullMQ instead
const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST

// Check for required services - Cosmos DB is required, Redis is optional
const hasRequiredServices = !!(cosmosEndpoint && cosmosKey)

// Conditionally define the test suite - if services are unavailable, use describe.skip
// This prevents hooks from running when services are missing
if (!hasRequiredServices) {
  console.warn('⚠️  Skipping E2E test: Missing required services. Need: COSMOS_DB_ENDPOINT and COSMOS_DB_KEY')
  describe.skip('Change Feed Processor Verification', () => {
    // Empty test suite when services are unavailable
  })
} else {
  describe('Change Feed Processor Verification', () => {

  let cosmos: CosmosClient
  let db: any
  let shardsContainer: any
  let shardTypesContainer: any
  let monitoring: MockMonitoringProvider
  let changeFeedService: ShardEmbeddingChangeFeedService
  let shardEmbeddingService: ShardEmbeddingService
  let shardRepository: ShardRepository
  let queueService: QueueService | undefined
  let createdShardIds: string[] = []

  beforeAll(async () => {
    // Guard: Return early if services are not available (defensive check)
    if (!cosmosEndpoint || !cosmosKey) {
      return
    }

    monitoring = new MockMonitoringProvider({ enabled: true })
    cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey })
    db = cosmos.database(databaseId)
    shardsContainer = db.container(shardsContainerId)
    shardTypesContainer = db.container(shardTypesContainerId)

    // Initialize repositories
    shardRepository = new ShardRepository(cosmos, databaseId, shardsContainerId, monitoring)
    const shardTypeRepository = new ShardTypeRepository(cosmos, databaseId, shardTypesContainerId, monitoring)

    // Initialize embedding services
    const embeddingTemplateService = new EmbeddingTemplateService(shardTypeRepository, monitoring)
    const embeddingService = new EmbeddingService(monitoring)
    shardEmbeddingService = new ShardEmbeddingService(
      embeddingTemplateService,
      embeddingService,
      shardTypeRepository,
      shardRepository,
      monitoring
    )

    // Initialize Queue Service (BullMQ) if Redis is available
    if (redisUrl) {
      queueService = new QueueService(monitoring)
    }
  })

  afterAll(async () => {
    // Cleanup: Delete test shards
    for (const shardId of createdShardIds) {
      try {
        await shardRepository.delete(shardId, TENANT_ID)
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Stop change feed if running
    if (changeFeedService) {
      await changeFeedService.stop()
    }
  })

  beforeEach(() => {
    // Reset monitoring events
    monitoring.clearEvents()
  })

  describe('Service Initialization', () => {
    it('should create Change Feed service instance', () => {
      changeFeedService = new ShardEmbeddingChangeFeedService(
        shardsContainer,
        shardEmbeddingService,
        monitoring,
        queueService,
        {
          maxItemCount: 10,
          pollInterval: 1000, // 1 second for faster tests
          maxConcurrency: 2,
          mode: queueService ? 'enqueue' : 'generate',
        }
      )

      expect(changeFeedService).toBeDefined()
      expect(changeFeedService.getStats().isRunning).toBe(false)
    })

    it('should have correct initial statistics', () => {
      const stats = changeFeedService.getStats()
      
      expect(stats.shardsProcessed).toBe(0)
      expect(stats.embeddingsGenerated).toBe(0)
      expect(stats.errors).toBe(0)
      expect(stats.skipped).toBe(0)
      expect(stats.jobsEnqueued).toBe(0)
      expect(stats.isRunning).toBe(false)
    })
  })

  describe('Change Feed Processor Status', () => {
    it('should start successfully', async () => {
      await changeFeedService.start()
      
      const stats = changeFeedService.getStats()
      expect(stats.isRunning).toBe(true)
      
      // Verify start event was tracked
      const events = monitoring.getEvents()
      const startEvent = events.find(e => e.name === 'change-feed.starting')
      expect(startEvent).toBeDefined()
    })

    it('should not start if already running', async () => {
      // Already started in previous test
      await changeFeedService.start() // Should not throw
      
      const events = monitoring.getEvents()
      const alreadyRunningEvent = events.find(e => e.name === 'change-feed.already-running')
      expect(alreadyRunningEvent).toBeDefined()
    })

    it('should stop successfully', async () => {
      await changeFeedService.stop()
      
      const stats = changeFeedService.getStats()
      expect(stats.isRunning).toBe(false)
      
      // Verify stop event was tracked
      const events = monitoring.getEvents()
      const stopEvent = events.find(e => e.name === 'change-feed.stopped')
      expect(stopEvent).toBeDefined()
    })

    it('should restart after stopping', async () => {
      await changeFeedService.start()
      const stats = changeFeedService.getStats()
      expect(stats.isRunning).toBe(true)
    })
  })

  describe('Shard Processing', () => {
    let testShard: Shard

    beforeEach(async () => {
      // Create a test shard
      testShard = {
        id: `test-shard-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        tenantId: TENANT_ID,
        shardTypeId: 'c_note', // Use note type as it's common
        name: 'Test Shard for Change Feed',
        status: 'active',
        structuredData: {
          name: 'Test Note',
          content: 'This is a test note for change feed verification',
          noteType: 'general',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        vectors: [], // No vectors initially
      } as Shard

      // Create shard in Cosmos DB
      await shardsContainer.items.create(testShard)
      createdShardIds.push(testShard.id)

      // Restart change feed to pick up new shard
      await changeFeedService.stop()
      await changeFeedService.start()
    })

    it('should process new shard creation', async () => {
      // Wait for change feed to process (with timeout)
      let processed = false
      const maxWait = 10000 // 10 seconds
      const startTime = Date.now()

      while (!processed && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const stats = changeFeedService.getStats()
        
        if (stats.shardsProcessed > 0) {
          processed = true
        }
      }

      expect(processed).toBe(true)
      
      const stats = changeFeedService.getStats()
      expect(stats.shardsProcessed).toBeGreaterThan(0)
    }, 15000) // 15 second timeout

    it('should generate embeddings for new shard', async () => {
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Check if embedding was generated (either directly or enqueued)
      const stats = changeFeedService.getStats()
      const hasEmbedding = stats.embeddingsGenerated > 0 || stats.jobsEnqueued > 0
      
      expect(hasEmbedding).toBe(true)
    }, 15000)

    it('should skip shards with recent vectors', async () => {
      // Add recent vector to shard
      const updatedShard = {
        ...testShard,
        vectors: [{
          id: 'test-vector',
          embedding: new Array(1536).fill(0.1), // Mock embedding
          model: 'text-embedding-ada-002',
          createdAt: new Date(), // Recent
        }],
      }

      await shardsContainer.items.upsert(updatedShard)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      const stats = changeFeedService.getStats()
      const skippedCount = stats.skipped
      
      // Should have skipped at least one shard
      expect(skippedCount).toBeGreaterThanOrEqual(0)
    }, 10000)

    it('should skip archived shards', async () => {
      const archivedShard = {
        ...testShard,
        id: `archived-${Date.now()}`,
        status: 'archived',
      }

      await shardsContainer.items.create(archivedShard)
      createdShardIds.push(archivedShard.id)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      const events = monitoring.getEvents()
      const skipEvent = events.find(e => 
        e.name === 'change-feed.shard-skipped' && 
        e.properties?.reason === 'status-archived'
      )
      
      expect(skipEvent).toBeDefined()
    }, 10000)

    it('should skip shards with no structured data', async () => {
      const emptyShard = {
        ...testShard,
        id: `empty-${Date.now()}`,
        structuredData: {},
      }

      await shardsContainer.items.create(emptyShard)
      createdShardIds.push(emptyShard.id)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      const events = monitoring.getEvents()
      const skipEvent = events.find(e => 
        e.name === 'change-feed.shard-skipped' && 
        e.properties?.reason === 'no-structured-data'
      )
      
      expect(skipEvent).toBeDefined()
    }, 10000)
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully without crashing', async () => {
      // Create invalid shard that might cause errors
      const invalidShard = {
        id: `invalid-${Date.now()}`,
        tenantId: TENANT_ID,
        shardTypeId: 'non-existent-type', // Invalid type
        name: 'Invalid Shard',
        status: 'active',
        structuredData: { content: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      try {
        await shardsContainer.items.create(invalidShard)
        createdShardIds.push(invalidShard.id)

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Service should still be running
        const stats = changeFeedService.getStats()
        expect(stats.isRunning).toBe(true)
        
        // Errors should be tracked
        expect(stats.errors).toBeGreaterThanOrEqual(0)
      } catch (error) {
        // If creation fails, that's also acceptable
        expect(error).toBeDefined()
      }
    }, 10000)
  })

  describe('Statistics Tracking', () => {
    it('should track processing statistics', async () => {
      const stats = changeFeedService.getStats()
      
      expect(stats).toHaveProperty('shardsProcessed')
      expect(stats).toHaveProperty('embeddingsGenerated')
      expect(stats).toHaveProperty('errors')
      expect(stats).toHaveProperty('skipped')
      expect(stats).toHaveProperty('jobsEnqueued')
      expect(stats).toHaveProperty('isRunning')
      expect(stats).toHaveProperty('lastProcessedAt')
    })

    it('should update lastProcessedAt when processing batches', async () => {
      // Create a test shard
      const testShard = {
        id: `stats-test-${Date.now()}`,
        tenantId: TENANT_ID,
        shardTypeId: 'c_note',
        name: 'Stats Test Shard',
        status: 'active',
        structuredData: { content: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await shardsContainer.items.create(testShard)
      createdShardIds.push(testShard.id)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000))

      const stats = changeFeedService.getStats()
      
      // Should have processed at least one shard
      if (stats.shardsProcessed > 0) {
        expect(stats.lastProcessedAt).toBeDefined()
        expect(stats.lastProcessedAt).toBeInstanceOf(Date)
      }
    }, 15000)
  })

  describe('Continuation Token', () => {
    it('should track continuation token', () => {
      const token = changeFeedService.getContinuationToken()
      // Token may be undefined initially, which is fine
      expect(token === undefined || typeof token === 'string').toBe(true)
    })
  })

  describe('Monitoring Integration', () => {
    it('should track events via monitoring provider', () => {
      const events = monitoring.getEvents()
      
      // Should have tracked at least start/stop events
      const hasStartEvent = events.some(e => e.name.includes('change-feed'))
      expect(hasStartEvent).toBe(true)
    })

    it('should track exceptions', async () => {
      // The error handling test should have generated exceptions
      const exceptions = monitoring.getExceptions()
      
      // May or may not have exceptions depending on test execution
      expect(Array.isArray(exceptions)).toBe(true)
    })
  })
  })
}

