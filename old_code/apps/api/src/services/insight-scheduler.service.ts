/**
 * Insight Scheduler Service
 * Schedules recurring AI insights like daily briefings and weekly reviews
 */

import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuid } from 'uuid';

// ============================================
// Types
// ============================================

export interface ScheduledInsight {
  id: string;
  tenantId: string;
  userId?: string;  // If user-specific
  
  // Configuration
  name: string;
  description?: string;
  insightType: ScheduledInsightType;
  
  // Schedule
  schedule: InsightSchedule;
  timezone: string;
  
  // Content configuration
  config: InsightConfig;
  
  // Delivery
  delivery: DeliveryConfig;
  
  // Status
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastError?: string;
  
  createdAt: Date;
  createdBy: string;
}

export type ScheduledInsightType =
  | 'daily_briefing'      // Morning summary of key updates
  | 'weekly_review'       // Weekly performance/activity summary
  | 'monthly_report'      // Monthly comprehensive report
  | 'deal_summary'        // Deal pipeline summary
  | 'task_digest'         // Upcoming tasks and deadlines
  | 'relationship_update' // Relationship health summary
  | 'custom';             // Custom insight template

export interface InsightSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'cron';
  
  // For daily
  timeOfDay?: string;     // HH:mm format
  
  // For weekly
  dayOfWeek?: number;     // 0-6 (Sunday-Saturday)
  
  // For monthly
  dayOfMonth?: number;    // 1-31
  
  // For cron
  cronExpression?: string;
  
  // Skip conditions
  skipWeekends?: boolean;
  skipHolidays?: boolean;
}

export interface InsightConfig {
  // Context
  shardTypeIds?: string[];
  focusShardIds?: string[];
  tags?: string[];
  dateRange?: 'day' | 'week' | 'month' | 'quarter';
  
  // Content
  contextTemplateId?: string;
  assistantId?: string;
  maxLength?: 'brief' | 'standard' | 'detailed';
  includeSections?: string[];
  excludeSections?: string[];
  
  // AI model
  modelId?: string;
  
  // Custom prompt additions
  customPrompt?: string;
}

export interface DeliveryConfig {
  channels: DeliveryChannel[];
}

export type DeliveryChannel =
  | { type: 'in_app'; showNotification: boolean }
  | { type: 'email'; recipients: string[] }
  | { type: 'slack'; webhookUrl: string; channel: string }
  | { type: 'teams'; webhookUrl: string }
  | { type: 'webhook'; url: string; headers?: Record<string, string> };

export interface ScheduledInsightResult {
  id: string;
  scheduleId: string;
  tenantId: string;
  
  // Generated content
  title: string;
  content: string;
  summary?: string;
  
  // Metrics
  generatedAt: Date;
  generationTimeMs: number;
  tokensUsed: number;
  
  // Delivery status
  deliveryResults: DeliveryResult[];
  
  // Status
  status: 'generated' | 'delivered' | 'failed';
}

export interface DeliveryResult {
  channel: string;
  success: boolean;
  deliveredAt?: Date;
  error?: string;
}

// ============================================
// Prompt Templates
// ============================================

