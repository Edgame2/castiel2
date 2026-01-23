/**
 * Comprehensive Audit Trail Service
 * Provides distributed tracing, data lineage, AI interaction logging, and decision audit trails
 * Phase 2: Robustness - Comprehensive Audit Trail
 */

import { v4 as uuidv4 } from 'uuid';
import { IMonitoringProvider } from '@castiel/monitoring';
import { CosmosDBService } from './cosmos-db.service.js';
import type {
  ComprehensiveAuditLogEntry,
  AuditOperation,
  DataLineage,
  AIInteractionLog,
  DecisionTrail,
  ComprehensiveAuditLogQuery,
  ComprehensiveAuditLogQueryResponse,
  ComprehensiveAuditLogStats,
} from '../types/comprehensive-audit.types.js';
import type { DetectionMethod } from '../types/risk-analysis.types.js';

/**
 * Container name for comprehensive audit logs in Cosmos DB
 */
const COMPREHENSIVE_AUDIT_CONTAINER = 'comprehensive-audit-logs';

export class ComprehensiveAuditTrailService {
  private enabled: boolean = true;

  constructor(
    private cosmosDB: CosmosDBService,
    private monitoring: IMonitoringProvider,
    enabled: boolean = true
  ) {
    this.enabled = enabled;
  }

  /**
   * Generate a new trace ID
   */
  generateTraceId(): string {
    return uuidv4();
  }

