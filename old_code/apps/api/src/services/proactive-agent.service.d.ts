/**
 * Proactive Insight Agent Service
 * Background monitoring agents that detect patterns and generate proactive insights
 * Monitors deals at risk, milestone approaching, anomalies, and opportunities
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
export interface ProactiveAgent {
    id: string;
    tenantId: string;
    name: string;
    type: AgentType;
    description: string;
    config: AgentConfig;
    schedule: AgentSchedule;
    shardTypeIds?: string[];
    filters?: Record<string, unknown>;
    isActive: boolean;
    lastRunAt?: Date;
    nextRunAt?: Date;
    lastResult?: AgentResult;
    createdAt: Date;
    createdBy: string;
}
export type AgentType = 'deal_at_risk' | 'milestone_reminder' | 'anomaly_detection' | 'opportunity_finder' | 'relationship_decay' | 'trend_alert' | 'custom';
export interface AgentConfig {
    riskThreshold?: number;
    daysAhead?: number;
    anomalyStdDev?: number;
    lookbackDays?: number;
    minDataPoints?: number;
    rules?: AgentRule[];
    notifyUsers?: string[];
    notifyRoles?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    useAIAnalysis?: boolean;
    contextTemplateId?: string;
}
export interface AgentRule {
    id: string;
    name: string;
    condition: RuleCondition;
    action: RuleAction;
}
export interface RuleCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'changed' | 'increased' | 'decreased';
    value?: unknown;
    percentage?: number;
}
export interface RuleAction {
    type: 'notify' | 'create_insight' | 'create_task' | 'webhook' | 'email';
    config: Record<string, unknown>;
}
export interface AgentSchedule {
    type: 'interval' | 'cron' | 'event';
    intervalMinutes?: number;
    cronExpression?: string;
    eventTriggers?: string[];
}
export interface AgentResult {
    runId: string;
    timestamp: Date;
    duration: number;
    shardsAnalyzed: number;
    insightsGenerated: ProactiveInsight[];
    errors: string[];
    status: 'success' | 'partial' | 'failed';
}
export interface ProactiveInsight {
    id: string;
    agentId: string;
    agentType: AgentType;
    tenantId: string;
    title: string;
    summary: string;
    details?: string;
    shardId: string;
    shardName: string;
    shardTypeId: string;
    confidence: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    evidence: InsightEvidence[];
    suggestedActions: SuggestedAction[];
    status: 'new' | 'acknowledged' | 'dismissed' | 'actioned';
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    createdAt: Date;
    expiresAt?: Date;
}
export interface InsightEvidence {
    type: 'metric' | 'trend' | 'comparison' | 'pattern';
    label: string;
    value: string | number;
    previousValue?: string | number;
    change?: number;
    changePercent?: number;
}
export interface SuggestedAction {
    id: string;
    label: string;
    type: 'navigate' | 'create_task' | 'send_email' | 'schedule_meeting' | 'custom';
    config: Record<string, unknown>;
}
export declare class ProactiveAgentService {
    private readonly shardRepository;
    private readonly redis;
    private readonly monitoring;
    private runningAgents;
    private readonly AGENTS_KEY;
    private readonly INSIGHTS_KEY;
    private readonly QUEUE_KEY;
    private riskEvaluationService?;
    constructor(shardRepository: ShardRepository, redis: Redis, monitoring: IMonitoringProvider, riskEvaluationService?: any);
    /**
     * Create a new proactive agent
     */
    createAgent(tenantId: string, agent: Omit<ProactiveAgent, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt' | 'lastResult'>): Promise<ProactiveAgent>;
    /**
     * Update an agent
     */
    updateAgent(agentId: string, tenantId: string, updates: Partial<ProactiveAgent>): Promise<ProactiveAgent | null>;
    /**
     * Delete an agent
     */
    deleteAgent(agentId: string, tenantId: string): Promise<boolean>;
    /**
     * Get agent by ID
     */
    getAgent(agentId: string, tenantId: string): Promise<ProactiveAgent | null>;
    /**
     * List agents for tenant
     */
    listAgents(tenantId: string): Promise<ProactiveAgent[]>;
    /**
     * Run an agent immediately
     */
    runAgent(agentId: string, tenantId: string): Promise<AgentResult>;
    /**
     * Get insights for a tenant
     */
    getInsights(tenantId: string, options?: {
        status?: string;
        priority?: string;
        agentType?: string;
        limit?: number;
    }): Promise<ProactiveInsight[]>;
    /**
     * Acknowledge an insight
     */
    acknowledgeInsight(insightId: string, tenantId: string, userId: string): Promise<ProactiveInsight | null>;
    /**
     * Dismiss an insight
     */
    dismissInsight(insightId: string, tenantId: string): Promise<boolean>;
    private analyzeDealRisk;
    private analyzeMilestones;
    private analyzeAnomalies;
    private analyzeOpportunities;
    private analyzeRelationshipDecay;
    private analyzeTrends;
    private runCustomRules;
    private getShardsForAgent;
    private createInsight;
    private evaluateCondition;
    private saveAgent;
    private storeInsight;
    private scheduleAgent;
    private unscheduleAgent;
    private calculateNextRun;
    /**
     * Cleanup - call on shutdown
     */
    shutdown(): Promise<void>;
}
export declare function createProactiveAgentService(shardRepository: ShardRepository, redis: Redis, monitoring: IMonitoringProvider, riskEvaluationService?: any): ProactiveAgentService;
//# sourceMappingURL=proactive-agent.service.d.ts.map