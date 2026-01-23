/**
 * Context Cache Service
 * Caches assembled contexts for reuse
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { AssembledContext } from './ContextAssemblyService';
import { v4 as uuidv4 } from 'uuid';

export interface CachedContext {
  id: string;
  tenantId: string;
  cacheKey: string;
  context: AssembledContext;
  hitCount: number;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export class ContextCacheService {
  private config: ReturnType<typeof loadConfig>;
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor() {
    this.config = loadConfig();
  }

  /**
   * Get cached context
   */
  async getCachedContext(tenantId: string, cacheKey: string): Promise<AssembledContext | null> {
    try {
      const container = getContainer('conversation_contexts');
      const { resources } = await container.items
        .query<CachedContext>({
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.cacheKey = @cacheKey AND c.expiresAt > @now',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@cacheKey', value: cacheKey },
            { name: '@now', value: new Date().toISOString() },
          ],
        })
        .fetchNext();

      if (resources.length > 0) {
        const cached = resources[0];
        // Update hit count
        await container.item(cached.id, tenantId).replace({
          ...cached,
          hitCount: cached.hitCount + 1,
        });
        return cached.context;
      }

      return null;
    } catch (error: any) {
      log.warn('Failed to get cached context', {
        error: error.message,
        tenantId,
        cacheKey,
        service: 'ai-conversation',
      });
      return null;
    }
  }

  /**
   * Cache context
   */
  async cacheContext(tenantId: string, cacheKey: string, context: AssembledContext): Promise<void> {
    try {
      const container = getContainer('conversation_contexts');
      const expiresAt = new Date(Date.now() + this.CACHE_TTL * 1000);

      const cached: CachedContext = {
        id: uuidv4(),
        tenantId,
        cacheKey,
        context,
        hitCount: 0,
        expiresAt,
        createdAt: new Date(),
      };

      await container.items.create(cached, { partitionKey: tenantId });
    } catch (error: any) {
      log.warn('Failed to cache context', {
        error: error.message,
        tenantId,
        service: 'ai-conversation',
      });
    }
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(query: string, projectId?: string, userId?: string): string {
    // Simple hash-based cache key
    const key = `${query}_${projectId || ''}_${userId || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 64);
  }
}
