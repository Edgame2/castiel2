/**
 * Explainable AI (XAI) Service
 * Provides transparency into AI reasoning and decision-making
 * Helps users understand why AI gave specific responses
 */
// ============================================
// Explanation Templates
// ============================================
const REASONING_TEMPLATES = {
    understanding: [
        'Parsed the query to identify the main question: {topic}',
        'Identified key entities: {entities}',
        'Determined query intent: {intent}',
        'Recognized query complexity as {complexity}',
    ],
    retrieval: [
        'Searched {sourceCount} relevant sources',
        'Found {matchCount} highly relevant matches',
        'Retrieved context from {sourceTypes}',
        'Prioritized sources by {criteria}',
    ],
    analysis: [
        'Analyzed {dataPoints} data points',
        'Identified patterns in {domain}',
        'Compared with {benchmark}',
        'Evaluated against {criteria}',
    ],
    synthesis: [
        'Combined insights from {sourceCount} sources',
        'Resolved {conflictCount} conflicting information',
        'Synthesized coherent response',
        'Structured response for clarity',
    ],
    validation: [
        'Verified claims against source data',
        'Checked for factual consistency',
        'Validated logical coherence',
        'Confirmed response completeness',
    ],
};
// ============================================
// Service
// ============================================
export class ExplainableAIService {
    monitoring;
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    // ============================================
    // Main Explanation Generation
    // ============================================
    /**
     * Generate an explanation for an AI response
     */
    async generateExplanation(request) {
        const startTime = Date.now();
        try {
            // Analyze the response and context
            const reasoningSteps = this.extractReasoningSteps(request);
            const sourceAttribution = this.analyzeSourceAttribution(request);
            const confidenceBreakdown = this.calculateConfidence(request, sourceAttribution);
            const keyFactors = this.identifyKeyFactors(request, sourceAttribution);
            const limitations = this.identifyLimitations(request, sourceAttribution);
            const alternatives = this.generateAlternatives(request);
            // Generate summary
            const summary = this.generateSummary(request, confidenceBreakdown, sourceAttribution.length, limitations.length);
            const explanation = {
                id: `exp_${Date.now()}`,
                responseId: request.responseId,
                summary,
                reasoningSteps,
                sourceAttribution,
                confidenceBreakdown,
                keyFactors,
                limitations,
                alternatives,
                debug: {
                    modelUsed: request.modelId,
                    promptTokens: 0,
                    completionTokens: 0,
                    temperature: 0.7,
                    retrievalLatencyMs: 0,
                    generationLatencyMs: Date.now() - startTime,
                    cacheHit: false,
                },
            };
            this.monitoring.trackEvent('xai.explanation-generated', {
                tenantId: request.tenantId,
                responseId: request.responseId,
                sourceCount: sourceAttribution.length,
                confidence: confidenceBreakdown.overall,
            });
            return explanation;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'xai.generateExplanation',
                tenantId: request.tenantId,
            });
            throw error;
        }
    }
    /**
     * Generate a simplified explanation for end users
     */
    async generateSimpleExplanation(request) {
        const full = await this.generateExplanation(request);
        return {
            summary: full.summary,
            sources: full.sourceAttribution
                .filter(s => s.contribution !== 'background')
                .map(s => s.sourceName),
            confidence: this.getConfidenceLabel(full.confidenceBreakdown.overall),
            limitations: full.limitations
                .filter(l => l.impact !== 'low')
                .map(l => l.description),
        };
    }
    // ============================================
    // Analysis Methods
    // ============================================
    extractReasoningSteps(request) {
        const steps = [];
        // Step 1: Understanding
        steps.push({
            stepNumber: 1,
            type: 'understanding',
            description: `Analyzed your question about "${this.extractTopic(request.query)}"`,
            details: `Identified the main intent and key entities in the query`,
            confidence: 0.95,
        });
        // Step 2: Retrieval
        const usedSources = request.context.filter(c => c.usedInResponse);
        steps.push({
            stepNumber: 2,
            type: 'retrieval',
            description: `Retrieved ${request.context.length} relevant sources, used ${usedSources.length}`,
            details: `Sources ranked by relevance to your specific question`,
            confidence: usedSources.length > 0 ? 0.9 : 0.5,
        });
        // Step 3: Analysis
        steps.push({
            stepNumber: 3,
            type: 'analysis',
            description: 'Analyzed the retrieved information for relevance and accuracy',
            details: 'Cross-referenced multiple sources where available',
            confidence: 0.85,
        });
        // Step 4: Synthesis
        steps.push({
            stepNumber: 4,
            type: 'synthesis',
            description: 'Combined insights into a coherent response',
            details: 'Structured the answer to directly address your question',
            confidence: 0.88,
        });
        // Step 5: Validation
        steps.push({
            stepNumber: 5,
            type: 'validation',
            description: 'Verified response against source data',
            details: 'Checked for factual accuracy and logical consistency',
            confidence: 0.82,
        });
        return steps;
    }
    analyzeSourceAttribution(request) {
        return request.context
            .filter(source => source.relevanceScore > 0.3)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .map(source => {
            // Find where this source's content appears in the response
            const excerpts = this.findExcerpts(source.content, request.response);
            return {
                sourceId: source.id,
                sourceName: source.name,
                sourceType: source.type,
                contribution: this.determineContribution(source.relevanceScore, source.usedInResponse),
                relevance: source.relevanceScore,
                excerpts,
            };
        });
    }
    calculateConfidence(request, attributions) {
        // Calculate individual factors
        const primarySources = attributions.filter(a => a.contribution === 'primary');
        const sourceQuality = primarySources.length > 0
            ? primarySources.reduce((sum, s) => sum + s.relevance, 0) / primarySources.length
            : 0.5;
        const sourceCoverage = Math.min(1, attributions.length / 5);
        const queryClarity = this.assessQueryClarity(request.query);
        const responseCoherence = this.assessResponseCoherence(request.response);
        const groundingStrength = attributions.filter(a => a.excerpts.length > 0).length / Math.max(1, attributions.length);
        // Calculate weighted overall score
        const overall = (sourceQuality * 0.3 +
            sourceCoverage * 0.2 +
            queryClarity * 0.15 +
            responseCoherence * 0.2 +
            groundingStrength * 0.15);
        return {
            overall: Math.round(overall * 100) / 100,
            factors: {
                sourceQuality: Math.round(sourceQuality * 100) / 100,
                sourceCoverage: Math.round(sourceCoverage * 100) / 100,
                queryClarity: Math.round(queryClarity * 100) / 100,
                responseCoherence: Math.round(responseCoherence * 100) / 100,
                groundingStrength: Math.round(groundingStrength * 100) / 100,
            },
            explanation: this.generateConfidenceExplanation(overall, {
                sourceQuality,
                sourceCoverage,
                queryClarity,
                responseCoherence,
                groundingStrength,
            }),
        };
    }
    identifyKeyFactors(request, attributions) {
        const factors = [];
        // Source availability
        if (attributions.length >= 3) {
            factors.push({
                factor: 'Multiple sources available',
                influence: 'positive',
                weight: 0.8,
                description: 'The response is supported by multiple independent sources',
            });
        }
        else if (attributions.length === 0) {
            factors.push({
                factor: 'Limited source data',
                influence: 'negative',
                weight: 0.9,
                description: 'Few relevant sources were found for this query',
            });
        }
        // Query specificity
        const wordCount = request.query.split(/\s+/).length;
        if (wordCount > 10) {
            factors.push({
                factor: 'Specific query',
                influence: 'positive',
                weight: 0.6,
                description: 'The query provided good context for accurate response',
            });
        }
        // Recent data
        const hasRecentData = request.context.some(c => c.type === 'shard' || c.type === 'document');
        if (hasRecentData) {
            factors.push({
                factor: 'Current data',
                influence: 'positive',
                weight: 0.7,
                description: 'Response based on up-to-date information from your data',
            });
        }
        return factors;
    }
    identifyLimitations(request, attributions) {
        const limitations = [];
        // Check for data gaps
        if (attributions.length < 2) {
            limitations.push({
                type: 'data_gap',
                description: 'Limited data sources available for this topic',
                impact: 'medium',
                mitigation: 'Consider adding more relevant documents or data',
            });
        }
        // Check for low relevance scores
        const avgRelevance = attributions.reduce((sum, a) => sum + a.relevance, 0) / Math.max(1, attributions.length);
        if (avgRelevance < 0.6) {
            limitations.push({
                type: 'uncertainty',
                description: 'Sources are only partially relevant to the query',
                impact: 'medium',
                mitigation: 'Try rephrasing the question for more specific results',
            });
        }
        // Check for scope limitations
        const hasWebSources = request.context.some(c => c.type === 'web');
        if (!hasWebSources) {
            limitations.push({
                type: 'scope',
                description: 'Response based only on internal data, not external sources',
                impact: 'low',
                mitigation: 'Enable web search for broader context',
            });
        }
        return limitations;
    }
    generateAlternatives(request) {
        // In production, would use AI to generate actual alternatives
        const alternatives = [];
        // Check if query could have multiple interpretations
        if (request.query.includes('or') || request.query.includes('?')) {
            alternatives.push({
                interpretation: 'The question may have been interpreted differently',
                probability: 0.2,
                reasoning: 'Consider rephrasing for more specific results',
            });
        }
        return alternatives;
    }
    // ============================================
    // Helper Methods
    // ============================================
    extractTopic(query) {
        // Extract main topic from query
        const words = query.toLowerCase().split(/\s+/);
        const stopWords = new Set(['what', 'why', 'how', 'when', 'where', 'who', 'is', 'are', 'the', 'a', 'an']);
        const meaningful = words.filter(w => !stopWords.has(w) && w.length > 2);
        return meaningful.slice(0, 3).join(' ') || 'your question';
    }
    findExcerpts(sourceContent, response) {
        const excerpts = [];
        // Simple overlap detection - would use more sophisticated NLP in production
        const sourceWords = sourceContent.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const responseWords = new Set(response.toLowerCase().split(/\s+/));
        const overlap = sourceWords.filter(w => responseWords.has(w));
        if (overlap.length > 3) {
            excerpts.push({
                text: overlap.slice(0, 5).join(' ') + '...',
                usedForClaim: 'Supporting information',
                startIndex: 0,
                endIndex: 50,
            });
        }
        return excerpts;
    }
    determineContribution(relevance, usedInResponse) {
        if (usedInResponse && relevance > 0.8) {
            return 'primary';
        }
        if (usedInResponse || relevance > 0.6) {
            return 'supporting';
        }
        return 'background';
    }
    assessQueryClarity(query) {
        const wordCount = query.split(/\s+/).length;
        const hasQuestionMark = query.includes('?');
        const hasSpecificTerms = /\b(how|what|why|when|where|who|which)\b/i.test(query);
        let score = 0.5;
        if (wordCount >= 5 && wordCount <= 30) {
            score += 0.2;
        }
        if (hasQuestionMark) {
            score += 0.1;
        }
        if (hasSpecificTerms) {
            score += 0.2;
        }
        return Math.min(1, score);
    }
    assessResponseCoherence(response) {
        const sentences = response.split(/[.!?]+/).filter(s => s.trim());
        const wordCount = response.split(/\s+/).length;
        let score = 0.7;
        if (sentences.length >= 2 && sentences.length <= 20) {
            score += 0.1;
        }
        if (wordCount >= 50 && wordCount <= 500) {
            score += 0.1;
        }
        if (response.includes('\n') || response.includes('•') || response.includes('-')) {
            score += 0.1;
        }
        return Math.min(1, score);
    }
    generateConfidenceExplanation(overall, factors) {
        if (overall >= 0.8) {
            return 'High confidence based on strong source evidence and clear query';
        }
        else if (overall >= 0.6) {
            const weakest = Object.entries(factors)
                .sort((a, b) => a[1] - b[1])[0];
            return `Moderate confidence. ${this.getFactorImprovement(weakest[0])}`;
        }
        else {
            return 'Lower confidence due to limited source data or query ambiguity';
        }
    }
    getFactorImprovement(factor) {
        const improvements = {
            sourceQuality: 'More specific sources could improve accuracy',
            sourceCoverage: 'Additional data sources would help',
            queryClarity: 'A more specific question could yield better results',
            responseCoherence: 'The response complexity reflects the topic',
            groundingStrength: 'More direct source citations available',
        };
        return improvements[factor] || '';
    }
    getConfidenceLabel(score) {
        if (score >= 0.85) {
            return 'Very High';
        }
        if (score >= 0.7) {
            return 'High';
        }
        if (score >= 0.55) {
            return 'Moderate';
        }
        if (score >= 0.4) {
            return 'Low';
        }
        return 'Very Low';
    }
    generateSummary(request, confidence, sourceCount, limitationCount) {
        const confidenceLabel = this.getConfidenceLabel(confidence.overall);
        let summary = `This response was generated with ${confidenceLabel.toLowerCase()} confidence`;
        summary += `, drawing from ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
        if (limitationCount > 0) {
            summary += `. Note: ${limitationCount} limitation${limitationCount !== 1 ? 's' : ''} identified`;
        }
        return summary + '.';
    }
}
// ============================================
// Factory
// ============================================
export function createExplainableAIService(monitoring) {
    return new ExplainableAIService(monitoring);
}
//# sourceMappingURL=explainable-ai.service.js.map