/**
 * PostgreSQL Storage Provider
 * Per ModuleImplementationGuide Section 6.3
 */

import { PrismaClient } from '.prisma/logging-client';
import { IStorageProvider, StorageProviderConfig } from './IStorageProvider';
import {
  AuditLog,
  LogSearchParams,
  LogSearchResult,
  LogAggregation,
  LogAggregationParams,
  LogCategory,
  LogSeverity,
} from '../../../types';
import { log } from '../../../utils/logger';

export class PostgresProvider implements IStorageProvider {
  private prisma: PrismaClient;
  private config: StorageProviderConfig;
  
  constructor(prisma: PrismaClient, config: StorageProviderConfig) {
    this.prisma = prisma;
    this.config = config;
  }
  
  async store(auditLog: AuditLog): Promise<AuditLog> {
    const result = await this.prisma.audit_logs.create({
      data: {
        id: auditLog.id,
        organizationId: auditLog.organizationId,
        timestamp: auditLog.timestamp,
        receivedAt: auditLog.receivedAt,
        userId: auditLog.userId,
        sessionId: auditLog.sessionId,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        geolocation: auditLog.geolocation as any,
        action: auditLog.action,
        category: auditLog.category as any,
        severity: auditLog.severity as any,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        message: auditLog.message,
        metadata: auditLog.metadata as any,
        previousHash: auditLog.previousHash,
        hash: auditLog.hash,
        source: auditLog.source,
        correlationId: auditLog.correlationId,
      },
    });
    
    return this.mapToAuditLog(result);
  }
  
  async storeBatch(logs: AuditLog[]): Promise<AuditLog[]> {
    const data = logs.map(auditLog => ({
      id: auditLog.id,
      organizationId: auditLog.organizationId,
      timestamp: auditLog.timestamp,
      receivedAt: auditLog.receivedAt,
      userId: auditLog.userId,
      sessionId: auditLog.sessionId,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      geolocation: auditLog.geolocation as any,
      action: auditLog.action,
      category: auditLog.category as any,
      severity: auditLog.severity as any,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      message: auditLog.message,
      metadata: auditLog.metadata as any,
      previousHash: auditLog.previousHash,
      hash: auditLog.hash,
      source: auditLog.source,
      correlationId: auditLog.correlationId,
    }));
    
    await this.prisma.audit_logs.createMany({ data });
    
    // Return the stored logs
    const ids = logs.map(l => l.id);
    const results = await this.prisma.audit_logs.findMany({
      where: { id: { in: ids } },
    });
    
    return results.map(r => this.mapToAuditLog(r));
  }
  
  async getById(id: string, organizationId?: string): Promise<AuditLog | null> {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    
    const result = await this.prisma.audit_logs.findFirst({ where });
    return result ? this.mapToAuditLog(result) : null;
  }
  
  async search(params: LogSearchParams): Promise<LogSearchResult> {
    const where = this.buildWhereClause(params);
    const orderBy = this.buildOrderBy(params);
    const take = params.limit || 50;
    const skip = params.offset || 0;
    
    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        orderBy,
        take: take + 1, // Get one extra to check hasMore
        skip,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);
    
    const hasMore = items.length > take;
    if (hasMore) {
      items.pop(); // Remove the extra item
    }
    
