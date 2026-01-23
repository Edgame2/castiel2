// @ts-nocheck - Optional service, not used by workers
/**
 * Smart Model Router Service
 * Routes AI requests to the most appropriate model based on:
 * - Query complexity
 * - Cost optimization
 * - Performance requirements
 * - Model capabilities
 */
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { DEFAULT_MODEL_SELECTION_CONFIG } from '../types/ai-provider.types.js';
const DEFAULT_CONFIG = {
    enableSmartRouting: true,
    defaultTier: 'standard',
    costOptimizationWeight: 0.3,
    qualityWeight: 0.5,
    latencyWeight: 0.2,
    economyThreshold: 30,
    premiumThreshold: 70,
};
// ============================================
// Complexity Analysis Patterns
// ============================================
const TECHNICAL_TERMS = new Set([
    'algorithm', 'optimization', 'architecture', 'integration', 'deployment',
    'machine learning', 'neural network', 'regression', 'classification',
    'pipeline', 'microservices', 'kubernetes', 'docker', 'api', 'database',
    'encryption', 'authentication', 'authorization', 'oauth', 'jwt',
    'financial', 'revenue', 'margin', 'roi', 'kpi', 'metrics', 'analytics',
    'forecasting', 'prediction', 'trend', 'correlation', 'variance',
]);
const COMPLEX_QUESTION_PATTERNS = [
    /why.*and.*how/i,
    /compare.*with.*and/i,
    /analyze.*considering/i,
    /evaluate.*based on/i,
    /what are the implications/i,
    /how would.*affect/i,
    /trade-?offs? between/i,
    /pros and cons/i,
    /comprehensive analysis/i,
    /in-depth review/i,
];
const SIMPLE_QUESTION_PATTERNS = [
    /what is/i,
    /who is/i,
    /when did/i,
    /where is/i,
    /how many/i,
    /list.*top/i,
    /give me.*summary/i,
    /brief overview/i,
];
// ============================================
// Service
// ============================================
export class ModelRouterService {
    shardRepository;
    shardTypeRepository;
    redis;
    monitoring;
    aiConfigService;
    config;
    modelCache = new Map();
    performanceCache = new Map();
    CACHE_TTL = 60 * 1000; // 1 minute
    lastCacheRefresh = 0;
    configCache = {
        thresholds: null,
        lastFetch: 0,
    };
    CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    constructor(shardRepository, shardTypeRepository, redis, monitoring, aiConfigService, config) {
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.redis = redis;
        this.monitoring = monitoring;
        this.aiConfigService = aiConfigService;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Get complexity thresholds from configuration
     */
    async getComplexityThresholds() {
        // Check cache
        const now = Date.now();
        if (this.configCache.thresholds && (now - this.configCache.lastFetch) < this.CONFIG_CACHE_TTL) {
            return this.configCache.thresholds;
        }
        // Load from config service
        if (this.aiConfigService) {
            try {
                const systemConfig = await this.aiConfigService.getSystemConfig();
                const modelSelection = systemConfig.modelSelection || DEFAULT_MODEL_SELECTION_CONFIG;
                const thresholds = {
                    economyMax: modelSelection.complexityThresholds.economyMax,
                    premiumMin: modelSelection.complexityThresholds.premiumMin,
                };
                this.configCache = { thresholds, lastFetch: now };
                // Update local config
                this.config.economyThreshold = thresholds.economyMax;
                this.config.premiumThreshold = thresholds.premiumMin;
                return thresholds;
            }
            catch (error) {
                this.monitoring.trackException(error, {
                    operation: 'model-router.getComplexityThresholds',
                });
            }
        }
        // Fallback to default
        const defaultThresholds = {
            economyMax: DEFAULT_MODEL_SELECTION_CONFIG.complexityThresholds.economyMax,
            premiumMin: DEFAULT_MODEL_SELECTION_CONFIG.complexityThresholds.premiumMin,
        };
        this.configCache = { thresholds: defaultThresholds, lastFetch: now };
        return defaultThresholds;
    }
    // ============================================
    // Core Routing
    // ============================================
    /**
     * Route a request to the best model
     */
    async route(request) {
        const startTime = Date.now();
        try {
            // Check for forced model
            if (request.forcedModelId) {
                const model = await this.getModelById(request.forcedModelId, request.tenantId);
                if (model) {
                    return {
                        model,
                        reason: 'Model explicitly specified',
                        alternativeModels: [],
                        estimatedCost: this.estimateCost(model, request.contextSize || 1000, 500),
                        estimatedLatencyMs: this.estimateLatency(model),
                        complexityScore: 50,
                    };
                }
            }
            // Analyze query complexity
            const complexity = await this.analyzeComplexity(request.query);
            // Get available models
            const models = await this.getAvailableModels(request.tenantId);
            if (models.length === 0) {
                throw new Error('No AI models available');
            }
            // Filter by capabilities
            const candidates = this.filterByCapabilities(models, request);
            // Score and rank models
            const scoredModels = this.scoreModels(candidates, complexity, request);
            // Select best model
            const bestModel = scoredModels[0];
            const alternativeModels = scoredModels.slice(1, 4).map((s) => s.model);
            const result = {
                model: bestModel.model,
                reason: bestModel.reason,
                alternativeModels,
                estimatedCost: this.estimateCost(bestModel.model, request.contextSize || 1000, 500),
                estimatedLatencyMs: this.estimateLatency(bestModel.model),
                complexityScore: complexity.score,
            };
            this.monitoring.trackEvent('model-router.routed', {
                tenantId: request.tenantId,
                selectedModel: result.model.modelId,
                complexityScore: complexity.score,
                reason: result.reason,
                latencyMs: Date.now() - startTime,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'model-router.route',
                tenantId: request.tenantId,
            });
            throw error;
        }
    }
    /**
     * Analyze query complexity
     */
    async analyzeComplexity(query) {
        const normalizedQuery = query.toLowerCase();
        const words = normalizedQuery.split(/\s+/);
        // Length factor (0-25 points)
        const lengthScore = Math.min(words.length / 4, 25);
        // Technical terms (0-25 points)
        let technicalCount = 0;
        for (const term of TECHNICAL_TERMS) {
            if (normalizedQuery.includes(term)) {
                technicalCount++;
            }
        }
        const technicalScore = Math.min(technicalCount * 5, 25);
        // Question complexity (0-25 points)
        let questionScore = 10; // baseline
        for (const pattern of SIMPLE_QUESTION_PATTERNS) {
            if (pattern.test(normalizedQuery)) {
                questionScore -= 5;
                break;
            }
        }
        for (const pattern of COMPLEX_QUESTION_PATTERNS) {
            if (pattern.test(normalizedQuery)) {
                questionScore += 10;
                break;
            }
        }
        questionScore = Math.max(0, Math.min(questionScore, 25));
        // Context requirement (0-15 points)
        const contextIndicators = ['based on', 'considering', 'in context of', 'given that'];
        let contextScore = 0;
        for (const indicator of contextIndicators) {
            if (normalizedQuery.includes(indicator)) {
                contextScore += 5;
            }
        }
        contextScore = Math.min(contextScore, 15);
        // Reasoning depth (0-10 points)
        const reasoningIndicators = ['explain why', 'analyze', 'evaluate', 'synthesize', 'compare'];
        let reasoningScore = 0;
        for (const indicator of reasoningIndicators) {
            if (normalizedQuery.includes(indicator)) {
                reasoningScore += 5;
            }
        }
        reasoningScore = Math.min(reasoningScore, 10);
        const totalScore = lengthScore + technicalScore + questionScore + contextScore + reasoningScore;
        // Get thresholds from configuration
        const thresholds = await this.getComplexityThresholds();
        // Determine recommendation
        let recommendation;
        if (totalScore <= thresholds.economyMax) {
            recommendation = 'economy';
        }
        else if (totalScore >= thresholds.premiumMin) {
            recommendation = 'premium';
        }
        else {
            recommendation = 'standard';
        }
        return {
            score: Math.round(totalScore),
            factors: {
                length: lengthScore,
                technicalTerms: technicalScore,
                questionComplexity: questionScore,
                contextRequirement: contextScore,
                reasoningDepth: reasoningScore,
            },
            recommendation,
        };
    }
    /**
     * Get performance metrics for a model
     */
    async getModelPerformance(modelId) {
        if (this.performanceCache.has(modelId)) {
            return this.performanceCache.get(modelId);
        }
        if (!this.redis) {
            return null;
        }
        try {
            const key = `ai:perf:${modelId}`;
            const data = await this.redis.get(key);
            if (data) {
                const perf = JSON.parse(data);
                this.performanceCache.set(modelId, perf);
                return perf;
            }
        }
        catch {
            // Ignore errors
        }
        return null;
    }
    /**
     * Record model performance
     */
    async recordPerformance(modelId, metrics) {
        if (!this.redis) {
            return;
        }
        try {
            const key = `ai:perf:${modelId}`;
            const current = await this.getModelPerformance(modelId);
            const updated = {
                modelId,
                avgLatencyMs: current
                    ? (current.avgLatencyMs * current.totalRequests + metrics.latencyMs) /
                        (current.totalRequests + 1)
                    : metrics.latencyMs,
                avgTokensPerSecond: metrics.tokensPerSecond || current?.avgTokensPerSecond || 0,
                errorRate: current
                    ? (current.errorRate * current.totalRequests + (metrics.success ? 0 : 1)) /
                        (current.totalRequests + 1)
                    : metrics.success
                        ? 0
                        : 1,
                successRate: current
                    ? (current.successRate * current.totalRequests + (metrics.success ? 1 : 0)) /
                        (current.totalRequests + 1)
                    : metrics.success
                        ? 1
                        : 0,
                avgSatisfactionScore: metrics.satisfactionScore !== undefined
                    ? current
                        ? (current.avgSatisfactionScore * current.totalRequests +
                            metrics.satisfactionScore) /
                            (current.totalRequests + 1)
                        : metrics.satisfactionScore
                    : current?.avgSatisfactionScore || 0,
                totalRequests: (current?.totalRequests || 0) + 1,
            };
            await this.redis.setex(key, 86400 * 7, JSON.stringify(updated)); // 7 days TTL
            this.performanceCache.set(modelId, updated);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'model-router.recordPerformance',
                modelId,
            });
        }
    }
    // ============================================
    // Private Methods
    // ============================================
    async getAvailableModels(tenantId) {
        // Check cache
        if (Date.now() - this.lastCacheRefresh < this.CACHE_TTL) {
            const cached = this.modelCache.get(tenantId) || this.modelCache.get('system');
            if (cached) {
                return cached;
            }
        }
        try {
            // Get AI Model ShardType
            const shardTypes = await this.shardTypeRepository.list('system', { limit: 100 });
            const aiModelType = shardTypes.shardTypes.find((st) => st.name === CORE_SHARD_TYPE_NAMES.AI_MODEL);
            if (!aiModelType) {
                return [];
            }
            // Query models
            const result = await this.shardRepository.list({
                filter: {
                    tenantId: 'system',
                    shardTypeId: aiModelType.id,
                },
                limit: 50,
            });
            const models = result.shards
                .filter((s) => s.structuredData.isActive)
                .map((s) => {
                const data = s.structuredData;
                return {
                    id: s.id,
                    name: data.name,
                    modelId: data.modelId,
                    modelType: data.modelType || 'LLM',
                    provider: data.provider,
                    contextWindow: data.contextWindow || 4096,
                    maxOutputTokens: data.maxOutputTokens || 2048,
                    supportsStreaming: data.supportsStreaming ?? true,
                    supportsVision: data.supportsVision ?? false,
                    supportsFunctionCalling: data.supportsFunctionCalling ?? false,
                    supportsJSON: data.supportsJSON ?? false,
                    inputPricePerMillion: data.inputPricePerMillion || 0,
                    outputPricePerMillion: data.outputPricePerMillion || 0,
                    isActive: data.isActive ?? true,
                    isDefault: data.isDefault ?? false,
                    qualityTier: this.determineQualityTier(data),
                };
            });
            this.modelCache.set('system', models);
            this.lastCacheRefresh = Date.now();
            return models;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'model-router.getAvailableModels',
            });
            return [];
        }
    }
    async getModelById(modelId, tenantId) {
        const models = await this.getAvailableModels(tenantId);
        return models.find((m) => m.id === modelId || m.modelId === modelId) || null;
    }
    filterByCapabilities(models, request) {
        return models.filter((model) => {
            if (model.modelType !== 'LLM') {
                return false;
            }
            if (request.requiresVision && !model.supportsVision) {
                return false;
            }
            if (request.requiresFunctionCalling && !model.supportsFunctionCalling) {
                return false;
            }
            if (request.requiresJSON && !model.supportsJSON) {
                return false;
            }
            if (request.preferStreaming && !model.supportsStreaming) {
                return false;
            }
            // Check context size
            const requiredContext = (request.contextSize || 1000) + 500; // Add buffer for output
            if (model.contextWindow < requiredContext) {
                return false;
            }
            return true;
        });
    }
    scoreModels(models, complexity, request) {
        const scored = models.map((model) => {
            let score = 0;
            const reasons = [];
            // Quality matching (higher for premium on complex, lower for economy on simple)
            const tierMatch = this.getTierMatchScore(model.qualityTier, complexity.recommendation);
            score += tierMatch * this.config.qualityWeight * 100;
            if (tierMatch > 0.8) {
                reasons.push(`${model.qualityTier} tier matches ${complexity.recommendation} complexity`);
            }
            // Cost optimization
            const costScore = this.getCostScore(model, request.maxCostPerRequest);
            score += costScore * this.config.costOptimizationWeight * 100;
            if (costScore > 0.7) {
                reasons.push('Cost-effective');
            }
            // Latency
            const latencyScore = this.getLatencyScore(model, request.maxLatencyMs);
            score += latencyScore * this.config.latencyWeight * 100;
            // Bonus for default model
            if (model.isDefault) {
                score += 5;
                reasons.push('Default model');
            }
            // Bonus for matching capabilities exactly
            if (request.requiresVision && model.supportsVision) {
                score += 3;
            }
            if (request.requiresFunctionCalling && model.supportsFunctionCalling) {
                score += 3;
            }
            if (request.preferStreaming && model.supportsStreaming) {
                score += 2;
            }
            return {
                model,
                score,
                reason: reasons.length > 0 ? reasons.join(', ') : 'Best available option',
            };
        });
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored;
    }
    getTierMatchScore(modelTier, recommendedTier) {
        if (modelTier === recommendedTier) {
            return 1.0;
        }
        const tierOrder = { economy: 0, standard: 1, premium: 2 };
        const diff = Math.abs(tierOrder[modelTier] - tierOrder[recommendedTier]);
        return diff === 1 ? 0.6 : 0.3;
    }
    getCostScore(model, maxCost) {
        const avgCostPerRequest = (model.inputPricePerMillion * 1000 + model.outputPricePerMillion * 500) / 1_000_000;
        if (maxCost && avgCostPerRequest > maxCost) {
            return 0;
        }
        // Lower cost = higher score (inverse relationship)
        // Normalize: $0.01 per request = 1.0, $0.10 = 0.5, $1.00 = 0.1
        return Math.max(0.1, 1 - avgCostPerRequest * 10);
    }
    getLatencyScore(model, maxLatency) {
        // Estimate latency based on model size (rough heuristic)
        const estimatedLatency = this.estimateLatency(model);
        if (maxLatency && estimatedLatency > maxLatency) {
            return 0;
        }
        // Normalize: 1s = 1.0, 3s = 0.5, 10s = 0.1
        return Math.max(0.1, 1 - estimatedLatency / 10000);
    }
    estimateLatency(model) {
        // Rough estimates based on model tier
        switch (model.qualityTier) {
            case 'economy':
                return 500; // 0.5s
            case 'standard':
                return 1500; // 1.5s
            case 'premium':
                return 3000; // 3s
            default:
                return 2000;
        }
    }
    estimateCost(model, inputTokens, outputTokens) {
        return ((model.inputPricePerMillion * inputTokens +
            model.outputPricePerMillion * outputTokens) /
            1_000_000);
    }
    determineQualityTier(modelData) {
        const modelId = (modelData.modelId || '').toLowerCase();
        const provider = (modelData.provider || '').toLowerCase();
        // Premium models
        if (modelId.includes('gpt-4') ||
            modelId.includes('claude-3-opus') ||
            modelId.includes('claude-3.5-sonnet') ||
            modelId.includes('gemini-ultra')) {
            return 'premium';
        }
        // Economy models
        if (modelId.includes('gpt-3.5') ||
            modelId.includes('claude-instant') ||
            modelId.includes('claude-3-haiku') ||
            modelId.includes('gemini-flash') ||
            modelId.includes('mistral-7b')) {
            return 'economy';
        }
        // Standard (default)
        return 'standard';
    }
}
// ============================================
// Factory
// ============================================
export function createModelRouterService(shardRepository, shardTypeRepository, redis, monitoring, config) {
    return new ModelRouterService(shardRepository, shardTypeRepository, redis, monitoring, config);
}
//# sourceMappingURL=model-router.service.js.map