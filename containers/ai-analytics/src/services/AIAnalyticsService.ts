/**
 * AI Analytics Service
 * AI usage analytics and monitoring
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AIAnalyticsEvent {
  id: string;
  tenantId: string;
  userId?: string;
  eventType: 'completion' | 'error' | 'usage' | 'feedback';
  modelId?: string;
  tokens?: number;
  cost?: number;
  latencyMs?: number;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

export interface AIAnalyticsModel {
  id: string;
  tenantId: string;
  modelId: string;
  modelName: string;
  usageCount: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class AIAnalyticsService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private aiInsightsClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.aiInsightsClient = new ServiceClient({
      baseURL: this.config.services.ai_insights?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Record AI analytics event
   */
  async recordEvent(tenantId: string, event: Omit<AIAnalyticsEvent, 'id' | 'tenantId' | 'createdAt'>): Promise<void> {
    try {
      const analyticsEvent: AIAnalyticsEvent = {
        id: uuidv4(),
        tenantId,
        ...event,
        createdAt: new Date(),
      };

      const container = getContainer('ai_analytics_events');
      await container.items.create(analyticsEvent, { partitionKey: tenantId });
    } catch (error: any) {
      log.error('Failed to record AI analytics event', error, {
        tenantId,
        service: 'ai-analytics',
      });
    }
  }

  /**
   * Get model analytics
   */
  async getModelAnalytics(tenantId: string, modelId?: string): Promise<AIAnalyticsModel[]> {
    try {
      const container = getContainer('ai_analytics_models');
      let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
      const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

      if (modelId) {
        query += ' AND c.modelId = @modelId';
        parameters.push({ name: '@modelId', value: modelId });
      }

      query += ' ORDER BY c.usageCount DESC';

      const { resources } = await container.items
        .query<AIAnalyticsModel>({ query, parameters })
        .fetchNext();

      return resources;
    } catch (error: any) {
      log.error('Failed to get model analytics', error, {
        tenantId,
        modelId,
        service: 'ai-analytics',
      });
      return [];
    }
  }
}