    return {
      items: items.map(r => this.mapToAuditLog(r)),
      total,
      hasMore,
      cursor: hasMore && items.length > 0 ? items[items.length - 1].id : undefined,
    };
  }
  
  async aggregate(params: LogAggregationParams): Promise<LogAggregation> {
    const where = this.buildWhereClause({
      organizationId: params.organizationId,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    
    const groupBy = params.field;
    const limit = params.limit || 10;
    
    const results = await this.prisma.audit_logs.groupBy({
      by: [groupBy],
      where,
      _count: { _all: true },
      orderBy: { _count: { [groupBy]: 'desc' } },
      take: limit,
    });
    
    return {
      field: params.field,
      buckets: results.map(r => ({
        key: String(r[groupBy] || 'unknown'),
        count: r._count._all,
      })),
    };
  }
  
  async getLastLog(organizationId?: string): Promise<AuditLog | null> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    
    const result = await this.prisma.audit_logs.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
    });
    
    return result ? this.mapToAuditLog(result) : null;
  }
  
  async getByIds(ids: string[]): Promise<AuditLog[]> {
    const results = await this.prisma.audit_logs.findMany({
      where: { id: { in: ids } },
    });
    
    return results.map(r => this.mapToAuditLog(r));
  }
  
  async getLogsInRange(startTime: Date, endTime: Date, limit?: number): Promise<AuditLog[]> {
    const results = await this.prisma.audit_logs.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
    
    return results.map(r => this.mapToAuditLog(r));
  }
  
  async count(params: Partial<LogSearchParams>): Promise<number> {
    const where = this.buildWhereClause(params);
    return this.prisma.audit_logs.count({ where });
  }
  
  async deleteOlderThan(date: Date, organizationId?: string): Promise<number> {
    const where: any = {
      timestamp: { lt: date },
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    
    const result = await this.prisma.audit_logs.deleteMany({ where });
    return result.count;
  }
  
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms: number; message?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latency_ms: Date.now() - start,
      };
    } catch (error: any) {
      log.error('PostgreSQL health check failed', error);
      return {
        status: 'error',
        latency_ms: Date.now() - start,
        message: error.message,
      };
    }
  }
  
  private buildWhereClause(params: Partial<LogSearchParams>): any {
    const where: any = {};
    
    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }
    
    if (params.userId) {
      where.userId = params.userId;
    }
    
    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }
    
    if (params.category) {
      where.category = params.category;
    }
    
    if (params.severity) {
      where.severity = params.severity;
    }
    
    if (params.resourceType) {
      where.resourceType = params.resourceType;
    }
    
    if (params.resourceId) {
      where.resourceId = params.resourceId;
    }
    
    if (params.source) {
      where.source = params.source;
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
    
    if (params.query) {
      // Use case-insensitive search across multiple fields
      where.OR = [
        { message: { contains: params.query, mode: 'insensitive' } },
        { action: { contains: params.query, mode: 'insensitive' } },
        { source: { contains: params.query, mode: 'insensitive' } },
        { resourceType: { contains: params.query, mode: 'insensitive' } },
      ];
    }
    
    return where;
  }
  
  /**
   * Full-text search using PostgreSQL native capabilities
   * Uses raw SQL for better search performance
   */
  async fullTextSearch(
    query: string,
    params: LogSearchParams
  ): Promise<LogSearchResult> {
    const organizationFilter = params.organizationId
      ? `AND organization_id = '${params.organizationId}'`
      : '';
    const categoryFilter = params.category
      ? `AND category = '${params.category}'`
      : '';
    const severityFilter = params.severity
      ? `AND severity = '${params.severity}'`
      : '';
    
    let dateFilter = '';
    if (params.startDate) {
      dateFilter += ` AND timestamp >= '${params.startDate.toISOString()}'`;
    }
    if (params.endDate) {
      dateFilter += ` AND timestamp <= '${params.endDate.toISOString()}'`;
    }
    
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    // Use PostgreSQL full-text search
    const searchQuery = `
      SELECT 
        *,
        ts_rank(
          to_tsvector('english', coalesce(message, '') || ' ' || coalesce(action, '') || ' ' || coalesce(source, '')),
          plainto_tsquery('english', $1)
        ) AS rank
      FROM audit_logs
      WHERE (
        to_tsvector('english', coalesce(message, '') || ' ' || coalesce(action, '') || ' ' || coalesce(source, ''))
        @@ plainto_tsquery('english', $1)
        OR message ILIKE $2
        OR action ILIKE $2
      )
      ${organizationFilter}
      ${categoryFilter}
      ${severityFilter}
      ${dateFilter}
      ORDER BY rank DESC, timestamp DESC
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `;
    
    const likeQuery = `%${query}%`;
    
    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        searchQuery,
        query,
        likeQuery
      );
      
      const hasMore = results.length > limit;
      if (hasMore) {
        results.pop();
      }
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE (
          to_tsvector('english', coalesce(message, '') || ' ' || coalesce(action, '') || ' ' || coalesce(source, ''))
          @@ plainto_tsquery('english', $1)
          OR message ILIKE $2
          OR action ILIKE $2
        )
        ${organizationFilter}
        ${categoryFilter}
        ${severityFilter}
        ${dateFilter}
      `;
      
      const [countResult] = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        countQuery,
        query,
        likeQuery
      );
      
      return {
        items: results.map(r => this.mapToAuditLog(r)),
        total: Number(countResult.count),
        hasMore,
        cursor: hasMore && results.length > 0 ? results[results.length - 1].id : undefined,
      };
    } catch (error) {
      log.error('Full-text search failed, falling back to basic search', error);
      // Fallback to basic search
      return this.search({ ...params, query });
    }
  }
  
  /**
   * Get time-series aggregation for dashboards
   */
  async getTimeSeries(
    params: LogAggregationParams & { interval: 'hour' | 'day' | 'week' | 'month' }
  ): Promise<{ buckets: { timestamp: string; count: number }[] }> {
    const orgFilter = params.organizationId
      ? `WHERE organization_id = '${params.organizationId}'`
      : 'WHERE 1=1';
    
    let dateFilter = '';
    if (params.startDate) {
      dateFilter += ` AND timestamp >= '${params.startDate.toISOString()}'`;
    }
    if (params.endDate) {
      dateFilter += ` AND timestamp <= '${params.endDate.toISOString()}'`;
    }
    
    const truncateInterval = params.interval === 'hour' ? 'hour'
      : params.interval === 'day' ? 'day'
      : params.interval === 'week' ? 'week'
      : 'month';
    
    const query = `
      SELECT 
        date_trunc('${truncateInterval}', timestamp) as bucket,
        COUNT(*)::integer as count
      FROM audit_logs
      ${orgFilter}
      ${dateFilter}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    
    const results = await this.prisma.$queryRawUnsafe<{ bucket: Date; count: number }[]>(query);
    
    return {
      buckets: results.map(r => ({
        timestamp: r.bucket.toISOString(),
        count: r.count,
      })),
    };
  }
  
  /**
   * Get distinct values for a field (for filter dropdowns)
   */
  async getDistinctValues(
    field: 'action' | 'source' | 'resourceType',
    organizationId?: string,
    limit = 100
  ): Promise<string[]> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    
    const columnMap: Record<string, string> = {
      action: 'action',
      source: 'source',
      resourceType: 'resource_type',
    };
    
    const column = columnMap[field];
    const orgFilter = organizationId
      ? `WHERE organization_id = '${organizationId}'`
      : '';
    
    const query = `
      SELECT DISTINCT ${column}
      FROM audit_logs
      ${orgFilter}
      WHERE ${column} IS NOT NULL
      ORDER BY ${column}
      LIMIT ${limit}
    `;
    
    const results = await this.prisma.$queryRawUnsafe<{ [key: string]: string }[]>(query);
    
    return results.map(r => r[column]);
  }
  
  private buildOrderBy(params: LogSearchParams): any {
    const sortBy = params.sortBy || 'timestamp';
    const sortOrder = params.sortOrder || 'desc';
    
    return { [sortBy]: sortOrder };
  }
  
  private mapToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      organizationId: row.organizationId,
      timestamp: row.timestamp,
      receivedAt: row.receivedAt,
      userId: row.userId,
      sessionId: row.sessionId,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      geolocation: row.geolocation as Record<string, unknown> | null,
      action: row.action,
      category: row.category as LogCategory,
      severity: row.severity as LogSeverity,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      message: row.message,
      metadata: row.metadata as Record<string, unknown>,
      previousHash: row.previousHash,
      hash: row.hash,
      source: row.source,
      correlationId: row.correlationId,
      createdAt: row.createdAt,
    };
  }
}

