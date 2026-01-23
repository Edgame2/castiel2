/**
 * Proactive Insights Types
 *
 * Foundation for automated, event-driven insights that detect important conditions
 * and proactively alert users. Integrates with the AI Insights system.
 *
 * @see docs/features/ai-insights/README.md
 */
// ============================================
// Default Triggers
// ============================================
/**
 * Default system triggers (can be customized per tenant)
 */
export const DEFAULT_PROACTIVE_TRIGGERS = [
    {
        name: 'Stale Opportunity',
        description: 'Opportunity has had no activity in the last 14 days',
        type: 'stale_opportunity',
        shardTypeId: 'c_opportunity',
        conditions: [
            { field: 'structuredData.lastActivityDate', operator: 'lt', relativeDate: '-14d' },
            { field: 'structuredData.stage', operator: 'nin', value: ['won', 'lost', 'closed'] },
        ],
        priority: 'high',
        cooldownHours: 168, // 1 week
        schedule: { cron: '0 9 * * 1-5' }, // 9 AM weekdays
        isActive: true,
        isSystem: true,
    },
    {
        name: 'Deal At Risk - No Activity',
        description: 'High-value deal with no activity in 7 days',
        type: 'deal_at_risk',
        shardTypeId: 'c_opportunity',
        conditions: {
            operator: 'and',
            conditions: [
                { field: 'structuredData.value', operator: 'gte', value: 50000 },
                { field: 'structuredData.lastActivityDate', operator: 'lt', relativeDate: '-7d' },
                { field: 'structuredData.stage', operator: 'nin', value: ['won', 'lost'] },
            ],
        },
        priority: 'critical',
        cooldownHours: 72, // 3 days
        schedule: { cron: '0 9 * * *' }, // Daily 9 AM
        isActive: true,
        isSystem: true,
    },
    {
        name: 'Close Date Approaching',
        description: 'Expected close date is within the next 7 days',
        type: 'milestone_approaching',
        shardTypeId: 'c_opportunity',
        conditions: [
            { field: 'structuredData.expectedCloseDate', operator: 'lte', relativeDate: '+7d' },
            { field: 'structuredData.expectedCloseDate', operator: 'gte', relativeDate: 'today' },
            { field: 'structuredData.stage', operator: 'nin', value: ['won', 'lost'] },
        ],
        priority: 'high',
        cooldownHours: 24,
        schedule: { cron: '0 9 * * *' },
        isActive: true,
        isSystem: true,
    },
    {
        name: 'Missing Follow-Up',
        description: 'Follow-up task is overdue',
        type: 'missing_follow_up',
        shardTypeId: 'c_task',
        conditions: [
            { field: 'structuredData.type', operator: 'eq', value: 'follow_up' },
            { field: 'structuredData.dueDate', operator: 'lt', relativeDate: 'today' },
            { field: 'structuredData.status', operator: 'neq', value: 'completed' },
        ],
        priority: 'medium',
        cooldownHours: 24,
        eventTriggers: ['shard.updated'],
        isActive: true,
        isSystem: true,
    },
    {
        name: 'Relationship Cooling',
        description: 'Key contact engagement has decreased significantly',
        type: 'relationship_cooling',
        shardTypeId: 'c_contact',
        conditions: [
            { field: 'structuredData.engagementScore', operator: 'lt', value: 30 },
            { field: 'structuredData.lastInteractionDate', operator: 'lt', relativeDate: '-30d' },
            { field: 'structuredData.importance', operator: 'in', value: ['key', 'champion', 'decision_maker'] },
        ],
        priority: 'medium',
        cooldownHours: 168, // 1 week
        schedule: { cron: '0 9 * * 1' }, // Weekly Monday 9 AM
        isActive: true,
        isSystem: true,
    },
    {
        name: 'Project Deadline Approaching',
        description: 'Project milestone due within 3 days',
        type: 'milestone_approaching',
        shardTypeId: 'c_project',
        conditions: [
            { field: 'structuredData.nextMilestoneDate', operator: 'lte', relativeDate: '+3d' },
            { field: 'structuredData.nextMilestoneDate', operator: 'gte', relativeDate: 'today' },
            { field: 'structuredData.status', operator: 'eq', value: 'active' },
        ],
        priority: 'high',
        cooldownHours: 24,
        schedule: { cron: '0 9 * * *' },
        isActive: true,
        isSystem: true,
    },
];
//# sourceMappingURL=proactive-insights.types.js.map