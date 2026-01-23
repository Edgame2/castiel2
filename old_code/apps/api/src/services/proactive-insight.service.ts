/**
 * Proactive Insight Service
 * 
 * Orchestrates the detection, generation, and delivery of proactive insights.
 * Monitors shard data for conditions that warrant user attention and
 * automatically generates contextual insights.
 * 
 * @see docs/features/ai-insights/README.md
 * @see apps/api/src/types/proactive-insights.types.ts
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  ProactiveTrigger,
  ProactiveInsight,
  ProactiveInsightType,
  ProactiveInsightPriority,
  ProactiveInsightStatus,
  TriggerCondition,
  TriggerConditionGroup,
  TriggerOperator,
  TriggerEvaluationResult,
  DeliveryPreferences,
  DeliveryChannel,
  InsightDelivery,
  GenerateProactiveInsightInput,
  CheckTriggersOptions,
  CheckTriggersResult,
  DEFAULT_PROACTIVE_TRIGGERS,
} from '../types/proactive-insights.types.js';
import { InsightService } from './insight.service.js';
import { ShardRepository } from '@castiel/api-core';
import { ProactiveInsightsRepository } from '../repositories/proactive-insights.repository.js';
import { ProactiveTriggersRepository } from '../repositories/proactive-triggers.repository.js';
import { ProactiveInsightsDeliveryPreferencesRepository } from '../repositories/proactive-insights-delivery-preferences.repository.js';
import { NotificationService } from './notification.service.js';
import { UserService } from './auth/user.service.js';
import type { NotificationType, NotificationPriority } from '../types/notification.types.js';
import type { ProactiveInsightsAnalyticsService } from './proactive-insights-analytics.service.js';
import type { UnifiedEmailService } from './email/email.service.js';

// ============================================
// Constants
// ============================================

const COOLDOWN_KEY_PREFIX = 'proactive:cooldown:';
const INSIGHT_CACHE_PREFIX = 'proactive:insight:';
const DEFAULT_BATCH_SIZE = 100;

// ============================================
// Service
// ============================================

/**
 * Proactive Insight Service
 * 
 * Main orchestrator for proactive insight functionality:
 * - Evaluates triggers against shards
 * - Generates insight content (with optional AI enhancement)
 * - Delivers insights through configured channels
 */
