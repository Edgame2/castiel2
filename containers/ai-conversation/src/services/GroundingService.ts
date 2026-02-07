/**
 * Grounding Service
 * Verifies AI outputs, generates citations, detects hallucinations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { AssembledContext } from './ContextAssemblyService.js';

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
  suggestion?: string;
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
      const claims = await this.extractClaims(tenantId, response);

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
      await container.items.create(groundedResponse, { partitionKey: tenantId } as any);

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
   * Extract claims from response using AI service
   */
  private async extractClaims(tenantId: string, response: string): Promise<Array<{ text: string; type: string; verifiable: boolean }>> {
    try {
      const token = this.getServiceToken(tenantId);
      
      // Truncate if too long
      const truncatedResponse = response.length > 4000 ? response.substring(0, 4000) + '...' : response;

      const CLAIM_EXTRACTION_PROMPT = `You are a claim extraction specialist. Analyze the following text and extract all factual and analytical claims.

For each claim, identify:
1. The exact text of the claim
2. The type (fact, date, quantity, quote, status, relationship, assessment, comparison, prediction, recommendation, opinion, general_knowledge)
3. Whether it's verifiable (true/false)

IMPORTANT:
- Extract EVERY claim, including inferred ones
- Mark assessments like "at risk" or "critical" as type "assessment"
- Mark comparisons like "better than" or "more than" as type "comparison"
- Mark future statements as type "prediction"
- Mark suggestions like "should" or "recommend" as type "recommendation"
- Mark subjective opinions as type "opinion"
- Mark common knowledge as type "general_knowledge"

Text:
"${truncatedResponse}"

Return ONLY a valid JSON array. Example format:
[
  {"text": "claim 1", "type": "fact", "verifiable": true},
  {"text": "claim 2", "type": "assessment", "verifiable": true}
]`;

      const aiResponse = await this.aiServiceClient.post<any>(
        '/api/ai/completions',
        {
          messages: [
            {
              role: 'user',
              content: CLAIM_EXTRACTION_PROMPT,
            },
          ],
          temperature: 0.2,
          maxTokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      // Parse JSON response
      let parsed: Array<{ text: string; type: string; verifiable: boolean }>;
      try {
        const content = aiResponse.choices?.[0]?.message?.content || aiResponse.completion || aiResponse.text || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError: any) {
        log.warn('Failed to parse claim extraction response', {
          error: parseError.message,
          service: 'ai-conversation',
        });
        // Fallback to simple extraction
        return this.simpleClaimExtraction(response);
      }

      return parsed
        .filter((p) => typeof p.text === 'string' && typeof p.type === 'string' && p.text.length > 0)
        .slice(0, 20);
    } catch (error: any) {
      log.warn('AI claim extraction failed, using simple extraction', {
        error: error.message,
        service: 'ai-conversation',
      });
      return this.simpleClaimExtraction(response);
    }
  }

  /**
   * Simple claim extraction fallback
   */
  private simpleClaimExtraction(response: string): Array<{ text: string; type: string; verifiable: boolean }> {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const claims: Array<{ text: string; type: string; verifiable: boolean }> = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (/\d+/.test(trimmed) || /(is|are|was|were|has|have|contains|includes)/i.test(trimmed)) {
        claims.push({
          text: trimmed,
          type: 'fact',
          verifiable: true,
        });
      } else if (trimmed.length > 20) {
        claims.push({
          text: trimmed,
          type: 'general',
          verifiable: false,
        });
      }
    }

    return claims.slice(0, 10);
  }

  /**
   * Match claims to sources with semantic similarity
   */
  private async matchClaimsToSources(
    claims: Array<{ text: string; type: string; verifiable: boolean }>,
    context: AssembledContext
  ): Promise<VerifiedClaim[]> {
    try {
      const verifiedClaims: VerifiedClaim[] = [];
      const MIN_CONFIDENCE_THRESHOLD = 0.65;

      for (const claim of claims) {
        if (!claim.verifiable) {
          // Opinion/general knowledge - no source needed
          verifiedClaims.push({
            id: uuidv4(),
            text: claim.text,
            verified: false,
            confidence: 0,
            sources: [],
            category: claim.type,
          });
          continue;
        }

        const claimWords = claim.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchingSources: string[] = [];
        let maxConfidence = 0;

        // Check each source for claim matches with semantic similarity
        for (const source of context.sources) {
          const sourceContent = source.content.toLowerCase();
          
          // Calculate word overlap
          const matchingWords = claimWords.filter(word => sourceContent.includes(word)).length;
          const wordMatchRatio = matchingWords / Math.max(1, claimWords.length);
          
          // Calculate semantic similarity (simple version - can be enhanced with embeddings)
          const semanticScore = this.calculateTextSimilarity(claim.text, source.content);
          
          // Combined score
          const matchScore = (wordMatchRatio * 0.4 + semanticScore * 0.6);

          if (matchScore > MIN_CONFIDENCE_THRESHOLD) {
            matchingSources.push(source.id);
            maxConfidence = Math.max(maxConfidence, matchScore);
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
   * Calculate text similarity (simple version)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Detect hallucinations with enhanced detection
   */
  private async detectHallucinations(
    claims: VerifiedClaim[],
    context: AssembledContext
  ): Promise<GroundingWarning[]> {
    try {
      const warnings: GroundingWarning[] = [];
      const MIN_CONFIDENCE_THRESHOLD = 0.65;

      for (const claim of claims) {
        // Check for unverified factual claims
        if (!claim.verified && claim.confidence < MIN_CONFIDENCE_THRESHOLD) {
          const severity = claim.confidence < 0.1 ? 'high' : claim.confidence < 0.3 ? 'medium' : 'low';
          
          // Determine warning type based on claim category
          let warningType: 'hallucination' | 'unverified' | 'contradiction' = 'unverified';
          if (claim.category === 'fact' || claim.category === 'date' || claim.category === 'quantity') {
            warningType = 'hallucination';
          }
          
          warnings.push({
            type: warningType,
            severity,
            message: `Unverified ${claim.category} claim with low confidence (${(claim.confidence * 100).toFixed(0)}%): ${claim.text.substring(0, 100)}`,
            location: claim.text.substring(0, 50),
          });
        } else if (claim.verified && claim.confidence < MIN_CONFIDENCE_THRESHOLD) {
          warnings.push({
            type: 'unverified',
            severity: 'low',
            message: `Claim verified but with low confidence (${(claim.confidence * 100).toFixed(0)}%): ${claim.text.substring(0, 100)}`,
            location: claim.text.substring(0, 50),
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