const INSIGHT_PROMPTS: Record<ScheduledInsightType, string> = {
  daily_briefing: `Generate a daily briefing for {date}.

Context:
{context}

Include:
1. **Key Updates** - Important changes since yesterday
2. **Today's Priorities** - Tasks and meetings due today
3. **Attention Items** - Things that need immediate attention
4. **Quick Metrics** - Key numbers at a glance

Keep it concise and actionable. Focus on what matters most.`,

  weekly_review: `Generate a weekly review for the week of {weekStart}.

Context:
{context}

Include:
1. **Week Summary** - Overview of the week's activities
2. **Key Achievements** - What was accomplished
3. **Metrics Comparison** - This week vs last week
4. **Challenges Faced** - Issues encountered
5. **Next Week Focus** - Priorities for upcoming week

Be analytical and highlight trends.`,

  monthly_report: `Generate a monthly report for {month}.

Context:
{context}

Include:
1. **Executive Summary** - High-level overview
2. **Key Metrics** - Performance indicators with trends
3. **Major Accomplishments** - Significant achievements
4. **Challenges & Learnings** - Issues and what we learned
5. **Next Month Outlook** - Predictions and focus areas

Be comprehensive but highlight the most important points.`,

  deal_summary: `Generate a deal pipeline summary.

Context:
{context}

Include:
1. **Pipeline Overview** - Total value and count by stage
2. **Hot Deals** - Deals closing soon or high value
3. **At Risk** - Deals that need attention
4. **Recent Changes** - New deals, stage changes, closures
5. **Forecast** - Expected closures this period

Focus on actionable insights for sales.`,

  task_digest: `Generate a task digest.

Context:
{context}

Include:
1. **Overdue** - Tasks past their due date
2. **Due Today** - Tasks due today
3. **Coming Up** - Tasks due this week
4. **Blocked** - Tasks with blockers
5. **Summary** - Overall task health

Prioritize by urgency and importance.`,

  relationship_update: `Generate a relationship health update.

Context:
{context}

Include:
1. **Relationships Needing Attention** - No recent contact
2. **Active Relationships** - Recent positive interactions
3. **At Risk** - Declining engagement signals
4. **New Connections** - Recently added relationships
5. **Recommendations** - Suggested follow-ups

Focus on maintaining healthy relationships.`,

  custom: `{customPrompt}

Context:
{context}`,
};

// ============================================
// Service
// ============================================

export class InsightSchedulerService {
  private runningSchedules: Map<string, NodeJS.Timeout> = new Map();
  private readonly SCHEDULES_KEY = 'insights:schedules:';
  private readonly RESULTS_KEY = 'insights:results:';

  constructor(
    private readonly redis: Redis,
    private readonly monitoring: IMonitoringProvider,
    private readonly aiService: {
      generateInsight: (prompt: string, context: string[], options?: any) => Promise<string>;
    }
  ) {}

  // ============================================
  // Schedule Management
  // ============================================

  /**
   * Create a scheduled insight
   */
  async createSchedule(
    tenantId: string,
    schedule: Omit<ScheduledInsight, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt'>
  ): Promise<ScheduledInsight> {
    const newSchedule: ScheduledInsight = {
      ...schedule,
      id: `sched_${uuid()}`,
      tenantId,
      createdAt: new Date(),
      nextRunAt: this.calculateNextRun(schedule.schedule, schedule.timezone),
    };

    await this.saveSchedule(newSchedule);

    if (newSchedule.isActive) {
      this.startSchedule(newSchedule);
    }

    this.monitoring.trackEvent('insight-schedule.created', {
      tenantId,
      scheduleId: newSchedule.id,
      type: newSchedule.insightType,
    });

    return newSchedule;
  }

  /**
   * Update a scheduled insight
   */
  async updateSchedule(
    scheduleId: string,
    tenantId: string,
    updates: Partial<ScheduledInsight>
  ): Promise<ScheduledInsight | null> {
    const schedule = await this.getSchedule(scheduleId, tenantId);
    if (!schedule) {return null;}

    const updated: ScheduledInsight = {
      ...schedule,
      ...updates,
      id: schedule.id,
      tenantId: schedule.tenantId,
      createdAt: schedule.createdAt,
    };

    if (updates.schedule || updates.timezone) {
      updated.nextRunAt = this.calculateNextRun(
        updated.schedule,
        updated.timezone
      );
    }

    await this.saveSchedule(updated);

    // Reschedule if active status changed
    this.stopSchedule(scheduleId);
    if (updated.isActive) {
      this.startSchedule(updated);
    }

    return updated;
  }

  /**
   * Delete a scheduled insight
   */
  async deleteSchedule(scheduleId: string, tenantId: string): Promise<boolean> {
    this.stopSchedule(scheduleId);
    const key = `${this.SCHEDULES_KEY}${tenantId}:${scheduleId}`;
    const deleted = await this.redis.del(key);
    return deleted > 0;
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string, tenantId: string): Promise<ScheduledInsight | null> {
    const key = `${this.SCHEDULES_KEY}${tenantId}:${scheduleId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List schedules for tenant
   */
  async listSchedules(tenantId: string, userId?: string): Promise<ScheduledInsight[]> {
    const pattern = `${this.SCHEDULES_KEY}${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) {return [];}

    const schedules: ScheduledInsight[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const schedule = JSON.parse(data);
        if (!userId || schedule.userId === userId || !schedule.userId) {
          schedules.push(schedule);
        }
      }
    }

