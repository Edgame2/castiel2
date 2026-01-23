/**
 * Insight Scheduler Service
 * Schedules recurring AI insights like daily briefings and weekly reviews
 */
import { v4 as uuid } from 'uuid';
// ============================================
// Prompt Templates
// ============================================
const INSIGHT_PROMPTS = {
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
    redis;
    monitoring;
    aiService;
    runningSchedules = new Map();
    SCHEDULES_KEY = 'insights:schedules:';
    RESULTS_KEY = 'insights:results:';
    constructor(redis, monitoring, aiService) {
        this.redis = redis;
        this.monitoring = monitoring;
        this.aiService = aiService;
    }
    // ============================================
    // Schedule Management
    // ============================================
    /**
     * Create a scheduled insight
     */
    async createSchedule(tenantId, schedule) {
        const newSchedule = {
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
    async updateSchedule(scheduleId, tenantId, updates) {
        const schedule = await this.getSchedule(scheduleId, tenantId);
        if (!schedule) {
            return null;
        }
        const updated = {
            ...schedule,
            ...updates,
            id: schedule.id,
            tenantId: schedule.tenantId,
            createdAt: schedule.createdAt,
        };
        if (updates.schedule || updates.timezone) {
            updated.nextRunAt = this.calculateNextRun(updated.schedule, updated.timezone);
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
    async deleteSchedule(scheduleId, tenantId) {
        this.stopSchedule(scheduleId);
        const key = `${this.SCHEDULES_KEY}${tenantId}:${scheduleId}`;
        const deleted = await this.redis.del(key);
        return deleted > 0;
    }
    /**
     * Get schedule by ID
     */
    async getSchedule(scheduleId, tenantId) {
        const key = `${this.SCHEDULES_KEY}${tenantId}:${scheduleId}`;
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    /**
     * List schedules for tenant
     */
    async listSchedules(tenantId, userId) {
        const pattern = `${this.SCHEDULES_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) {
            return [];
        }
        const schedules = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const schedule = JSON.parse(data);
                if (!userId || schedule.userId === userId || !schedule.userId) {
                    schedules.push(schedule);
                }
            }
        }
        return schedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // ============================================
    // Execution
    // ============================================
    /**
     * Run a scheduled insight immediately
     */
    async runSchedule(scheduleId, tenantId) {
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
            const result = {
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
        }
        catch (error) {
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
    async getResults(scheduleId, tenantId, limit = 10) {
        const key = `${this.RESULTS_KEY}${tenantId}:${scheduleId}`;
        const results = await this.redis.lrange(key, 0, limit - 1);
        return results.map(r => JSON.parse(r));
    }
    // ============================================
    // Private Methods
    // ============================================
    buildPrompt(schedule) {
        const template = INSIGHT_PROMPTS[schedule.insightType];
        const now = new Date();
        return template
            .replace('{date}', now.toLocaleDateString())
            .replace('{weekStart}', this.getWeekStart(now).toLocaleDateString())
            .replace('{month}', now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
            .replace('{customPrompt}', schedule.config.customPrompt || '');
    }
    async getContextForSchedule(schedule) {
        // Simplified - would query shards based on config
        return ['Context would be assembled based on schedule configuration'];
    }
    extractTitle(content, type) {
        const titles = {
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
    extractSummary(content) {
        // Extract first paragraph as summary
        const lines = content.split('\n').filter(l => l.trim());
        return lines[0]?.substring(0, 200) || '';
    }
    async deliverInsight(schedule, insight) {
        const results = [];
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
            }
            catch (error) {
                results.push({
                    channel: channel.type,
                    success: false,
                    error: error.message,
                });
            }
        }
        return results;
    }
    async saveSchedule(schedule) {
        const key = `${this.SCHEDULES_KEY}${schedule.tenantId}:${schedule.id}`;
        await this.redis.set(key, JSON.stringify(schedule));
    }
    async storeResult(result) {
        const key = `${this.RESULTS_KEY}${result.tenantId}:${result.scheduleId}`;
        await this.redis.lpush(key, JSON.stringify(result));
        await this.redis.ltrim(key, 0, 99); // Keep last 100 results
    }
    startSchedule(schedule) {
        const intervalMs = this.getIntervalMs(schedule.schedule);
        if (intervalMs <= 0) {
            return;
        }
        const timeout = setInterval(() => {
            this.runSchedule(schedule.id, schedule.tenantId).catch(err => {
                this.monitoring.trackException(err, { scheduleId: schedule.id });
            });
        }, intervalMs);
        this.runningSchedules.set(schedule.id, timeout);
    }
    stopSchedule(scheduleId) {
        const timeout = this.runningSchedules.get(scheduleId);
        if (timeout) {
            clearInterval(timeout);
            this.runningSchedules.delete(scheduleId);
        }
    }
    calculateNextRun(schedule, timezone) {
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
    getIntervalMs(schedule) {
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
    getWeekStart(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d;
    }
    /**
     * Cleanup - call on shutdown
     */
    async shutdown() {
        for (const [_, timeout] of this.runningSchedules) {
            clearInterval(timeout);
        }
        this.runningSchedules.clear();
    }
}
// ============================================
// Factory
// ============================================
export function createInsightSchedulerService(redis, monitoring, aiService) {
    return new InsightSchedulerService(redis, monitoring, aiService);
}
//# sourceMappingURL=insight-scheduler.service.js.map