export class ProactiveInsightService {
  private repository?: ProactiveInsightsRepository;
  private triggersRepository?: ProactiveTriggersRepository;
  private deliveryPreferencesRepository?: ProactiveInsightsDeliveryPreferencesRepository;
  private notificationService?: NotificationService;
  private userService?: UserService;
  private analyticsService?: ProactiveInsightsAnalyticsService;
  private emailService?: UnifiedEmailService;

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private insightService: InsightService,
    private redis?: Redis,
    repository?: ProactiveInsightsRepository,
    notificationService?: NotificationService,
    triggersRepository?: ProactiveTriggersRepository,
    userService?: UserService,
    analyticsService?: ProactiveInsightsAnalyticsService,
    emailService?: UnifiedEmailService
  ) {
    this.repository = repository;
    this.notificationService = notificationService;
    this.triggersRepository = triggersRepository;
    this.userService = userService;
    this.analyticsService = analyticsService;
    this.emailService = emailService;
  }

  /**
   * Set repository (for late initialization)
   */
  setRepository(repository: ProactiveInsightsRepository): void {
    this.repository = repository;
  }

  /**
   * Set analytics service (for late initialization)
   */
  setAnalyticsService(analyticsService: ProactiveInsightsAnalyticsService): void {
    this.analyticsService = analyticsService;
  }

  /**
   * Set triggers repository (for late initialization)
   */
  setTriggersRepository(repository: ProactiveTriggersRepository): void {
    this.triggersRepository = repository;
  }

  /**
   * Set notification service (for late initialization)
   */
  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  /**
   * Set delivery preferences repository (for late initialization)
   */
  setDeliveryPreferencesRepository(
    repository: ProactiveInsightsDeliveryPreferencesRepository
  ): void {
    this.deliveryPreferencesRepository = repository;
  }

  /**
   * Set user service (for late initialization)
   */
  setUserService(userService: UserService): void {
    this.userService = userService;
  }

  /**
   * Seed default triggers for a tenant
   * Creates all DEFAULT_PROACTIVE_TRIGGERS for the specified tenant
   */
  async seedDefaultTriggers(tenantId: string): Promise<{
    seeded: number;
    skipped: number;
    errors: number;
  }> {
    if (!this.triggersRepository) {
      throw new Error('Triggers repository not initialized');
    }

    const results = { seeded: 0, skipped: 0, errors: 0 };

    for (const triggerDef of DEFAULT_PROACTIVE_TRIGGERS) {
      try {
        // Check if trigger already exists (by type and tenant)
        const existing = await this.triggersRepository.listTriggers(tenantId, {
          type: triggerDef.type,
          isSystem: true,
          limit: 1,
        });

        if (existing.triggers.length > 0) {
          results.skipped++;
          continue;
        }

        // Create trigger
        const trigger: ProactiveTrigger = {
          id: uuidv4(),
          tenantId,
          name: triggerDef.name,
          description: triggerDef.description,
          type: triggerDef.type,
          shardTypeId: triggerDef.shardTypeId,
          conditions: triggerDef.conditions,
          priority: triggerDef.priority,
          cooldownHours: triggerDef.cooldownHours,
          schedule: triggerDef.schedule,
          eventTriggers: triggerDef.eventTriggers,
          messageTemplate: triggerDef.messageTemplate,
          contextTemplateId: triggerDef.contextTemplateId,
          metadata: triggerDef.metadata,
          isActive: triggerDef.isActive,
          isSystem: true,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          triggerCount: 0,
        };

        await this.triggersRepository.upsertTrigger(trigger);
        results.seeded++;
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.seedDefaultTriggers',
          tenantId,
          triggerType: triggerDef.type,
        });
        results.errors++;
      }
    }

    return results;
  }

  // ============================================
  // Trigger Checking
  // ============================================

  /**
   * Check all triggers for a tenant and generate insights
   * This is the main entry point for scheduled trigger evaluation
   */
  async checkTriggers(
    tenantId: string,
    options: CheckTriggersOptions = {}
  ): Promise<CheckTriggersResult> {
    const startTime = Date.now();
    const result: CheckTriggersResult = {
      triggersEvaluated: 0,
      shardsEvaluated: 0,
      insightsGenerated: [],
      deliveryResults: options.dryRun ? undefined : [],
      errors: [],
      durationMs: 0,
      executedAt: new Date(),
    };

    try {
      // 1. Get active triggers for tenant
      const triggers = await this.getActiveTriggers(tenantId, options.triggerIds);
      result.triggersEvaluated = triggers.length;

      if (triggers.length === 0) {
        this.monitoring.trackEvent('proactive.checkTriggers.noTriggers', { tenantId });
        result.durationMs = Date.now() - startTime;
        return result;
      }

      // 2. Group triggers by shardType for efficient querying
      const triggersByType = this.groupTriggersByShardType(triggers);

      // 3. For each shard type, get shards and evaluate triggers
      for (const [shardTypeId, typeTriggers] of Object.entries(triggersByType)) {
        // Skip if filtering by shard type and this type not included
        if (options.shardTypeIds && !options.shardTypeIds.includes(shardTypeId)) {
          continue;
        }

        try {
          // Get shards of this type (with filtering if specified)
          const shards = await this.getShardsForEvaluation(
            tenantId,
            shardTypeId,
            options.shardIds
          );

          result.shardsEvaluated += shards.length;

          // Evaluate each shard against all triggers for its type
          for (const shard of shards) {
            for (const trigger of typeTriggers) {
              try {
                const evalResult = await this.evaluateTrigger(trigger, shard.id, shard);

                if (evalResult.triggered) {
                  // Generate insight
                  const insight = await this.generateProactiveInsight({
                    trigger,
                    shardId: shard.id,
                    shardData: shard,
                    matchedConditions: evalResult.conditionResults.filter(c => c.matched),
                    generateAIContent: options.generateAIContent,
                  });

                  result.insightsGenerated.push(insight);

                  // Deliver if not dry run
                  if (!options.dryRun && result.deliveryResults) {
                    // Note: userId not available in worker context, will use defaults
                    const deliveryResult = await this.deliverToDefaultChannels(
                      insight,
                      tenantId,
                      undefined // userId not available in scheduled trigger evaluation
                    );
                    if (deliveryResult) {
                      result.deliveryResults.push(...deliveryResult);
                    }
                  }

                  // Check limit
                  if (options.limit && result.insightsGenerated.length >= options.limit) {
                    break;
                  }
                }
              } catch (error) {
                result.errors.push({
                  triggerId: trigger.id,
                  shardId: shard.id,
                  error: (error as Error).message,
                });
              }
            }

            if (options.limit && result.insightsGenerated.length >= options.limit) {
              break;
            }
          }
        } catch (error) {
          result.errors.push({
            error: `Failed to process shard type ${shardTypeId}: ${(error as Error).message}`,
          });
        }
      }

      result.durationMs = Date.now() - startTime;

      this.monitoring.trackEvent('proactive.checkTriggers.completed', {
        tenantId,
        triggersEvaluated: result.triggersEvaluated,
        shardsEvaluated: result.shardsEvaluated,
        insightsGenerated: result.insightsGenerated.length,
        errors: result.errors.length,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.checkTriggers',
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Evaluate a single trigger against a shard
   */
  async evaluateTrigger(
    trigger: ProactiveTrigger,
    shardId: string,
    shardData: Record<string, unknown>
  ): Promise<TriggerEvaluationResult> {
    const result: TriggerEvaluationResult = {
      triggerId: trigger.id,
      shardId,
      triggered: false,
      conditionResults: [],
      evaluatedAt: new Date(),
    };

    // Check if trigger is active
    if (!trigger.isActive) {
      result.skipReason = 'trigger_disabled';
      return result;
    }

    // Check cooldown
    const inCooldown = await this.isInCooldown(trigger.id, shardId, trigger.cooldownHours);
    if (inCooldown.active) {
      result.skipReason = 'cooldown_active';
      result.existingInsightId = inCooldown.insightId;
      return result;
    }

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions(
      trigger.conditions,
      shardData,
      result.conditionResults
    );

    result.triggered = conditionsMet;
    if (!conditionsMet) {
      result.skipReason = 'conditions_not_met';
    }

    return result;
  }

  // ============================================
  // Insight Generation
  // ============================================

  /**
   * Generate a proactive insight from a triggered condition
   */
  async generateProactiveInsight(
    input: GenerateProactiveInsightInput
  ): Promise<ProactiveInsight> {
    const { trigger, shardId, shardData, matchedConditions, generateAIContent } = input;

    const insightId = uuidv4();

    // Build basic insight content
    const title = this.generateTitle(trigger, shardData);
    let summary = this.generateSummary(trigger, shardData, matchedConditions);
    let detailedContent: string | undefined;

    // Optionally generate AI content
    if (generateAIContent && trigger.contextTemplateId) {
      try {
        const aiContent = await this.generateAIContent(trigger, shardId, shardData);
        if (aiContent) {
          summary = aiContent.summary || summary;
          detailedContent = aiContent.detailed;
        }
      } catch (error) {
        this.monitoring.trackEvent('proactive.aiGeneration.failed', {
          triggerId: trigger.id,
          shardId,
          error: (error as Error).message,
        });
        // Continue with template-based content
      }
    }

    // Build suggested actions
    const suggestedActions = this.buildSuggestedActions(trigger, shardId, shardData);

    const insight: ProactiveInsight = {
      id: insightId,
      tenantId: trigger.tenantId,
      triggerId: trigger.id,
      triggerName: trigger.name,
      type: trigger.type,
      priority: trigger.priority,
      status: 'pending',
      shardId,
      shardName: (shardData.name as string) || shardId,
      shardTypeId: trigger.shardTypeId,
      title,
      summary,
      detailedContent,
      matchedConditions: matchedConditions.map(mc => ({
        field: mc.condition.field,
        operator: mc.condition.operator,
        expectedValue: mc.condition.value,
        actualValue: mc.actualValue,
      })),
      suggestedActions,
      deliveries: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store insight
    await this.storeInsight(insight);

    // Update trigger statistics
    if (this.triggersRepository) {
      try {
        await this.triggersRepository.updateTriggerStats(trigger.id, trigger.tenantId, {
          lastTriggeredAt: new Date(),
          triggerCount: trigger.triggerCount + 1,
        });
      } catch (error) {
        // Non-blocking - don't fail insight generation if stats update fails
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.updateTriggerStats',
          triggerId: trigger.id,
          tenantId: trigger.tenantId,
        });
      }
    }

    // Set cooldown
    await this.setCooldown(trigger.id, shardId, trigger.cooldownHours, insightId);

    this.monitoring.trackEvent('proactive.insight.generated', {
      insightId,
      triggerId: trigger.id,
      type: trigger.type,
      priority: trigger.priority,
      shardId,
    });

    return insight;
  }

  // ============================================
  // Insight Delivery
  // ============================================

  /**
   * Deliver an insight through configured channels
   */
  async deliverInsight(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): Promise<InsightDelivery[]> {
    const deliveries: InsightDelivery[] = [];

    // Determine which channels to use
    const channels = this.determineChannels(insight, preferences);

    for (const channel of channels) {
      try {
        const delivery = await this.deliverToChannel(insight, channel, preferences);
        deliveries.push(delivery);
        insight.deliveries.push(delivery);
      } catch (error) {
        const failedDelivery: InsightDelivery = {
          id: uuidv4(),
          channel,
          target: preferences.userId,
          status: 'failed',
          error: (error as Error).message,
          scheduledAt: new Date(),
          failedAt: new Date(),
        };
        deliveries.push(failedDelivery);
        insight.deliveries.push(failedDelivery);

        // Record analytics event for failed delivery (non-blocking)
        if (this.analyticsService) {
          this.analyticsService.recordDeliveryEvent({
            tenantId: insight.tenantId,
            insightId: insight.id,
            channel,
            status: 'failed',
            timestamp: failedDelivery.failedAt,
          }).catch((analyticsError) => {
            // Non-blocking - don't fail if analytics recording fails
            this.monitoring.trackException(analyticsError as Error, {
              operation: 'proactive.analytics.recordDeliveryEvent.failed',
              insightId: insight.id,
              channel,
            });
          });
        }
      }
    }

    // Update insight status
    const hasSuccessfulDelivery = deliveries.some(d => d.status === 'sent');
    if (hasSuccessfulDelivery) {
      insight.status = 'delivered';
    }

    // Update stored insight
    await this.updateInsight(insight);

    this.monitoring.trackEvent('proactive.insight.delivered', {
      insightId: insight.id,
      channelsAttempted: channels.length,
      channelsSucceeded: deliveries.filter(d => d.status === 'sent').length,
    });

    return deliveries;
  }

  // ============================================
  // Private: Condition Evaluation
  // ============================================

  /**
   * Evaluate conditions against shard data
   */
  private evaluateConditions(
    conditions: TriggerCondition[] | TriggerConditionGroup,
    data: Record<string, unknown>,
    results: TriggerEvaluationResult['conditionResults']
  ): boolean {
    // Handle grouped conditions
    if ('operator' in conditions && 'conditions' in conditions) {
      const group = conditions;
      const childResults = group.conditions.map(child => {
        if ('field' in child) {
          // It's a single condition
          const matched = this.evaluateSingleCondition(child, data, results);
          return matched;
        } else {
          // It's a nested group
          return this.evaluateConditions(child, data, results);
        }
      });

      return group.operator === 'and'
        ? childResults.every(r => r)
        : childResults.some(r => r);
    }

    // Handle array of conditions (implicit AND)
    const conditionArray = conditions;
    return conditionArray.every(condition =>
      this.evaluateSingleCondition(condition, data, results)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateSingleCondition(
    condition: TriggerCondition,
    data: Record<string, unknown>,
    results: TriggerEvaluationResult['conditionResults']
  ): boolean {
    const actualValue = this.getNestedValue(data, condition.field);
    let expectedValue = condition.value;

    // Handle relative dates
    if (condition.relativeDate) {
      expectedValue = this.parseRelativeDate(condition.relativeDate);
    }

    const matched = this.compareValues(actualValue, condition.operator, expectedValue);

    results.push({
      condition,
      matched,
      actualValue,
    });

    return matched;
  }

  /**
   * Compare values using the specified operator
   */
  private compareValues(
    actual: unknown,
    operator: TriggerOperator,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return actual === expected;

      case 'neq':
        return actual !== expected;

      case 'gt':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual > expected
          : actual instanceof Date && expected instanceof Date
          ? actual > expected
          : false;

      case 'gte':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual >= expected
          : actual instanceof Date && expected instanceof Date
          ? actual >= expected
          : false;

      case 'lt':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual < expected
          : actual instanceof Date && expected instanceof Date
          ? actual < expected
          : String(actual) < String(expected);

      case 'lte':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual <= expected
          : actual instanceof Date && expected instanceof Date
          ? actual <= expected
          : String(actual) <= String(expected);

      case 'in':
        return Array.isArray(expected) && expected.includes(actual);

      case 'nin':
        return Array.isArray(expected) && !expected.includes(actual);

      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case 'not_contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return !actual.toLowerCase().includes(expected.toLowerCase());
        }
        if (Array.isArray(actual)) {
          return !actual.includes(expected);
        }
        return true;

      case 'starts_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.toLowerCase().startsWith(expected.toLowerCase())
          : false;

      case 'ends_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.toLowerCase().endsWith(expected.toLowerCase())
          : false;

      case 'is_null':
        return actual === null || actual === undefined;

      case 'is_not_null':
        return actual !== null && actual !== undefined;

      case 'changed':
      case 'changed_to':
      case 'changed_from':
        // These require previous state - not evaluated here
        // Handled in event-driven evaluation
        return false;

      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Parse relative date expression
   */
  private parseRelativeDate(expression: string): Date {
    const now = new Date();

    if (expression === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    if (expression === 'now') {
      return now;
    }

    // Parse expressions like "-7d", "+3d", "-1w", "-1m"
    const match = expression.match(/^([+-]?)(\d+)([dwmyh])$/);
    if (!match) {
      return now;
    }

    const sign = match[1] === '-' ? -1 : 1;
    const value = parseInt(match[2], 10) * sign;
    const unit = match[3];

    const result = new Date(now);

    switch (unit) {
      case 'h':
        result.setHours(result.getHours() + value);
        break;
      case 'd':
        result.setDate(result.getDate() + value);
        break;
      case 'w':
        result.setDate(result.getDate() + value * 7);
        break;
      case 'm':
        result.setMonth(result.getMonth() + value);
        break;
      case 'y':
        result.setFullYear(result.getFullYear() + value);
        break;
    }

    return result;
  }

  // ============================================
  // Private: Content Generation
  // ============================================

  /**
   * Generate insight title based on trigger and shard
   */
  private generateTitle(
    trigger: ProactiveTrigger,
    shardData: Record<string, unknown>
  ): string {
    const shardName = (shardData.name as string) || 'Item';

    const titles: Record<ProactiveInsightType, string> = {
      deal_at_risk: `⚠️ ${shardName} may be at risk`,
      milestone_approaching: `📅 Milestone approaching for ${shardName}`,
      stale_opportunity: `💤 ${shardName} needs attention`,
      missing_follow_up: `📞 Follow-up needed: ${shardName}`,
      relationship_cooling: `❄️ Engagement declining: ${shardName}`,
      action_required: `🎯 Action required: ${shardName}`,
    };

    return titles[trigger.type] || `Alert: ${shardName}`;
  }

  /**
   * Generate insight summary from matched conditions
   */
  private generateSummary(
    trigger: ProactiveTrigger,
    shardData: Record<string, unknown>,
    matchedConditions: TriggerEvaluationResult['conditionResults']
  ): string {
    // Use template if provided
    if (trigger.messageTemplate) {
      return this.interpolateTemplate(trigger.messageTemplate, shardData);
    }

    // Generate based on type and conditions
    const shardName = (shardData.name as string) || 'This item';
    const conditions = matchedConditions.map(mc => {
      const field = mc.condition.field.split('.').pop() || mc.condition.field;
      return `${field}: ${mc.actualValue}`;
    });

    const summaries: Record<ProactiveInsightType, string> = {
      deal_at_risk: `${shardName} shows warning signs that may indicate a risk to closing. ${conditions.join(', ')}.`,
      milestone_approaching: `An important milestone for ${shardName} is approaching. Review the status and ensure everything is on track.`,
      stale_opportunity: `${shardName} has had no recent activity. Consider reaching out to keep the conversation moving.`,
      missing_follow_up: `A follow-up action for ${shardName} appears to be overdue. Please review and take action.`,
      relationship_cooling: `Engagement with ${shardName} has decreased. Consider scheduling a check-in.`,
      action_required: `${shardName} requires your attention. ${conditions.join(', ')}.`,
    };

    return summaries[trigger.type] || `${shardName} requires attention.`;
  }

  /**
   * Interpolate template with shard data
   */
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * Generate AI-enhanced content
   */
  private async generateAIContent(
    trigger: ProactiveTrigger,
    shardId: string,
    _shardData: Record<string, unknown>
  ): Promise<{ summary?: string; detailed?: string } | null> {
    // Use insight service to generate content
    const response = await this.insightService.quickInsight(
      trigger.tenantId,
      'system', // System-generated
      {
        shardId,
        type: trigger.type === 'deal_at_risk' ? 'risks' : 'summary',
        options: {
          format: 'brief',
          maxLength: 500,
        },
      }
    );

    return {
      summary: response.content,
      detailed: response.content,
    };
  }

  /**
   * Build suggested actions based on insight type
   */
  private buildSuggestedActions(
    trigger: ProactiveTrigger,
    shardId: string,
    _shardData: Record<string, unknown>
  ): ProactiveInsight['suggestedActions'] {
    const actions: ProactiveInsight['suggestedActions'] = [
      {
        label: 'View Details',
        type: 'navigate',
        payload: { url: `/shards/${shardId}` },
      },
    ];

    // Add type-specific actions
    switch (trigger.type) {
      case 'missing_follow_up':
      case 'relationship_cooling':
        actions.push({
          label: 'Schedule Meeting',
          type: 'schedule_meeting',
          payload: { shardId, defaultTitle: `Follow-up: ${_shardData.name}` },
        });
        break;

      case 'deal_at_risk':
      case 'stale_opportunity':
        actions.push({
          label: 'Create Task',
          type: 'create_task',
          payload: { shardId, type: 'follow_up' },
        });
        break;

      case 'milestone_approaching':
        actions.push({
          label: 'Review Milestone',
          type: 'navigate',
          payload: { url: `/shards/${shardId}?tab=milestones` },
        });
        break;
    }

    return actions;
  }

  // ============================================
  // Private: Delivery
  // ============================================

  /**
   * Determine which channels to use for delivery
   */
  private determineChannels(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): DeliveryChannel[] {
    const channels: DeliveryChannel[] = [];

    // Valid channel keys in preferences.channels
    const validChannelKeys = ['in_app', 'dashboard', 'email', 'webhook'] as const;

    // Check type-specific overrides first
    const typeOverride = preferences.typeOverrides?.[insight.type];
    if (typeOverride?.channels) {
      return typeOverride.channels.filter(ch => {
        // email_digest uses the email config
        const configKey = ch === 'email_digest' ? 'email' : ch;
        if (!validChannelKeys.includes(configKey)) {
          return false;
        }
        const config = preferences.channels[configKey];
        return config && 'enabled' in config && config.enabled;
      });
    }

    // In-app notifications
    if (preferences.channels.in_app.enabled) {
      channels.push('in_app');
    }

    // Dashboard widget
    if (preferences.channels.dashboard.enabled) {
      channels.push('dashboard');
    }

    // Email (immediate or digest based on priority)
    if (preferences.channels.email.enabled) {
      const threshold = preferences.channels.email.immediateThreshold;
      const priorityOrder: ProactiveInsightPriority[] = ['low', 'medium', 'high', 'critical'];
      const insightLevel = priorityOrder.indexOf(insight.priority);
      const thresholdLevel = priorityOrder.indexOf(threshold);

      if (insightLevel >= thresholdLevel) {
        channels.push('email');
      } else {
        channels.push('email_digest');
      }
    }

    // Webhook
    if (preferences.channels.webhook.enabled && preferences.channels.webhook.url) {
      channels.push('webhook');
    }

    return channels;
  }

  /**
   * Deliver to a specific channel
   */
  private async deliverToChannel(
    insight: ProactiveInsight,
    channel: DeliveryChannel,
    preferences: DeliveryPreferences
  ): Promise<InsightDelivery> {
    const deliveryId = uuidv4();
    const delivery: InsightDelivery = {
      id: deliveryId,
      channel,
      target: preferences.userId,
      status: 'pending',
      scheduledAt: new Date(),
    };

    switch (channel) {
      case 'in_app':
        await this.deliverInApp(insight, preferences);
        break;

      case 'dashboard':
        await this.deliverToDashboard(insight, preferences);
        break;

      case 'email':
        await this.deliverEmail(insight, preferences);
        break;

      case 'email_digest':
        await this.queueForDigest(insight, preferences, deliveryId);
        delivery.status = 'pending'; // Will be sent in digest
        return delivery;

      case 'webhook':
        const webhookResult = await this.deliverWebhook(insight, preferences);
        delivery.responseStatus = webhookResult.status;
        delivery.responseBody = webhookResult.body;
        // Check if webhook response indicates failure (non-2xx status)
        if (webhookResult.status < 200 || webhookResult.status >= 300) {
          delivery.status = 'failed';
          delivery.failedAt = new Date();
          delivery.error = `Webhook returned status ${webhookResult.status}`;
        }
        break;
    }

    // Only mark as 'sent' if not already marked as 'failed'
    if (delivery.status !== 'failed') {
    delivery.status = 'sent';
    delivery.sentAt = new Date();
    }

    // Record analytics event (non-blocking)
    if (this.analyticsService) {
      const latencyMs = delivery.sentAt 
        ? delivery.sentAt.getTime() - delivery.scheduledAt.getTime()
        : delivery.failedAt
        ? delivery.failedAt.getTime() - delivery.scheduledAt.getTime()
        : 0;
      
      this.analyticsService.recordDeliveryEvent({
        tenantId: insight.tenantId,
        insightId: insight.id,
        channel,
        status: delivery.status === 'failed' ? 'failed' : 'sent',
        latencyMs,
        timestamp: delivery.sentAt || delivery.failedAt || new Date(),
      }).catch((error) => {
        // Non-blocking - don't fail delivery if analytics recording fails
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.analytics.recordDeliveryEvent',
          insightId: insight.id,
          channel,
        });
      });
    }

    return delivery;
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInApp(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): Promise<void> {
    if (!this.notificationService) {
      this.monitoring.trackEvent('proactive.delivery.inApp.skipped', {
        insightId: insight.id,
        userId: preferences.userId,
        reason: 'notification_service_unavailable',
      });
      throw new Error('Notification service unavailable');
    }

    try {
      // Map proactive insight priority to notification priority
      const notificationPriority: NotificationPriority = 
        insight.priority === 'critical' ? 'high' :
        insight.priority === 'high' ? 'high' :
        insight.priority === 'medium' ? 'medium' :
        'low';

      // Map proactive insight type to notification type
      // Most proactive insights are alerts/warnings
      const notificationType: NotificationType = 
        insight.priority === 'critical' ? 'alert' :
        insight.priority === 'high' ? 'warning' :
        'information';

      // Create link to proactive insight detail page
      const link = `/proactive-insights/${insight.id}`;

      // Create notification via notification service
      // This will automatically handle email, webhook, push, etc. based on user preferences
      await this.notificationService.createSystemNotification({
        tenantId: insight.tenantId,
        userId: preferences.userId,
        type: notificationType,
        name: insight.title,
        content: insight.summary,
        link,
        priority: notificationPriority,
        metadata: {
          source: 'proactive_insights',
          insightId: insight.id,
          insightType: insight.type,
          shardId: insight.shardId,
          shardName: insight.shardName,
          triggerId: insight.triggerId,
        },
      });

    this.monitoring.trackEvent('proactive.delivery.inApp', {
      insightId: insight.id,
        userId: preferences.userId,
      });
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.delivery.inApp',
        insightId: insight.id,
        userId: preferences.userId,
      });
      // Don't throw - delivery failures shouldn't break insight generation
    }
  }

  /**
   * Add to dashboard widget
   */
  private async deliverToDashboard(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): Promise<void> {
    // Store in Redis for dashboard widget to pick up
    if (!this.redis) {
      throw new Error('Redis unavailable for dashboard delivery');
    }

    try {
      const key = `dashboard:insights:${preferences.tenantId}:${preferences.userId}`;
      await this.redis.lpush(key, JSON.stringify({
        id: insight.id,
        type: insight.type,
        priority: insight.priority,
        title: insight.title,
        summary: insight.summary,
        shardId: insight.shardId,
        shardName: insight.shardName,
        createdAt: insight.createdAt,
      }));
      // Trim to max items
      await this.redis.ltrim(key, 0, (preferences.channels.dashboard.maxItems || 10) - 1);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.delivery.dashboard',
        insightId: insight.id,
        userId: preferences.userId,
      });
      throw new Error(`Dashboard delivery failed: ${(error as Error).message}`);
    }
  }

  /**
   * Send immediate email notification
   * Sends email directly for high-priority insights that meet the immediate threshold.
   * This is used when email is enabled but in_app notifications are disabled,
   * or when immediate email delivery is specifically requested.
   */
  private async deliverEmail(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): Promise<void> {
    if (!this.emailService || !this.emailService.isReady()) {
      this.monitoring.trackEvent('proactive.delivery.email.skipped', {
      insightId: insight.id,
      userId: preferences.userId,
        reason: 'email_service_unavailable',
      });
      return;
    }

    if (!this.userService) {
      this.monitoring.trackEvent('proactive.delivery.email.skipped', {
        insightId: insight.id,
        userId: preferences.userId,
        reason: 'user_service_unavailable',
      });
      return;
    }

    try {
      // Get user for email address
      const user = await this.userService.findById(preferences.userId, preferences.tenantId);
      if (!user || !user.email) {
        this.monitoring.trackEvent('proactive.delivery.email.skipped', {
          insightId: insight.id,
          userId: preferences.userId,
          reason: 'user_email_not_found',
        });
        return;
      }

      // Check quiet hours
      if (preferences.quietHours?.enabled) {
        if (this.isInQuietHours(preferences.quietHours)) {
          this.monitoring.trackEvent('proactive.delivery.email.skipped', {
            insightId: insight.id,
            userId: preferences.userId,
            reason: 'quiet_hours',
          });
          // Queue for later instead of skipping entirely
          await this.queueForDigest(insight, preferences, uuidv4());
          return;
        }
      }

      // Build email content
      const priorityColor = this.getPriorityColor(insight.priority);
      const subject = `[${insight.priority.toUpperCase()}] ${insight.title}`;
      const htmlBody = this.buildEmailBody(insight, priorityColor);
      const textBody = this.buildEmailText(insight);

      // Send email
      const sendStartTime = Date.now();
      const result = await this.emailService.send({
        to: user.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      const latencyMs = Date.now() - sendStartTime;

      if (result.success) {
        this.monitoring.trackEvent('proactive.delivery.email.sent', {
          insightId: insight.id,
          userId: preferences.userId,
          messageId: result.messageId,
        });

        // Record analytics event for successful email delivery
        if (this.analyticsService) {
          this.analyticsService.recordDeliveryEvent({
            tenantId: insight.tenantId,
            insightId: insight.id,
            channel: 'email',
            status: 'sent',
            latencyMs,
            timestamp: new Date(),
          }).catch((analyticsError) => {
            // Non-blocking - don't fail if analytics recording fails
            this.monitoring.trackException(analyticsError as Error, {
              operation: 'proactive.analytics.recordDeliveryEvent.email',
              insightId: insight.id,
            });
          });
        }
      } else {
        this.monitoring.trackEvent('proactive.delivery.email.failed', {
          insightId: insight.id,
          userId: preferences.userId,
          error: result.error,
        });

        // Record analytics event for failed email delivery
        if (this.analyticsService) {
          this.analyticsService.recordDeliveryEvent({
            tenantId: insight.tenantId,
            insightId: insight.id,
            channel: 'email',
            status: 'failed',
            latencyMs,
            timestamp: new Date(),
          }).catch((analyticsError) => {
            // Non-blocking - don't fail if analytics recording fails
            this.monitoring.trackException(analyticsError as Error, {
              operation: 'proactive.analytics.recordDeliveryEvent.email',
              insightId: insight.id,
            });
          });
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.delivery.email',
        insightId: insight.id,
        userId: preferences.userId,
      });

      // Record analytics event for exception during email delivery
      // Note: We can't calculate accurate latency for exceptions, so we use 0
      if (this.analyticsService) {
        this.analyticsService.recordDeliveryEvent({
          tenantId: insight.tenantId,
          insightId: insight.id,
          channel: 'email',
          status: 'failed',
          latencyMs: 0, // Can't calculate latency for exceptions
          timestamp: new Date(),
        }).catch((analyticsError) => {
          // Non-blocking - don't fail if analytics recording fails
          this.monitoring.trackException(analyticsError as Error, {
            operation: 'proactive.analytics.recordDeliveryEvent.email',
            insightId: insight.id,
          });
        });
      }
      // Don't throw - email delivery failures shouldn't break insight generation
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(quietHours: { start: string; end: string; timezone: string }): boolean {
    const now = new Date();
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    // Simple UTC-based check (in production, use proper timezone library)
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentTime >= startTime || currentTime < endTime;
    } else {
      // Same-day quiet hours
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: ProactiveInsightPriority): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return '#dc2626'; // red
      case 'high':
        return '#ea580c'; // orange
      case 'medium':
        return '#ca8a04'; // yellow
      case 'low':
        return '#2563eb'; // blue
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Build HTML email body
   */
  private buildEmailBody(insight: ProactiveInsight, priorityColor: string): string {
    const link = `/proactive-insights/${insight.id}`;
    const baseUrl = process.env.BASE_URL || 'https://app.castiel.ai';

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-left: 4px solid ${priorityColor}; padding-left: 20px; margin-bottom: 20px;">
          <h1 style="color: #111827; margin-top: 0;">${this.escapeHtml(insight.title)}</h1>
          <div style="margin-bottom: 15px;">
            <span style="background-color: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              ${this.escapeHtml(insight.priority)}
            </span>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #374151; font-size: 16px;">${this.escapeHtml(insight.summary)}</p>
        </div>

        ${insight.detailedContent ? `
        <div style="margin-bottom: 20px;">
          <h2 style="color: #111827; font-size: 18px; margin-bottom: 10px;">Details</h2>
          <p style="color: #6b7280; line-height: 1.8;">${this.escapeHtml(insight.detailedContent)}</p>
        </div>
        ` : ''}

        ${insight.shardName ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            <strong>Related to:</strong> ${this.escapeHtml(insight.shardName)}
          </p>
        </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <a href="${baseUrl}${link}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Insight
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>This is an automated email from Castiel. You can manage your notification preferences in your account settings.</p>
        </div>
      </body>
    </html>
  `;
  }

  /**
   * Build plain text email body
   */
  private buildEmailText(insight: ProactiveInsight): string {
    const link = `/proactive-insights/${insight.id}`;
    const baseUrl = process.env.BASE_URL || 'https://app.castiel.ai';

    let text = `
${insight.title} [${insight.priority.toUpperCase()}]

${insight.summary}
`;

    if (insight.detailedContent) {
      text += `\n\nDetails:\n${insight.detailedContent}\n`;
    }

    if (insight.shardName) {
      text += `\nRelated to: ${insight.shardName}\n`;
    }

    text += `\n\nView Insight: ${baseUrl}${link}\n\n`;
    text += `---\nThis is an automated email from Castiel. You can manage your notification preferences in your account settings.`;

    return text;
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Queue insight for digest email
   */
  private async queueForDigest(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences,
    deliveryId: string
  ): Promise<void> {
    if (this.redis) {
      const key = `digest:pending:${preferences.tenantId}:${preferences.userId}`;
      await this.redis.rpush(key, JSON.stringify({
        deliveryId,
        insightId: insight.id,
        type: insight.type,
        priority: insight.priority,
        title: insight.title,
        summary: insight.summary,
        shardName: insight.shardName,
        createdAt: insight.createdAt,
      }));
    }
  }

  /**
   * Deliver webhook
   */
  private async deliverWebhook(
    insight: ProactiveInsight,
    preferences: DeliveryPreferences
  ): Promise<{ status: number; body?: string }> {
    const config = preferences.channels.webhook;
    if (!config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      id: insight.id,
      type: insight.type,
      priority: insight.priority,
      title: insight.title,
      summary: insight.summary,
      shard: {
        id: insight.shardId,
        name: insight.shardName,
        typeId: insight.shardTypeId,
      },
      suggestedActions: insight.suggestedActions,
      createdAt: insight.createdAt,
    };

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add HMAC signature if secret is configured
    if (config.secret) {
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', config.secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Proactive-Signature'] = signature;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      return {
        status: response.status,
        body: await response.text(),
      };
    } catch (error) {
      throw new Error(`Webhook delivery failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get delivery preferences for a user (with defaults fallback)
   */
  private async getDeliveryPreferences(
    tenantId: string,
    userId?: string
  ): Promise<DeliveryPreferences | null> {
    if (!userId || !this.deliveryPreferencesRepository) {
      return null;
    }

    try {
      const preferences = await this.deliveryPreferencesRepository.getPreferences(
        tenantId,
        userId
      );
      return preferences;
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'proactive.getDeliveryPreferences',
        tenantId,
        userId,
      });
      return null;
    }
  }

  /**
   * Deliver to default channels (when no user preferences available)
   * Now attempts to get user preferences first, falls back to defaults
   * When userId is undefined (worker context), delivers to all users in tenant
   */
  private async deliverToDefaultChannels(
    insight: ProactiveInsight,
    tenantId: string,
    userId?: string
  ): Promise<CheckTriggersResult['deliveryResults']> {
    const allDeliveryResults: CheckTriggersResult['deliveryResults'] = [];

    // If userId is provided, deliver to that specific user
    if (userId) {
      const preferences = await this.getDeliveryPreferences(tenantId, userId);
      if (preferences) {
        const channels = this.determineChannels(insight, preferences);
        for (const channel of channels) {
          try {
            await this.deliverToChannel(insight, channel, preferences);
            allDeliveryResults.push({
              insightId: insight.id,
              channel,
              status: 'sent',
            });
          } catch (error) {
            allDeliveryResults.push({
              insightId: insight.id,
              channel,
              status: 'failed',
              error: (error as Error).message,
            });
          }
        }
        return allDeliveryResults;
      }
    }

    // If userId is undefined (worker context), deliver to all users in tenant
    if (!userId && this.userService) {
      try {
        // Get all users in the tenant
        const result = await this.userService.listUsers(tenantId, {
          page: 1,
          limit: 1000, // Large limit to get all users
        });

        // Deliver to each user based on their preferences
        for (const user of result.users) {
          try {
            const preferences = await this.getDeliveryPreferences(tenantId, user.id);
            if (preferences) {
              const channels = this.determineChannels(insight, preferences);
              for (const channel of channels) {
                try {
                  await this.deliverToChannel(insight, channel, preferences);
                  allDeliveryResults.push({
                    insightId: insight.id,
                    channel,
                    status: 'sent',
                  });
                } catch (error) {
                  allDeliveryResults.push({
                    insightId: insight.id,
                    channel,
                    status: 'failed',
                    error: (error as Error).message,
                  });
                }
              }
            } else {
              // User has no preferences, use default dashboard delivery
              if (this.redis) {
                const key = `dashboard:insights:${tenantId}:${user.id}`;
                await this.redis.lpush(key, JSON.stringify({
                  id: insight.id,
                  type: insight.type,
                  priority: insight.priority,
                  title: insight.title,
                  summary: insight.summary,
                  shardId: insight.shardId,
                  shardName: insight.shardName,
                  createdAt: insight.createdAt,
                }));
                await this.redis.ltrim(key, 0, 99); // Keep last 100
              }
              allDeliveryResults.push({
                insightId: insight.id,
                channel: 'dashboard',
                status: 'sent',
              });
            }
          } catch (error) {
            // Log error but continue with other users
            this.monitoring.trackException(error as Error, {
              operation: 'proactive.deliverToDefaultChannels.user',
              insightId: insight.id,
              tenantId,
              userId: user.id,
            });
          }
        }

        if (allDeliveryResults.length > 0) {
          return allDeliveryResults;
        }
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.deliverToDefaultChannels.getAllUsers',
          insightId: insight.id,
          tenantId,
        });
        // Fall through to default behavior
      }
    }

    // Fallback to default behavior (dashboard only)
    if (this.redis) {
      const key = `dashboard:insights:${tenantId}:all`;
      await this.redis.lpush(key, JSON.stringify({
        id: insight.id,
        type: insight.type,
        priority: insight.priority,
        title: insight.title,
        summary: insight.summary,
        shardId: insight.shardId,
        shardName: insight.shardName,
        createdAt: insight.createdAt,
      }));
      await this.redis.ltrim(key, 0, 99); // Keep last 100
    }

    return [{
      insightId: insight.id,
      channel: 'dashboard',
      status: 'sent',
    }];
  }

  // ============================================
  // Private: Cooldown Management
  // ============================================

  /**
   * Check if trigger-shard pair is in cooldown
   */
  private async isInCooldown(
    triggerId: string,
    shardId: string,
    _cooldownHours: number
  ): Promise<{ active: boolean; insightId?: string }> {
    if (!this.redis) {
      return { active: false };
    }

    const key = `${COOLDOWN_KEY_PREFIX}${triggerId}:${shardId}`;
    const value = await this.redis.get(key);

    if (value) {
      return { active: true, insightId: value };
    }

    return { active: false };
  }

  /**
   * Set cooldown for trigger-shard pair
   */
  private async setCooldown(
    triggerId: string,
    shardId: string,
    cooldownHours: number,
    insightId: string
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${COOLDOWN_KEY_PREFIX}${triggerId}:${shardId}`;
    const ttlSeconds = cooldownHours * 60 * 60;
    await this.redis.setex(key, ttlSeconds, insightId);
  }

  // ============================================
  // Private: Data Access
  // ============================================

  /**
   * Get active triggers for a tenant
   * Public method for use by event subscriber
   */
  public async getActiveTriggers(
    tenantId: string,
    triggerIds?: string[]
  ): Promise<ProactiveTrigger[]> {
    // Use repository if available, otherwise fall back to default triggers
    if (this.triggersRepository) {
      try {
        const result = await this.triggersRepository.listTriggers(tenantId, {
          isActive: true,
          limit: 1000, // Get all active triggers
        });

        let triggers = result.triggers;

        // Filter by triggerIds if provided
        if (triggerIds && triggerIds.length > 0) {
          triggers = triggers.filter(t => triggerIds.includes(t.id));
        }

        return triggers;
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.getActiveTriggers',
          tenantId,
        });
        // Fall through to default triggers
      }
    }

    // Fallback to default triggers (for backward compatibility)
    let triggers = DEFAULT_PROACTIVE_TRIGGERS.map(t => ({
      ...t,
      id: `${tenantId}-${t.type}`,
      tenantId,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0,
    })) as ProactiveTrigger[];

    if (triggerIds) {
      triggers = triggers.filter(t => triggerIds.includes(t.id));
    }

    return triggers.filter(t => t.isActive);
  }

  /**
   * Group triggers by shard type
   */
  private groupTriggersByShardType(
    triggers: ProactiveTrigger[]
  ): Record<string, ProactiveTrigger[]> {
    const grouped: Record<string, ProactiveTrigger[]> = {};

    for (const trigger of triggers) {
      if (!grouped[trigger.shardTypeId]) {
        grouped[trigger.shardTypeId] = [];
      }
      grouped[trigger.shardTypeId].push(trigger);
    }

    return grouped;
  }

  /**
   * Get shards for trigger evaluation
   */
  private async getShardsForEvaluation(
    tenantId: string,
    shardTypeId: string,
    _shardIds?: string[]
  ): Promise<{ id: string; name: string; shardTypeId: string; [key: string]: unknown }[]> {
    // Note: shardIds filtering would need to be done in-memory or via custom query
    // The ShardQueryFilter doesn't support filtering by specific IDs
    const result = await this.shardRepository.list({
      filter: {
        tenantId,
        shardTypeId,
        status: 'active' as any, // Only check active shards
      },
      limit: DEFAULT_BATCH_SIZE,
    });

    return result.shards.map(shard => ({
      id: shard.id,
      name: (shard.structuredData?.name as string) || shard.id,
      shardTypeId: shard.shardTypeId,
      status: shard.status,
      structuredData: shard.structuredData,
      ...(shard.structuredData || {}),
    }));
  }

  /**
   * Store insight
   */
  private async storeInsight(insight: ProactiveInsight): Promise<void> {
    // Use repository if available, otherwise fall back to Redis
    if (this.repository) {
      await this.repository.upsertInsight(insight);
    } else if (this.redis) {
      // Fallback to Redis for backward compatibility
      const key = `${INSIGHT_CACHE_PREFIX}${insight.id}`;
      await this.redis.setex(key, 86400 * 30, JSON.stringify(insight)); // 30 day TTL
      this.monitoring.trackEvent('proactive.insight.stored_redis_fallback', {
        insightId: insight.id,
        tenantId: insight.tenantId,
      });
    } else {
      this.monitoring.trackEvent('proactive.insight.store_failed', {
        insightId: insight.id,
        tenantId: insight.tenantId,
        reason: 'no_storage_available',
      });
      throw new Error('No storage available for proactive insights');
    }
  }

  /**
   * Update insight
   */
  private async updateInsight(insight: ProactiveInsight): Promise<void> {
    insight.updatedAt = new Date();
    await this.storeInsight(insight);
  }

  // ============================================
  // Public: Insight Retrieval
  // ============================================

  /**
   * Get insight by ID
   */
  async getInsight(insightId: string, tenantId: string): Promise<ProactiveInsight | null> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    return this.repository.getInsight(insightId, tenantId);
  }

  /**
   * List insights for a tenant
   */
  async listInsights(
    tenantId: string,
    options?: {
      status?: ProactiveInsightStatus | ProactiveInsightStatus[];
      type?: ProactiveInsightType | ProactiveInsightType[];
      priority?: ProactiveInsightPriority | ProactiveInsightPriority[];
      shardId?: string;
      triggerId?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'createdAt' | 'updatedAt' | 'priority';
      order?: 'asc' | 'desc';
    }
  ): Promise<{ insights: ProactiveInsight[]; total: number; hasMore: boolean }> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    return this.repository.listInsights(tenantId, options);
  }

  /**
   * Acknowledge an insight
   */
  async acknowledgeInsight(
    insightId: string,
    tenantId: string,
    userId: string
  ): Promise<ProactiveInsight> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    const insight = await this.repository.updateInsightStatus(insightId, tenantId, 'acknowledged', userId);

    // Record analytics event (non-blocking)
    if (this.analyticsService && insight.acknowledgedAt && insight.createdAt) {
      const timeToAcknowledge = insight.acknowledgedAt.getTime() - insight.createdAt.getTime();
      this.analyticsService.recordEngagementEvent({
        tenantId,
        insightId,
        eventType: 'acknowledged',
        timeToEventMs: timeToAcknowledge,
        timestamp: insight.acknowledgedAt,
      }).catch((error) => {
        // Non-blocking - don't fail if analytics recording fails
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.analytics.recordEngagementEvent.acknowledged',
          insightId,
          tenantId,
        });
      });
    }

    return insight;
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(
    insightId: string,
    tenantId: string,
    userId: string,
    reason?: string
  ): Promise<ProactiveInsight> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    const insight = await this.repository.updateInsightStatus(insightId, tenantId, 'dismissed', userId, reason);

    // Record analytics event (non-blocking)
    if (this.analyticsService && insight.dismissedAt && insight.createdAt) {
      const timeToDismiss = insight.dismissedAt.getTime() - insight.createdAt.getTime();
      this.analyticsService.recordEngagementEvent({
        tenantId,
        insightId,
        eventType: 'dismissed',
        timeToEventMs: timeToDismiss,
        timestamp: insight.dismissedAt,
      }).catch((error) => {
        // Non-blocking - don't fail if analytics recording fails
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.analytics.recordEngagementEvent.dismissed',
          insightId,
          tenantId,
        });
      });
    }

    return insight;
  }

  /**
   * Mark insight as actioned
   */
  async actionInsight(
    insightId: string,
    tenantId: string,
    userId: string
  ): Promise<ProactiveInsight> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    const insight = await this.repository.updateInsightStatus(insightId, tenantId, 'actioned', userId);

    // Record analytics event (non-blocking)
    if (this.analyticsService && insight.actionedAt && insight.createdAt) {
      const timeToAction = insight.actionedAt.getTime() - insight.createdAt.getTime();
      this.analyticsService.recordEngagementEvent({
        tenantId,
        insightId,
        eventType: 'actioned',
        timeToEventMs: timeToAction,
        timestamp: insight.actionedAt,
      }).catch((error) => {
        // Non-blocking - don't fail if analytics recording fails
        this.monitoring.trackException(error as Error, {
          operation: 'proactive.analytics.recordEngagementEvent.actioned',
          insightId,
          tenantId,
        });
      });
    }

    return insight;
  }

  /**
   * Delete an insight
   */
  async deleteInsight(insightId: string, tenantId: string): Promise<void> {
    if (!this.repository) {
      throw new Error('Repository not initialized');
    }
    await this.repository.deleteInsight(insightId, tenantId);
  }
}
