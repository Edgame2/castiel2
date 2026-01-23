/**
 * Proactive Insight Agent Service
 * Background monitoring agents that detect patterns and generate proactive insights
 * Monitors deals at risk, milestone approaching, anomalies, and opportunities
 */
import { v4 as uuid } from 'uuid';
// ============================================
// Service
// ============================================
export class ProactiveAgentService {
    shardRepository;
    redis;
    monitoring;
    runningAgents = new Map();
    AGENTS_KEY = 'proactive:agents:';
    INSIGHTS_KEY = 'proactive:insights:';
    QUEUE_KEY = 'proactive:queue';
    riskEvaluationService; // RiskEvaluationService - optional for enhanced risk analysis
    constructor(shardRepository, redis, monitoring, riskEvaluationService // Optional: for enhanced risk analysis
    ) {
        this.shardRepository = shardRepository;
        this.redis = redis;
        this.monitoring = monitoring;
        this.riskEvaluationService = riskEvaluationService;
    }
    // ============================================
    // Agent Management
    // ============================================
    /**
     * Create a new proactive agent
     */
    async createAgent(tenantId, agent) {
        const newAgent = {
            ...agent,
            id: `agent_${uuid()}`,
            tenantId,
            createdAt: new Date(),
            nextRunAt: this.calculateNextRun(agent.schedule),
        };
        await this.saveAgent(newAgent);
        if (newAgent.isActive) {
            await this.scheduleAgent(newAgent);
        }
        this.monitoring.trackEvent('proactive-agent.created', {
            tenantId,
            agentId: newAgent.id,
            type: newAgent.type,
        });
        return newAgent;
    }
    /**
     * Update an agent
     */
    async updateAgent(agentId, tenantId, updates) {
        const agent = await this.getAgent(agentId, tenantId);
        if (!agent) {
            return null;
        }
        const updated = {
            ...agent,
            ...updates,
            id: agent.id,
            tenantId: agent.tenantId,
            createdAt: agent.createdAt,
        };
        if (updates.schedule) {
            updated.nextRunAt = this.calculateNextRun(updates.schedule);
        }
        await this.saveAgent(updated);
        // Reschedule if active status changed
        if (updates.isActive !== undefined) {
            if (updates.isActive) {
                await this.scheduleAgent(updated);
            }
            else {
                this.unscheduleAgent(agentId);
            }
        }
        return updated;
    }
    /**
     * Delete an agent
     */
    async deleteAgent(agentId, tenantId) {
        this.unscheduleAgent(agentId);
        const key = `${this.AGENTS_KEY}${tenantId}:${agentId}`;
        const deleted = await this.redis.del(key);
        return deleted > 0;
    }
    /**
     * Get agent by ID
     */
    async getAgent(agentId, tenantId) {
        const key = `${this.AGENTS_KEY}${tenantId}:${agentId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * List agents for tenant
     */
    async listAgents(tenantId) {
        const pattern = `${this.AGENTS_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return [];
        }
        const agents = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                agents.push(JSON.parse(data));
            }
        }
        return agents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // ============================================
    // Agent Execution
    // ============================================
    /**
     * Run an agent immediately
     */
    async runAgent(agentId, tenantId) {
        const agent = await this.getAgent(agentId, tenantId);
        if (!agent) {
            throw new Error('Agent not found');
        }
        const runId = uuid();
        const startTime = Date.now();
        const insights = [];
        const errors = [];
        try {
            // Get shards to analyze
            const shards = await this.getShardsForAgent(agent);
            // Run type-specific analysis
            switch (agent.type) {
                case 'deal_at_risk':
                    insights.push(...await this.analyzeDealRisk(agent, shards));
                    break;
                case 'milestone_reminder':
                    insights.push(...await this.analyzeMilestones(agent, shards));
                    break;
                case 'anomaly_detection':
                    insights.push(...await this.analyzeAnomalies(agent, shards));
                    break;
                case 'opportunity_finder':
                    insights.push(...await this.analyzeOpportunities(agent, shards));
                    break;
                case 'relationship_decay':
                    insights.push(...await this.analyzeRelationshipDecay(agent, shards));
                    break;
                case 'trend_alert':
                    insights.push(...await this.analyzeTrends(agent, shards));
                    break;
                case 'custom':
                    insights.push(...await this.runCustomRules(agent, shards));
                    break;
            }
            // Store insights
            for (const insight of insights) {
                await this.storeInsight(insight);
            }
            const result = {
                runId,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                shardsAnalyzed: shards.length,
                insightsGenerated: insights,
                errors,
                status: errors.length === 0 ? 'success' : 'partial',
            };
            // Update agent with result
            await this.updateAgent(agentId, tenantId, {
                lastRunAt: new Date(),
                nextRunAt: this.calculateNextRun(agent.schedule),
                lastResult: result,
            });
            this.monitoring.trackEvent('proactive-agent.run', {
                tenantId,
                agentId,
                type: agent.type,
                shardsAnalyzed: shards.length,
                insightsGenerated: insights.length,
                durationMs: result.duration,
            });
            return result;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'proactive-agent.run',
                agentId,
            });
            return {
                runId,
                timestamp: new Date(),
                duration: Date.now() - startTime,
                shardsAnalyzed: 0,
                insightsGenerated: [],
                errors: [error.message],
                status: 'failed',
            };
        }
    }
    // ============================================
    // Insight Management
    // ============================================
    /**
     * Get insights for a tenant
     */
    async getInsights(tenantId, options) {
        const pattern = `${this.INSIGHTS_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return [];
        }
        let insights = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                insights.push(JSON.parse(data));
            }
        }
        // Apply filters
        if (options?.status) {
            insights = insights.filter(i => i.status === options.status);
        }
        if (options?.priority) {
            insights = insights.filter(i => i.priority === options.priority);
        }
        if (options?.agentType) {
            insights = insights.filter(i => i.agentType === options.agentType);
        }
        // Sort by priority and date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        insights.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return insights.slice(0, options?.limit || 100);
    }
    /**
     * Acknowledge an insight
     */
    async acknowledgeInsight(insightId, tenantId, userId) {
        const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        const insight = JSON.parse(data);
        insight.status = 'acknowledged';
        insight.acknowledgedBy = userId;
        insight.acknowledgedAt = new Date();
        await this.redis.set(key, JSON.stringify(insight));
        return insight;
    }
    /**
     * Dismiss an insight
     */
    async dismissInsight(insightId, tenantId) {
        const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
        const data = await this.redis.get(key);
        if (!data) {
            return false;
        }
        const insight = JSON.parse(data);
        insight.status = 'dismissed';
        await this.redis.set(key, JSON.stringify(insight));
        return true;
    }
    // ============================================
    // Analysis Methods
    // ============================================
    async analyzeDealRisk(agent, shards) {
        const insights = [];
        const threshold = agent.config.riskThreshold || 0.7;
        for (const shard of shards) {
            // If RiskEvaluationService is available, use it for comprehensive risk analysis
            if (this.riskEvaluationService && shard.shardTypeId === 'c_opportunity') {
                try {
                    const riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(shard.id, shard.tenantId, 'system', // System user for proactive analysis
                    {
                        forceRefresh: false,
                        includeHistorical: true,
                        includeAI: true,
                    });
                    // Check if overall risk score exceeds threshold
                    if (riskEvaluation.overallRiskScore >= threshold) {
                        const evidence = riskEvaluation.detectedRisks.map((risk) => ({
                            type: 'risk',
                            label: risk.riskName,
                            value: risk.confidence,
                            description: risk.explainability,
                        }));
                        insights.push(this.createInsight(agent, shard, {
                            title: `Deal at risk: ${shard.name || shard.id}`,
                            summary: `This deal has a risk score of ${(riskEvaluation.overallRiskScore * 100).toFixed(0)}% with ${riskEvaluation.detectedRisks.length} identified risks`,
                            confidence: riskEvaluation.overallRiskScore,
                            priority: riskEvaluation.overallRiskScore > 0.8 ? 'critical' : 'high',
                            evidence,
                            suggestedActions: [
                                {
                                    id: uuid(),
                                    label: 'View risk analysis',
                                    type: 'navigate',
                                    config: { path: `/shards/${shard.id}?tab=risk-analysis` },
                                },
                                {
                                    id: uuid(),
                                    label: 'Schedule follow-up',
                                    type: 'schedule_meeting',
                                    config: { shardId: shard.id },
                                },
                            ],
                        }));
                        continue; // Skip simple risk analysis below
                    }
                }
                catch (error) {
                    // If risk evaluation fails, fall back to simple analysis
                    this.monitoring.trackException(error, {
                        operation: 'proactive-agent.analyzeDealRisk-riskEvaluation',
                        shardId: shard.id,
                        tenantId: shard.tenantId,
                    });
                    // Fall through to simple risk analysis
                }
            }
            // Simple risk scoring based on common deal fields (fallback)
            const data = shard.structuredData || {};
            let riskScore = 0;
            const evidence = [];
            // Check for stale activity
            if (data.lastActivityAt) {
                const daysSinceActivity = (Date.now() - new Date(data.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceActivity > 14) {
                    riskScore += 0.3;
                    evidence.push({
                        type: 'metric',
                        label: 'Days Since Activity',
                        value: Math.round(daysSinceActivity),
                    });
                }
            }
            // Check for decreasing probability
            if (data.probability !== undefined && data.previousProbability !== undefined) {
                if (data.probability < data.previousProbability) {
                    riskScore += 0.2;
                    evidence.push({
                        type: 'trend',
                        label: 'Probability Change',
                        value: data.probability,
                        previousValue: data.previousProbability,
                        change: data.probability - data.previousProbability,
                    });
                }
            }
            // Check close date proximity
            if (data.closeDate) {
                const daysToClose = (new Date(data.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                if (daysToClose < 7 && daysToClose > 0) {
                    riskScore += 0.2;
                    evidence.push({
                        type: 'metric',
                        label: 'Days to Close',
                        value: Math.round(daysToClose),
                    });
                }
            }
            if (riskScore >= threshold) {
                insights.push(this.createInsight(agent, shard, {
                    title: `Deal at risk: ${shard.name}`,
                    summary: `This deal shows signs of being at risk with a score of ${(riskScore * 100).toFixed(0)}%`,
                    confidence: riskScore,
                    priority: riskScore > 0.8 ? 'critical' : 'high',
                    evidence,
                    suggestedActions: [
                        {
                            id: uuid(),
                            label: 'Schedule follow-up',
                            type: 'schedule_meeting',
                            config: { shardId: shard.id },
                        },
                        {
                            id: uuid(),
                            label: 'View deal details',
                            type: 'navigate',
                            config: { path: `/shards/${shard.id}` },
                        },
                    ],
                }));
            }
        }
        return insights;
    }
    async analyzeMilestones(agent, shards) {
        const insights = [];
        const daysAhead = agent.config.daysAhead || 7;
        const dateFields = ['dueDate', 'closeDate', 'deadline', 'targetDate', 'endDate'];
        for (const shard of shards) {
            const data = shard.structuredData || {};
            for (const field of dateFields) {
                if (data[field]) {
                    const daysUntil = (new Date(data[field]).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    if (daysUntil > 0 && daysUntil <= daysAhead) {
                        const priority = daysUntil <= 1 ? 'critical' : daysUntil <= 3 ? 'high' : 'medium';
                        insights.push(this.createInsight(agent, shard, {
                            title: `Upcoming ${field}: ${shard.name}`,
                            summary: `${field} is in ${Math.round(daysUntil)} day(s)`,
                            confidence: 1,
                            priority,
                            evidence: [{
                                    type: 'metric',
                                    label: 'Days Until',
                                    value: Math.round(daysUntil),
                                }],
                            suggestedActions: [
                                {
                                    id: uuid(),
                                    label: 'Create reminder task',
                                    type: 'create_task',
                                    config: {
                                        shardId: shard.id,
                                        title: `Follow up on ${shard.name}`,
                                    },
                                },
                            ],
                        }));
                    }
                }
            }
        }
        return insights;
    }
    async analyzeAnomalies(agent, shards) {
        // Simplified anomaly detection - in production, use statistical methods
        return [];
    }
    async analyzeOpportunities(agent, shards) {
        // Opportunity pattern detection
        return [];
    }
    async analyzeRelationshipDecay(agent, shards) {
        const insights = [];
        const decayThreshold = 30; // days
        for (const shard of shards) {
            const data = shard.structuredData || {};
            if (data.lastContactDate) {
                const daysSinceContact = (Date.now() - new Date(data.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceContact > decayThreshold) {
                    insights.push(this.createInsight(agent, shard, {
                        title: `Relationship needs attention: ${shard.name}`,
                        summary: `No contact in ${Math.round(daysSinceContact)} days`,
                        confidence: 0.85,
                        priority: daysSinceContact > 60 ? 'high' : 'medium',
                        evidence: [{
                                type: 'metric',
                                label: 'Days Since Contact',
                                value: Math.round(daysSinceContact),
                            }],
                        suggestedActions: [
                            {
                                id: uuid(),
                                label: 'Send check-in email',
                                type: 'send_email',
                                config: { shardId: shard.id },
                            },
                        ],
                    }));
                }
            }
        }
        return insights;
    }
    async analyzeTrends(agent, shards) {
        // Trend analysis - requires historical data
        return [];
    }
    async runCustomRules(agent, shards) {
        const insights = [];
        const rules = agent.config.rules || [];
        for (const shard of shards) {
            const data = shard.structuredData || {};
            for (const rule of rules) {
                if (this.evaluateCondition(rule.condition, data)) {
                    insights.push(this.createInsight(agent, shard, {
                        title: `${rule.name}: ${shard.name}`,
                        summary: `Triggered by rule: ${rule.name}`,
                        confidence: 0.9,
                        priority: agent.config.priority || 'medium',
                        evidence: [{
                                type: 'pattern',
                                label: rule.condition.field,
                                value: data[rule.condition.field],
                            }],
                        suggestedActions: [],
                    }));
                }
            }
        }
        return insights;
    }
    // ============================================
    // Helpers
    // ============================================
    async getShardsForAgent(agent) {
        const result = await this.shardRepository.list({
            filter: {
                tenantId: agent.tenantId,
                shardTypeId: agent.shardTypeIds?.[0],
            },
            limit: 500,
        });
        return result.shards;
    }
    createInsight(agent, shard, data) {
        return {
            id: `insight_${uuid()}`,
            agentId: agent.id,
            agentType: agent.type,
            tenantId: agent.tenantId,
            shardId: shard.id,
            shardName: shard.name,
            shardTypeId: shard.shardTypeId,
            title: data.title || '',
            summary: data.summary || '',
            details: data.details,
            confidence: data.confidence || 0.8,
            priority: data.priority || 'medium',
            evidence: data.evidence || [],
            suggestedActions: data.suggestedActions || [],
            status: 'new',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };
    }
    evaluateCondition(condition, data) {
        const value = data[condition.field];
        switch (condition.operator) {
            case 'eq': return value === condition.value;
            case 'ne': return value !== condition.value;
            case 'gt': return typeof value === 'number' && value > condition.value;
            case 'gte': return typeof value === 'number' && value >= condition.value;
            case 'lt': return typeof value === 'number' && value < condition.value;
            case 'lte': return typeof value === 'number' && value <= condition.value;
            case 'contains': return typeof value === 'string' && value.includes(condition.value);
            default: return false;
        }
    }
    async saveAgent(agent) {
        const key = `${this.AGENTS_KEY}${agent.tenantId}:${agent.id}`;
        await this.redis.set(key, JSON.stringify(agent));
    }
    async storeInsight(insight) {
        const key = `${this.INSIGHTS_KEY}${insight.tenantId}:${insight.id}`;
        await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(insight)); // 7 days TTL
    }
    async scheduleAgent(agent) {
        if (agent.schedule.type === 'interval' && agent.schedule.intervalMinutes) {
            const intervalMs = agent.schedule.intervalMinutes * 60 * 1000;
            const timeout = setInterval(() => {
                this.runAgent(agent.id, agent.tenantId).catch(err => {
                    this.monitoring.trackException(err, { agentId: agent.id });
                });
            }, intervalMs);
            this.runningAgents.set(agent.id, timeout);
        }
    }
    unscheduleAgent(agentId) {
        const timeout = this.runningAgents.get(agentId);
        if (timeout) {
            clearInterval(timeout);
            this.runningAgents.delete(agentId);
        }
    }
    calculateNextRun(schedule) {
        const now = new Date();
        if (schedule.type === 'interval' && schedule.intervalMinutes) {
            return new Date(now.getTime() + schedule.intervalMinutes * 60 * 1000);
        }
        return now;
    }
    /**
     * Cleanup - call on shutdown
     */
    async shutdown() {
        for (const [agentId, timeout] of this.runningAgents) {
            clearInterval(timeout);
        }
        this.runningAgents.clear();
    }
}
// ============================================
// Factory
// ============================================
export function createProactiveAgentService(shardRepository, redis, monitoring, riskEvaluationService // Optional: for enhanced risk analysis
) {
    return new ProactiveAgentService(shardRepository, redis, monitoring, riskEvaluationService);
}
//# sourceMappingURL=proactive-agent.service.js.map