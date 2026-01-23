// @ts-nocheck - Optional service, not used by workers
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
import { Logger } from '../utils/logger.js';
// ============================================
// Types
// ============================================
export var ClaimType;
(function (ClaimType) {
    // Directly verifiable
    ClaimType["FACT"] = "fact";
    ClaimType["DATE"] = "date";
    ClaimType["QUANTITY"] = "quantity";
    ClaimType["QUOTE"] = "quote";
    // Contextually verifiable
    ClaimType["STATUS"] = "status";
    ClaimType["RELATIONSHIP"] = "relationship";
    // Inferred (need supporting facts)
    ClaimType["ASSESSMENT"] = "assessment";
    ClaimType["COMPARISON"] = "comparison";
    ClaimType["PREDICTION"] = "prediction";
    ClaimType["RECOMMENDATION"] = "recommendation";
    // Not verifiable
    ClaimType["OPINION"] = "opinion";
    ClaimType["GENERAL_KNOWLEDGE"] = "general";
})(ClaimType || (ClaimType = {}));
// ============================================
// Configuration
// ============================================
const CLAIM_EXTRACTION_PROMPT = `You are a claim extraction specialist. Analyze the following text and extract all factual and analytical claims.

For each claim, identify:
1. The exact text of the claim
2. The type (fact, date, quantity, quote, status, relationship, assessment, comparison, prediction, recommendation, opinion, general_knowledge)
3. Whether it's verifiable (verifiable vs not_verifiable)

IMPORTANT:
- Extract EVERY claim, including inferred ones
- Mark assessments like "at risk" or "critical" as type "assessment"
- Mark comparisons like "better than" or "more than" as type "comparison"
- Mark future statements as type "prediction"
- Mark suggestions like "should" or "recommend" as type "recommendation"
- Mark subjective opinions as type "opinion"
- Mark common knowledge as type "general_knowledge"

Text:
"\${TEXT}"

Return ONLY a valid JSON array. Example format:
[
  {"text": "claim 1", "type": "fact", "verifiable": true},
  {"text": "claim 2", "type": "assessment", "verifiable": true}
]`;
const MIN_CONFIDENCE_THRESHOLD = 0.65;
const MAX_CITATIONS = 20;
const HALLUCINATION_SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};
// ============================================
// Service
// ============================================
export class GroundingService {
    llmService;
    logger = new Logger(GroundingService.name);
    constructor(llmService) {
        this.llmService = llmService;
    }
    /**
     * Main method: Ground AI response with citations and verification
     */
    async ground(response, context, options) {
        const startTime = Date.now();
        try {
            // 1. Extract claims from response
            const claims = await this.extractClaims(response);
            this.logger.debug(`Extracted ${claims.length} claims from response`, { responseLength: response.length, claimCount: claims.length });
            // 2. Verify claims against context
            const sourceMatches = await this.matchClaimsToSources(claims, context);
            this.logger.debug(`Verified ${sourceMatches.filter((s) => s.status === 'verified').length}/${sourceMatches.length} claims`);
            // 3. Detect hallucinations
            let hallucinations = [];
            if (!options?.skipHallucinationDetection) {
                hallucinations = await this.detectHallucinations(sourceMatches, context);
                this.logger.debug(`Detected ${hallucinations.length} potential hallucinations`);
            }
            // 4. Generate citations
            const citations = this.generateCitations(sourceMatches);
            this.logger.debug(`Generated ${citations.length} citations for ${Math.min(citations.length, MAX_CITATIONS)} unique sources`);
            // 5. Calculate grounding score
            const groundingScore = this.calculateGroundingScore(sourceMatches);
            // 6. Inject citations into response
            const groundedContent = this.injectCitations(response, sourceMatches);
            // 7. Build GroundedResponse
            const verifiedClaims = sourceMatches.map((sm) => ({
                claim: sm.claim.text,
                verified: sm.status === 'verified' || sm.status === 'partially_verified',
                confidence: sm.sources.length > 0 ? sm.sources[0].matchScore : 0,
                sources: sm.sources.map((s) => s.citation.id),
                category: this.mapClaimTypeToCategory(sm.claim.type),
            }));
            const result = {
                originalContent: response,
                groundedContent,
                citations: citations.slice(0, MAX_CITATIONS),
                overallConfidence: groundingScore,
                groundingScore,
                claims: verifiedClaims,
                warnings: hallucinations,
            };
            this.logger.info(`Grounding completed in ${Date.now() - startTime}ms`, {
                totalClaims: claims.length,
                verifiedClaims: sourceMatches.filter((s) => s.status === 'verified').length,
                hallucinationCount: hallucinations.length,
                citationCount: citations.length,
                groundingScore: Math.round(groundingScore * 100),
                processingTimeMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.logger.error('Error during grounding', { error });
            // Graceful degradation: return response without grounding
            return {
                originalContent: response,
                groundedContent: response,
                citations: [],
                overallConfidence: 0,
                groundingScore: 0,
                claims: [],
                warnings: [
                    {
                        claim: 'Unable to verify claims',
                        type: 'unverified',
                        severity: 'high',
                        suggestion: 'Response could not be grounded against sources',
                    },
                ],
            };
        }
    }
    /**
     * Extract claims from response using LLM
     */
    async extractClaims(response) {
        try {
            // Truncate response if too long for LLM
            const truncatedResponse = response.length > 4000 ? response.substring(0, 4000) + '...' : response;
            const prompt = CLAIM_EXTRACTION_PROMPT.replace('${TEXT}', truncatedResponse);
            const output = await this.llmService.complete(prompt, {
                temperature: 0.2, // Low temperature for consistency
                maxTokens: 2000,
            });
            // Parse JSON response
            let parsed;
            try {
                // Extract JSON from response (it might have surrounding text)
                const jsonMatch = output.match(/\[[\s\S]*\]/);
                if (!jsonMatch) {
                    throw new Error('No JSON array found in response');
                }
                parsed = JSON.parse(jsonMatch[0]);
            }
            catch (parseError) {
                this.logger.warn('Failed to parse claim extraction response', {
                    output: output.substring(0, 200),
                    error: parseError,
                });
                return [];
            }
            // Convert to ExtractedClaim with IDs and positions
            return parsed
                .filter((p) => typeof p.text === 'string' &&
                typeof p.type === 'string' &&
                p.text.length > 0)
                .map((claim, index) => {
                const startIndex = response.indexOf(claim.text);
                const endIndex = startIndex + claim.text.length;
                return {
                    id: `claim_${index}`,
                    text: claim.text,
                    type: claim.type || ClaimType.OPINION,
                    startIndex: startIndex >= 0 ? startIndex : 0,
                    endIndex: endIndex >= 0 ? endIndex : 0,
                    entities: this.extractEntities(claim.text),
                    verifiable: claim.verifiable === true,
                    requiresSource: this.isVerifiableType(claim.type),
                };
            });
        }
        catch (error) {
            this.logger.warn('Error extracting claims', { error });
            return [];
        }
    }
    /**
     * Match claims to sources in context
     */
    async matchClaimsToSources(claims, context) {
        const matches = [];
        for (const claim of claims) {
            if (!claim.requiresSource) {
                // Opinion/general knowledge - no source needed
                matches.push({
                    claim,
                    status: 'unverified',
                    sources: [],
                });
                continue;
            }
            // Find matching sources
            const sources = [];
            // Check primary chunk
            const primaryScore = this.calculateTextSimilarity(claim.text, context.primary?.content ? JSON.stringify(context.primary.content) : '');
            if (primaryScore > MIN_CONFIDENCE_THRESHOLD) {
                sources.push({
                    citation: {
                        id: `cite_${context.primary?.shardId || 'primary'}`,
                        text: this.extractExcerpt(claim.text, context.primary?.content ? JSON.stringify(context.primary.content) : ''),
                        source: {
                            shardId: context.primary?.shardId || '',
                            shardName: context.primary?.shardName || 'Primary Context',
                            shardTypeId: context.primary?.shardTypeId || '',
                            fieldPath: undefined,
                        },
                        confidence: primaryScore,
                        matchType: 'semantic',
                    },
                    matchType: 'semantic',
                    matchScore: primaryScore,
                    excerpt: this.extractExcerpt(claim.text, context.primary?.content ? JSON.stringify(context.primary.content) : ''),
                });
            }
            // Check related chunks
            for (const chunk of context.related || []) {
                const score = this.calculateTextSimilarity(claim.text, chunk.content ? JSON.stringify(chunk.content) : '');
                if (score > MIN_CONFIDENCE_THRESHOLD) {
                    sources.push({
                        citation: {
                            id: `cite_${chunk.shardId}`,
                            text: this.extractExcerpt(claim.text, chunk.content ? JSON.stringify(chunk.content) : ''),
                            source: {
                                shardId: chunk.shardId,
                                shardName: chunk.shardName,
                                shardTypeId: chunk.shardTypeId,
                                fieldPath: undefined,
                            },
                            confidence: score,
                            matchType: 'semantic',
                        },
                        matchType: 'semantic',
                        matchScore: score,
                        excerpt: this.extractExcerpt(claim.text, chunk.content ? JSON.stringify(chunk.content) : ''),
                    });
                }
            }
            // Check RAG chunks
            for (const ragChunk of context.ragChunks || []) {
                const score = this.calculateTextSimilarity(claim.text, ragChunk.content);
                if (score > MIN_CONFIDENCE_THRESHOLD) {
                    sources.push({
                        citation: {
                            id: `cite_${ragChunk.shardId}`,
                            text: this.extractExcerpt(claim.text, ragChunk.content),
                            source: {
                                shardId: ragChunk.shardId,
                                shardName: ragChunk.shardName,
                                shardTypeId: ragChunk.shardTypeId,
                                fieldPath: undefined,
                            },
                            confidence: score,
                            matchType: 'semantic',
                        },
                        matchType: 'semantic',
                        matchScore: score,
                        excerpt: this.extractExcerpt(claim.text, ragChunk.content),
                    });
                }
            }
            // Determine verification status
            let status = 'unverified';
            if (sources.some((s) => s.matchScore >= 0.9)) {
                status = 'verified';
            }
            else if (sources.some((s) => s.matchScore >= 0.7)) {
                status = 'partially_verified';
            }
            matches.push({
                claim,
                status,
                sources: sources.sort((a, b) => b.matchScore - a.matchScore),
            });
        }
        return matches;
    }
    /**
     * Detect potential hallucinations
     */
    async detectHallucinations(sourceMatches, context) {
        const warnings = [];
        for (const match of sourceMatches) {
            if (match.status === 'unverified' && match.claim.requiresSource) {
                // Unverified factual claim is a potential hallucination
                warnings.push({
                    claim: match.claim.text,
                    type: 'unverified',
                    severity: match.claim.type === ClaimType.FACT
                        ? HALLUCINATION_SEVERITY_LEVELS.HIGH
                        : HALLUCINATION_SEVERITY_LEVELS.MEDIUM,
                    suggestion: 'This claim could not be verified against source data. Please verify independently.',
                });
            }
            if (match.status === 'contradicted') {
                // Contradicted claim is a hallucination
                warnings.push({
                    claim: match.claim.text,
                    type: 'contradiction',
                    severity: HALLUCINATION_SEVERITY_LEVELS.HIGH,
                    suggestion: `This contradicts source data. Source says: ${match.contradiction?.actualValue || 'different value'}`,
                });
            }
        }
        return warnings;
    }
    /**
     * Generate citations from source matches
     */
    generateCitations(sourceMatches) {
        const citations = [];
        const citedSourceIds = new Set();
        // Use verified and partially verified claims
        for (const match of sourceMatches) {
            if ((match.status === 'verified' || match.status === 'partially_verified') &&
                match.sources.length > 0) {
                const primarySource = match.sources[0]; // Use highest confidence source
                const sourceId = primarySource.citation.source.shardId;
                // Avoid duplicate citations
                if (!citedSourceIds.has(sourceId)) {
                    citations.push(primarySource.citation);
                    citedSourceIds.add(sourceId);
                }
            }
        }
        return citations.slice(0, MAX_CITATIONS);
    }
    /**
     * Calculate grounding score (0-1)
     */
    calculateGroundingScore(sourceMatches) {
        if (sourceMatches.length === 0) {
            return 0;
        }
        const verifiedCount = sourceMatches.filter((s) => s.status === 'verified').length;
        const partialCount = sourceMatches.filter((s) => s.status === 'partially_verified').length;
        const hallucinations = sourceMatches.filter((s) => s.status === 'unverified' && s.claim.requiresSource).length;
        // Score = (verified + 0.5*partial - hallucinations) / total
        const score = (verifiedCount + 0.5 * partialCount - hallucinations) /
            sourceMatches.length;
        return Math.max(0, Math.min(1, score));
    }
    /**
     * Inject citations into response
     */
    injectCitations(response, sourceMatches) {
        let citedResponse = response;
        const citationMap = new Map();
        let citationCounter = 1;
        // Sort by position (reverse) to avoid index shifting
        const sortedMatches = [...sourceMatches]
            .filter((s) => s.status === 'verified' || s.status === 'partially_verified')
            .filter((s) => s.sources.length > 0)
            .sort((a, b) => b.claim.endIndex - a.claim.endIndex);
        for (const match of sortedMatches) {
            const sourceId = match.sources[0].citation.source.shardId;
            let citationNum = citationMap.get(sourceId);
            if (!citationNum) {
                citationNum = citationCounter++;
                citationMap.set(sourceId, citationNum);
            }
            // Insert citation marker at end of claim
            const insertPosition = match.claim.endIndex;
            const citationMarker = `[${citationNum}]`;
            citedResponse =
                citedResponse.substring(0, insertPosition) +
                    citationMarker +
                    citedResponse.substring(insertPosition);
        }
        return citedResponse;
    }
    /**
     * Helper: Calculate text similarity using Jaccard similarity
     */
    calculateTextSimilarity(text1, text2) {
        const normalize = (s) => s
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 0);
        const words1 = new Set(normalize(text1));
        const words2 = new Set(normalize(text2));
        if (words1.size === 0 && words2.size === 0) {
            return 1;
        }
        if (words1.size === 0 || words2.size === 0) {
            return 0;
        }
        const intersection = new Set([...words1].filter((w) => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    /**
     * Helper: Extract relevant excerpt from text
     */
    extractExcerpt(claim, text, length = 150) {
        const index = text.toLowerCase().indexOf(claim.toLowerCase());
        if (index === -1) {
            return text.substring(0, length);
        }
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + claim.length + 50);
        return text.substring(start, end).trim();
    }
    /**
     * Helper: Extract entities from text (simple extraction)
     */
    extractEntities(text) {
        const entities = [];
        // Extract capitalized words (simple entity recognition)
        const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
        if (capitalizedWords) {
            entities.push(...capitalizedWords);
        }
        return [...new Set(entities)];
    }
    /**
     * Helper: Check if claim type requires source verification
     */
    isVerifiableType(type) {
        return [
            ClaimType.FACT,
            ClaimType.DATE,
            ClaimType.QUANTITY,
            ClaimType.QUOTE,
            ClaimType.STATUS,
            ClaimType.RELATIONSHIP,
            ClaimType.ASSESSMENT,
            ClaimType.COMPARISON,
            ClaimType.PREDICTION,
        ].includes(type);
    }
    /**
     * Helper: Map claim type to claim category
     */
    mapClaimTypeToCategory(type) {
        switch (type) {
            case ClaimType.FACT:
            case ClaimType.DATE:
            case ClaimType.QUANTITY:
            case ClaimType.QUOTE:
            case ClaimType.STATUS:
            case ClaimType.RELATIONSHIP:
                return 'factual';
            case ClaimType.ASSESSMENT:
            case ClaimType.COMPARISON:
            case ClaimType.RECOMMENDATION:
                return 'analytical';
            case ClaimType.PREDICTION:
                return 'prediction';
            case ClaimType.OPINION:
            case ClaimType.GENERAL_KNOWLEDGE:
            default:
                return 'opinion';
        }
    }
}
//# sourceMappingURL=grounding.service.js.map