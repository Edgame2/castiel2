/**
 * Proactive Insight Agent Service
 * Background monitoring agents that detect patterns and generate proactive insights
 * Monitors deals at risk, milestone approaching, anomalies, and opportunities
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '@castiel/api-core';
import { v4 as uuid } from 'uuid';

// ============================================
// Types
// ============================================

export interface ProactiveAgent {
  id: string;
  tenantId: string;
  name: string;
  type: AgentType;
  description: string;
  
  // Configuration
  config: AgentConfig;
  
  // Schedule
  schedule: AgentSchedule;
  
  // Targeting
  shardTypeIds?: string[];
  filters?: Record<string, unknown>;
  
  // Status
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastResult?: AgentResult;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
}

export type AgentType =
  | 'deal_at_risk'        // Detect deals with declining signals
  | 'milestone_reminder'  // Upcoming deadlines/milestones
  | 'anomaly_detection'   // Statistical anomalies
  | 'opportunity_finder'  // New opportunities from data patterns
  | 'relationship_decay'  // Relationships needing attention
  | 'trend_alert'         // Significant trend changes
  | 'custom';             // Custom agent with user-defined rules

export interface AgentConfig {
  // Thresholds
  riskThreshold?: number;        // 0-1, triggers when exceeded
  daysAhead?: number;            // For milestone reminders
  anomalyStdDev?: number;        // Standard deviations for anomaly
  
  // Analysis
  lookbackDays?: number;         // Days of history to analyze
  minDataPoints?: number;        // Minimum data points required
  
  // Custom rules (for custom agents)
  rules?: AgentRule[];
  
  // Notification
  notifyUsers?: string[];
  notifyRoles?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  
  // AI enhancement
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
  percentage?: number;  // For increased/decreased
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
  
  // Insight details
  title: string;
  summary: string;
  details?: string;
  
  // Related data
  shardId: string;
  shardName: string;
  shardTypeId: string;
  
  // Scoring
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Evidence
  evidence: InsightEvidence[];
  
  // Actions
  suggestedActions: SuggestedAction[];
  
  // Status
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

// ============================================
// Service
// ============================================

export class ProactiveAgentService {
  private runningAgents: Map<string, NodeJS.Timeout> = new Map();
  private readonly AGENTS_KEY = 'proactive:agents:';
  private readonly INSIGHTS_KEY = 'proactive:insights:';
  private readonly QUEUE_KEY = 'proactive:queue';

  private riskEvaluationService?: any; // RiskEvaluationService - optional for enhanced risk analysis

  constructor(
    private readonly shardRepository: ShardRepository,
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider,
    riskEvaluationService?: any // Optional: for enhanced risk analysis
  ) {
    this.riskEvaluationService = riskEvaluationService;
  }

  // ============================================
  // Agent Management
  // ============================================

  /**
   * Create a new proactive agent
   */
  async createAgent(
    tenantId: string,
    agent: Omit<ProactiveAgent, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt' | 'lastResult'>
  ): Promise<ProactiveAgent> {
    const newAgent: ProactiveAgent = {
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
  async updateAgent(
    agentId: string,
    tenantId: string,
    updates: Partial<ProactiveAgent>
  ): Promise<ProactiveAgent | null> {
    const agent = await this.getAgent(agentId, tenantId);
    if (!agent) {return null;}

    const updated: ProactiveAgent = {
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
      } else {
        this.unscheduleAgent(agentId);
      }
    }

    return updated;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, tenantId: string): Promise<boolean> {
    this.unscheduleAgent(agentId);
    const key = `${this.AGENTS_KEY}${tenantId}:${agentId}`;
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string, tenantId: string): Promise<ProactiveAgent | null> {
    const key = `${this.AGENTS_KEY}${tenantId}:${agentId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List agents for tenant
   */
  async listAgents(tenantId: string): Promise<ProactiveAgent[]> {
    const pattern = `${this.AGENTS_KEY}${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) {return [];}

    const agents: ProactiveAgent[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        agents.push(JSON.parse(data));
      }
    }

    return agents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ============================================
  // Agent Execution
  // ============================================

  /**
   * Run an agent immediately
   */
  async runAgent(agentId: string, tenantId: string): Promise<AgentResult> {
    const agent = await this.getAgent(agentId, tenantId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const runId = uuid();
    const startTime = Date.now();
    const insights: ProactiveInsight[] = [];
    const errors: string[] = [];

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

      const result: AgentResult = {
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
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'proactive-agent.run',
        agentId,
      });

      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        runId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        shardsAnalyzed: 0,
        insightsGenerated: [],
        errors: [errorMessage],
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
  async getInsights(
    tenantId: string,
    options?: {
      status?: string;
      priority?: string;
      agentType?: string;
      limit?: number;
    }
  ): Promise<ProactiveInsight[]> {
    const pattern = `${this.INSIGHTS_KEY}${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) {return [];}

    let insights: ProactiveInsight[] = [];
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
      if (priorityDiff !== 0) {return priorityDiff;}
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return insights.slice(0, options?.limit || 100);
  }

  /**
   * Acknowledge an insight
   */
  async acknowledgeInsight(
    insightId: string,
    tenantId: string,
    userId: string
  ): Promise<ProactiveInsight | null> {
    const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
    const data = await this.redis.get(key);
    if (!data) {return null;}

    const insight: ProactiveInsight = JSON.parse(data);
    insight.status = 'acknowledged';
    insight.acknowledgedBy = userId;
    insight.acknowledgedAt = new Date();

    await this.redis.set(key, JSON.stringify(insight));
    return insight;
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string, tenantId: string): Promise<boolean> {
    const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
    const data = await this.redis.get(key);
    if (!data) {return false;}

    const insight: ProactiveInsight = JSON.parse(data);
    insight.status = 'dismissed';

    await this.redis.set(key, JSON.stringify(insight));
    return true;
  }

  // ============================================
  // Analysis Methods
  // ============================================

  private async analyzeDealRisk(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    const threshold = agent.config.riskThreshold || 0.7;

    for (const shard of shards) {
      // If RiskEvaluationService is available, use it for comprehensive risk analysis
      if (this.riskEvaluationService && shard.shardTypeId === 'c_opportunity') {
        try {
          const riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(
            shard.id,
            shard.tenantId,
            'system', // System user for proactive analysis
            {
              forceRefresh: false,
              includeHistorical: true,
              includeAI: true,
            }
          );

          // Check if overall risk score exceeds threshold
          if (riskEvaluation.overallRiskScore >= threshold) {
            const evidence: InsightEvidence[] = riskEvaluation.detectedRisks.map((risk: any) => ({
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
        } catch (error) {
          // If risk evaluation fails, fall back to simple analysis
          this.monitoring.trackException(error as Error, {
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
      const evidence: InsightEvidence[] = [];

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

  private async analyzeMilestones(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
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

  private async analyzeAnomalies(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    // Simplified anomaly detection - in production, use statistical methods
    return [];
  }

  private async analyzeOpportunities(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    // Opportunity pattern detection
    return [];
  }

  private async analyzeRelationshipDecay(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
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

  private async analyzeTrends(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    // Trend analysis - requires historical data
    return [];
  }

  private async runCustomRules(agent: ProactiveAgent, shards: any[]): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
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

  private async getShardsForAgent(agent: ProactiveAgent): Promise<any[]> {
    const result = await this.shardRepository.list({
      filter: {
        tenantId: agent.tenantId,
        shardTypeId: agent.shardTypeIds?.[0],
      },
      limit: 500,
    });
    return result.shards;
  }

  private createInsight(
    agent: ProactiveAgent,
    shard: any,
    data: Partial<ProactiveInsight>
  ): ProactiveInsight {
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

  private evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
    const value = data[condition.field];
    
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return typeof value === 'number' && value > (condition.value as number);
      case 'gte': return typeof value === 'number' && value >= (condition.value as number);
      case 'lt': return typeof value === 'number' && value < (condition.value as number);
      case 'lte': return typeof value === 'number' && value <= (condition.value as number);
      case 'contains': return typeof value === 'string' && value.includes(condition.value as string);
      default: return false;
    }
  }

  private async saveAgent(agent: ProactiveAgent): Promise<void> {
    const key = `${this.AGENTS_KEY}${agent.tenantId}:${agent.id}`;
    await this.redis.set(key, JSON.stringify(agent));
  }

  private async storeInsight(insight: ProactiveInsight): Promise<void> {
    const key = `${this.INSIGHTS_KEY}${insight.tenantId}:${insight.id}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(insight)); // 7 days TTL
  }

  private async scheduleAgent(agent: ProactiveAgent): Promise<void> {
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

  private unscheduleAgent(agentId: string): void {
    const timeout = this.runningAgents.get(agentId);
    if (timeout) {
      clearInterval(timeout);
      this.runningAgents.delete(agentId);
    }
  }

  private calculateNextRun(schedule: AgentSchedule): Date {
    const now = new Date();
    if (schedule.type === 'interval' && schedule.intervalMinutes) {
      return new Date(now.getTime() + schedule.intervalMinutes * 60 * 1000);
    }
    return now;
  }

  /**
   * Cleanup - call on shutdown
   */
  async shutdown(): Promise<void> {
    for (const [agentId, timeout] of this.runningAgents) {
      clearInterval(timeout);
    }
    this.runningAgents.clear();
  }
}

// ============================================
// Factory
// ============================================

export function createProactiveAgentService(
  shardRepository: ShardRepository,
  redis: Redis,
  monitoring: IMonitoringProvider,
  riskEvaluationService?: any // Optional: for enhanced risk analysis
): ProactiveAgentService {
  return new ProactiveAgentService(shardRepository, redis, monitoring, riskEvaluationService);
}











