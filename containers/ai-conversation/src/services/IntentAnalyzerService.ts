/**
 * Intent Analyzer Service
 * Intent classification for conversation queries
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities: Array<{ type: string; value: string }>;
  category: 'question' | 'command' | 'request' | 'clarification' | 'other';
}

export class IntentAnalyzerService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;

  constructor() {
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Analyze intent from query
   */
  async analyzeIntent(tenantId: string, query: string): Promise<IntentAnalysis> {
    try {
      // Implement intent classification using keyword matching
      const queryLower = query.toLowerCase();
      let intent = 'general_query';
      let confidence = 0.5;

      // Question intent
      if (queryLower.match(/^(what|how|why|when|where|who|which|can|could|should|would|is|are|do|does|did)/)) {
        intent = 'question';
        confidence = 0.8;
      }
      // Command intent
      else if (queryLower.match(/^(create|make|build|generate|add|update|delete|remove|show|list|get|fetch)/)) {
        intent = 'command';
        confidence = 0.85;
      }
      // Explanation intent
      else if (queryLower.match(/(explain|describe|tell me about|what is|what are)/)) {
        intent = 'explanation';
        confidence = 0.8;
      }
      // Search intent
      else if (queryLower.match(/(find|search|look for|get|retrieve)/)) {
        intent = 'search';
        confidence = 0.75;
      }
      // Analysis intent
      else if (queryLower.match(/(analyze|compare|evaluate|review|assess)/)) {
        intent = 'analysis';
        confidence = 0.8;
      }

      return {
        intent,
        confidence,
        entities: [],
        category: 'question',
      };
    } catch (error: any) {
      log.error('Failed to analyze intent', error, {
        tenantId,
        query,
        service: 'ai-conversation',
      });
      throw error;
    }
  }
}
