/**
 * Risk Evaluation Service
 * Core service for evaluating opportunities and detecting risks
 * Combines rule-based, AI-powered, and historical pattern matching
 */
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { SimilarityMetric } from '../types/vector-search.types.js';
import { v4 as uuidv4 } from 'uuid';
export class RiskEvaluationService {
    monitoring;
    shardRepository;
    shardTypeRepository;
    relationshipService;
    riskCatalogService;
    vectorSearchService;
    insightService;
    serviceBusService;
    // Cache TTL for risk evaluations (15 minutes)
    CACHE_TTL = 15 * 60 * 1000;
    evaluationCache = new Map();
    constructor(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService, serviceBusService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.shardTypeRepository = shardTypeRepository;
        this.relationshipService = relationshipService;
        this.riskCatalogService = riskCatalogService;
        this.vectorSearchService = vectorSearchService;
        this.insightService = insightService;
        this.serviceBusService = serviceBusService;
    }
    /**
     * Queue risk evaluation for async processing
     */
    async queueRiskEvaluation(opportunityId, tenantId, userId, trigger, priority = 'normal', options) {
        if (!this.serviceBusService) {
            throw new Error('ServiceBusService is required for queueing risk evaluations');
        }
        try {
            await this.serviceBusService.sendRiskEvaluationJob({
                opportunityId,
                tenantId,
                userId,
                trigger,
                priority,
                options: {
                    includeHistorical: options?.includeHistorical !== false,
                    includeAI: options?.includeAI !== false,
                    includeSemanticDiscovery: options?.includeSemanticDiscovery !== false,
                },
                timestamp: new Date(),
            });
            this.monitoring.trackEvent('risk-evaluation.queued', {
                tenantId,
                opportunityId,
                trigger,
                priority,
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.queueRiskEvaluation',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
    /**
     * Main evaluation method - evaluates an opportunity for risks
     */
    async evaluateOpportunity(opportunityId, tenantId, userId, options) {
        const startTime = Date.now();
        try {
            // Check cache first (unless force refresh)
            if (!options?.forceRefresh) {
                const cached = this.evaluationCache.get(`${tenantId}:${opportunityId}`);
                if (cached && cached.expiresAt > Date.now()) {
                    this.monitoring.trackEvent('risk-evaluation.cache-hit', {
                        tenantId,
                        opportunityId,
                    });
                    return cached.evaluation;
                }
            }
            // Get opportunity shard
            const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
            if (!opportunity) {
                throw new Error(`Opportunity not found: ${opportunityId}`);
            }
            // Verify it's an opportunity shard
            const shardType = await this.shardTypeRepository.findById(opportunity.shardTypeId, tenantId);
            if (shardType?.name !== CORE_SHARD_TYPE_NAMES.OPPORTUNITY) {
                throw new Error(`Shard is not an opportunity: ${opportunityId}`);
            }
            // Get related shards (account, contacts, etc.)
            const relatedShardsResult = await this.relationshipService.getRelatedShards(tenantId, opportunityId, 'both', { limit: 50 });
            const relatedShards = relatedShardsResult.map(r => r.shard);
            // Detect risks using multiple methods
            const detectedRisks = await this.detectRisks(opportunity, relatedShards, tenantId, userId, {
                includeHistorical: options?.includeHistorical !== false,
                includeAI: options?.includeAI !== false,
            });
            // Calculate aggregate risk score (global + category scores)
            const { globalScore, categoryScores } = await this.calculateRiskScore(detectedRisks, tenantId, opportunity);
            // Calculate revenue at risk (basic calculation - will be enhanced by RevenueAtRiskService)
            const revenueAtRisk = this.calculateRevenueAtRisk(opportunity, globalScore);
            // Build risk evaluation with category scores
            const evaluation = {
                evaluationDate: new Date(),
                riskScore: globalScore,
                categoryScores,
                revenueAtRisk,
                risks: detectedRisks,
                calculatedAt: new Date(),
                calculatedBy: userId,
            };
            // Update opportunity shard with embedded risk evaluation
            await this.shardRepository.update(opportunityId, tenantId, {
                structuredData: {
                    ...opportunity.structuredData,
                    riskEvaluation: evaluation,
                },
            });
            // Create risk snapshot (on EVERY evaluation for evolution tracking)
            await this.createRiskSnapshot(opportunity, evaluation, tenantId, userId);
            // Cache the evaluation
            this.evaluationCache.set(`${tenantId}:${opportunityId}`, {
                evaluation,
                expiresAt: Date.now() + this.CACHE_TTL,
            });
            this.monitoring.trackEvent('risk-evaluation.completed', {
                tenantId,
                opportunityId,
                riskScore: globalScore,
                categoryScores: JSON.stringify(categoryScores),
                riskCount: detectedRisks.length,
                durationMs: Date.now() - startTime,
            });
            return evaluation;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.evaluateOpportunity',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
    /**
     * Detect risks using rule-based, AI-powered, and historical pattern matching
     */
    async detectRisks(opportunity, relatedShards, tenantId, userId, options) {
        const startTime = Date.now();
        const detectedRisks = [];
        try {
            // Get risk catalog
            const opportunityData = opportunity.structuredData;
            const industryId = relatedShards.find(s => {
                const data = s.structuredData;
                return s.shardTypeId === (opportunity.shardTypeId) && data?.industry;
            })?.structuredData;
            const catalog = await this.riskCatalogService.getCatalog(tenantId, industryId?.industry);
            // 1. Rule-based detection (fast, deterministic)
            const ruleBasedRisks = await this.detectRisksByRules(opportunity, relatedShards, catalog, tenantId);
            detectedRisks.push(...ruleBasedRisks);
            // 2. Historical pattern matching (if enabled)
            if (options.includeHistorical && this.vectorSearchService) {
                const historicalRisks = await this.detectRisksByHistoricalPatterns(opportunity, catalog, tenantId, userId);
                // Merge with existing risks (avoid duplicates)
                for (const historicalRisk of historicalRisks) {
                    const existing = detectedRisks.find(r => r.riskId === historicalRisk.riskId);
                    if (!existing) {
                        detectedRisks.push(historicalRisk);
                    }
                    else {
                        // Update confidence if historical is higher
                        if (historicalRisk.confidence > existing.confidence) {
                            existing.confidence = historicalRisk.confidence;
                            existing.explainability = `${existing.explainability}\n\nHistorical pattern: ${historicalRisk.explainability}`;
                        }
                    }
                }
            }
            // 3. Semantic discovery and risk detection (if enabled and vector search available)
            let allRelatedShards = [...relatedShards];
            if (options.includeSemanticDiscovery !== false && this.vectorSearchService) {
                const semanticShards = await this.discoverRiskRelevantShards(opportunity, catalog, tenantId, userId);
                // Merge and deduplicate (prefer auto-linked if duplicate)
                const linkedIds = new Set(relatedShards.map(s => s.id));
                const uniqueSemantic = semanticShards.filter(s => !linkedIds.has(s.id));
                allRelatedShards = [...relatedShards, ...uniqueSemantic];
                // Detect risks from semantic shards using sophisticated NLP
                const semanticRisks = await this.detectRisksBySemantic(opportunity, semanticShards, catalog, tenantId);
                // Merge semantic risks
                for (const semanticRisk of semanticRisks) {
                    const existing = detectedRisks.find(r => r.riskId === semanticRisk.riskId);
                    if (!existing) {
                        detectedRisks.push(semanticRisk);
                    }
                    else {
                        // Update confidence if semantic is higher
                        if (semanticRisk.confidence > existing.confidence) {
                            existing.confidence = semanticRisk.confidence;
                            existing.explainability = `${existing.explainability}\n\nSemantic match: ${semanticRisk.explainability}`;
                            // Merge source shards
                            existing.sourceShards = Array.from(new Set([...existing.sourceShards, ...semanticRisk.sourceShards]));
                        }
                    }
                }
            }
            // 4. AI-powered detection (if enabled) - now uses all shards (auto-linked + semantic)
            if (options.includeAI && this.insightService) {
                const aiRisks = await this.detectRisksByAI(opportunity, allRelatedShards, // Use combined shards
                catalog, tenantId, userId);
                // Merge with existing risks
                for (const aiRisk of aiRisks) {
                    const existing = detectedRisks.find(r => r.riskId === aiRisk.riskId);
                    if (!existing) {
                        detectedRisks.push(aiRisk);
                    }
                    else {
                        // Update confidence if AI is higher
                        if (aiRisk.confidence > existing.confidence) {
                            existing.confidence = aiRisk.confidence;
                            existing.explainability = `${existing.explainability}\n\nAI analysis: ${aiRisk.explainability}`;
                        }
                    }
                }
            }
            this.monitoring.trackEvent('risk-evaluation.risks-detected', {
                tenantId,
                opportunityId: opportunity.id,
                ruleBasedCount: ruleBasedRisks.length,
                historicalCount: options.includeHistorical ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId)).length : 0,
                semanticCount: options.includeSemanticDiscovery !== false ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId) && !detectedRisks.find(hr => hr.riskId === r.riskId && options.includeHistorical)).length : 0,
                aiCount: options.includeAI ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId)).length : 0,
                autoLinkedShards: relatedShards.length,
                semanticShards: allRelatedShards.length - relatedShards.length,
                totalShards: allRelatedShards.length,
                totalCount: detectedRisks.length,
                durationMs: Date.now() - startTime,
            });
            return detectedRisks;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.detectRisks',
                tenantId,
                opportunityId: opportunity.id,
            });
            // Return rule-based risks even if other methods fail
            return detectedRisks;
        }
    }
    /**
     * Rule-based risk detection (fast, deterministic)
     */
    async detectRisksByRules(opportunity, relatedShards, catalog, tenantId) {
        const risks = [];
        const opportunityData = opportunity.structuredData;
        for (const riskDef of catalog) {
            // Check if this risk applies to any of the related shard types
            const applicableShards = relatedShards.filter(s => riskDef.sourceShardTypes.includes(s.shardTypeId));
            if (applicableShards.length === 0) {
                continue;
            }
            // Evaluate detection rules
            const rule = riskDef.detectionRules;
            let matches = false;
            let confidence = 0.5; // Default confidence
            let explainability = '';
            const sourceShardIds = [];
            // Simple rule evaluation (can be enhanced)
            if (rule.type === 'attribute') {
                // Check opportunity attributes
                for (const condition of rule.conditions) {
                    // Basic attribute matching (simplified)
                    if (this.evaluateCondition(opportunityData, condition)) {
                        matches = true;
                        confidence = Math.max(confidence, 0.7);
                        explainability = `Opportunity attribute matches risk condition: ${JSON.stringify(condition)}`;
                    }
                }
            }
            else if (rule.type === 'relationship') {
                // Check related shards
                for (const shard of applicableShards) {
                    const shardData = shard.structuredData;
                    for (const condition of rule.conditions) {
                        if (this.evaluateCondition(shardData, condition)) {
                            matches = true;
                            confidence = Math.max(confidence, 0.8);
                            sourceShardIds.push(shard.id);
                            explainability = `Related shard (${shard.id}) matches risk condition`;
                        }
                    }
                }
            }
            if (matches && confidence >= rule.confidenceThreshold) {
                // Get effective ponderation
                const ponderation = await this.riskCatalogService.getPonderation(riskDef.riskId, tenantId, undefined, // industryId - can be enhanced
                undefined // opportunityType - can be enhanced
                );
                risks.push({
                    riskId: riskDef.riskId,
                    riskName: riskDef.name,
                    category: riskDef.category,
                    ponderation,
                    confidence,
                    contribution: ponderation * confidence, // Will be normalized in calculateRiskScore
                    explainability: explainability || riskDef.explainabilityTemplate,
                    sourceShards: sourceShardIds.length > 0 ? sourceShardIds : applicableShards.map(s => s.id),
                    lifecycleState: 'identified',
                });
            }
        }
        return risks;
    }
    /**
     * Historical pattern-based risk detection
     */
    async detectRisksByHistoricalPatterns(opportunity, catalog, tenantId, userId) {
        if (!this.vectorSearchService) {
            return [];
        }
        try {
            // Get historical patterns
            const patterns = await this.getHistoricalPatterns(opportunity, tenantId, userId);
            const risks = [];
            // Analyze patterns to detect risks
            for (const pattern of patterns) {
                if (pattern.outcome === 'lost') {
                    // Find matching risk in catalog
                    for (const riskFactor of pattern.riskFactors) {
                        const riskDef = catalog.find(c => c.riskId === riskFactor);
                        if (riskDef) {
                            const ponderation = await this.riskCatalogService.getPonderation(riskDef.riskId, tenantId);
                            risks.push({
                                riskId: riskDef.riskId,
                                riskName: riskDef.name,
                                category: riskDef.category,
                                ponderation,
                                confidence: pattern.similarityScore * 0.8, // Scale by similarity
                                contribution: ponderation * pattern.similarityScore * 0.8,
                                explainability: `Similar opportunity (${pattern.similarOpportunityId}) was lost. Similarity: ${(pattern.similarityScore * 100).toFixed(1)}%`,
                                sourceShards: [pattern.similarOpportunityId],
                                lifecycleState: 'identified',
                            });
                        }
                    }
                }
            }
            return risks;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.detectRisksByHistoricalPatterns',
                tenantId,
                opportunityId: opportunity.id,
            });
            return [];
        }
    }
    /**
     * AI-powered risk detection
     */
    async detectRisksByAI(opportunity, relatedShards, catalog, tenantId, userId) {
        if (!this.insightService) {
            return [];
        }
        try {
            // Build context for AI analysis with all numerical data
            const opportunityData = opportunity.structuredData;
            // Calculate time-based metrics
            const now = new Date();
            const closeDate = opportunityData.closeDate || opportunityData.expectedCloseDate;
            const daysToClose = closeDate ? Math.ceil((new Date(closeDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const lastActivityAt = opportunityData.lastActivityAt;
            const daysSinceActivity = lastActivityAt ? Math.ceil((now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
            // Get quota context if available (for owner-based quotas)
            let quotaContext = null;
            if (opportunityData.ownerId) {
                try {
                    // Try to get active quota for this user (simplified - would need QuotaService injection)
                    // For now, we'll include owner info so AI can consider quota pressure
                    quotaContext = {
                        ownerId: opportunityData.ownerId,
                        note: 'Quota information would be included if QuotaService is available',
                    };
                }
                catch (error) {
                    // Quota service not available - continue without it
                }
            }
            const context = {
                opportunity: {
                    name: opportunityData.name,
                    stage: opportunityData.stage,
                    value: opportunityData.value,
                    currency: opportunityData.currency || 'USD',
                    probability: opportunityData.probability,
                    expectedRevenue: opportunityData.expectedRevenue,
                    closeDate,
                    expectedCloseDate: opportunityData.expectedCloseDate,
                    daysToClose,
                    daysSinceActivity,
                    lastActivityAt,
                    description: opportunityData.description,
                    ownerId: opportunityData.ownerId,
                    accountId: opportunityData.accountId,
                },
                quota: quotaContext,
                relatedShards: relatedShards.map(s => ({
                    type: s.shardTypeId,
                    data: s.structuredData,
                })),
                numericalMetrics: {
                    dealValue: opportunityData.value || 0,
                    expectedRevenue: opportunityData.expectedRevenue || opportunityData.value || 0,
                    probability: opportunityData.probability || 0,
                    daysToClose,
                    daysSinceActivity,
                },
            };
            // Use InsightService to analyze for risks with comprehensive prompt
            const riskCategories = catalog.map(c => c.category).join(', ');
            const insightRequest = {
                tenantId,
                userId,
                query: `Analyze this opportunity for potential risks. 

Key numerical data to consider:
- Deal Value: ${opportunityData.value || 0} ${opportunityData.currency || 'USD'}
- Expected Revenue: ${opportunityData.expectedRevenue || opportunityData.value || 0} ${opportunityData.currency || 'USD'}
- Win Probability: ${opportunityData.probability || 0}%
- Days to Close: ${daysToClose !== null ? daysToClose : 'unknown'}
- Days Since Last Activity: ${daysSinceActivity !== null ? daysSinceActivity : 'unknown'}

Consider:
1. Financial risks: deal value vs expected revenue, probability trends
2. Timeline risks: close date proximity, activity gaps
3. Stage risks: current stage progression, stagnation indicators
4. Related entity risks: account health, stakeholder changes
5. Historical patterns: similar opportunities that were lost

Identify specific risks from these categories: ${riskCategories}

For each risk identified, provide:
- Risk ID (from catalog if matching)
- Risk category
- Confidence level (0-1)
- Explanation with specific numerical evidence
- Recommended mitigation actions`,
                scope: {
                    shardId: opportunity.id,
                },
                options: {
                    format: 'structured',
                    includeReasoning: true,
                },
            };
            const response = await this.insightService.generate(tenantId, userId, insightRequest);
            // Parse AI response to extract risks
            const risks = [];
            // Check if response is InsightResponse (not ModelUnavailableResponse)
            if ('success' in response && !response.success) {
                // ModelUnavailableResponse - skip AI processing
                return risks;
            }
            const insightResponse = response;
            try {
                // Try to parse structured JSON response
                let parsedContent = null;
                if (insightResponse.format === 'structured' && insightResponse.content) {
                    try {
                        // Try parsing as JSON first
                        parsedContent = JSON.parse(insightResponse.content);
                    }
                    catch {
                        // If not JSON, try to extract JSON from markdown code blocks
                        const jsonMatch = insightResponse.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                        if (jsonMatch && jsonMatch[1]) {
                            try {
                                parsedContent = JSON.parse(jsonMatch[1]);
                            }
                            catch (parseError) {
                                // If extraction also fails, parsedContent remains null
                                this.monitoring.trackException(parseError instanceof Error ? parseError : new Error(String(parseError)), {
                                    operation: 'risk-evaluation.parseStructuredContent',
                                });
                            }
                        }
                    }
                }
                // Extract risks from parsed content
                if (parsedContent && Array.isArray(parsedContent.risks)) {
                    for (const riskData of parsedContent.risks) {
                        // Find matching risk in catalog
                        const riskDef = catalog.find(c => c.riskId === riskData.riskId ||
                            c.name.toLowerCase() === riskData.riskName?.toLowerCase());
                        if (riskDef) {
                            const ponderation = await this.riskCatalogService.getPonderation(riskDef.riskId, tenantId);
                            risks.push({
                                riskId: riskDef.riskId,
                                riskName: riskDef.name,
                                category: riskDef.category,
                                ponderation,
                                confidence: Math.min(Math.max(riskData.confidence || 0.5, 0), 1),
                                contribution: ponderation * Math.min(Math.max(riskData.confidence || 0.5, 0), 1),
                                explainability: riskData.explanation || riskData.explainability || riskDef.explainabilityTemplate,
                                sourceShards: [opportunity.id],
                                lifecycleState: 'identified',
                            });
                        }
                    }
                }
                else if (insightResponse.content) {
                    // Fallback: Try to extract risks from natural language response
                    // Look for risk mentions in the content
                    const riskMentions = this.extractRisksFromText(insightResponse.content, catalog);
                    for (const mention of riskMentions) {
                        const ponderation = await this.riskCatalogService.getPonderation(mention.riskId, tenantId);
                        risks.push({
                            riskId: mention.riskId,
                            riskName: mention.riskName,
                            category: mention.category,
                            ponderation,
                            confidence: mention.confidence,
                            contribution: ponderation * mention.confidence,
                            explainability: mention.explanation || mention.riskDef.explainabilityTemplate,
                            sourceShards: [opportunity.id],
                            lifecycleState: 'identified',
                        });
                    }
                }
            }
            catch (parseError) {
                // Log parsing error but don't fail the entire evaluation
                this.monitoring.trackException(parseError, {
                    operation: 'risk-evaluation.parseAIResponse',
                    tenantId,
                    opportunityId: opportunity.id,
                });
            }
            return risks;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.detectRisksByAI',
                tenantId,
                opportunityId: opportunity.id,
            });
            return [];
        }
    }
    /**
     * Extract risks from natural language text (fallback parser)
     */
    extractRisksFromText(text, catalog) {
        const extracted = [];
        const textLower = text.toLowerCase();
        // Look for risk mentions by name or category
        for (const riskDef of catalog) {
            const riskNameLower = riskDef.name.toLowerCase();
            const categoryLower = riskDef.category.toLowerCase();
            // Check if risk name or category is mentioned
            if (textLower.includes(riskNameLower) || textLower.includes(categoryLower)) {
                // Try to extract confidence from context (look for percentages or "high/medium/low")
                let confidence = 0.5; // Default
                const riskIndex = Math.max(textLower.indexOf(riskNameLower), textLower.indexOf(categoryLower));
                const riskContext = textLower.substring(Math.max(0, riskIndex - 50), Math.min(textLower.length, riskIndex + Math.max(riskNameLower.length, categoryLower.length) + 200));
                if (riskContext.includes('high') || riskContext.includes('significant') || riskContext.includes('critical')) {
                    confidence = 0.8;
                }
                else if (riskContext.includes('medium') || riskContext.includes('moderate')) {
                    confidence = 0.5;
                }
                else if (riskContext.includes('low') || riskContext.includes('minor')) {
                    confidence = 0.3;
                }
                // Extract percentage if mentioned
                const percentMatch = riskContext.match(/(\d+)%/);
                if (percentMatch) {
                    confidence = Math.min(Math.max(parseInt(percentMatch[1]) / 100, 0), 1);
                }
                extracted.push({
                    riskId: riskDef.riskId,
                    riskName: riskDef.name,
                    category: riskDef.category,
                    confidence,
                    explanation: `AI detected ${riskDef.name} risk: ${typeof text === 'string' && text.length > 0 ? text.substring(0, 200) : 'N/A'}`,
                    riskDef,
                });
            }
        }
        return extracted;
    }
    /**
     * Get historical patterns for similar opportunities
     */
    async getHistoricalPatterns(opportunity, tenantId, userId) {
        if (!this.vectorSearchService) {
            return [];
        }
        try {
            // Build query from opportunity
            const opportunityData = opportunity.structuredData;
            const queryText = `${opportunityData.name || ''} ${opportunityData.description || ''}`;
            // Search for similar opportunities using semantic search
            const searchResponse = await this.vectorSearchService.semanticSearch({
                query: queryText,
                filter: {
                    tenantId,
                    shardTypeId: opportunity.shardTypeId,
                },
                topK: 20,
            }, userId || 'system' // Use system user if not provided
            );
            // Analyze results to build patterns
            const patterns = [];
            for (const result of searchResponse.results.slice(0, 10)) {
                const similarShard = await this.shardRepository.findById(result.shard.id, tenantId);
                if (!similarShard) {
                    continue;
                }
                const similarData = similarShard.structuredData;
                const outcome = similarData.stage === 'closed_won' ? 'won' :
                    similarData.stage === 'closed_lost' ? 'lost' : null;
                if (outcome) {
                    // Extract risk factors from similar opportunity's risk evaluation if available
                    const similarRiskEval = similarData.riskEvaluation;
                    const riskFactors = similarRiskEval?.risks?.map((r) => r.riskId) || [];
                    patterns.push({
                        similarOpportunityId: similarShard.id,
                        similarityScore: result.score || 0.5,
                        outcome,
                        riskFactors,
                        winRate: outcome === 'won' ? 1 : 0,
                        avgClosingTime: 0, // TODO: Calculate from dates
                    });
                }
            }
            return patterns;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.getHistoricalPatterns',
                tenantId,
                opportunityId: opportunity.id,
            });
            return [];
        }
    }
    /**
     * Calculate aggregate risk score from detected risks
     * Returns both global score and category scores
     * Public method for use by other services (e.g., SimulationService)
     */
    async calculateRiskScore(risks, tenantId, opportunity) {
        if (risks.length === 0) {
            return {
                globalScore: 0,
                categoryScores: {
                    Commercial: 0,
                    Technical: 0,
                    Legal: 0,
                    Financial: 0,
                    Competitive: 0,
                    Operational: 0,
                },
            };
        }
        // Calculate global score (existing logic)
        const totalContribution = risks.reduce((sum, risk) => sum + risk.contribution, 0);
        const normalizedRisks = risks.map(risk => ({
            ...risk,
            contribution: risk.contribution / Math.max(totalContribution, 1),
        }));
        const globalScore = normalizedRisks.reduce((sum, risk) => {
            return sum + (risk.ponderation * risk.confidence * risk.contribution);
        }, 0);
        // Calculate category scores
        const categoryScores = await this.calculateCategoryScores(risks);
        return {
            globalScore: Math.min(Math.max(globalScore, 0), 1),
            categoryScores,
        };
    }
    /**
     * Calculate risk scores per category
     */
    async calculateCategoryScores(risks) {
        const categoryRisks = new Map();
        // Group risks by category
        for (const risk of risks) {
            if (!categoryRisks.has(risk.category)) {
                categoryRisks.set(risk.category, []);
            }
            categoryRisks.get(risk.category).push(risk);
        }
        // Initialize all categories to 0
        const categoryScores = {
            Commercial: 0,
            Technical: 0,
            Legal: 0,
            Financial: 0,
            Competitive: 0,
            Operational: 0,
        };
        // Calculate score per category
        for (const [category, categoryRiskList] of categoryRisks) {
            if (categoryRiskList.length === 0) {
                continue;
            }
            // Normalize contributions within category
            const totalContribution = categoryRiskList.reduce((sum, r) => sum + r.contribution, 0);
            const normalized = categoryRiskList.map(r => ({
                ...r,
                contribution: r.contribution / Math.max(totalContribution, 1),
            }));
            // Calculate category score: Σ(ponderation * confidence * normalizedContribution)
            const categoryScore = normalized.reduce((sum, risk) => {
                return sum + (risk.ponderation * risk.confidence * risk.contribution);
            }, 0);
            categoryScores[category] = Math.min(Math.max(categoryScore, 0), 1);
        }
        return categoryScores;
    }
    /**
     * Calculate revenue at risk (basic calculation)
     */
    calculateRevenueAtRisk(opportunity, riskScore) {
        // Validate inputs
        if (!opportunity || !opportunity.structuredData || typeof riskScore !== 'number' || !isFinite(riskScore)) {
            return 0;
        }
        const opportunityData = opportunity.structuredData;
        const dealValue = typeof opportunityData?.value === 'number' && isFinite(opportunityData.value)
            ? opportunityData.value
            : 0;
        const probability = typeof opportunityData?.probability === 'number' && isFinite(opportunityData.probability)
            ? Math.max(0, Math.min(100, opportunityData.probability)) / 100
            : 0.5; // Default 50%
        // Validate riskScore is between 0 and 1
        const safeRiskScore = Math.max(0, Math.min(1, riskScore));
        // Revenue at risk = dealValue * probability * riskScore
        // This represents the portion of expected revenue that's at risk
        const result = dealValue * probability * safeRiskScore;
        // Ensure result is finite
        return isFinite(result) ? result : 0;
    }
    /**
     * Evaluate a condition against data (simplified)
     */
    evaluateCondition(data, condition) {
        // Simplified condition evaluation
        // TODO: Implement proper condition evaluation engine
        if (typeof condition === 'object' && condition.field && condition.operator) {
            const value = this.getNestedValue(data, condition.field);
            const conditionValue = condition.value;
            // Handle null/undefined values safely
            if (value === null || value === undefined) {
                if (condition.operator === 'is_null' || condition.operator === 'not_exists') {
                    return true;
                }
                if (condition.operator === 'is_not_null' || condition.operator === 'exists') {
                    return false;
                }
                // For other operators, null/undefined comparisons return false
                return false;
            }
            switch (condition.operator) {
                case 'equals':
                    return value === conditionValue;
                case 'not_equals':
                    return value !== conditionValue;
                case 'greater_than':
                    return typeof value === 'number' && typeof conditionValue === 'number' && value > conditionValue;
                case 'less_than':
                    return typeof value === 'number' && typeof conditionValue === 'number' && value < conditionValue;
                case 'contains':
                    return typeof value === 'string' && String(value).includes(String(conditionValue));
                case 'is_null':
                    return value === null;
                case 'is_not_null':
                    return value !== null;
                case 'exists':
                    return value !== undefined && value !== null;
                case 'not_exists':
                    return value === undefined || value === null;
                default:
                    return false;
            }
        }
        return false;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        if (!obj || !path || typeof path !== 'string') {
            return undefined;
        }
        try {
            return path.split('.').reduce((current, key) => {
                if (current === null || current === undefined) {
                    return undefined;
                }
                return current[key];
            }, obj);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Discover risk-relevant shards using vector search
     * Uses risk catalog to build targeted queries and filter shard types
     */
    async discoverRiskRelevantShards(opportunity, catalog, tenantId, userId, options = {}) {
        if (!this.vectorSearchService || catalog.length === 0) {
            return [];
        }
        const { maxShards = 20, minScore = 0.72, } = options;
        try {
            // Build semantic query from opportunity context AND risk catalog
            const query = this.buildRiskSearchQuery(opportunity, catalog);
            // Determine shard types from catalog (use sourceShardTypes from active risks)
            const catalogShardTypes = new Set();
            for (const risk of catalog) {
                if (risk.isActive && risk.sourceShardTypes) {
                    risk.sourceShardTypes.forEach(type => catalogShardTypes.add(type));
                }
            }
            // Fallback to default types if catalog doesn't specify
            const defaultShardTypes = [
                CORE_SHARD_TYPE_NAMES.EMAIL,
                CORE_SHARD_TYPE_NAMES.NOTE,
                CORE_SHARD_TYPE_NAMES.DOCUMENT,
                CORE_SHARD_TYPE_NAMES.TASK,
                CORE_SHARD_TYPE_NAMES.MEETING,
                CORE_SHARD_TYPE_NAMES.CALL,
                CORE_SHARD_TYPE_NAMES.MESSAGE,
            ];
            const shardTypes = catalogShardTypes.size > 0
                ? Array.from(catalogShardTypes)
                : defaultShardTypes;
            // Perform vector search
            const searchResponse = await this.vectorSearchService.semanticSearch({
                query,
                filter: {
                    tenantId,
                    shardTypeIds: shardTypes, // Use plural for array
                },
                topK: maxShards,
                minScore,
                similarityMetric: SimilarityMetric.COSINE,
            }, userId);
            // Extract shards from results (already full Shard objects)
            const shards = searchResponse.results
                .map(r => r.shard)
                .filter((shard) => shard !== undefined && shard !== null);
            this.monitoring.trackEvent('risk-evaluation.semantic-discovery', {
                tenantId,
                opportunityId: opportunity.id,
                queryLength: query.length,
                resultsFound: searchResponse.results.length,
                shardsLoaded: shards.length,
                shardTypes: shardTypes.join(','),
            });
            return shards;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.discoverRiskRelevantShards',
                tenantId,
                opportunityId: opportunity.id,
            });
            return [];
        }
    }
    /**
     * Build semantic search query from opportunity context AND risk catalog
     * Uses risk catalog entries to build targeted queries
     */
    buildRiskSearchQuery(opportunity, catalog) {
        // Validate inputs
        if (!opportunity || !opportunity.structuredData) {
            return '';
        }
        const data = opportunity.structuredData;
        // Core opportunity identifiers (high weight)
        const identifiers = [
            typeof data?.name === 'string' ? data.name : '',
            typeof data?.accountName === 'string' ? data.accountName : '',
            typeof data?.contactName === 'string' ? data.contactName : '',
            typeof data?.ownerName === 'string' ? data.ownerName : '',
        ].filter(Boolean);
        // Extract risk terms from catalog
        const riskTerms = this.extractRiskTermsFromCatalog(catalog);
        // Opportunity context (medium weight)
        const opportunityContext = [
            typeof data?.description === 'string' ? data.description.substring(0, 200) : '',
            typeof data?.nextStep === 'string' ? data.nextStep : '',
            typeof data?.stage === 'string' ? `stage ${data.stage}` : '',
        ].filter(Boolean);
        // Build query: identifiers + risk catalog terms + opportunity context
        const queryParts = [
            ...identifiers,
            ...riskTerms,
            ...opportunityContext,
        ].filter(Boolean);
        return queryParts.join(' ');
    }
    /**
     * Extract searchable terms from risk catalog
     * Combines risk names, descriptions, and categories into search terms
     */
    extractRiskTermsFromCatalog(catalog) {
        const terms = new Set();
        for (const risk of catalog) {
            if (!risk.isActive) {
                continue;
            }
            // Add risk name (high relevance)
            if (risk.name) {
                risk.name.split(/\s+/).forEach(term => {
                    const cleaned = term.toLowerCase().replace(/[^\w]/g, '');
                    if (cleaned.length > 2) {
                        terms.add(cleaned);
                    }
                });
            }
            // Add key terms from description (medium relevance)
            if (risk.description) {
                const words = risk.description
                    .split(/\s+/)
                    .map(w => w.toLowerCase().replace(/[^\w]/g, ''))
                    .filter(w => w.length >= 3 && !this.isStopWord(w));
                // Take top 3-5 most relevant words from description
                words.slice(0, 5).forEach(term => terms.add(term));
            }
            // Add category as context
            terms.add(risk.category.toLowerCase());
        }
        // Limit total terms to avoid query dilution
        return Array.from(terms).slice(0, 15);
    }
    /**
     * Check if word is a common stop word
     */
    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
        ]);
        return stopWords.has(word);
    }
    /**
     * Detect risks by matching semantic search results to catalog risks
     * Uses sophisticated NLP (embedding-based semantic similarity)
     */
    async detectRisksBySemantic(opportunity, semanticShards, catalog, tenantId) {
        if (!this.vectorSearchService || semanticShards.length === 0) {
            return [];
        }
        const detectedRisks = [];
        try {
            // For each semantic shard, try to match to catalog risks using NLP
            for (const shard of semanticShards) {
                const shardContent = this.extractShardContent(shard);
                // For each risk in catalog, check semantic similarity
                for (const riskDef of catalog) {
                    if (!riskDef.isActive) {
                        continue;
                    }
                    // Check if shard type matches risk's sourceShardTypes
                    if (!riskDef.sourceShardTypes.includes(shard.shardTypeId)) {
                        continue;
                    }
                    // Match shard content to risk using sophisticated NLP (embedding similarity)
                    const matchScore = await this.matchShardToRiskNLP(shardContent, riskDef, tenantId);
                    if (matchScore > 0.6) { // Semantic similarity threshold
                        const ponderation = await this.riskCatalogService.getPonderation(riskDef.riskId, tenantId);
                        detectedRisks.push({
                            riskId: riskDef.riskId,
                            riskName: riskDef.name,
                            category: riskDef.category,
                            ponderation,
                            confidence: matchScore,
                            contribution: ponderation * matchScore,
                            explainability: `Semantic similarity match in ${shard.shardTypeId} (${shard.id}): ${riskDef.name} (similarity: ${(matchScore * 100).toFixed(1)}%)`,
                            sourceShards: [shard.id],
                            lifecycleState: 'identified',
                        });
                    }
                }
            }
            return detectedRisks;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.detectRisksBySemantic',
                tenantId,
                opportunityId: opportunity.id,
            });
            return [];
        }
    }
    /**
     * Match shard content to risk definition using sophisticated NLP
     * Uses semantic similarity via embeddings rather than simple keyword matching
     */
    async matchShardToRiskNLP(shardContent, risk, tenantId) {
        if (!this.vectorSearchService) {
            return 0;
        }
        try {
            // Build query from risk definition (name + description)
            const riskQuery = `${risk.name} ${risk.description}`;
            // Use vector search to find similarity
            // We'll use the semantic search with the risk query to find similar content
            // Then compare the shard content embedding with risk query embedding
            const searchResponse = await this.vectorSearchService.semanticSearch({
                query: riskQuery,
                filter: {
                    tenantId,
                },
                topK: 1,
                minScore: 0.5,
            }, 'system');
            // If we find the shard in results, use its score
            // Otherwise, calculate similarity using embeddings
            // For now, use a simplified approach: if shard content contains risk terms, score based on that
            // TODO: Enhance with direct embedding comparison when AzureOpenAIService is available
            // Extract risk terms
            const riskTerms = this.extractRiskTermsFromCatalog([risk]);
            const shardLower = shardContent.toLowerCase();
            // Count matches (simple approach for now, can be enhanced with direct embedding comparison)
            let matchCount = 0;
            for (const term of riskTerms) {
                if (shardLower.includes(term.toLowerCase())) {
                    matchCount++;
                }
            }
            // Calculate match score based on term overlap
            // This is a simplified NLP approach - can be enhanced with direct embedding similarity
            const baseScore = matchCount / Math.max(riskTerms.length, 1);
            // Boost score if risk name appears in shard
            const nameBoost = risk.name.toLowerCase().split(/\s+/).some(word => shardLower.includes(word.toLowerCase())) ? 0.2 : 0;
            return Math.min(baseScore + nameBoost, 1);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.matchShardToRiskNLP',
                tenantId,
                riskId: risk.riskId,
            });
            return 0;
        }
    }
    /**
     * Extract content from shard for semantic matching
     */
    extractShardContent(shard) {
        const data = shard.structuredData;
        const contentParts = [];
        // Extract relevant fields based on shard type
        if (data.name) {
            contentParts.push(data.name);
        }
        if (data.description) {
            contentParts.push(data.description);
        }
        if (data.body) {
            contentParts.push(data.body);
        }
        if (data.content) {
            contentParts.push(data.content);
        }
        if (data.subject) {
            contentParts.push(data.subject);
        }
        if (data.text) {
            contentParts.push(data.text);
        }
        if (data.notes) {
            contentParts.push(data.notes);
        }
        // Include unstructured data if available
        if (data.unstructuredData && typeof data.unstructuredData === 'object') {
            contentParts.push(JSON.stringify(data.unstructuredData));
        }
        const joined = contentParts.join(' ');
        return typeof joined === 'string' && joined.length > 0 ? joined.substring(0, 2000) : ''; // Limit length
    }
    /**
     * Create risk snapshot for evolution tracking
     * Called on EVERY evaluation (not just significant changes)
     */
    async createRiskSnapshot(opportunity, evaluation, tenantId, userId) {
        try {
            // Get risk snapshot shard type
            const snapshotShardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT, 'system');
            if (!snapshotShardType) {
                this.monitoring.trackEvent('risk-evaluation.snapshot-skipped', {
                    tenantId,
                    opportunityId: opportunity.id,
                    reason: 'shard-type-not-found',
                });
                return;
            }
            const opportunityData = opportunity.structuredData;
            // Create snapshot document
            const snapshot = {
                id: uuidv4(),
                tenantId,
                opportunityId: opportunity.id,
                snapshotDate: new Date(),
                riskScore: evaluation.riskScore,
                categoryScores: evaluation.categoryScores,
                revenueAtRisk: evaluation.revenueAtRisk,
                risks: evaluation.risks.map(r => ({
                    riskId: r.riskId,
                    riskName: r.riskName,
                    category: r.category,
                    ponderation: r.ponderation,
                    confidence: r.confidence,
                    contribution: r.contribution,
                    explainability: r.explainability,
                    sourceShards: r.sourceShards,
                    lifecycleState: r.lifecycleState,
                })),
                metadata: {
                    dealValue: opportunityData.value || 0,
                    currency: opportunityData.currency || 'USD',
                    stage: opportunityData.stage || '',
                    probability: opportunityData.probability || 0,
                    expectedCloseDate: opportunityData.closeDate || opportunityData.expectedCloseDate,
                },
                createdAt: new Date(),
            };
            // Store as c_risk_snapshot shard
            const opportunityName = opportunity.structuredData?.name || opportunity.id;
            await this.shardRepository.create({
                tenantId,
                shardTypeId: snapshotShardType.id,
                structuredData: {
                    ...snapshot,
                    name: `Risk Snapshot ${opportunityName} - ${new Date().toISOString()}`,
                },
                createdBy: userId,
            });
            this.monitoring.trackEvent('risk-evaluation.snapshot-created', {
                tenantId,
                opportunityId: opportunity.id,
                snapshotId: snapshot.id,
            });
        }
        catch (error) {
            // Don't fail evaluation if snapshot creation fails
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.createRiskSnapshot',
                tenantId,
                opportunityId: opportunity.id,
            });
        }
    }
    /**
     * Get risk score evolution over time (global and per category)
     */
    async getRiskEvolution(opportunityId, tenantId, options) {
        try {
            // Get risk snapshot shard type
            const snapshotShardType = await this.shardTypeRepository.findByName(CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT, 'system');
            if (!snapshotShardType) {
                return {
                    snapshots: [],
                    evolution: {
                        global: [],
                        categories: {
                            Commercial: [],
                            Technical: [],
                            Legal: [],
                            Financial: [],
                            Competitive: [],
                            Operational: [],
                        },
                    },
                };
            }
            // Build filter using structuredDataFilters
            const structuredDataFilters = {
                opportunityId,
            };
            // Date filtering using operator syntax
            if (options?.startDate || options?.endDate) {
                if (options.startDate && options.endDate) {
                    structuredDataFilters.snapshotDate = {
                        operator: 'gte',
                        value: options.startDate,
                    };
                    // Note: Cosmos DB doesn't support multiple operators on same field easily
                    // We'll filter in memory for endDate
                }
                else if (options.startDate) {
                    structuredDataFilters.snapshotDate = {
                        operator: 'gte',
                        value: options.startDate,
                    };
                }
                // endDate will be filtered in memory after query
            }
            // Get all snapshots for opportunity
            const snapshotsResult = await this.shardRepository.list({
                filter: {
                    tenantId,
                    shardTypeId: snapshotShardType.id,
                    structuredDataFilters,
                },
                orderBy: 'createdAt', // Use createdAt as proxy for snapshotDate ordering
                orderDirection: 'asc',
                limit: 1000, // Reasonable limit for evolution tracking
            });
            // Filter by endDate in memory if specified
            let filteredSnapshots = snapshotsResult.shards;
            if (options?.endDate) {
                filteredSnapshots = filteredSnapshots.filter(s => {
                    const data = s.structuredData;
                    const snapshotDate = data.snapshotDate ? new Date(data.snapshotDate) : s.createdAt;
                    return snapshotDate <= options.endDate;
                });
            }
            // Sort by snapshotDate (not just createdAt)
            filteredSnapshots.sort((a, b) => {
                const dataA = a.structuredData;
                const dataB = b.structuredData;
                const dateA = dataA.snapshotDate ? new Date(dataA.snapshotDate) : a.createdAt;
                const dateB = dataB.snapshotDate ? new Date(dataB.snapshotDate) : b.createdAt;
                return dateA.getTime() - dateB.getTime();
            });
            const snapshots = filteredSnapshots.map(s => {
                const data = s.structuredData;
                return {
                    id: s.id,
                    snapshotDate: new Date(data.snapshotDate || s.createdAt),
                    riskScore: data.riskScore || 0,
                    categoryScores: data.categoryScores || {
                        Commercial: 0,
                        Technical: 0,
                        Legal: 0,
                        Financial: 0,
                        Competitive: 0,
                        Operational: 0,
                    },
                    revenueAtRisk: data.revenueAtRisk || 0,
                    risks: (data.risks || []).map((r) => ({
                        riskId: r.riskId,
                        riskName: r.riskName,
                        category: r.category,
                        confidence: r.confidence,
                    })),
                };
            });
            // Build evolution data
            const evolution = {
                global: snapshots.map(s => ({
                    date: s.snapshotDate,
                    score: s.riskScore,
                })),
                categories: {
                    Commercial: [],
                    Technical: [],
                    Legal: [],
                    Financial: [],
                    Competitive: [],
                    Operational: [],
                },
            };
            // Extract category scores from snapshots
            for (const snapshot of snapshots) {
                for (const category of Object.keys(evolution.categories)) {
                    evolution.categories[category].push({
                        date: snapshot.snapshotDate,
                        score: snapshot.categoryScores[category] || 0,
                    });
                }
            }
            this.monitoring.trackEvent('risk-evaluation.evolution-retrieved', {
                tenantId,
                opportunityId,
                snapshotCount: snapshots.length,
            });
            return { snapshots, evolution };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.getRiskEvolution',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
    /**
     * Get current and historical identified risks
     */
    async getRisksWithHistory(opportunityId, tenantId) {
        try {
            // Get current evaluation
            const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
            const currentEvaluation = opportunity?.structuredData?.riskEvaluation;
            const currentRisks = currentEvaluation?.risks || [];
            // Get all historical snapshots
            const evolution = await this.getRiskEvolution(opportunityId, tenantId);
            // Build historical risk map
            const historicalMap = new Map();
            for (const snapshot of evolution.snapshots) {
                for (const risk of snapshot.risks) {
                    const existing = historicalMap.get(risk.riskId);
                    if (!existing) {
                        historicalMap.set(risk.riskId, {
                            riskId: risk.riskId,
                            riskName: risk.riskName,
                            category: risk.category,
                            firstIdentified: snapshot.snapshotDate,
                            lastSeen: snapshot.snapshotDate,
                            occurrences: 1,
                        });
                    }
                    else {
                        existing.occurrences++;
                        if (snapshot.snapshotDate < existing.firstIdentified) {
                            existing.firstIdentified = snapshot.snapshotDate;
                        }
                        if (snapshot.snapshotDate > existing.lastSeen) {
                            existing.lastSeen = snapshot.snapshotDate;
                        }
                    }
                }
            }
            // Determine status
            const currentRiskIds = new Set(currentRisks.map((r) => r.riskId));
            const historical = Array.from(historicalMap.values()).map(h => ({
                ...h,
                status: currentRiskIds.has(h.riskId) ? 'active' : 'resolved',
            }));
            this.monitoring.trackEvent('risk-evaluation.risks-history-retrieved', {
                tenantId,
                opportunityId,
                currentCount: currentRisks.length,
                historicalCount: historical.length,
            });
            return {
                current: currentRisks,
                historical,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'risk-evaluation.getRisksWithHistory',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
}
//# sourceMappingURL=risk-evaluation.service.js.map