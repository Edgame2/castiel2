/**
 * Alert Service
 * Manages alert rules and detection
 * Per ModuleImplementationGuide Section 6: Abstraction Layer
 * Supports Prisma (Postgres) or CosmosAlertRulesRepository (Cosmos DB).
 */

import { randomUUID } from 'crypto';
import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider } from './providers/storage/IStorageProvider';
import { LogSearchParams } from '../types/log.types';
import { log } from '../utils/logger';
import type { CosmosAlertRulesRepository } from '../data/cosmos/alert-rules';

export interface AlertRule {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  type: 'PATTERN' | 'THRESHOLD' | 'ANOMALY';
  conditions: Record<string, unknown>;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface CreateAlertRuleInput {
  organizationId?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  type: 'PATTERN' | 'THRESHOLD' | 'ANOMALY';
  conditions: Record<string, unknown>;
  notificationChannels?: string[];
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  conditions?: Record<string, unknown>;
  notificationChannels?: string[];
}

export class AlertService {
  private prisma: PrismaClient | null;
  private storage: IStorageProvider;
  private cosmosAlertRules: CosmosAlertRulesRepository | null;

  constructor(prisma: PrismaClient | null, storage: IStorageProvider, cosmosAlertRules?: CosmosAlertRulesRepository) {
    this.prisma = prisma;
    this.storage = storage;
    this.cosmosAlertRules = cosmosAlertRules ?? null;
  }

  /**
   * Create an alert rule
   */
  async createRule(
    input: CreateAlertRuleInput,
    createdBy: string
  ): Promise<AlertRule> {
    if (this.cosmosAlertRules) {
      const rule = await this.cosmosAlertRules.create({
        data: {
          organizationId: input.organizationId ?? null,
          name: input.name,
          description: input.description ?? null,
          enabled: input.enabled ?? true,
          type: input.type,
          conditions: input.conditions,
          notificationChannels: input.notificationChannels ?? [],
          createdBy,
          updatedBy: createdBy,
        },
      });
      return this.mapToAlertRule(rule);
    }
    const rule = await this.prisma!.audit_alert_rules.create({
      data: {
        id: randomUUID(),
        organizationId: input.organizationId || null,
        name: input.name,
        description: input.description || null,
        enabled: input.enabled ?? true,
        type: input.type as any,
        conditions: input.conditions as any,
        notificationChannels: (input.notificationChannels || []) as any,
        createdBy,
        updatedBy: createdBy,
      },
    });

    return this.mapToAlertRule(rule);
  }

