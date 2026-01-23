/**
 * Alert Job
 * Checks for alert conditions and triggers notifications
 * Per ModuleImplementationGuide Section 9: Event-Driven Communication
 */

import { PrismaClient, audit_alert_type } from '.prisma/logging-client';
import { CronJob } from 'cron';
import { IStorageProvider } from '../services/providers/storage/IStorageProvider';
import { publishAlertTriggered } from '../events/publisher';
import { log } from '../utils/logger';

export interface AlertCheckResult {
  rulesChecked: number;
  alertsTriggered: number;
  alerts: TriggeredAlert[];
  errors: string[];
  durationMs: number;
}

export interface TriggeredAlert {
  ruleId: string;
  ruleName: string;
  organizationId: string | null;
  triggeredAt: Date;
  matchCount: number;
  conditions: Record<string, unknown>;
}

// Alert condition types
interface PatternConditions {
  action?: string;
  category?: string;
  severity?: string;
  minCount?: number;
}

interface ThresholdConditions {
  threshold: number;
  action?: string;
  category?: string;
  timeWindowMinutes?: number;
}

interface AnomalyConditions {
  multiplier?: number;
  baselineMinutes?: number;
}

export class AlertJob {
  private prisma: PrismaClient;
  private storage: IStorageProvider;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private lastCheckTime: Date;
  
  constructor(prisma: PrismaClient, storage: IStorageProvider) {
    this.prisma = prisma;
    this.storage = storage;
    this.lastCheckTime = new Date(Date.now() - 60 * 1000); // Start from 1 minute ago
  }
  
  /**
   * Start the alert job with cron schedule
   */
  start(schedule: string = '*/1 * * * *'): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    
    this.cronJob = new CronJob(
      schedule,
      async () => {
        await this.runNow();
      },
      null,
      true,
      'UTC'
    );
    
