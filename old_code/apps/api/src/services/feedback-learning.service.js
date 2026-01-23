/**
 * Feedback Learning Service
 * Continuous improvement from user feedback on AI responses
 * Analyzes patterns in feedback to improve prompts, model selection, and context retrieval
 */
// ============================================
// Service
// ============================================
export class FeedbackLearningService {
    redis;
    monitoring;
    FEEDBACK_KEY = 'ai:feedback:';
    ANALYSIS_KEY = 'ai:feedback:analysis:';
    PATTERNS_KEY = 'ai:feedback:patterns:';
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // Feedback Collection
    // ============================================
    /**
     * Record user feedback
     */
    async recordFeedback(feedback) {
        const entry = {
            ...feedback,
            id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
        };
        // Store in tenant-specific list
        const key = `${this.FEEDBACK_KEY}${feedback.tenantId}`;
        await this.redis.lpush(key, JSON.stringify(entry));
        await this.redis.ltrim(key, 0, 9999); // Keep last 10k entries
        // Update real-time counters
        await this.updateCounters(entry);
        // Check for patterns (async, non-blocking)
        this.detectPatterns(entry).catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'feedback-learning.detect-patterns',
                entryId: entry.id,
            });
        });
        this.monitoring.trackEvent('feedback.recorded', {
            tenantId: feedback.tenantId,
            rating: feedback.rating,
            categories: feedback.categories,
            modelId: feedback.modelId,
        });
        return entry;
    }
    /**
     * Get feedback entries
     */
    async getFeedback(tenantId, options) {
        const key = `${this.FEEDBACK_KEY}${tenantId}`;
        const all = await this.redis.lrange(key, 0, options?.limit || 1000);
        let entries = all.map(item => JSON.parse(item));
        // Apply filters
        if (options?.rating) {
            entries = entries.filter(e => e.rating === options.rating);
        }
        if (options?.modelId) {
            entries = entries.filter(e => e.modelId === options.modelId);
        }
        if (options?.insightType) {
            entries = entries.filter(e => e.insightType === options.insightType);
        }
        if (options?.startDate) {
            entries = entries.filter(e => new Date(e.createdAt) >= options.startDate);
        }
        if (options?.endDate) {
            entries = entries.filter(e => new Date(e.createdAt) <= options.endDate);
        }
        return entries;
    }
    // ============================================
    // Analysis
    // ============================================
    /**
     * Analyze feedback patterns
     */
    async analyzeFeedback(tenantId, period) {
        const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
        const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
        const entries = await this.getFeedback(tenantId, {
            limit: 10000,
            startDate,
        });
        if (entries.length === 0) {
            return this.emptyAnalysis(period);
        }
        // Basic metrics
        const positive = entries.filter(e => e.rating === 'positive').length;
        const negative = entries.filter(e => e.rating === 'negative').length;
        const withScore = entries.filter(e => e.score !== undefined);
        const avgScore = withScore.length > 0
            ? withScore.reduce((sum, e) => sum + (e.score || 0), 0) / withScore.length
            : 0;
        // Category analysis
        const positiveCats = {};
        const negativeCats = {};
        for (const entry of entries) {
            for (const cat of entry.categories || []) {
                if (entry.rating === 'positive') {
                    positiveCats[cat] = (positiveCats[cat] || 0) + 1;
                }
                else if (entry.rating === 'negative') {
                    negativeCats[cat] = (negativeCats[cat] || 0) + 1;
                }
            }
        }
        // Model analysis
        const byModel = {};
        const modelGroups = this.groupBy(entries, 'modelId');
        for (const [modelId, modelEntries] of Object.entries(modelGroups)) {
            const modelPositive = modelEntries.filter(e => e.rating === 'positive').length;
            const modelNegative = modelEntries.filter(e => e.rating === 'negative').length;
            const modelWithScore = modelEntries.filter(e => e.score !== undefined);
            const modelRegens = modelEntries.filter(e => e.wasRegenerated).length;
            byModel[modelId] = {
                modelId,
                totalResponses: modelEntries.length,
                positiveRate: modelPositive / modelEntries.length,
                negativeRate: modelNegative / modelEntries.length,
                avgScore: modelWithScore.length > 0
                    ? modelWithScore.reduce((sum, e) => sum + (e.score || 0), 0) / modelWithScore.length
                    : 0,
                regenerationRate: modelRegens / modelEntries.length,
            };
        }
        // Insight type analysis
        const byInsightType = {};
        const typeGroups = this.groupBy(entries.filter(e => e.insightType), 'insightType');
        for (const [type, typeEntries] of Object.entries(typeGroups)) {
            const typePositive = typeEntries.filter(e => e.rating === 'positive').length;
            const typeNegative = typeEntries.filter(e => e.rating === 'negative').length;
            const typeNegCats = typeEntries
                .filter(e => e.rating === 'negative')
                .flatMap(e => e.categories || []);
            byInsightType[type] = {
                insightType: type,
                totalResponses: typeEntries.length,
                positiveRate: typePositive / typeEntries.length,
                negativeRate: typeNegative / typeEntries.length,
                avgScore: 0,
                topIssues: [...new Set(typeNegCats)].slice(0, 5),
            };
        }
        // Generate recommendations
        const recommendations = this.generateRecommendations(entries, byModel, byInsightType);
        // Detect patterns
        const problematicPatterns = await this.detectProblematicPatterns(entries);
        const successPatterns = await this.detectSuccessPatterns(entries);
        return {
            period,
            totalFeedback: entries.length,
            positiveRate: positive / entries.length,
            negativeRate: negative / entries.length,
            averageScore: avgScore,
            topPositiveCategories: Object.entries(positiveCats)
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
            topNegativeCategories: Object.entries(negativeCats)
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
            byModel,
            byInsightType,
            byTimeOfDay: {},
            problematicPatterns,
            successPatterns,
            recommendations,
        };
    }
    /**
     * Get model-specific feedback insights
     */
    async getModelInsights(tenantId, modelId) {
        const entries = await this.getFeedback(tenantId, { modelId, limit: 500 });
        if (entries.length === 0) {
            return {
                feedback: {
                    modelId,
                    totalResponses: 0,
                    positiveRate: 0,
                    negativeRate: 0,
                    avgScore: 0,
                    regenerationRate: 0,
                },
                recentIssues: [],
                suggestions: [],
            };
        }
        const positive = entries.filter(e => e.rating === 'positive').length;
        const negative = entries.filter(e => e.rating === 'negative').length;
        const regens = entries.filter(e => e.wasRegenerated).length;
        const withScore = entries.filter(e => e.score !== undefined);
        const negativeCategories = entries
            .filter(e => e.rating === 'negative')
            .flatMap(e => e.categories || []);
        const suggestions = [];
        if (negativeCategories.includes('too_long')) {
            suggestions.push('Consider reducing max_tokens or adding conciseness instructions');
        }
        if (negativeCategories.includes('hallucination')) {
            suggestions.push('Increase grounding requirements and citation enforcement');
        }
        if (negativeCategories.includes('incomplete')) {
            suggestions.push('Improve context retrieval to provide more relevant information');
        }
        return {
            feedback: {
                modelId,
                totalResponses: entries.length,
                positiveRate: positive / entries.length,
                negativeRate: negative / entries.length,
                avgScore: withScore.length > 0
                    ? withScore.reduce((sum, e) => sum + (e.score || 0), 0) / withScore.length
                    : 0,
                regenerationRate: regens / entries.length,
            },
            recentIssues: [...new Set(negativeCategories)].slice(0, 10),
            suggestions,
        };
    }
    // ============================================
    // Learning & Improvement
    // ============================================
    /**
     * Generate prompt improvements based on feedback
     */
    async suggestPromptImprovements(tenantId, templateId) {
        const entries = await this.getFeedback(tenantId, {
            limit: 1000,
        });
        const templateEntries = entries.filter(e => e.contextTemplateId === templateId);
        if (templateEntries.length < 10) {
            return []; // Not enough data
        }
        const negativeEntries = templateEntries.filter(e => e.rating === 'negative');
        const improvements = [];
        // Analyze negative feedback patterns
        const issueCategories = negativeEntries.flatMap(e => e.categories || []);
        const issueCounts = {};
        for (const cat of issueCategories) {
            issueCounts[cat] = (issueCounts[cat] || 0) + 1;
        }
        // Generate improvements based on top issues
        const sortedIssues = Object.entries(issueCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        for (const [issue, count] of sortedIssues) {
            const improvement = this.getPromptImprovement(issue, count, negativeEntries.length);
            if (improvement) {
                improvements.push({
                    templateId,
                    originalPrompt: '',
                    improvedPrompt: improvement.suggestion,
                    reason: improvement.reason,
                    expectedImprovement: improvement.expectedImprovement,
                    basedOnFeedback: negativeEntries.slice(0, 5).map(e => e.id),
                });
            }
        }
        return improvements;
    }
    // ============================================
    // Private Methods
    // ============================================
    async updateCounters(entry) {
        const dateKey = new Date().toISOString().split('T')[0];
        const countersKey = `${this.FEEDBACK_KEY}counters:${entry.tenantId}:${dateKey}`;
        await this.redis.hincrby(countersKey, 'total', 1);
        await this.redis.hincrby(countersKey, entry.rating, 1);
        if (entry.modelId) {
            await this.redis.hincrby(countersKey, `model:${entry.modelId}`, 1);
        }
        await this.redis.expire(countersKey, 90 * 24 * 60 * 60); // 90 days
    }
    async detectPatterns(entry) {
        // Pattern detection for automatic learning
        // This would use NLP/ML in production
    }
    async detectProblematicPatterns(entries) {
        const patterns = [];
        const negativeEntries = entries.filter(e => e.rating === 'negative');
        if (negativeEntries.length < 5) {
            return patterns;
        }
        // Check for common issues
        const hallucinations = negativeEntries.filter(e => e.categories?.includes('hallucination'));
        if (hallucinations.length > negativeEntries.length * 0.2) {
            patterns.push({
                pattern: 'Frequent hallucinations',
                occurrences: hallucinations.length,
                negativeFeedbackRate: hallucinations.length / negativeEntries.length,
                examples: hallucinations.slice(0, 3).map(e => e.response.substring(0, 100)),
                suggestedFix: 'Increase grounding requirements and add source verification',
            });
        }
        const tooLong = negativeEntries.filter(e => e.categories?.includes('too_long'));
        if (tooLong.length > negativeEntries.length * 0.15) {
            patterns.push({
                pattern: 'Responses too verbose',
                occurrences: tooLong.length,
                negativeFeedbackRate: tooLong.length / negativeEntries.length,
                examples: [],
                suggestedFix: 'Add conciseness instructions to prompts',
            });
        }
        return patterns;
    }
    async detectSuccessPatterns(entries) {
        const patterns = [];
        const positiveEntries = entries.filter(e => e.rating === 'positive');
        if (positiveEntries.length < 5) {
            return patterns;
        }
        // Analyze what makes responses successful
        const helpfulEntries = positiveEntries.filter(e => e.categories?.includes('helpful'));
        if (helpfulEntries.length > positiveEntries.length * 0.5) {
            patterns.push({
                pattern: 'Actionable responses',
                occurrences: helpfulEntries.length,
                positiveFeedbackRate: helpfulEntries.length / positiveEntries.length,
                characteristics: ['Specific recommendations', 'Clear next steps'],
            });
        }
        return patterns;
    }
    generateRecommendations(entries, byModel, byInsightType) {
        const recommendations = [];
        // Model recommendations
        for (const [modelId, feedback] of Object.entries(byModel)) {
            if (feedback.negativeRate > 0.3) {
                recommendations.push({
                    id: `rec_${modelId}`,
                    type: 'model',
                    priority: 'high',
                    title: `High negative feedback for ${modelId}`,
                    description: `This model has a ${(feedback.negativeRate * 100).toFixed(0)}% negative feedback rate`,
                    expectedImpact: 'Reduce negative feedback by 20-40%',
                    evidence: [`${feedback.totalResponses} responses analyzed`],
                });
            }
            if (feedback.regenerationRate > 0.25) {
                recommendations.push({
                    id: `rec_regen_${modelId}`,
                    type: 'model',
                    priority: 'medium',
                    title: `High regeneration rate for ${modelId}`,
                    description: `${(feedback.regenerationRate * 100).toFixed(0)}% of responses are regenerated`,
                    expectedImpact: 'Improve first-response quality',
                    evidence: [`${feedback.totalResponses} responses analyzed`],
                });
            }
        }
        // Insight type recommendations
        for (const [type, feedback] of Object.entries(byInsightType)) {
            if (feedback.negativeRate > 0.25) {
                recommendations.push({
                    id: `rec_type_${type}`,
                    type: 'prompt',
                    priority: feedback.negativeRate > 0.4 ? 'high' : 'medium',
                    title: `Improve ${type} insight prompts`,
                    description: `${type} insights have ${(feedback.negativeRate * 100).toFixed(0)}% negative feedback`,
                    expectedImpact: 'Improve satisfaction for this insight type',
                    evidence: feedback.topIssues,
                });
            }
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    getPromptImprovement(issue, count, totalNegative) {
        const improvements = {
            too_long: {
                suggestion: 'Add instruction: "Be concise. Limit response to 2-3 paragraphs unless more detail is specifically requested."',
                reason: 'Users find responses too verbose',
                expectedImprovement: 0.2,
            },
            hallucination: {
                suggestion: 'Add instruction: "Only provide information that can be directly verified from the provided context. If information is not available, say so."',
                reason: 'Responses contain unverified claims',
                expectedImprovement: 0.3,
            },
            incomplete: {
                suggestion: 'Add instruction: "Ensure all aspects of the question are addressed. If the question has multiple parts, address each one."',
                reason: 'Responses missing key information',
                expectedImprovement: 0.15,
            },
            off_topic: {
                suggestion: 'Add instruction: "Stay focused on the specific question asked. Do not include tangential information."',
                reason: 'Responses diverge from the question',
                expectedImprovement: 0.2,
            },
            confusing: {
                suggestion: 'Add instruction: "Structure your response clearly with headers or bullet points when appropriate. Use simple language."',
                reason: 'Users find responses hard to understand',
                expectedImprovement: 0.15,
            },
        };
        return improvements[issue] || null;
    }
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const value = String(item[key] || 'unknown');
            groups[value] = groups[value] || [];
            groups[value].push(item);
            return groups;
        }, {});
    }
    emptyAnalysis(period) {
        return {
            period,
            totalFeedback: 0,
            positiveRate: 0,
            negativeRate: 0,
            averageScore: 0,
            topPositiveCategories: [],
            topNegativeCategories: [],
            byModel: {},
            byInsightType: {},
            byTimeOfDay: {},
            problematicPatterns: [],
            successPatterns: [],
            recommendations: [],
        };
    }
}
// ============================================
// Factory
// ============================================
export function createFeedbackLearningService(redis, monitoring) {
    return new FeedbackLearningService(redis, monitoring);
}
//# sourceMappingURL=feedback-learning.service.js.map