/**
 * Grounding Service
 * Verifies AI outputs, generates citations, detects hallucinations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { AssembledContext } from './ContextAssemblyService';

export interface GroundedResponse {
  id: string;
  tenantId: string;
  originalContent: string;
  groundedContent: string;
  citations: Citation[];
  claims: VerifiedClaim[];
  groundingScore: number;
  warnings: GroundingWarning[];
  createdAt: Date | string;
}

export interface Citation {
  id: string;
  index: number;
  shardId: string;
  shardName: string;
  text: string;
  confidence: number;
}

export interface VerifiedClaim {
  id: string;
  text: string;
  verified: boolean;
  confidence: number;
  sources: string[];
  category: string;
}

export interface GroundingWarning {
  type: 'hallucination' | 'unverified' | 'contradiction';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: string;
}

export class GroundingService {
  private config: ReturnType<typeof loadConfig>;
  private aiServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
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
   * Ground AI response with citations and verification
   */
  async ground(
    tenantId: string,
    response: string,
    context: AssembledContext
  ): Promise<GroundedResponse> {
    try {
      log.info('Grounding response', {
        tenantId,
        responseLength: response.length,
        contextSources: context.sources.length,
        service: 'ai-conversation',
      });

      // 1. Extract claims from response
      const claims = await this.extractClaims(response);

      // 2. Match claims to sources
      const verifiedClaims = await this.matchClaimsToSources(claims, context);

      // 3. Detect hallucinations
      const warnings = await this.detectHallucinations(verifiedClaims, context);

      // 4. Generate citations
      const citations = this.generateCitations(verifiedClaims, context);

      // 5. Calculate grounding score
      const groundingScore = this.calculateGroundingScore(verifiedClaims);

      // 6. Inject citations into response
      const groundedContent = this.injectCitations(response, citations);

      const groundedResponse: GroundedResponse = {
        id: uuidv4(),
        tenantId,
        originalContent: response,
        groundedContent,
        citations,
        claims: verifiedClaims,
        groundingScore,
        warnings,
        createdAt: new Date(),
      };

      // Store citation
      const container = getContainer('conversation_citations');
      await container.items.create(groundedResponse, { partitionKey: tenantId });

      return groundedResponse;
    } catch (error: any) {
      log.error('Failed to ground response', error, {
        tenantId,
        service: 'ai-conversation',
      });
      throw error;
    }
  }

  /**
   * Extract claims from response
   */
  private async extractClaims(response: string): Promise<Array<{ text: string; type: string }>> {
    try {
      // Simple claim extraction: identify factual statements
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const claims: Array<{ text: string; type: string }> = [];

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        // Identify factual statements (contain numbers, dates, or specific entities)
        if (/\d+/.test(trimmed) || /(is|are|was|were|has|have|contains|includes)/i.test(trimmed)) {
          claims.push({
            text: trimmed,
            type: 'factual',
          });
        } else if (trimmed.length > 20) {
          // Other significant statements
          claims.push({
            text: trimmed,
            type: 'general',
          });
        }
      }

      return claims.slice(0, 10); // Limit to top 10 claims
    } catch (error: any) {
      log.warn('Claim extraction failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Match claims to sources
   */
  private async matchClaimsToSources(
    claims: Array<{ text: string; type: string }>,
    context: AssembledContext
  ): Promise<VerifiedClaim[]> {
    try {
      const verifiedClaims: VerifiedClaim[] = [];

      for (const claim of claims) {
        const claimWords = claim.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchingSources: string[] = [];
        let maxConfidence = 0;

        // Check each source for claim matches
        for (const source of context.sources) {
          const sourceContent = source.content.toLowerCase();
          const matchingWords = claimWords.filter(word => sourceContent.includes(word)).length;
          const matchRatio = matchingWords / claimWords.length;

          if (matchRatio > 0.3) {
            matchingSources.push(source.id);
            maxConfidence = Math.max(maxConfidence, matchRatio);
          }
        }

        verifiedClaims.push({
          id: uuidv4(),
          text: claim.text,
          verified: matchingSources.length > 0,
          confidence: maxConfidence,
          sources: matchingSources,
          category: claim.type,
        });
      }

      return verifiedClaims;
    } catch (error: any) {
      log.warn('Claim-source matching failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return claims.map((claim) => ({
        id: uuidv4(),
        text: claim.text,
        verified: false,
        confidence: 0,
        sources: [],
        category: claim.type,
      }));
    }
  }

  /**
   * Detect hallucinations
   */
  private async detectHallucinations(
    claims: VerifiedClaim[],
    context: AssembledContext
  ): Promise<GroundingWarning[]> {
    try {
      const warnings: GroundingWarning[] = [];

      for (const claim of claims) {
        if (!claim.verified && claim.confidence < 0.3) {
          const severity = claim.confidence < 0.1 ? 'high' : claim.confidence < 0.2 ? 'medium' : 'low';
          warnings.push({
            type: 'hallucination',
            severity,
            message: `Unverified claim with low confidence (${(claim.confidence * 100).toFixed(0)}%): ${claim.text.substring(0, 100)}`,
          });
        } else if (claim.verified && claim.confidence < 0.5) {
          warnings.push({
            type: 'unverified',
            severity: 'low',
            message: `Claim verified but with low confidence: ${claim.text.substring(0, 100)}`,
          });
        }
      }

      return warnings;
    } catch (error: any) {
      log.warn('Hallucination detection failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return [];
    }
  }

  /**
   * Generate citations
   */
  private generateCitations(claims: VerifiedClaim[], context: AssembledContext): Citation[] {
    const citationMap = new Map<string, Citation>();
    
    claims.forEach(claim => {
      claim.sources.forEach((sourceId, index) => {
        if (!citationMap.has(sourceId)) {
          const source = context.sources.find(s => s.id === sourceId);
          if (source) {
            citationMap.set(sourceId, {
              id: uuidv4(),
              index: citationMap.size + 1,
              shardId: source.shardId,
              shardName: source.shardName,
              text: source.content.substring(0, 200),
              confidence: claim.confidence,
            });
          }
        }
      });
    });

    return Array.from(citationMap.values());
  }

  /**
   * Calculate grounding score
   */
  private calculateGroundingScore(claims: VerifiedClaim[]): number {
    if (claims.length === 0) return 0;
    const verifiedCount = claims.filter(c => c.verified).length;
    const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
    return (verifiedCount / claims.length) * 0.6 + avgConfidence * 0.4;
  }

  /**
   * Inject citations into response
   */
  private injectCitations(response: string, citations: Citation[]): string {
    if (citations.length === 0) {
      return response;
    }

    try {
      // Find sentences that might need citations
      const sentences = response.split(/([.!?]+)/);
      let result = '';
      let citationIndex = 0;

      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i];
        const punctuation = sentences[i + 1] || '';

        // Check if this sentence might need a citation (contains numbers, dates, or specific terms)
        if (citationIndex < citations.length && (/\d+/.test(sentence) || sentence.length > 50)) {
          result += sentence + `[${citations[citationIndex].index}]` + punctuation;
          citationIndex++;
        } else {
          result += sentence + punctuation;
        }
      }

      // Add citation references at the end
      if (citations.length > 0) {
        result += '\n\nReferences:\n';
        citations.forEach(citation => {
          result += `[${citation.index}] ${citation.shardName}\n`;
        });
      }

      return result;
    } catch (error: any) {
      log.warn('Citation injection failed', {
        error: error.message,
        service: 'ai-conversation',
      });
      return response;
    }
  }
}