  /**
   * Update an alert rule
   */
  async updateRule(
    id: string,
    input: UpdateAlertRuleInput,
    updatedBy: string
  ): Promise<AlertRule> {
    if (this.cosmosAlertRules) {
      const rule = await this.cosmosAlertRules.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          enabled: input.enabled,
          conditions: input.conditions,
          notificationChannels: input.notificationChannels,
          updatedBy,
        },
      });
      return this.mapToAlertRule(rule);
    }
    const rule = await this.prisma!.audit_alert_rules.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        conditions: input.conditions as any,
        notificationChannels: input.notificationChannels as any,
        updatedBy,
      },
    });

    return this.mapToAlertRule(rule);
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(id: string): Promise<void> {
    if (this.cosmosAlertRules) {
      await this.cosmosAlertRules.delete({ where: { id } });
      return;
    }
    await this.prisma!.audit_alert_rules.delete({
      where: { id },
    });
  }

  /**
   * Get an alert rule
   */
  async getRule(id: string): Promise<AlertRule | null> {
    if (this.cosmosAlertRules) {
      const rule = await this.cosmosAlertRules.findUnique({ where: { id } });
      return rule ? this.mapToAlertRule(rule) : null;
    }
    const rule = await this.prisma!.audit_alert_rules.findUnique({
      where: { id },
    });
    if (!rule) return null;
    return this.mapToAlertRule(rule);
  }

  /**
   * List alert rules
   */
  async listRules(organizationId?: string): Promise<AlertRule[]> {
    if (this.cosmosAlertRules) {
      const rules = await this.cosmosAlertRules.findMany({
        where: organizationId !== undefined ? { organizationId: organizationId ?? null } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      return rules.map((r) => this.mapToAlertRule(r));
    }
    const where: Record<string, unknown> = {};
    if (organizationId !== undefined) {
      where.organizationId = organizationId || null;
    }
    const rules = await this.prisma!.audit_alert_rules.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rules.map((r) => this.mapToAlertRule(r));
  }

  /**
   * Evaluate an alert rule
   */
  async evaluateRule(ruleId: string): Promise<boolean> {
    const rule = await this.getRule(ruleId);
    
    if (!rule || !rule.enabled) {
      return false;
    }

    try {
      switch (rule.type) {
        case 'PATTERN':
          return await this.evaluatePatternRule(rule);
        case 'THRESHOLD':
          return await this.evaluateThresholdRule(rule);
        case 'ANOMALY':
          return await this.evaluateAnomalyRule(rule);
        default:
          log.warn('Unknown alert rule type', { ruleId, type: rule.type });
          return false;
      }
    } catch (error) {
      log.error('Failed to evaluate alert rule', error, { ruleId });
      return false;
    }
  }

  /**
   * Evaluate pattern-based rule
   */
  private async evaluatePatternRule(rule: AlertRule): Promise<boolean> {
    const conditions = rule.conditions as any;
    
    // Build search params from conditions
    const searchParams: LogSearchParams = {
      organizationId: rule.organizationId || undefined,
      limit: 1, // Just check if any match
      offset: 0,
    };

    if (conditions.action) {
      searchParams.action = conditions.action;
    }
    if (conditions.category) {
      searchParams.category = conditions.category;
    }
    if (conditions.severity) {
      searchParams.severity = conditions.severity;
    }
    if (conditions.timeWindow) {
      const now = new Date();
      const windowMs = conditions.timeWindow * 1000; // Convert seconds to ms
      searchParams.startDate = new Date(now.getTime() - windowMs);
      searchParams.endDate = now;
    }
    if (conditions.query) {
      searchParams.query = conditions.query;
    }

    const result = await this.storage.search(searchParams);
    return result.items.length > 0;
  }

  /**
   * Evaluate threshold-based rule
   */
  private async evaluateThresholdRule(rule: AlertRule): Promise<boolean> {
    const conditions = rule.conditions as any;
    const threshold = conditions.threshold || 0;
    const timeWindow = conditions.timeWindow || 3600; // Default 1 hour

    const now = new Date();
    const startDate = new Date(now.getTime() - timeWindow * 1000);

    const searchParams: LogSearchParams = {
      organizationId: rule.organizationId || undefined,
      startDate,
      endDate: now,
      limit: threshold + 1, // Only fetch enough to check threshold
      offset: 0,
    };

    if (conditions.action) {
      searchParams.action = conditions.action;
    }
    if (conditions.category) {
      searchParams.category = conditions.category;
    }
    if (conditions.severity) {
      searchParams.severity = conditions.severity;
    }

    const result = await this.storage.search(searchParams);
    return result.items.length >= threshold;
  }

  /**
   * Evaluate anomaly-based rule
   * Compares current volume/pattern to historical baseline
   */
  private async evaluateAnomalyRule(rule: AlertRule): Promise<boolean> {
    const conditions = rule.conditions as any;
    const multiplier = conditions.multiplier || 3; // Default 3x spike
    const baselineMinutes = conditions.baselineMinutes || 60; // Default 1 hour baseline
    
    const now = new Date();
    const checkWindowMinutes = conditions.checkWindowMinutes || 5; // Default 5 minute check window
    const checkStart = new Date(now.getTime() - checkWindowMinutes * 60 * 1000);
    const baselineStart = new Date(checkStart.getTime() - baselineMinutes * 60 * 1000);
    
    // Build search params for baseline period
    const baselineParams: LogSearchParams = {
      organizationId: rule.organizationId || undefined,
      startDate: baselineStart,
      endDate: checkStart,
      limit: 1, // We only need count
      offset: 0,
    };
    
    // Build search params for current period
    const currentParams: LogSearchParams = {
      organizationId: rule.organizationId || undefined,
      startDate: checkStart,
      endDate: now,
      limit: 1, // We only need count
      offset: 0,
    };
    
    // Apply additional filters if specified
    if (conditions.action) {
      baselineParams.action = conditions.action;
      currentParams.action = conditions.action;
    }
    if (conditions.category) {
      baselineParams.category = conditions.category;
      currentParams.category = conditions.category;
    }
    if (conditions.severity) {
      baselineParams.severity = conditions.severity;
      currentParams.severity = conditions.severity;
    }
    
    try {
      // Get baseline and current counts
      const baselineResult = await this.storage.search(baselineParams);
      const currentResult = await this.storage.search(currentParams);
      
      const baselineCount = baselineResult.total;
      const currentCount = currentResult.total;
      
      // Calculate rates (events per minute)
      const baselineMinutesActual = (checkStart.getTime() - baselineStart.getTime()) / (60 * 1000);
      const currentMinutesActual = (now.getTime() - checkStart.getTime()) / (60 * 1000);
      
      const baselineRate = baselineCount / Math.max(baselineMinutesActual, 1);
      const currentRate = currentCount / Math.max(currentMinutesActual, 1);
      
      // Check for anomaly (current rate > baseline rate * multiplier)
      if (baselineRate > 0 && currentRate > baselineRate * multiplier) {
        log.info('Anomaly detected', {
          ruleId: rule.id,
          baselineRate: Math.round(baselineRate * 100) / 100,
          currentRate: Math.round(currentRate * 100) / 100,
          multiplier: Math.round((currentRate / baselineRate) * 100) / 100,
        });
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Failed to evaluate anomaly rule', error, { ruleId: rule.id });
      return false;
    }
  }

  /**
   * Map Prisma model to AlertRule type
   */
  private mapToAlertRule(rule: any): AlertRule {
    return {
      id: rule.id,
      organizationId: rule.organizationId,
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      type: rule.type,
      conditions: rule.conditions as Record<string, unknown>,
      notificationChannels: Array.isArray(rule.notificationChannels)
        ? rule.notificationChannels
        : [],
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      updatedBy: rule.updatedBy,
      updatedAt: rule.updatedAt,
    };
  }
}

