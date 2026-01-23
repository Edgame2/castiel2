/**
 * Insight Scheduler Service
 * Schedules recurring AI insights like daily briefings and weekly reviews
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
export interface ScheduledInsight {
    id: string;
    tenantId: string;
    userId?: string;
    name: string;
    description?: string;
    insightType: ScheduledInsightType;
    schedule: InsightSchedule;
    timezone: string;
    config: InsightConfig;
    delivery: DeliveryConfig;
    isActive: boolean;
    lastRunAt?: Date;
    nextRunAt?: Date;
    lastError?: string;
    createdAt: Date;
    createdBy: string;
}
export type ScheduledInsightType = 'daily_briefing' | 'weekly_review' | 'monthly_report' | 'deal_summary' | 'task_digest' | 'relationship_update' | 'custom';
export interface InsightSchedule {
    type: 'daily' | 'weekly' | 'monthly' | 'cron';
    timeOfDay?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    cronExpression?: string;
    skipWeekends?: boolean;
    skipHolidays?: boolean;
}
export interface InsightConfig {
    shardTypeIds?: string[];
    focusShardIds?: string[];
    tags?: string[];
    dateRange?: 'day' | 'week' | 'month' | 'quarter';
    contextTemplateId?: string;
    assistantId?: string;
    maxLength?: 'brief' | 'standard' | 'detailed';
    includeSections?: string[];
    excludeSections?: string[];
    modelId?: string;
    customPrompt?: string;
}
export interface DeliveryConfig {
    channels: DeliveryChannel[];
}
export type DeliveryChannel = {
    type: 'in_app';
    showNotification: boolean;
} | {
    type: 'email';
    recipients: string[];
} | {
    type: 'slack';
    webhookUrl: string;
    channel: string;
} | {
    type: 'teams';
    webhookUrl: string;
} | {
    type: 'webhook';
    url: string;
    headers?: Record<string, string>;
};
export interface ScheduledInsightResult {
    id: string;
    scheduleId: string;
    tenantId: string;
    title: string;
    content: string;
    summary?: string;
    generatedAt: Date;
    generationTimeMs: number;
    tokensUsed: number;
    deliveryResults: DeliveryResult[];
    status: 'generated' | 'delivered' | 'failed';
}
export interface DeliveryResult {
    channel: string;
    success: boolean;
    deliveredAt?: Date;
    error?: string;
}
export declare class InsightSchedulerService {
    private readonly redis;
    private readonly monitoring;
    private readonly aiService;
    private runningSchedules;
    private readonly SCHEDULES_KEY;
    private readonly RESULTS_KEY;
    constructor(redis: Redis, monitoring: IMonitoringProvider, aiService: {
        generateInsight: (prompt: string, context: string[], options?: any) => Promise<string>;
    });
    /**
     * Create a scheduled insight
     */
    createSchedule(tenantId: string, schedule: Omit<ScheduledInsight, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt'>): Promise<ScheduledInsight>;
    /**
     * Update a scheduled insight
     */
    updateSchedule(scheduleId: string, tenantId: string, updates: Partial<ScheduledInsight>): Promise<ScheduledInsight | null>;
    /**
     * Delete a scheduled insight
     */
    deleteSchedule(scheduleId: string, tenantId: string): Promise<boolean>;
    /**
     * Get schedule by ID
     */
    getSchedule(scheduleId: string, tenantId: string): Promise<ScheduledInsight | null>;
    /**
     * List schedules for tenant
     */
    listSchedules(tenantId: string, userId?: string): Promise<ScheduledInsight[]>;
    /**
     * Run a scheduled insight immediately
     */
    runSchedule(scheduleId: string, tenantId: string): Promise<ScheduledInsightResult>;
    /**
     * Get recent results for a schedule
     */
    getResults(scheduleId: string, tenantId: string, limit?: number): Promise<ScheduledInsightResult[]>;
    private buildPrompt;
    private getContextForSchedule;
    private extractTitle;
    private extractSummary;
    private deliverInsight;
    private saveSchedule;
    private storeResult;
    private startSchedule;
    private stopSchedule;
    private calculateNextRun;
    private getIntervalMs;
    private getWeekStart;
    /**
     * Cleanup - call on shutdown
     */
    shutdown(): Promise<void>;
}
export declare function createInsightSchedulerService(redis: Redis, monitoring: IMonitoringProvider, aiService: {
    generateInsight: (prompt: string, context: string[], options?: any) => Promise<string>;
}): InsightSchedulerService;
//# sourceMappingURL=insight-scheduler.service.d.ts.map