    log.info('Alert job started', { schedule });
  }
  
  /**
   * Stop the alert job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    log.info('Alert job stopped');
  }
  
  /**
   * Run alert checks manually
   */
  async runNow(): Promise<AlertCheckResult> {
    if (this.isRunning) {
      log.warn('Alert job already running, skipping');
      return {
        rulesChecked: 0,
        alertsTriggered: 0,
        alerts: [],
        errors: ['Job already running'],
        durationMs: 0,
      };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const checkStartTime = this.lastCheckTime;
    const checkEndTime = new Date();
    
    const result: AlertCheckResult = {
      rulesChecked: 0,
      alertsTriggered: 0,
      alerts: [],
      errors: [],
      durationMs: 0,
    };
    
    try {
      log.debug('Starting alert check', { from: checkStartTime, to: checkEndTime });
      
      // Get all enabled alert rules
      const rules = await this.prisma.audit_alert_rules.findMany({
        where: {
          enabled: true,
        },
      });
      
      result.rulesChecked = rules.length;
      
      if (rules.length === 0) {
        log.debug('No alert rules configured');
        this.lastCheckTime = checkEndTime;
        result.durationMs = Date.now() - startTime;
        return result;
      }
      
      // Check each rule
      for (const rule of rules) {
        try {
          const alert = await this.checkRule(rule, checkStartTime, checkEndTime);
          
          if (alert) {
            result.alertsTriggered++;
            result.alerts.push(alert);
            
            // Update last triggered timestamp
            await this.prisma.audit_alert_rules.update({
              where: { id: rule.id },
              data: { updatedAt: new Date() },
            });
            
            // Publish alert event
            await this.publishAlert(alert, rule);
          }
        } catch (error: any) {
          const errorMsg = `Failed to check rule ${rule.id}: ${error.message}`;
          log.error(errorMsg, error);
          result.errors.push(errorMsg);
        }
      }
      
      this.lastCheckTime = checkEndTime;
      result.durationMs = Date.now() - startTime;
      
      if (result.alertsTriggered > 0) {
        log.info('Alert check completed with triggers', {
          rulesChecked: result.rulesChecked,
          alertsTriggered: result.alertsTriggered,
          durationMs: result.durationMs,
        });
      } else {
        log.debug('Alert check completed', {
          rulesChecked: result.rulesChecked,
          durationMs: result.durationMs,
        });
      }
      
      return result;
    } catch (error: any) {
      log.error('Alert job failed', error);
      result.errors.push(error.message);
      result.durationMs = Date.now() - startTime;
      return result;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Check a single alert rule
   */
  private async checkRule(
    rule: {
      id: string;
      organizationId: string | null;
      name: string;
      type: audit_alert_type;
      conditions: any;
    },
    startTime: Date,
    endTime: Date
  ): Promise<TriggeredAlert | null> {
    const conditions = rule.conditions as Record<string, any>;
    
    switch (rule.type) {
      case 'PATTERN':
        return this.checkPatternRule(rule, conditions as PatternConditions, startTime, endTime);
      
      case 'THRESHOLD':
        return this.checkThresholdRule(rule, conditions as ThresholdConditions, startTime, endTime);
      
      case 'ANOMALY':
        return this.checkAnomalyRule(rule, conditions as AnomalyConditions, startTime, endTime);
      
      default:
        log.warn('Unknown alert type', { ruleId: rule.id, type: rule.type });
        return null;
    }
  }
  
  /**
   * Check pattern-based alert (e.g., specific action occurs)
   */
  private async checkPatternRule(
    rule: { id: string; organizationId: string | null; name: string },
    conditions: { action?: string; category?: string; severity?: string; minCount?: number },
    startTime: Date,
    endTime: Date
  ): Promise<TriggeredAlert | null> {
    const where: any = {
      timestamp: { gte: startTime, lte: endTime },
    };
    
    if (rule.organizationId) {
      where.organizationId = rule.organizationId;
    }
    if (conditions.action) {
      where.action = { contains: conditions.action, mode: 'insensitive' };
    }
    if (conditions.category) {
      where.category = conditions.category;
    }
    if (conditions.severity) {
      where.severity = conditions.severity;
    }
    
    const count = await this.prisma.audit_logs.count({ where });
    const minCount = conditions.minCount || 1;
    
    if (count >= minCount) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        organizationId: rule.organizationId,
        triggeredAt: new Date(),
        matchCount: count,
        conditions,
      };
    }
    
    return null;
  }
  
  /**
   * Check threshold-based alert (e.g., > N events in time window)
   */
  private async checkThresholdRule(
    rule: { id: string; organizationId: string | null; name: string },
    conditions: { threshold: number; action?: string; category?: string; timeWindowMinutes?: number },
    startTime: Date,
    endTime: Date
  ): Promise<TriggeredAlert | null> {
    // Use time window if specified, otherwise use check interval
    const windowStart = conditions.timeWindowMinutes
      ? new Date(endTime.getTime() - conditions.timeWindowMinutes * 60 * 1000)
      : startTime;
    
    const where: any = {
      timestamp: { gte: windowStart, lte: endTime },
    };
    
    if (rule.organizationId) {
      where.organizationId = rule.organizationId;
    }
    if (conditions.action) {
      where.action = { contains: conditions.action, mode: 'insensitive' };
    }
    if (conditions.category) {
      where.category = conditions.category;
    }
    
    const count = await this.prisma.audit_logs.count({ where });
    
    if (count > conditions.threshold) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        organizationId: rule.organizationId,
        triggeredAt: new Date(),
        matchCount: count,
        conditions: { ...conditions, threshold: conditions.threshold, actual: count },
      };
    }
    
    return null;
  }
  
  /**
   * Check anomaly-based alert (e.g., volume spike)
   * Simple implementation: checks if current volume is > N times the average
   */
  private async checkAnomalyRule(
    rule: { id: string; organizationId: string | null; name: string },
    conditions: { multiplier?: number; baselineMinutes?: number },
    startTime: Date,
    endTime: Date
  ): Promise<TriggeredAlert | null> {
    const multiplier = conditions.multiplier || 3; // Default 3x spike
    const baselineMinutes = conditions.baselineMinutes || 60; // Default 1 hour baseline
    
    // Calculate baseline (average rate over baseline period)
    const baselineStart = new Date(endTime.getTime() - baselineMinutes * 60 * 1000);
    
    const baseWhere: any = {
      timestamp: { gte: baselineStart, lt: startTime },
    };
    if (rule.organizationId) {
      baseWhere.organizationId = rule.organizationId;
    }
    
    const baselineCount = await this.prisma.audit_logs.count({ where: baseWhere });
    const baselineMinutesActual = (startTime.getTime() - baselineStart.getTime()) / (60 * 1000);
    const baselineRate = baselineCount / Math.max(baselineMinutesActual, 1);
    
    // Calculate current rate
    const currentWhere: any = {
      timestamp: { gte: startTime, lte: endTime },
    };
    if (rule.organizationId) {
      currentWhere.organizationId = rule.organizationId;
    }
    
    const currentCount = await this.prisma.audit_logs.count({ where: currentWhere });
    const currentMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    const currentRate = currentCount / Math.max(currentMinutes, 1);
    
    // Check for anomaly
    if (baselineRate > 0 && currentRate > baselineRate * multiplier) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        organizationId: rule.organizationId,
        triggeredAt: new Date(),
        matchCount: currentCount,
        conditions: {
          baselineRate: Math.round(baselineRate * 100) / 100,
          currentRate: Math.round(currentRate * 100) / 100,
          multiplier,
          actualMultiplier: Math.round((currentRate / baselineRate) * 100) / 100,
        },
      };
    }
    
    return null;
  }
  
  /**
   * Publish alert to notification service
   */
  private async publishAlert(
    alert: TriggeredAlert,
    rule: { notificationChannels: any }
  ): Promise<void> {
    try {
      await publishAlertTriggered({
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        organizationId: alert.organizationId || undefined,
        triggeredAt: alert.triggeredAt,
        matchCount: alert.matchCount,
        conditions: alert.conditions,
        notificationChannels: (rule.notificationChannels as string[]) || [],
      });
      
      log.info('Alert published', { ruleId: alert.ruleId, ruleName: alert.ruleName });
    } catch (error) {
      log.error('Failed to publish alert', error, { ruleId: alert.ruleId });
    }
  }
}
