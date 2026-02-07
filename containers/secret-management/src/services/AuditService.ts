/**
 * Audit Service
 * 
 * Manages audit logging for all secret operations.
 */

import { getDatabaseClient } from '@coder/shared';
import {
  AuditLogParams,
  AuditLog,
  AuditLogsParams,
} from '../types/audit.types';
import { SecretAuditEventType, AuditCategory } from '../types/audit.types';

export class AuditService {
  private get db() {
    return getDatabaseClient() as any;
  }
  
  /**
   * Map event type to category
   */
  private getCategory(eventType: SecretAuditEventType): AuditCategory {
    if (eventType.startsWith('SECRET_')) {
      if (['SECRET_CREATED', 'SECRET_READ', 'SECRET_UPDATED', 'SECRET_DELETED'].includes(eventType)) {
        return 'CRUD';
      }
      if (['SECRET_ROTATED', 'SECRET_EXPIRED', 'SECRET_EXPIRING_SOON'].includes(eventType)) {
        return 'LIFECYCLE';
      }
    }
    if (eventType.startsWith('ACCESS_')) {
      return 'ACCESS';
    }
    if (eventType.startsWith('VAULT_')) {
      return 'VAULT';
    }
    if (eventType.startsWith('SECRETS_')) {
      return 'IMPORT_EXPORT';
    }
    if (eventType.startsWith('KEY_')) {
      return 'KEY_MANAGEMENT';
    }
    return 'CRUD';
  }
  
  /**
   * Create audit log entry
   */
  async log(params: AuditLogParams): Promise<AuditLog> {
    const log = await this.db.secret_audit_logs.create({
      data: {
        eventType: params.eventType,
        eventCategory: this.getCategory(params.eventType),
        actorType: params.actorType || 'USER',
        actorId: params.actorId,
        actorName: params.actorName || null,
        organizationId: params.organizationId || null,
        teamId: params.teamId || null,
        projectId: params.projectId || null,
        secretId: params.secretId || null,
        secretName: params.secretName || null,
        secretScope: params.secretScope || null,
        action: params.action || params.eventType,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestId: params.requestId || null,
        outcome: params.outcome || 'SUCCESS',
        errorMessage: params.errorMessage || null,
      },
    });
    
    return this.mapToAuditLog(log);
  }
  
  /**
   * List audit logs
   */
  async listLogs(params: AuditLogsParams): Promise<AuditLog[]> {
    const where: any = {};
    
    if (params.secretId) {
      where.secretId = params.secretId;
    }
    
    if (params.eventType && params.eventType.length > 0) {
      where.eventType = { in: params.eventType };
    }
    
    if (params.actorId) {
      where.actorId = params.actorId;
    }
    
    if (params.outcome && params.outcome.length > 0) {
      where.outcome = { in: params.outcome };
    }
    
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }
    
    const logs = await this.db.secret_audit_logs.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: params.limit || 50,
      skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
    });
    
    return logs.map((l: any) => this.mapToAuditLog(l));
  }
  
  /**
   * Get audit log by ID
   */
  async getLog(logId: string): Promise<AuditLog> {
    const log = await this.db.secret_audit_logs.findUnique({
      where: { id: logId },
    });
    
    if (!log) {
      throw new Error('Audit log not found');
    }
    
    return this.mapToAuditLog(log);
  }
  
  /**
   * Map database model to AuditLog
   */
  private mapToAuditLog(log: any): AuditLog {
    return {
      id: log.id,
      eventType: log.eventType,
      eventCategory: log.eventCategory,
      actorType: log.actorType,
      actorId: log.actorId,
      actorName: log.actorName || undefined,
      organizationId: log.organizationId || undefined,
      teamId: log.teamId || undefined,
      projectId: log.projectId || undefined,
      secretId: log.secretId || undefined,
      secretName: log.secretName || undefined,
      secretScope: log.secretScope || undefined,
      action: log.action,
      details: log.details ? (log.details as Record<string, unknown>) : undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      requestId: log.requestId || undefined,
      outcome: log.outcome,
      errorMessage: log.errorMessage || undefined,
      timestamp: log.timestamp,
    };
  }
}
