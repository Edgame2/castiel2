/**
 * Proactive Insights Types
 *
 * Foundation for automated, event-driven insights that detect important conditions
 * and proactively alert users. Integrates with the AI Insights system.
 *
 * @see docs/features/ai-insights/README.md
 */
/**
 * Types of proactive insights the system can generate
 * Each type maps to specific business conditions that warrant user attention
 */
export type ProactiveInsightType = 'deal_at_risk' | 'milestone_approaching' | 'stale_opportunity' | 'missing_follow_up' | 'relationship_cooling' | 'action_required';
/**
 * Priority levels for proactive insights
 * Determines notification urgency and UI prominence
 */
export type ProactiveInsightPriority = 'critical' | 'high' | 'medium' | 'low';
/**
 * Status of a proactive insight
 */
export type ProactiveInsightStatus = 'pending' | 'delivered' | 'acknowledged' | 'actioned' | 'dismissed' | 'expired';
/**
 * Comparison operators for trigger conditions
 */
export type TriggerOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null' | 'changed' | 'changed_to' | 'changed_from';
/**
 * Single trigger condition that evaluates a field against a value
 */
export interface TriggerCondition {
    /** Field path to evaluate (supports dot notation: "structuredData.stage") */
    field: string;
    /** Comparison operator */
    operator: TriggerOperator;
    /** Value to compare against (not required for is_null/is_not_null) */
    value?: unknown;
    /** For date fields: relative time expression (e.g., "-7d", "-1w", "today") */
    relativeDate?: string;
    /** Optional description for documentation */
    description?: string;
}
/**
 * Logical grouping of conditions
 */
export interface TriggerConditionGroup {
    /** Logical operator to combine conditions */
    operator: 'and' | 'or';
    /** Nested conditions or groups */
    conditions: (TriggerCondition | TriggerConditionGroup)[];
}
/**
 * Time-based schedule for trigger evaluation
 */
export interface TriggerSchedule {
    /** Cron expression for scheduling (e.g., "0 9 * * 1-5" for 9 AM weekdays) */
    cron?: string;
    /** Or interval in minutes */
    intervalMinutes?: number;
    /** Timezone for cron evaluation */
    timezone?: string;
}
/**
 * Proactive trigger configuration
 * Defines when and how to detect conditions that warrant insights
 */
export interface ProactiveTrigger {
    /** Unique identifier */
    id: string;
    /** Tenant this trigger belongs to */
    tenantId: string;
    /** Human-readable name */
    name: string;
    /** Detailed description */
    description?: string;
    /** Type of insight this trigger generates */
    type: ProactiveInsightType;
    /** ShardType this trigger applies to (e.g., "c_opportunity", "c_project") */
    shardTypeId: string;
    /** Conditions that must be met to fire the trigger */
    conditions: TriggerCondition[] | TriggerConditionGroup;
    /** Priority of generated insights */
    priority: ProactiveInsightPriority;
    /** Minimum hours between insights for the same shard */
    cooldownHours: number;
    /** Schedule for trigger evaluation (if not event-driven) */
    schedule?: TriggerSchedule;
    /** Event types that should trigger evaluation */
    eventTriggers?: string[];
    /** Template for generating insight content (optional - uses AI if not provided) */
    messageTemplate?: string;
    /** Context template ID to use for AI generation */
    contextTemplateId?: string;
    /** Additional metadata for insight generation */
    metadata?: Record<string, unknown>;
    /** Whether this trigger is active */
    isActive: boolean;
    /** Whether this is a system-defined trigger */
    isSystem: boolean;
    /** Created by user ID */
    createdBy: string;
    /** Audit timestamps */
    createdAt: Date;
    updatedAt: Date;
    /** Statistics */
    lastTriggeredAt?: Date;
    triggerCount: number;
}
/**
 * Delivery channels for proactive insights
 */
export type DeliveryChannel = 'in_app' | 'dashboard' | 'email' | 'email_digest' | 'webhook';
/**
 * Email digest frequency
 */
export type DigestFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';
/**
 * Delivery preferences for a user
 */
export interface DeliveryPreferences {
    /** User ID these preferences belong to */
    userId: string;
    /** Tenant ID */
    tenantId: string;
    /** Per-channel configuration */
    channels: {
        in_app: {
            enabled: boolean;
            /** Minimum priority to show as push notification vs silent */
            pushThreshold: ProactiveInsightPriority;
        };
        dashboard: {
            enabled: boolean;
            /** Maximum insights to show in widget */
            maxItems: number;
            /** Group by type */
            groupByType: boolean;
        };
        email: {
            enabled: boolean;
            /** Minimum priority for immediate email */
            immediateThreshold: ProactiveInsightPriority;
            /** Otherwise use digest */
            digestFrequency: DigestFrequency;
            /** Time to send digest (HH:mm in user's timezone) */
            digestTime?: string;
        };
        webhook: {
            enabled: boolean;
            /** Webhook URL */
            url?: string;
            /** Custom headers */
            headers?: Record<string, string>;
            /** Secret for HMAC signature */
            secret?: string;
        };
    };
    /** Global quiet hours (no notifications) */
    quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
    };
    /** Per-insight-type overrides */
    typeOverrides?: Partial<Record<ProactiveInsightType, {
        enabled?: boolean;
        channels?: DeliveryChannel[];
        priority?: ProactiveInsightPriority;
    }>>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * A generated proactive insight
 */
