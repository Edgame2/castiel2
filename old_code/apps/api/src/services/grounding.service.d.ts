/**
 * Grounding Service
 * Verifies AI outputs, generates citations, detects hallucinations,
 * and ensures response accuracy through source attribution
 *
 * Implements the Grounding Pipeline:
 * 1. Claim Extraction - Extract factual claims from response
 * 2. Source Matching - Find supporting evidence in context
 * 3. Verification - Determine if claims are verified/unverified/contradicted
 * 4. Confidence Scoring - Calculate grounding score (0-100%)
 * 5. Citation Injection - Add [1], [2] markers to response
 */
import type { GroundedResponse, AssembledContext } from '../types/ai-insights.types.js';
import type { LLMService } from './llm.service.js';
export declare enum ClaimType {
    FACT = "fact",// "The value is $500K"
    DATE = "date",// "Close date is December 15"
    QUANTITY = "quantity",// "There are 3 stakeholders"
    QUOTE = "quote",// "John said 'budget is tight'"
    STATUS = "status",// "The deal is in negotiation"
    RELATIONSHIP = "relationship",// "Acme is the client"
    ASSESSMENT = "assessment",// "The deal is at risk"
    COMPARISON = "comparison",// "Better than last quarter"
    PREDICTION = "prediction",// "Likely to close"
    RECOMMENDATION = "recommendation",// "You should..."
    OPINION = "opinion",// Subjective interpretation
    GENERAL_KNOWLEDGE = "general"
}
export declare class GroundingService {
    private llmService;
    private logger;
    constructor(llmService: LLMService);
    /**
     * Main method: Ground AI response with citations and verification
     */
    ground(response: string, context: AssembledContext, options?: {
        skipHallucinationDetection?: boolean;
    }): Promise<GroundedResponse>;
    /**
     * Extract claims from response using LLM
     */
    private extractClaims;
    /**
     * Match claims to sources in context
     */
    private matchClaimsToSources;
    /**
     * Detect potential hallucinations
     */
    private detectHallucinations;
    /**
     * Generate citations from source matches
     */
    private generateCitations;
    /**
     * Calculate grounding score (0-1)
     */
    private calculateGroundingScore;
    /**
     * Inject citations into response
     */
    private injectCitations;
    /**
     * Helper: Calculate text similarity using Jaccard similarity
     */
    private calculateTextSimilarity;
    /**
     * Helper: Extract relevant excerpt from text
     */
    private extractExcerpt;
    /**
     * Helper: Extract entities from text (simple extraction)
     */
    private extractEntities;
    /**
     * Helper: Check if claim type requires source verification
     */
    private isVerifiableType;
    /**
     * Helper: Map claim type to claim category
     */
    private mapClaimTypeToCategory;
}
//# sourceMappingURL=grounding.service.d.ts.map