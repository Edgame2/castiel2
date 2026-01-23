/**
 * Context-Aware Query Parser Service
 * Parses queries with context awareness
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface ParsedQuery {
  original: string;
  parsed: {
    intent: string;
    entities: Array<{ type: string; value: string }>;
    filters: Record<string, any>;
    sort?: { field: string; direction: 'asc' | 'desc' };
  };
  contextHints: string[];
}

export class ContextAwareQueryParserService {
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
   * Parse query with context awareness
   */
  async parseQuery(tenantId: string, query: string, context?: any): Promise<ParsedQuery> {
    try {
      // Implement context-aware parsing
      // Extract entities (simple keyword extraction)
      const words = query.split(/\s+/).filter(w => w.length > 3);
      const entityWords = words.filter(w => /^[A-Z]/.test(w) || /\d+/.test(w));

      // Identify intent (reuse IntentAnalyzer logic)
      const queryLower = query.toLowerCase();
      let intent = 'general_query';
      if (queryLower.match(/^(what|how|why|when|where|who|which|can|could|should)/)) {
        intent = 'question';
      } else if (queryLower.match(/^(create|make|build|generate|add|update|delete)/)) {
        intent = 'command';
      } else if (queryLower.match(/(explain|describe|tell me about)/)) {
        intent = 'explanation';
      }

      // Apply context filters (if conversation context available)
      const contextFilters: Record<string, any> = {};
      const contextHints: string[] = [];
      
      if (context) {
        // Extract topics from previous messages
        if (context.topics && Array.isArray(context.topics)) {
          const previousTopics = context.topics.map((t: any) => t.text || t).filter(Boolean);
          if (previousTopics.length > 0) {
            contextFilters.topics = previousTopics;
            contextHints.push(`Previous topics: ${previousTopics.slice(0, 3).join(', ')}`);
          }
        }

        // Extract shard IDs if available
        if (context.sources && Array.isArray(context.sources)) {
          const shardIds = context.sources.map((s: any) => s.shardId).filter(Boolean);
          if (shardIds.length > 0) {
            contextFilters.shardIds = shardIds;
            contextHints.push(`Related to ${shardIds.length} source(s)`);
          }
        }
      }

      return {
        original: query,
        parsed: {
          intent,
          entities: entityWords.map(e => ({ type: /^[A-Z]/.test(e) ? 'proper_noun' : 'number', value: e })),
          filters: contextFilters,
        },
        contextHints,
      };
    } catch (error: any) {
      log.error('Failed to parse query', error, {
        tenantId,
        query,
        service: 'ai-conversation',
      });
      throw error;
    }
  }
}