export interface ProactiveInsight {
    /** Unique identifier */
    id: string;
    /** Tenant ID */
    tenantId: string;
    /** Trigger that generated this insight */
    triggerId: string;
    triggerName: string;
    /** Type of insight */
    type: ProactiveInsightType;
    /** Priority level */
    priority: ProactiveInsightPriority;
    /** Current status */
    status: ProactiveInsightStatus;
    /** The shard that triggered this insight */
    shardId: string;
    shardName: string;
    shardTypeId: string;
    /** Insight content */
    title: string;
    summary: string;
    /** AI-generated detailed content (if applicable) */
    detailedContent?: string;
    /** Conditions that were met (for debugging/transparency) */
    matchedConditions: {
        field: string;
        operator: TriggerOperator;
        expectedValue: unknown;
        actualValue: unknown;
    }[];
    /** Suggested actions */
    suggestedActions?: {
        label: string;
        type: 'navigate' | 'create_task' | 'send_email' | 'schedule_meeting' | 'custom';
        payload: Record<string, unknown>;
    }[];
    /** Related shards for context */
    relatedShards?: {
        id: string;
        name: string;
        shardTypeId: string;
        relationship: string;
    }[];
    /** Target users (if null, follows normal RBAC) */
    targetUserIds?: string[];
    /** Delivery tracking */
    deliveries: InsightDelivery[];
    /** User interactions */
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    actionedAt?: Date;
    actionedBy?: string;
    dismissedAt?: Date;
    dismissedBy?: string;
    dismissReason?: string;
    /** Expiry */
    expiresAt?: Date;
    /** Audit timestamps */
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Tracking for a single delivery attempt
 */
export interface InsightDelivery {
    /** Delivery attempt ID */
    id: string;
    /** Channel used */
    channel: DeliveryChannel;
    /** Target (user ID, email, webhook URL) */
    target: string;
    /** Delivery status */
    status: 'pending' | 'sent' | 'failed' | 'bounced';
    /** For digest: included in this digest ID */
    digestId?: string;
    /** Error details if failed */
    error?: string;
    /** Timestamps */
    scheduledAt: Date;
    sentAt?: Date;
    failedAt?: Date;
    /** For webhooks: response status */
    responseStatus?: number;
    responseBody?: string;
}
/**
 * Aggregated email digest
 */
export interface InsightDigest {
    /** Digest ID */
    id: string;
    /** User receiving the digest */
    userId: string;
    tenantId: string;
    /** Time period covered */
    periodStart: Date;
    periodEnd: Date;
    /** Insights included */
    insights: {
        insightId: string;
        type: ProactiveInsightType;
        priority: ProactiveInsightPriority;
        title: string;
        summary: string;
        shardName: string;
    }[];
    /** Digest status */
    status: 'pending' | 'sent' | 'failed';
    /** Email tracking */
    emailId?: string;
    sentAt?: Date;
    openedAt?: Date;
    createdAt: Date;
}
/**
 * Result of evaluating a trigger against a shard
 */
export interface TriggerEvaluationResult {
    /** Trigger that was evaluated */
    triggerId: string;
    /** Shard that was evaluated */
    shardId: string;
    /** Whether all conditions were met */
    triggered: boolean;
    /** Individual condition results */
    conditionResults: {
        condition: TriggerCondition;
        matched: boolean;
        actualValue: unknown;
    }[];
    /** If not triggered, reason why */
    skipReason?: 'conditions_not_met' | 'cooldown_active' | 'trigger_disabled' | 'shard_excluded';
    /** Existing insight ID if in cooldown */
    existingInsightId?: string;
    /** Evaluation timestamp */
    evaluatedAt: Date;
}
/**
 * Input for generating a proactive insight
 */
export interface GenerateProactiveInsightInput {
    trigger: ProactiveTrigger;
    shardId: string;
    shardData: Record<string, unknown>;
    matchedConditions: TriggerEvaluationResult['conditionResults'];
    generateAIContent?: boolean;
}
/**
 * Input for delivering an insight
 */
export interface DeliverInsightInput {
    insight: ProactiveInsight;
    preferences: DeliveryPreferences;
    channels?: DeliveryChannel[];
    immediate?: boolean;
}
/**
 * Configuration for checking triggers
 */
export interface CheckTriggersOptions {
    /** Only check specific triggers */
    triggerIds?: string[];
    /** Only check for specific shard types */
    shardTypeIds?: string[];
    /** Only check specific shards */
    shardIds?: string[];
    /** Generate AI content for insights */
    generateAIContent?: boolean;
    /** Maximum insights to generate in this run */
    limit?: number;
    /** Whether to actually deliver or just evaluate */
    dryRun?: boolean;
}
/**
 * Result of a trigger check run
 */
export interface CheckTriggersResult {
    /** Number of triggers evaluated */
    triggersEvaluated: number;
    /** Number of shards evaluated */
    shardsEvaluated: number;
    /** Insights generated */
    insightsGenerated: ProactiveInsight[];
    /** Delivery results (if not dry run) */
    deliveryResults?: {
        insightId: string;
        channel: DeliveryChannel;
        status: 'sent' | 'failed' | 'skipped';
        error?: string;
    }[];
    /** Errors encountered */
    errors: {
        triggerId?: string;
        shardId?: string;
        error: string;
    }[];
    /** Execution time in ms */
    durationMs: number;
    /** Timestamp */
    executedAt: Date;
}
/**
 * Default system triggers (can be customized per tenant)
 */
export declare const DEFAULT_PROACTIVE_TRIGGERS: Omit<ProactiveTrigger, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'triggerCount'>[];
//# sourceMappingURL=proactive-insights.types.d.ts.map