    return schedules.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ============================================
  // Execution
  // ============================================

  /**
   * Run a scheduled insight immediately
   */
  async runSchedule(scheduleId: string, tenantId: string): Promise<ScheduledInsightResult> {
    const schedule = await this.getSchedule(scheduleId, tenantId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const startTime = Date.now();
    const resultId = uuid();

    try {
      // Build prompt
      const prompt = this.buildPrompt(schedule);
      
      // Get context (simplified - would use context template service in production)
      const context = await this.getContextForSchedule(schedule);
      
      // Generate insight
      const content = await this.aiService.generateInsight(prompt, context, {
        modelId: schedule.config.modelId,
      });

      // Parse and structure the response
      const title = this.extractTitle(content, schedule.insightType);
      const summary = this.extractSummary(content);

      // Deliver to channels
      const deliveryResults = await this.deliverInsight(schedule, {
        title,
        content,
        summary,
      });

      const result: ScheduledInsightResult = {
        id: resultId,
        scheduleId,
        tenantId,
        title,
        content,
        summary,
        generatedAt: new Date(),
        generationTimeMs: Date.now() - startTime,
        tokensUsed: 0, // Would be returned from AI service
        deliveryResults,
        status: deliveryResults.every(r => r.success) ? 'delivered' : 'failed',
      };

      // Store result
      await this.storeResult(result);

      // Update schedule
      await this.updateSchedule(scheduleId, tenantId, {
        lastRunAt: new Date(),
        nextRunAt: this.calculateNextRun(schedule.schedule, schedule.timezone),
        lastError: undefined,
      });

      this.monitoring.trackEvent('insight-schedule.executed', {
        tenantId,
        scheduleId,
        type: schedule.insightType,
        durationMs: result.generationTimeMs,
        deliveredCount: deliveryResults.filter(r => r.success).length,
      });

      return result;
    } catch (error: any) {
      // Update schedule with error
      await this.updateSchedule(scheduleId, tenantId, {
        lastRunAt: new Date(),
        nextRunAt: this.calculateNextRun(schedule.schedule, schedule.timezone),
        lastError: error.message,
      });

      this.monitoring.trackException(error, {
        operation: 'insight-schedule.execute',
        scheduleId,
      });

      throw error;
    }
  }

  /**
   * Get recent results for a schedule
   */
  async getResults(scheduleId: string, tenantId: string, limit = 10): Promise<ScheduledInsightResult[]> {
    const key = `${this.RESULTS_KEY}${tenantId}:${scheduleId}`;
    const results = await this.redis.lrange(key, 0, limit - 1);
    return results.map(r => JSON.parse(r));
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildPrompt(schedule: ScheduledInsight): string {
    const template = INSIGHT_PROMPTS[schedule.insightType];
    const now = new Date();

    return template
      .replace('{date}', now.toLocaleDateString())
      .replace('{weekStart}', this.getWeekStart(now).toLocaleDateString())
      .replace('{month}', now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
      .replace('{customPrompt}', schedule.config.customPrompt || '');
  }

  private async getContextForSchedule(schedule: ScheduledInsight): Promise<string[]> {
    // Simplified - would query shards based on config
    return ['Context would be assembled based on schedule configuration'];
  }

  private extractTitle(content: string, type: ScheduledInsightType): string {
    const titles: Record<ScheduledInsightType, string> = {
      daily_briefing: `Daily Briefing - ${new Date().toLocaleDateString()}`,
      weekly_review: `Weekly Review - Week of ${this.getWeekStart(new Date()).toLocaleDateString()}`,
      monthly_report: `Monthly Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      deal_summary: 'Deal Pipeline Summary',
      task_digest: 'Task Digest',
      relationship_update: 'Relationship Health Update',
      custom: 'Custom Insight',
    };
    return titles[type];
  }

  private extractSummary(content: string): string {
    // Extract first paragraph as summary
    const lines = content.split('\n').filter(l => l.trim());
    return lines[0]?.substring(0, 200) || '';
  }

  private async deliverInsight(
    schedule: ScheduledInsight,
    insight: { title: string; content: string; summary?: string }
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const channel of schedule.delivery.channels) {
      try {
        switch (channel.type) {
          case 'in_app':
            // Store for in-app display
            results.push({
              channel: 'in_app',
              success: true,
              deliveredAt: new Date(),
            });
            break;

          case 'email':
            // Would integrate with email service
            results.push({
              channel: 'email',
              success: true,
              deliveredAt: new Date(),
            });
            break;

          case 'webhook':
            const response = await fetch(channel.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...channel.headers,
              },
              body: JSON.stringify(insight),
            });
            results.push({
              channel: 'webhook',
              success: response.ok,
              deliveredAt: new Date(),
              error: response.ok ? undefined : `HTTP ${response.status}`,
            });
            break;

          default:
            results.push({
              channel: channel.type,
              success: false,
              error: 'Channel not implemented',
            });
        }
      } catch (error: any) {
        results.push({
          channel: channel.type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async saveSchedule(schedule: ScheduledInsight): Promise<void> {
    const key = `${this.SCHEDULES_KEY}${schedule.tenantId}:${schedule.id}`;
    await this.redis.set(key, JSON.stringify(schedule));
  }

  private async storeResult(result: ScheduledInsightResult): Promise<void> {
    const key = `${this.RESULTS_KEY}${result.tenantId}:${result.scheduleId}`;
    await this.redis.lpush(key, JSON.stringify(result));
    await this.redis.ltrim(key, 0, 99); // Keep last 100 results
  }

  private startSchedule(schedule: ScheduledInsight): void {
    const intervalMs = this.getIntervalMs(schedule.schedule);
    if (intervalMs <= 0) {return;}

    const timeout = setInterval(() => {
      this.runSchedule(schedule.id, schedule.tenantId).catch(err => {
        this.monitoring.trackException(err, { scheduleId: schedule.id });
      });
    }, intervalMs);

    this.runningSchedules.set(schedule.id, timeout);
  }

  private stopSchedule(scheduleId: string): void {
    const timeout = this.runningSchedules.get(scheduleId);
    if (timeout) {
      clearInterval(timeout);
      this.runningSchedules.delete(scheduleId);
    }
  }

  private calculateNextRun(schedule: InsightSchedule, timezone: string): Date {
    const now = new Date();
    
    switch (schedule.type) {
      case 'daily':
        const [hours, minutes] = (schedule.timeOfDay || '09:00').split(':').map(Number);
        const nextDaily = new Date(now);
        nextDaily.setHours(hours, minutes, 0, 0);
        if (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;

      case 'weekly':
        const nextWeekly = new Date(now);
        const targetDay = schedule.dayOfWeek || 1;
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        nextWeekly.setDate(now.getDate() + daysUntil);
        nextWeekly.setHours(9, 0, 0, 0);
        return nextWeekly;

      case 'monthly':
        const nextMonthly = new Date(now);
        nextMonthly.setDate(schedule.dayOfMonth || 1);
        nextMonthly.setHours(9, 0, 0, 0);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private getIntervalMs(schedule: InsightSchedule): number {
    switch (schedule.type) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  /**
   * Cleanup - call on shutdown
   */
  async shutdown(): Promise<void> {
    for (const [_, timeout] of this.runningSchedules) {
      clearInterval(timeout);
    }
    this.runningSchedules.clear();
  }
}

// ============================================
// Factory
// ============================================

export function createInsightSchedulerService(
  redis: Redis,
  monitoring: IMonitoringProvider,
  aiService: { generateInsight: (prompt: string, context: string[], options?: any) => Promise<string> }
): InsightSchedulerService {
  return new InsightSchedulerService(redis, monitoring, aiService);
}











