/**
 * Fixture Data Generators
 * 
 * Utilities to generate test data for:
 * - Users
 * - Tenants
 * - Shards
 * - Shard Types
 * - Revisions
 * - ACL entries
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * User fixtures
 */
export class UserFixtures {
  static create(overrides: any = {}) {
    return {
      id: uuidv4(),
      tenantId: 'test-tenant-001',
      email: `user-${Date.now()}@test.com`,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...',
      status: 'ACTIVE',
      emailVerified: true,
      roles: ['user'],
      organizationId: null,
      providers: [
        {
          provider: 'email',
          providerId: `user-${Date.now()}@test.com`,
          connectedAt: new Date().toISOString(),
        },
      ],
      metadata: {
        firstName: 'Test',
        lastName: 'User',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createAdmin(overrides: any = {}) {
    return this.create({
      roles: ['admin', 'user'],
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: any = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        email: `user-${i}@test.com`,
        ...overrides,
      })
    );
  }
}

/**
 * Shard Type fixtures
 */
export class ShardTypeFixtures {
  static create(overrides: any = {}) {
    return {
      id: uuidv4(),
      tenantId: 'test-tenant-001',
      name: `test-type-${Date.now()}`,
      displayName: 'Test Type',
      description: 'A test shard type',
      version: 1,
      isActive: true,
      isBuiltIn: false,
      parentShardTypeId: null,
      schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
          },
          content: {
            type: 'string',
          },
        },
        required: ['title'],
      },
      metadata: {
        createdBy: 'test-user-001',
        icon: '📄',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createDocument(overrides: any = {}) {
    return this.create({
      name: 'document',
      displayName: 'Document',
      description: 'Document shard type',
      isBuiltIn: true,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          content: { type: 'string' },
          author: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content'],
      },
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: any = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        name: `test-type-${i}`,
        displayName: `Test Type ${i}`,
        ...overrides,
      })
    );
  }
}

/**
 * Shard fixtures
 */
export class ShardFixtures {
  static create(overrides: any = {}) {
    return {
      id: uuidv4(),
      tenantId: 'test-tenant-001',
      shardTypeId: 'test-shardtype-001',
      status: 'active',
      structuredData: {
        title: 'Test Shard',
        content: 'This is a test shard for testing purposes.',
      },
      unstructuredData: {
        text: 'Additional unstructured content.',
        files: [],
      },
      vectors: [],
      acl: [
        {
          userId: 'test-user-001',
          permissions: ['READ', 'WRITE', 'ADMIN'],
          grantedBy: 'test-user-001',
          grantedAt: new Date().toISOString(),
        },
      ],
      enrichment: {
        enabled: false,
        lastEnrichedAt: null,
      },
      metadata: {
        version: 1,
        tags: ['test'],
        category: 'testing',
      },
      revisionId: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user-001',
      updatedBy: 'test-user-001',
      ...overrides,
    };
  }

  static createWithVectors(overrides: any = {}) {
    return this.create({
      vectors: [
        {
          id: uuidv4(),
          field: 'content',
          model: 'text-embedding-ada-002',
          dimensions: 1536,
          embedding: Array.from({ length: 1536 }, () => Math.random()),
          createdAt: new Date().toISOString(),
        },
      ],
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: any = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        structuredData: {
          title: `Test Shard ${i}`,
          content: `Test content ${i}`,
        },
        ...overrides,
      })
    );
  }
}

/**
 * Revision fixtures
 */
export class RevisionFixtures {
  static create(overrides: any = {}) {
    return {
      id: uuidv4(),
      tenantId: 'test-tenant-001',
      shardId: 'test-shard-001',
      shardTypeId: 'test-shardtype-001',
      revisionNumber: 1,
      changeType: 'UPDATE',
      changedBy: 'test-user-001',
      timestamp: new Date().toISOString(),
      data: {
        structuredData: {
          title: 'Test Shard',
          content: 'Test content',
        },
      },
      storageStrategy: 'FULL_SNAPSHOT',
      isCompressed: false,
      isMilestone: false,
      metadata: {
        changeDescription: 'Test change',
      },
      ...overrides,
    };
  }

  static createMultiple(count: number, shardId: string, overrides: any = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        shardId,
        revisionNumber: i + 1,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        ...overrides,
      })
    );
  }
}

/**
 * ACL Entry fixtures
 */
export class ACLFixtures {
  static create(overrides: any = {}) {
    return {
      userId: 'test-user-001',
      roleId: null,
      permissions: ['READ'],
      grantedBy: 'test-admin-001',
      grantedAt: new Date().toISOString(),
      expiresAt: null,
      ...overrides,
    };
  }

  static createWithAllPermissions(overrides: any = {}) {
    return this.create({
      permissions: ['READ', 'WRITE', 'ADMIN'],
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: any = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        userId: `test-user-${i}`,
        ...overrides,
      })
    );
  }
}

/**
 * Vectorization Job fixtures
 */
export class VectorizationJobFixtures {
  static create(overrides: any = {}) {
    return {
      id: uuidv4(),
      tenantId: 'test-tenant-001',
      shardId: 'test-shard-001',
      shardTypeId: 'test-shardtype-001',
      status: 'PENDING',
      config: {
        model: 'TEXT_EMBEDDING_ADA_002',
        chunkingStrategy: 'FIXED_SIZE',
        chunkSize: 512,
        chunkOverlap: 50,
        textSources: [
          { field: 'structuredData.content', weight: 1.0 },
        ],
        combineChunks: true,
        enabled: true,
      },
      priority: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
      retryCount: 0,
      maxRetries: 3,
      ...overrides,
    };
  }

  static createCompleted(overrides: any = {}) {
    return this.create({
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date().toISOString(),
      result: {
        vectorCount: 1,
        totalTokens: 100,
        chunksProcessed: 1,
        model: 'TEXT_EMBEDDING_ADA_002',
        dimensions: 1536,
        executionTimeMs: 500,
        cost: 0.00002,
      },
      ...overrides,
    });
  }

  static createFailed(overrides: any = {}) {
    return this.create({
      status: 'FAILED',
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date().toISOString(),
      error: {
        code: 'EMBEDDING_API_ERROR',
        message: 'Failed to generate embedding',
        details: {},
      },
      retryCount: 3,
      ...overrides,
    });
  }
}

/**
 * Cache entry fixtures
 */
export class CacheFixtures {
  static createShardCacheKey(tenantId: string, shardId: string): string {
    return `tenant:${tenantId}:shard:${shardId}:structured`;
  }

  static createACLCacheKey(tenantId: string, userId: string, shardId: string): string {
    return `tenant:${tenantId}:acl:${userId}:${shardId}`;
  }

  static createVectorSearchCacheKey(tenantId: string, queryHash: string): string {
    return `tenant:${tenantId}:vsearch:${queryHash}`;
  }

  static createCachedShard(shard: any): string {
    return JSON.stringify(shard.structuredData);
  }

  static createCachedACL(permissions: string[]): string {
    return JSON.stringify({
      permissions,
      cachedAt: new Date().toISOString(),
    });
  }
}
