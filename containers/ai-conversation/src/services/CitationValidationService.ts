/**
 * Citation Validation Service
 * Validates citations in AI responses
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { Citation } from './GroundingService';

export interface CitationValidation {
  citationId: string;
  valid: boolean;
  issues: string[];
  confidence: number;
}

export class CitationValidationService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'ai-conversation',
      serviceName: 'ai-conversation',
      tenantId,
    });
  }

  /**
   * Validate citation
   */
  async validateCitation(tenantId: string, citation: Citation): Promise<CitationValidation> {
    try {
      const issues: string[] = [];
      let valid = true;

      // Check if shard exists
      // Verify shard exists via shard-manager
      try {
        const token = this.getServiceToken(tenantId);
        const shardResponse = await this.shardManagerClient.get<any>(
          `/api/v1/shards/${citation.shardId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
            },
          }
        );

        if (!shardResponse) {
          return {
            valid: false,
            confidence: 0,
            errors: ['Shard not found'],
          };
        }

        // Validate citation text against source content
        const sourceContent = JSON.stringify(shardResponse.structuredData || {}).toLowerCase();
        const citationText = citation.text.toLowerCase();
        
        // Check if citation text appears in source (with some flexibility)
        const citationWords = citationText.split(/\s+/).filter(w => w.length > 3);
        const matchingWords = citationWords.filter(word => sourceContent.includes(word)).length;
        const matchRatio = citationWords.length > 0 ? matchingWords / citationWords.length : 0;

        if (matchRatio < 0.3) {
          return {
            valid: false,
            confidence: matchRatio,
            errors: ['Citation text does not match source content'],
          };
        }

      // Check confidence threshold
      if (citation.confidence < 0.5) {
        issues.push('Low confidence score');
        valid = false;
      }

      return {
        citationId: citation.id,
        valid,
        issues,
        confidence: citation.confidence,
      };
    } catch (error: any) {
      log.error('Failed to validate citation', error, {
        tenantId,
        citationId: citation.id,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Validate all citations
   */
  async validateCitations(tenantId: string, citations: Citation[]): Promise<CitationValidation[]> {
    return Promise.all(citations.map(c => this.validateCitation(tenantId, c)));
  }
}