  /**
   * Log a tool execution with full traceability
   * This method is designed to never throw - audit logging should not break app flow
   */
  async logToolExecution(
    entry: Omit<ComprehensiveAuditLogEntry, 'id' | 'traceId' | 'timestamp' | 'partitionKey'> & {
      traceId?: string;
      parentTraceId?: string;
      toolName: string;
      toolCallId: string;
      arguments?: Record<string, unknown>;
      result?: unknown;
    }
  ): Promise<ComprehensiveAuditLogEntry | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const auditEntry: ComprehensiveAuditLogEntry = {
        id: uuidv4(),
        traceId: entry.traceId || this.generateTraceId(),
        parentTraceId: entry.parentTraceId,
        timestamp: new Date(),
        operation: 'ai_tool_execution' as AuditOperation,
        tenantId: entry.tenantId,
        userId: entry.userId,
        inputData: {
          toolName: entry.toolName,
          toolCallId: entry.toolCallId,
          arguments: this.sanitizeData(entry.arguments),
        },
        outputData: this.sanitizeData(entry.result),
        durationMs: entry.durationMs,
        success: entry.success,
        error: entry.error,
        errorCode: entry.errorCode,
        metadata: {
          ...entry.metadata,
          toolName: entry.toolName,
          toolCallId: entry.toolCallId,
          serviceName: 'ai-tool-executor',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        partitionKey: entry.tenantId,
      };

      await this.cosmosDB.upsertDocument(
        COMPREHENSIVE_AUDIT_CONTAINER,
        auditEntry,
        entry.tenantId
      );

      this.monitoring.trackEvent('comprehensive-audit.tool-execution-logged', {
        tenantId: entry.tenantId,
        toolName: entry.toolName,
        toolCallId: entry.toolCallId,
        traceId: auditEntry.traceId,
        durationMs: entry.durationMs,
        success: entry.success,
      });

      return auditEntry;
    } catch (error) {
      // Never throw - audit logging should not break app flow
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit.logToolExecution',
        tenantId: entry.tenantId,
        toolName: entry.toolName,
      });
      return null;
    }
  }

  /**
   * Log a risk evaluation with full traceability
   * This method is designed to never throw - audit logging should not break app flow
   */
  async logRiskEvaluation(
    entry: Omit<ComprehensiveAuditLogEntry, 'id' | 'traceId' | 'timestamp' | 'partitionKey'> & {
      traceId?: string;
      parentTraceId?: string;
    }
  ): Promise<ComprehensiveAuditLogEntry | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const auditEntry: ComprehensiveAuditLogEntry = {
        id: uuidv4(),
        traceId: entry.traceId || this.generateTraceId(),
        parentTraceId: entry.parentTraceId,
        timestamp: new Date(),
        operation: entry.operation || 'risk_evaluation',
        tenantId: entry.tenantId,
        userId: entry.userId,
        inputData: this.sanitizeData(entry.inputData),
        outputData: this.sanitizeData(entry.outputData),
        assumptions: entry.assumptions,
        dataLineage: entry.dataLineage,
        aiInteraction: entry.aiInteraction,
        decisionTrail: entry.decisionTrail,
        durationMs: entry.durationMs,
        success: entry.success,
        error: entry.error,
        errorCode: entry.errorCode,
        metadata: {
          ...entry.metadata,
          serviceName: 'comprehensive-audit-trail',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        partitionKey: entry.tenantId,
      };

      await this.cosmosDB.upsertDocument(
        COMPREHENSIVE_AUDIT_CONTAINER,
        auditEntry,
        entry.tenantId
      );

      this.monitoring.trackEvent('comprehensive-audit.risk-evaluation-logged', {
        tenantId: entry.tenantId,
        operation: auditEntry.operation,
        traceId: auditEntry.traceId,
        durationMs: entry.durationMs,
        success: entry.success,
      });

      return auditEntry;
    } catch (error) {
      // Log but don't throw - audit logging should not break app flow
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit-trail.log-risk-evaluation',
        tenantId: entry.tenantId,
        operationType: entry.operation,
      });
      return null;
    }
  }

  /**
   * Log an AI chat interaction with full traceability
   * This method is designed to never throw - audit logging should not break app flow
   */
  async logAIChat(
    entry: Omit<ComprehensiveAuditLogEntry, 'id' | 'traceId' | 'timestamp' | 'partitionKey'> & {
      traceId?: string;
      parentTraceId?: string;
    }
  ): Promise<ComprehensiveAuditLogEntry | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const auditEntry: ComprehensiveAuditLogEntry = {
        id: uuidv4(),
        traceId: entry.traceId || this.generateTraceId(),
        parentTraceId: entry.parentTraceId,
        timestamp: new Date(),
        operation: entry.operation || 'ai_chat_generation',
        tenantId: entry.tenantId,
        userId: entry.userId,
        inputData: this.sanitizeData(entry.inputData),
        outputData: this.sanitizeData(entry.outputData),
        assumptions: entry.assumptions,
        dataLineage: entry.dataLineage,
        aiInteraction: entry.aiInteraction,
        decisionTrail: entry.decisionTrail,
        durationMs: entry.durationMs,
        success: entry.success,
        error: entry.error,
        errorCode: entry.errorCode,
        metadata: {
          ...entry.metadata,
          serviceName: 'comprehensive-audit-trail',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        partitionKey: entry.tenantId,
      };

      await this.cosmosDB.upsertDocument(
        COMPREHENSIVE_AUDIT_CONTAINER,
        auditEntry,
        entry.tenantId
      );

      this.monitoring.trackEvent('comprehensive-audit.ai-chat-logged', {
        tenantId: entry.tenantId,
        operation: auditEntry.operation,
        traceId: auditEntry.traceId,
        modelName: entry.aiInteraction?.modelName,
        durationMs: entry.durationMs,
        success: entry.success,
      });

      return auditEntry;
    } catch (error) {
      // Log but don't throw - audit logging should not break app flow
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit-trail.log-ai-chat',
        tenantId: entry.tenantId,
        operationType: entry.operation,
      });
      return null;
    }
  }

  /**
   * Query comprehensive audit logs
   */
  async queryAuditLogs(
    query: ComprehensiveAuditLogQuery
  ): Promise<ComprehensiveAuditLogQueryResponse> {
    try {
      // Get all documents from container (CosmosDBService.queryDocuments is simplified)
      const allEntries = await this.cosmosDB.queryDocuments<ComprehensiveAuditLogEntry>(
        COMPREHENSIVE_AUDIT_CONTAINER,
        '',
        [],
        query.tenantId
      );

      // Apply filters
      let filtered = allEntries.filter((entry) => {
        // Tenant filter (always required)
        if (entry.tenantId !== query.tenantId) {
          return false;
        }

        // Trace ID filter
        if (query.traceId && entry.traceId !== query.traceId) {
          return false;
        }

        // Parent trace ID filter
        if (query.parentTraceId && entry.parentTraceId !== query.parentTraceId) {
          return false;
        }

        // Operation filter
        if (query.operation) {
          const operations = Array.isArray(query.operation) ? query.operation : [query.operation];
          if (!operations.includes(entry.operation)) {
            return false;
          }
        }

        // User filter
        if (query.userId && entry.userId !== query.userId) {
          return false;
        }

        // Date range filter
        if (query.startDate && entry.timestamp < query.startDate) {
          return false;
        }
        if (query.endDate && entry.timestamp > query.endDate) {
          return false;
        }

        // Success filter
        if (query.success !== undefined && entry.success !== query.success) {
          return false;
        }

        // Error filter
        if (query.hasError !== undefined) {
          const hasError = !!entry.error;
          if (hasError !== query.hasError) {
            return false;
          }
        }

        // Duration filters
        if (query.minDurationMs !== undefined && entry.durationMs < query.minDurationMs) {
          return false;
        }
        if (query.maxDurationMs !== undefined && entry.durationMs > query.maxDurationMs) {
          return false;
        }

        // AI interaction filters
        if (query.modelName && entry.aiInteraction?.modelName !== query.modelName) {
          return false;
        }
        if (query.provider && entry.aiInteraction?.provider !== query.provider) {
          return false;
        }

        // Decision trail filters
        if (query.detectionMethod && entry.decisionTrail) {
          if (!entry.decisionTrail.detectionMethods.includes(query.detectionMethod)) {
            return false;
          }
        }
        if (query.riskId && entry.decisionTrail) {
          const hasRiskId = entry.decisionTrail.matchedRules?.some(
            (r) => r.riskId === query.riskId
          );
          if (!hasRiskId) {
            return false;
          }
        }

        // Data lineage filter
        if (query.sourceSystem && entry.dataLineage) {
          const hasSourceSystem = entry.dataLineage.sourceSystems.some(
            (s) => s.system === query.sourceSystem
          );
          if (!hasSourceSystem) {
            return false;
          }
        }

        return true;
      });

      // Sort
      const orderBy = query.orderBy || 'timestamp';
      const orderDirection = query.orderDirection || 'desc';
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (orderBy === 'timestamp') {
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
        } else if (orderBy === 'durationMs') {
          aValue = a.durationMs;
          bValue = b.durationMs;
        } else {
          return 0;
        }

        if (orderDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // Paginate
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        entries: paginated,
        total,
        limit,
        offset,
        hasMore,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit-trail.query-audit-logs',
        tenantId: query.tenantId,
      });
      return {
        entries: [],
        total: 0,
        limit: query.limit || 100,
        offset: query.offset || 0,
        hasMore: false,
      };
    }
  }

  /**
   * Get statistics for audit logs
   */
  async getStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComprehensiveAuditLogStats> {
    try {
      const query: ComprehensiveAuditLogQuery = {
        tenantId,
        startDate,
        endDate,
        limit: 10000, // Get all for stats
      };

      const response = await this.queryAuditLogs(query);
      const entries = response.entries;

      // Calculate statistics
      const operations: Record<AuditOperation, number> = {} as Record<AuditOperation, number>;
      let totalDuration = 0;
      let successCount = 0;
      let errorCount = 0;
      const byModel: Record<string, { count: number; totalDuration: number; successCount: number }> = {};
      const byDetectionMethod: Partial<Record<DetectionMethod, number>> = {};

      for (const entry of entries) {
        // Count operations
        operations[entry.operation] = (operations[entry.operation] || 0) + 1;

        // Duration
        totalDuration += entry.durationMs;

        // Success/Error
        if (entry.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // By model
        if (entry.aiInteraction?.modelName) {
          const modelName = entry.aiInteraction.modelName;
          if (!byModel[modelName]) {
            byModel[modelName] = { count: 0, totalDuration: 0, successCount: 0 };
          }
          byModel[modelName].count++;
          byModel[modelName].totalDuration += entry.durationMs;
          if (entry.success) {
            byModel[modelName].successCount++;
          }
        }

        // By detection method
        if (entry.decisionTrail?.detectionMethods) {
          for (const method of entry.decisionTrail.detectionMethods) {
            byDetectionMethod[method] = (byDetectionMethod[method] || 0) + 1;
          }
        }
      }

      const total = entries.length;
      const averageDuration = total > 0 ? totalDuration / total : 0;
      const successRate = total > 0 ? successCount / total : 0;
      const errorRate = total > 0 ? errorCount / total : 0;

      // Calculate model stats
      const modelStats: Record<string, { count: number; averageDurationMs: number; successRate: number }> = {};
      for (const [model, stats] of Object.entries(byModel)) {
        modelStats[model] = {
          count: stats.count,
          averageDurationMs: stats.count > 0 ? stats.totalDuration / stats.count : 0,
          successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
        };
      }

      return {
        totalEntries: total,
        operations: operations as Record<AuditOperation, number>,
        successRate,
        averageDurationMs: averageDuration,
        errorRate,
        byModel: modelStats,
        byDetectionMethod: byDetectionMethod as Record<string, number>,
        timeRange: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit-trail.get-stats',
        tenantId,
      });
      return {
        totalEntries: 0,
        operations: {} as Record<AuditOperation, number>,
        successRate: 0,
        averageDurationMs: 0,
        errorRate: 0,
        byModel: {},
        byDetectionMethod: {} as Record<DetectionMethod, number>,
        timeRange: {
          start: startDate,
          end: endDate,
        },
      };
    }
  }

  /**
   * Phase 3.1: Log PII redaction for audit trail
   */
  async logPIIRedaction(entry: {
    tenantId: string;
    userId: string;
    operation: string;
    detectedPII: number;
    byType: Record<string, number>;
    redactionsApplied: number;
    timestamp: Date;
  }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const auditEntry: ComprehensiveAuditLogEntry = {
        id: uuidv4(),
        traceId: this.generateTraceId(),
        timestamp: entry.timestamp,
        operation: 'pii_redaction' as AuditOperation,
        tenantId: entry.tenantId,
        userId: entry.userId,
        inputData: {
          operation: entry.operation,
          detectedPII: entry.detectedPII,
          byType: entry.byType,
        },
        outputData: {
          redactionsApplied: entry.redactionsApplied,
        },
        durationMs: 0,
        success: true,
        metadata: {
          serviceName: 'pii-detection',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
        partitionKey: entry.tenantId,
      };

      await this.cosmosDB.upsertDocument(
        COMPREHENSIVE_AUDIT_CONTAINER,
        auditEntry,
        entry.tenantId
      );

      this.monitoring.trackEvent('comprehensive-audit.pii-redaction-logged', {
        tenantId: entry.tenantId,
        operation: entry.operation,
        detectedPII: entry.detectedPII,
        redactionsApplied: entry.redactionsApplied,
      });
    } catch (error) {
      // Non-blocking - log but don't throw
      this.monitoring.trackException(error as Error, {
        operation: 'comprehensive-audit.log-pii-redaction',
        tenantId: entry.tenantId,
      });
    }
  }

  /**
   * Sanitize data before storing (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    // Create a copy to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'accessToken', 'refreshToken'];
    
    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}
