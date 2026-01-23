/**
 * Proactive Insights Types
 * 
 * Foundation for automated, event-driven insights that detect important conditions
 * and proactively alert users. Integrates with the AI Insights system.
 * 
 * @see docs/features/ai-insights/README.md
 */

// ============================================
// Proactive Insight Types
// ============================================

/**
 * Types of proactive insights the system can generate
 * Each type maps to specific business conditions that warrant user attention
 */
export type ProactiveInsightType =
  | 'deal_at_risk'           // Deal shows warning signs (stalled, no activity, lost stakeholder)
  | 'milestone_approaching'  // Important deadline or milestone is near
  | 'stale_opportunity'      // Opportunity has had no activity for too long
  | 'missing_follow_up'      // Expected follow-up action hasn't occurred
  | 'relationship_cooling'   // Relationship metrics declining (fewer meetings, slower responses)
  | 'action_required';       // Explicit action item is overdue or urgent

/**
 * Priority levels for proactive insights
 * Determines notification urgency and UI prominence
 */
export type ProactiveInsightPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Status of a proactive insight
 */
export type ProactiveInsightStatus = 
  | 'pending'      // Generated, not yet delivered
  | 'delivered'    // Sent to user via configured channels
  | 'acknowledged' // User has seen the insight
  | 'actioned'     // User has taken action on the insight
  | 'dismissed'    // User dismissed without action
  | 'expired';     // Insight is no longer relevant

// ============================================
// Trigger Conditions
// ============================================

/**
 * Comparison operators for trigger conditions
 */
export type TriggerOperator =
  | 'eq'         // Equals
  | 'neq'        // Not equals
  | 'gt'         // Greater than
  | 'gte'        // Greater than or equal
  | 'lt'         // Less than
  | 'lte'        // Less than or equal
  | 'in'         // In array
  | 'nin'        // Not in array
  | 'contains'   // String/array contains
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'    // Field is null/undefined
  | 'is_not_null'
  | 'changed'    // Field value changed
  | 'changed_to' // Field changed to specific value
  | 'changed_from'; // Field changed from specific value

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

// ============================================
// Proactive Triggers
// ============================================

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

// ============================================
// Delivery Configuration
// ============================================

/**
 * Delivery channels for proactive insights
 */
export type DeliveryChannel = 
  | 'in_app'      // In-app notification/toast
  | 'dashboard'   // Dashboard widget
  | 'email'       // Email notification
  | 'email_digest' // Aggregated email digest
  | 'webhook';    // External webhook

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
    start: string; // HH:mm
    end: string;   // HH:mm
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

// ============================================
// Proactive Insight
// ============================================

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

// ============================================
// Email Digest
// ============================================

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

// ============================================
// Trigger Evaluation
// ============================================

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
  skipReason?: 
    | 'conditions_not_met'
    | 'cooldown_active'
    | 'trigger_disabled'
    | 'shard_excluded';
  
  /** Existing insight ID if in cooldown */
  existingInsightId?: string;
  
  /** Evaluation timestamp */
  evaluatedAt: Date;
}

// ============================================
// Service Interfaces
// ============================================

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
  channels?: DeliveryChannel[]; // Override which channels to use
  immediate?: boolean; // Skip digest grouping for email
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

// ============================================
// Default Triggers
// ============================================

/**
 * Default system triggers (can be customized per tenant)
 */
export const DEFAULT_PROACTIVE_TRIGGERS: Omit<ProactiveTrigger, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'triggerCount'>[] = [
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
