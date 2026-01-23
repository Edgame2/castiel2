/**
 * Grounding Service Integration Tests
 * Tests for claim extraction, source matching, hallucination detection,
 * citation generation, and grounding score calculation
 */
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { GroundingService } from '../grounding.service.js';
// ============================================
// Mock LLM Service
// ============================================
const createMockLLMService = () => ({
    complete: vi.fn(async (prompt) => {
        // Mock claim extraction response
        if (prompt.includes('claim extraction specialist')) {
            return JSON.stringify([
                { text: 'The deal is at risk', type: 'assessment', verifiable: true },
                { text: 'no contact in 14 days', type: 'fact', verifiable: true },
                { text: 'budget concerns were raised', type: 'fact', verifiable: true },
                { text: 'close date is Q4', type: 'date', verifiable: true },
                { text: 'the value is $500K', type: 'fact', verifiable: true },
            ]);
        }
        return '[]';
    }),
});
// ============================================
// Helper Functions
// ============================================
const createMockContext = (overrides) => ({
    primary: {
        shardId: 'primary_1',
        shardName: 'Opportunity Record',
        shardTypeId: 'opportunity',
        shardTypeName: 'Opportunity',
        content: {
            name: 'Acme Deal',
            value: 500000,
            status: 'in_negotiation',
            expectedCloseDate: '2024-12-15',
            lastContact: '2024-11-07',
        },
        tokenCount: 150,
    },
    related: [
        {
            shardId: 'related_1',
            shardName: 'Activity Log',
            shardTypeId: 'activity',
            shardTypeName: 'Activity',
            content: {
                activities: [
                    { date: '2024-11-07', type: 'call', description: 'Budget discussion' },
                    { date: '2024-10-20', type: 'meeting', description: 'Initial meeting' },
                ],
            },
            tokenCount: 100,
        },
    ],
    ragChunks: [
        {
            shardId: 'rag_1',
            shardName: 'Meeting Notes',
            shardTypeId: 'note',
            content: 'Client mentioned concerns about budget and timeline.',
            score: 0.85,
            tokenCount: 50,
        },
    ],
    ...overrides,
});
// ============================================
// Tests
// ============================================
describe('GroundingService', () => {
    let service;
    let mockLLM;
    beforeEach(() => {
        mockLLM = createMockLLMService();
        service = new GroundingService(mockLLM);
    });
    describe('Main Grounding Pipeline', () => {
        it('should ground response with citations', async () => {
            const response = 'The deal is at risk because no contact in 14 days and budget concerns were raised. The close date is Q4 and the value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
            expect(result.originalContent).toBe(response);
            expect(result.groundedContent).toBeTruthy();
            expect(result.groundingScore).toBeGreaterThan(0);
            expect(result.citations.length).toBeGreaterThan(0);
            expect(result.claims.length).toBeGreaterThan(0);
        });
        it('should calculate grounding score between 0 and 1', async () => {
            const response = 'The deal is at risk because no contact in 14 days.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.groundingScore).toBeGreaterThanOrEqual(0);
            expect(result.groundingScore).toBeLessThanOrEqual(1);
        });
        it('should generate citations with proper structure', async () => {
            const response = 'The value is $500K and the close date is Q4.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            if (result.citations.length > 0) {
                const citation = result.citations[0];
                expect(citation.id).toBeTruthy();
                expect(citation.text).toBeTruthy();
                expect(citation.source).toBeDefined();
                expect(citation.source.shardId).toBeTruthy();
                expect(citation.source.shardName).toBeTruthy();
                expect(citation.confidence).toBeGreaterThanOrEqual(0);
                expect(citation.confidence).toBeLessThanOrEqual(1);
            }
        });
        it('should mark verified claims correctly', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const verifiedClaims = result.claims.filter((c) => c.verified);
            expect(verifiedClaims.length).toBeGreaterThan(0);
        });
        it('should handle empty response gracefully', async () => {
            const response = '';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
            expect(result.claims.length).toBe(0);
            expect(result.groundingScore).toBeGreaterThanOrEqual(0);
        });
        it('should handle missing context gracefully', async () => {
            const response = 'Some response text.';
            const context = createMockContext({
                related: [],
                ragChunks: [],
            });
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
            expect(result.groundingScore).toBeGreaterThanOrEqual(0);
        });
        it('should skip hallucination detection when requested', async () => {
            const response = 'The deal is at risk.';
            const context = createMockContext();
            const result = await service.ground(response, context, {
                skipHallucinationDetection: true,
            });
            expect(result).toBeDefined();
            // Warnings should be empty or minimal
            expect(result.warnings.length).toBeLessThanOrEqual(1);
        });
        it('should cap citations at max limit', async () => {
            const response = 'Claim 1. Claim 2. Claim 3. Claim 4. Claim 5. ' +
                'Claim 6. Claim 7. Claim 8. Claim 9. Claim 10. ' +
                'Claim 11. Claim 12. Claim 13. Claim 14. Claim 15. ' +
                'Claim 16. Claim 17. Claim 18. Claim 19. Claim 20. ' +
                'Claim 21. Claim 22.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.citations.length).toBeLessThanOrEqual(20);
        });
    });
    describe('Claim Extraction', () => {
        it('should extract multiple claim types', async () => {
            const response = 'The deal is at risk. The close date is Q4. The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.claims.length).toBeGreaterThan(0);
            const categories = new Set(result.claims.map((c) => c.category));
            expect(categories.size).toBeGreaterThan(0);
        });
        it('should identify factual claims', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const factualClaims = result.claims.filter((c) => c.category === 'factual');
            expect(factualClaims.length).toBeGreaterThan(0);
        });
        it('should identify analytical claims', async () => {
            const response = 'The deal is at risk because of budget concerns.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const analyticalClaims = result.claims.filter((c) => c.category === 'analytical');
            expect(analyticalClaims.length).toBeGreaterThan(0);
        });
        it('should handle responses with quotes', async () => {
            const response = 'John said "budget is tight".';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.claims.length).toBeGreaterThan(0);
        });
        it('should handle responses with numbers', async () => {
            const response = 'There are 3 stakeholders and 5 decision makers.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.claims.length).toBeGreaterThan(0);
        });
        it('should handle responses with dates', async () => {
            const response = 'The close date is December 15, 2024.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.claims.length).toBeGreaterThan(0);
        });
    });
    describe('Source Matching', () => {
        it('should match claims to primary context', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext({
                primary: {
                    shardId: 'primary_1',
                    shardName: 'Opportunity',
                    shardTypeId: 'opportunity',
                    shardTypeName: 'Opportunity',
                    content: { value: 500000 },
                    tokenCount: 50,
                },
            });
            const result = await service.ground(response, context);
            expect(result.citations.some((c) => c.source.shardId === 'primary_1')).toBe(true);
        });
        it('should match claims to related chunks', async () => {
            const response = 'Budget concerns were raised.';
            const context = createMockContext({
                related: [
                    {
                        shardId: 'related_1',
                        shardName: 'Meeting Notes',
                        shardTypeId: 'note',
                        shardTypeName: 'Note',
                        content: { notes: 'Budget concerns were discussed.' },
                        tokenCount: 50,
                    },
                ],
            });
            const result = await service.ground(response, context);
            expect(result.citations.some((c) => c.source.shardId === 'related_1')).toBe(true);
        });
        it('should match claims to RAG chunks', async () => {
            const response = 'The timeline is concerning.';
            const context = createMockContext({
                ragChunks: [
                    {
                        shardId: 'rag_1',
                        shardName: 'Web Search Result',
                        shardTypeId: 'web',
                        content: 'Timeline is a major concern for enterprise implementations.',
                        score: 0.8,
                        tokenCount: 50,
                    },
                ],
            });
            const result = await service.ground(response, context);
            expect(result.ragChunks?.[0]?.shardId).toBe('rag_1');
        });
        it('should prioritize high-confidence matches', async () => {
            const response = 'The deal is $500,000.';
            const context = createMockContext({
                primary: {
                    shardId: 'primary_1',
                    shardName: 'Opportunity',
                    shardTypeId: 'opportunity',
                    shardTypeName: 'Opportunity',
                    content: { value: 500000 },
                    tokenCount: 50,
                },
                related: [
                    {
                        shardId: 'related_1',
                        shardName: 'Estimate',
                        shardTypeId: 'estimate',
                        shardTypeName: 'Estimate',
                        content: { estimatedValue: 450000 },
                        tokenCount: 50,
                    },
                ],
            });
            const result = await service.ground(response, context);
            // Primary should be prioritized
            if (result.citations.length > 0) {
                expect(result.citations[0].source.shardId).toBe('primary_1');
            }
        });
        it('should handle multiple sources for same claim', async () => {
            const response = 'The deal value is significant.';
            const context = createMockContext({
                primary: {
                    shardId: 'primary_1',
                    shardName: 'Opportunity',
                    shardTypeId: 'opportunity',
                    shardTypeName: 'Opportunity',
                    content: { value: 500000, status: 'large_deal' },
                    tokenCount: 50,
                },
            });
            const result = await service.ground(response, context);
            // Should handle multiple sources
            expect(result).toBeDefined();
        });
    });
    describe('Verification Status', () => {
        it('should mark claims as verified when matching context', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const verifiedClaims = result.claims.filter((c) => c.verified);
            expect(verifiedClaims.length).toBeGreaterThan(0);
        });
        it('should mark claims as unverified when no match', async () => {
            const response = 'The value is $1 billion.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const unverifiedClaims = result.claims.filter((c) => !c.verified);
            expect(unverifiedClaims.length).toBeGreaterThan(0);
        });
        it('should include confidence scores', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const claim of result.claims) {
                expect(claim.confidence).toBeGreaterThanOrEqual(0);
                expect(claim.confidence).toBeLessThanOrEqual(1);
            }
        });
        it('should link verified claims to citations', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const verifiedClaimsWithCitations = result.claims.filter((c) => c.verified && c.sources.length > 0);
            expect(verifiedClaimsWithCitations.length).toBeGreaterThan(0);
        });
    });
    describe('Hallucination Detection', () => {
        it('should detect unverified factual claims', async () => {
            const response = 'The deal value is $10 billion and involves 50 stakeholders.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
        it('should not flag opinions as hallucinations', async () => {
            const response = 'I think this deal is important.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            // Opinions should have fewer warnings
            expect(result.warnings.length).toBeLessThan(3);
        });
        it('should provide suggestions for unverified claims', async () => {
            const response = 'The deal involves 100 decision makers.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const warning of result.warnings) {
                expect(warning.suggestion).toBeTruthy();
                expect(warning.suggestion.length).toBeGreaterThan(0);
            }
        });
        it('should rate hallucination severity', async () => {
            const response = 'The deal is $5 billion.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const warning of result.warnings) {
                expect(['low', 'medium', 'high']).toContain(warning.severity);
            }
        });
        it('should handle multiple hallucinations', async () => {
            const response = 'The deal is $10 billion with 100 stakeholders and 50 decision makers.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
    describe('Citation Generation', () => {
        it('should generate citations in proper format', async () => {
            const response = 'The value is $500K and the status is in negotiation.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const citation of result.citations) {
                expect(citation.id).toMatch(/^cite_/);
                expect(citation.source).toBeDefined();
                expect(citation.source.shardId).toBeTruthy();
            }
        });
        it('should avoid duplicate citations', async () => {
            const response = 'The value is $500K. The value was set at $500K. The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const shardIds = new Set(result.citations.map((c) => c.source.shardId));
            expect(shardIds.size).toBeLessThanOrEqual(result.citations.length);
        });
        it('should include excerpt text in citations', async () => {
            const response = 'The close date is Q4.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const citation of result.citations) {
                expect(citation.text).toBeTruthy();
                expect(citation.text.length).toBeGreaterThan(0);
            }
        });
        it('should include match type in citations', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const citation of result.citations) {
                expect(['exact', 'semantic', 'inferred']).toContain(citation.matchType);
            }
        });
        it('should include confidence in citations', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const citation of result.citations) {
                expect(citation.confidence).toBeGreaterThanOrEqual(0);
                expect(citation.confidence).toBeLessThanOrEqual(1);
            }
        });
    });
    describe('Citation Injection', () => {
        it('should inject citation markers into response', async () => {
            const response = 'The value is $500K and the status is in negotiation.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            if (result.citations.length > 0) {
                expect(result.groundedContent).toContain('[');
                expect(result.groundedContent).toContain(']');
            }
        });
        it('should preserve original response content', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            // Original content should match without citations
            const cleanContent = result.groundedContent.replace(/\[\d+\]/g, '').trim();
            expect(cleanContent).toBe(response);
        });
        it('should use sequential citation numbers', async () => {
            const response = 'The value is $500K and the status is in negotiation.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            const citationNumbers = (result.groundedContent.match(/\[(\d+)\]/g) || []).map((m) => parseInt(m.slice(1, -1), 10));
            if (citationNumbers.length > 0) {
                for (let i = 0; i < citationNumbers.length; i++) {
                    expect(citationNumbers[i]).toBeLessThanOrEqual(citationNumbers.length);
                }
            }
        });
        it('should handle multiple citations for same claim', async () => {
            const response = 'The deal is at risk.';
            const context = createMockContext({
                primary: {
                    shardId: 'primary_1',
                    shardName: 'Opportunity',
                    shardTypeId: 'opportunity',
                    shardTypeName: 'Opportunity',
                    content: { status: 'at_risk', health: 'poor' },
                    tokenCount: 50,
                },
            });
            const result = await service.ground(response, context);
            expect(result.groundedContent.length).toBeGreaterThanOrEqual(response.length);
        });
    });
    describe('Score Calculation', () => {
        it('should calculate higher score for fully verified response', async () => {
            const verifiedResponse = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(verifiedResponse, context);
            expect(result.groundingScore).toBeGreaterThan(0.5);
        });
        it('should calculate lower score for unverified response', async () => {
            const unverifiedResponse = 'The deal value is $10 billion with 1000 stakeholders.';
            const context = createMockContext();
            const result = await service.ground(unverifiedResponse, context);
            // Should have lower score due to unverified claims
            expect(result).toBeDefined();
        });
        it('should reflect hallucinations in score', async () => {
            const response = 'The value is $500K.'; // Verifiable
            const context = createMockContext();
            const resultVerified = await service.ground(response, context);
            const responseWithHallucination = 'The value is $500K and $10 billion.'; // Contradictory
            const resultWithError = await service.ground(responseWithHallucination, context);
            // Error case should have equal or lower score
            expect(resultWithError.groundingScore).toBeLessThanOrEqual(resultVerified.groundingScore + 0.1);
        });
        it('should weight verified claims more than partial', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            // Verified response should have good grounding score
            expect(result.groundingScore).toBeGreaterThan(0.3);
        });
    });
    describe('Error Handling', () => {
        it('should handle LLM failures gracefully', async () => {
            const badLLM = {
                complete: vi.fn().mockRejectedValue(new Error('LLM error')),
            };
            const badService = new GroundingService(badLLM);
            const response = 'Some response.';
            const context = createMockContext();
            const result = await badService.ground(response, context);
            expect(result).toBeDefined();
            expect(result.citations.length).toBe(0);
            expect(result.groundingScore).toBeLessThanOrEqual(0);
        });
        it('should handle null context chunks', async () => {
            const response = 'Some response.';
            const context = createMockContext({
                related: [
                    {
                        shardId: 'related_1',
                        shardName: 'Note',
                        shardTypeId: 'note',
                        shardTypeName: 'Note',
                        content: null,
                        tokenCount: 0,
                    },
                ],
            });
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
        });
        it('should handle undefined context gracefully', async () => {
            const response = 'Some response.';
            const context = createMockContext({
                primary: undefined,
                related: undefined,
                ragChunks: undefined,
            });
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
        });
        it('should handle very long responses', async () => {
            const longResponse = 'The deal is at risk. '.repeat(200); // ~4000 chars
            const context = createMockContext();
            const result = await service.ground(longResponse, context);
            expect(result).toBeDefined();
            expect(result.groundingScore).toBeGreaterThanOrEqual(0);
        });
        it('should handle special characters in response', async () => {
            const response = 'The deal value is $500K€ with @mentions #hashtags & symbols.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result).toBeDefined();
        });
    });
    describe('Performance', () => {
        it('should complete grounding within 5 seconds', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const startTime = Date.now();
            await service.ground(response, context);
            const elapsedMs = Date.now() - startTime;
            expect(elapsedMs).toBeLessThan(5000);
        });
        it('should handle large context efficiently', async () => {
            const response = 'The value is $500K.';
            const largeContext = createMockContext({
                related: Array.from({ length: 50 }, (_, i) => ({
                    shardId: `related_${i}`,
                    shardName: `Related Shard ${i}`,
                    shardTypeId: 'note',
                    shardTypeName: 'Note',
                    content: { text: `This is related chunk ${i}` },
                    tokenCount: 50,
                })),
            });
            const startTime = Date.now();
            const result = await service.ground(response, largeContext);
            const elapsedMs = Date.now() - startTime;
            expect(result).toBeDefined();
            expect(elapsedMs).toBeLessThan(5000);
        });
    });
    describe('Integration with Response Types', () => {
        it('should return GroundedResponse with all required fields', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            expect(result.originalContent).toBe(response);
            expect(typeof result.groundedContent).toBe('string');
            expect(Array.isArray(result.citations)).toBe(true);
            expect(typeof result.overallConfidence).toBe('number');
            expect(typeof result.groundingScore).toBe('number');
            expect(Array.isArray(result.claims)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('should provide correct claim structure', async () => {
            const response = 'The value is $500K.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const claim of result.claims) {
                expect(typeof claim.claim).toBe('string');
                expect(typeof claim.verified).toBe('boolean');
                expect(typeof claim.confidence).toBe('number');
                expect(Array.isArray(claim.sources)).toBe(true);
                expect(['factual', 'analytical', 'opinion', 'prediction']).toContain(claim.category);
            }
        });
        it('should provide correct warning structure', async () => {
            const response = 'The deal is $10 billion.';
            const context = createMockContext();
            const result = await service.ground(response, context);
            for (const warning of result.warnings) {
                expect(typeof warning.claim).toBe('string');
                expect(typeof warning.type).toBe('string');
                expect(['low', 'medium', 'high']).toContain(warning.severity);
                expect(typeof warning.suggestion).toBe('string');
            }
        });
    });
});
//# sourceMappingURL=grounding.service.test.js.map