/**
 * Search Analytics Service
 * Handles search analytics and statistics
 */

import { getContainer } from '@coder/shared/database';
import { BadRequestError } from '@coder/shared/utils/errors';
import { SearchQuery, SearchAnalytics } from '../types/search.types';

export class SearchAnalyticsService {
  private queriesContainerName = 'search_queries';

  /**
   * Get search analytics
   */
  async getAnalytics(
    tenantId: string,
    period: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<SearchAnalytics> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.queriesContainerName);
    const query =
      'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.createdAt >= @startDate AND c.createdAt <= @endDate';
    const parameters = [
      { name: '@tenantId', value: tenantId },
      { name: '@startDate', value: period.startDate },
      { name: '@endDate', value: period.endDate },
    ];

    try {
      const { resources } = await container.items.query<SearchQuery>({ query, parameters }).fetchAll();

      const totalQueries = resources.length;
      const uniqueQueries = new Set(resources.map((q) => q.query.toLowerCase())).size;
      const averageResultsCount =
        totalQueries > 0 ? resources.reduce((sum, q) => sum + q.resultsCount, 0) / totalQueries : 0;
      const averageResponseTime =
        totalQueries > 0 ? resources.reduce((sum, q) => sum + q.took, 0) / totalQueries : 0;

      // Group by search type
      const bySearchTypeMap = new Map<
        'vector' | 'hybrid' | 'fulltext',
        { count: number; resultsCount: number; responseTime: number }
      >();

      for (const q of resources) {
        const existing = bySearchTypeMap.get(q.searchType) || {
          count: 0,
          resultsCount: 0,
          responseTime: 0,
        };
        bySearchTypeMap.set(q.searchType, {
          count: existing.count + 1,
          resultsCount: existing.resultsCount + q.resultsCount,
          responseTime: existing.responseTime + q.took,
        });
      }

      const bySearchType = Array.from(bySearchTypeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        averageResultsCount: data.count > 0 ? data.resultsCount / data.count : 0,
        averageResponseTime: data.count > 0 ? data.responseTime / data.count : 0,
      }));

      // Top queries
      const queryCountMap = new Map<string, { count: number; resultsCount: number }>();
      for (const q of resources) {
        const key = q.query.toLowerCase();
        const existing = queryCountMap.get(key) || { count: 0, resultsCount: 0 };
        queryCountMap.set(key, {
          count: existing.count + 1,
          resultsCount: existing.resultsCount + q.resultsCount,
        });
      }

      const topQueries = Array.from(queryCountMap.entries())
        .map(([query, data]) => ({
          query,
          count: data.count,
          averageResultsCount: data.resultsCount / data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top shard types (from filters)
      const shardTypeCountMap = new Map<string, { count: number; scores: number[] }>();
      for (const q of resources) {
        if (q.filters?.shardTypeIds) {
          for (const shardTypeId of q.filters.shardTypeIds as string[]) {
            const existing = shardTypeCountMap.get(shardTypeId) || { count: 0, scores: [] };
            shardTypeCountMap.set(shardTypeId, {
              count: existing.count + 1,
              scores: existing.scores,
            });
          }
        }
      }

      const topShardTypes = Array.from(shardTypeCountMap.entries())
        .map(([shardTypeId, data]) => ({
          shardTypeId,
          count: data.count,
          averageScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : undefined,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        tenantId,
        period,
        totalQueries,
        uniqueQueries,
        averageResultsCount,
        averageResponseTime,
        bySearchType,
        topQueries,
        topShardTypes,
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate search analytics: ${error.message}`);
    }
  }
}

