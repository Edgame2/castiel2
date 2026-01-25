/**
 * Sentiment Trends Service (Plan §921)
 * Reads from risk_sentiment_trends. Populated by ai-insights or data-enrichment when wired.
 */

import { getContainer } from '@coder/shared/database';
import { log } from '../utils/logger';

export interface SentimentTrendPoint {
  period: string;
  score: number;
  sampleSize: number;
}

/**
 * Get sentiment trends for an opportunity from risk_sentiment_trends.
 * Data from ai-insights or data-enrichment when wired; returns [] when none.
 */
export async function getSentimentTrends(opportunityId: string, tenantId: string): Promise<SentimentTrendPoint[]> {
  try {
    const container = getContainer('risk_sentiment_trends');
    const { resources } = await container.items
      .query<{ period: string; score: number; sampleSize: number }>({
        query: 'SELECT c.period, c.score, c.sampleSize FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.period DESC',
        parameters: [{ name: '@opportunityId', value: opportunityId }],
      }, { partitionKey: tenantId })
      .fetchAll();
    return (resources ?? []).map((r) => ({ period: r.period, score: r.score, sampleSize: r.sampleSize ?? 0 }));
  } catch (e) {
    log.warn('SentimentTrendsService.getSentimentTrends failed', { error: e instanceof Error ? e.message : String(e), opportunityId, tenantId, service: 'risk-analytics' });
    return [];
  }
}
