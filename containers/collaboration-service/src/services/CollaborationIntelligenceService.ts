/**
 * Collaboration Intelligence Service
 * Collaborative insights and intelligence (merged from collaboration-intelligence container)
 */

import { ServiceClient } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface CollaborationInsight {
  id: string;
  tenantId: string;
  insightType: string;
  content: string;
  participants: string[];
  relevanceScore: number;
  createdAt: Date | string;
}

export class CollaborationIntelligenceService {
  private config: ReturnType<typeof loadConfig>;
  private aiInsightsClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiInsightsClient = new ServiceClient({
      baseURL: this.config.services.ai_insights?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Generate collaborative insight
   */
  async generateInsight(tenantId: string, context: any): Promise<CollaborationInsight> {
    try {
      // Extract participants from context
      const participants = context.participants || context.userIds || [];
      const contextText = JSON.stringify(context).substring(0, 500);

      // Generate collaborative insight using AI insights service
      let insightContent = '';
      let relevanceScore = 0.8;

      try {
        const aiInsight = await this.aiInsightsClient.post<any>(
          '/api/v1/insights/generate',
          {
            type: 'collaborative',
            context: contextText,
            participants,
          },
          {
            headers: {
              'X-Tenant-ID': tenantId,
            },
          }
        ).catch(() => null);

        if (aiInsight?.insight) {
          insightContent = aiInsight.insight;
          relevanceScore = aiInsight.relevanceScore || 0.8;
        }
      } catch (error: any) {
        // Use fallback
      }

      // Fallback insight generation
      if (!insightContent) {
        const participantCount = participants.length;
        insightContent = `Collaborative insight: ${participantCount} participant(s) involved in this context. ` +
          `Key themes: ${contextText.substring(0, 200)}...`;
        relevanceScore = participantCount > 0 ? 0.8 : 0.6;
      }

      const insight: CollaborationInsight = {
        id: uuidv4(),
        tenantId,
        insightType: 'collaborative',
        content: insightContent,
        participants: participants,
        relevanceScore,
        createdAt: new Date(),
      };

      const container = getContainer('collaboration_insights');
      await container.items.create(insight, { partitionKey: tenantId });

      return insight;
    } catch (error: any) {
      throw new Error(`Failed to generate collaborative insight: ${error.message}`);
    }
  }
}
