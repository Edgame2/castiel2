/**
 * Cosmos DB Storage Provider
 * Implements IStorageProvider using Azure Cosmos DB (shared database, /tenantId partition).
 * Partition key is tenantId for audit logs.
 */

import { getContainer } from '@coder/shared/database';
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

/** Cosmos SDK expects parameters[].value to be JSONValue; cast to avoid strict typing across SDK versions. */
type CosmosQuerySpec = { query: string; parameters?: { name: string; value: string | number | boolean | null }[] };

export class CosmosProvider implements IStorageProvider {
  private containerName: string;
  private config: StorageProviderConfig;

  constructor(containerName: string, config: StorageProviderConfig) {
    this.containerName = containerName;
    this.config = config;
  }

  private getContainer() {
    return getContainer(this.containerName);
  }

  /** Cosmos partition key: tenantId */
  private partitionKey(tenantId: string): string {
    return tenantId;
  }

  private toDoc(log: AuditLog): Record<string, unknown> {
    return {
      id: log.id,
      tenantId: log.tenantId,
      timestamp: log.timestamp.toISOString(),
      receivedAt: log.receivedAt.toISOString(),
      userId: log.userId,
      sessionId: log.sessionId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      geolocation: log.geolocation,
      action: log.action,
      category: log.category,
      severity: log.severity,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      message: log.message,
      metadata: log.metadata,
      previousHash: log.previousHash,
      hash: log.hash,
      source: log.source,
      correlationId: log.correlationId,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private mapToAuditLog(doc: Record<string, unknown>): AuditLog {
    return {
      id: doc.id as string,
      tenantId: (doc.tenantId ?? doc.organizationId) as string,
      timestamp: new Date(doc.timestamp as string),
      receivedAt: new Date(doc.receivedAt as string),
      userId: (doc.userId as string) ?? null,
      sessionId: (doc.sessionId as string) ?? null,
      ipAddress: (doc.ipAddress as string) ?? null,
      userAgent: (doc.userAgent as string) ?? null,
      geolocation: (doc.geolocation as Record<string, unknown>) ?? null,
      action: doc.action as string,
      category: doc.category as LogCategory,
      severity: doc.severity as LogSeverity,
      resourceType: (doc.resourceType as string) ?? null,
      resourceId: (doc.resourceId as string) ?? null,
      message: doc.message as string,
      metadata: (doc.metadata as Record<string, unknown>) ?? {},
      previousHash: (doc.previousHash as string) ?? null,
      hash: doc.hash as string,
      source: doc.source as string,
      correlationId: (doc.correlationId as string) ?? null,
      createdAt: new Date((doc.createdAt as string) ?? doc.timestamp as string),
    };
  }

  async store(auditLog: AuditLog): Promise<AuditLog> {
    const container = this.getContainer();
    const doc = this.toDoc(auditLog);
    await container.items.create(doc, {
      partitionKey: this.partitionKey(auditLog.tenantId),
    } as Record<string, unknown>);
    return auditLog;
  }

  async storeBatch(logs: AuditLog[]): Promise<AuditLog[]> {
    const container = this.getContainer();
    for (const auditLog of logs) {
      const doc = this.toDoc(auditLog);
      await container.items.create(doc, {
        partitionKey: this.partitionKey(auditLog.tenantId),
      } as Record<string, unknown>);
    }
    return logs;
  }

  async getById(id: string, tenantId?: string): Promise<AuditLog | null> {
    const container = this.getContainer();
    if (tenantId) {
      try {
        const { resource } = await container.item(id, this.partitionKey(tenantId)).read();
        return resource ? this.mapToAuditLog(resource as Record<string, unknown>) : null;
      } catch (err: unknown) {
        if ((err as { code?: number })?.code === 404) return null;
        throw err;
      }
    }
    const { resources } = await container.items
      .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] } as CosmosQuerySpec)
      .fetchNext();
    return resources.length > 0 ? this.mapToAuditLog(resources[0] as Record<string, unknown>) : null;
  }

  async search(params: LogSearchParams): Promise<LogSearchResult> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (params.tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: params.tenantId });
    }
    if (params.userId) {
      conditions.push('c.userId = @userId');
      parameters.push({ name: '@userId', value: params.userId });
    }
    if (params.action) {
      conditions.push('CONTAINS(LOWER(c.action), LOWER(@action))');
      parameters.push({ name: '@action', value: params.action });
    }
    if (params.category) {
      conditions.push('c.category = @category');
      parameters.push({ name: '@category', value: params.category });
    }
    if (params.severity) {
      conditions.push('c.severity = @severity');
      parameters.push({ name: '@severity', value: params.severity });
    }
    if (params.resourceType) {
      conditions.push('c.resourceType = @resourceType');
      parameters.push({ name: '@resourceType', value: params.resourceType });
    }
    if (params.resourceId) {
      conditions.push('c.resourceId = @resourceId');
      parameters.push({ name: '@resourceId', value: params.resourceId });
    }
    if (params.source) {
      conditions.push('c.source = @source');
      parameters.push({ name: '@source', value: params.source });
    }
    if (params.startDate) {
      conditions.push('c.timestamp >= @startDate');
      parameters.push({ name: '@startDate', value: params.startDate.toISOString() });
    }
    if (params.endDate) {
      conditions.push('c.timestamp <= @endDate');
      parameters.push({ name: '@endDate', value: params.endDate.toISOString() });
    }
    if (params.query) {
      conditions.push('(CONTAINS(LOWER(c.message), LOWER(@q)) OR CONTAINS(LOWER(c.action), LOWER(@q)) OR CONTAINS(LOWER(c.source), LOWER(@q)))');
      parameters.push({ name: '@q', value: params.query });
    }
    const where = conditions.join(' AND ');
    const sortBy = params.sortBy ?? 'timestamp';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(params.limit ?? 50, 100);
    const offset = params.offset ?? 0;
    const querySpec: CosmosQuerySpec = {
      query: `SELECT * FROM c WHERE ${where} ORDER BY c.${sortBy} ${sortOrder} OFFSET @offset LIMIT @limit`,
      parameters: [...parameters, { name: '@offset', value: offset }, { name: '@limit', value: limit + 1 }] as CosmosQuerySpec['parameters'],
    };
    const countSpec: CosmosQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c WHERE ${where}`,
      parameters: parameters as CosmosQuerySpec['parameters'],
    };
    const container = this.getContainer();
    const [itemsResp, countResp] = await Promise.all([
      container.items.query(querySpec).fetchNext(),
      container.items.query(countSpec).fetchNext(),
    ]);
    const items = (itemsResp.resources as Record<string, unknown>[]) ?? [];
    const total = (countResp.resources?.[0] as number) ?? 0;
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return {
      items: items.map((r: Record<string, unknown>) => this.mapToAuditLog(r)),
      total,
      hasMore,
      cursor: hasMore && items.length > 0 ? (items[items.length - 1].id as string) : undefined,
    };
  }

  async fullTextSearch(query: string, params: LogSearchParams): Promise<LogSearchResult> {
    return this.search({ ...params, query });
  }

  async aggregate(params: LogAggregationParams): Promise<LogAggregation> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (params.tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: params.tenantId });
    }
    if (params.startDate) {
      conditions.push('c.timestamp >= @startDate');
      parameters.push({ name: '@startDate', value: params.startDate.toISOString() });
    }
    if (params.endDate) {
      conditions.push('c.timestamp <= @endDate');
      parameters.push({ name: '@endDate', value: params.endDate.toISOString() });
    }
    const where = conditions.join(' AND ');
    const field = params.field;
    const limit = params.limit ?? 10;
    const querySpec: CosmosQuerySpec = {
      query: `SELECT c.${field}, COUNT(1) as count FROM c WHERE ${where} GROUP BY c.${field} ORDER BY COUNT(1) DESC OFFSET 0 LIMIT @limit`,
      parameters: [...parameters, { name: '@limit', value: limit }] as CosmosQuerySpec['parameters'],
    };
    const { resources } = await this.getContainer().items.query(querySpec).fetchNext();
    const buckets = (resources ?? []).map((r: Record<string, unknown>) => ({
      key: String(r[field] ?? 'unknown'),
      count: Number(r.count ?? 0),
    }));
    return { field, buckets };
  }

  async getLastLog(tenantId?: string): Promise<AuditLog | null> {
    const container = this.getContainer();
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: tenantId });
    }
    const where = conditions.join(' AND ');
    const { resources } = await container.items
      .query({
        query: `SELECT TOP 1 * FROM c WHERE ${where} ORDER BY c.timestamp DESC`,
        parameters: parameters as CosmosQuerySpec['parameters'],
      })
      .fetchNext();
    return resources?.length
      ? this.mapToAuditLog(resources[0] as Record<string, unknown>)
      : null;
  }

  async getByIds(ids: string[]): Promise<AuditLog[]> {
    if (ids.length === 0) return [];
    const container = this.getContainer();
    const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
    const parameters = ids.map((id, i) => ({ name: `@id${i}`, value: id }));
    const { resources } = await container.items
      .query({ query: `SELECT * FROM c WHERE c.id IN (${placeholders})`, parameters: parameters as CosmosQuerySpec['parameters'] })
      .fetchNext();
    return (resources ?? []).map((r: Record<string, unknown>) => this.mapToAuditLog(r));
  }

  async getLogsInRange(startTime: Date, endTime: Date, limit = 1000): Promise<AuditLog[]> {
    const container = this.getContainer();
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.timestamp >= @start AND c.timestamp <= @end ORDER BY c.timestamp ASC OFFSET 0 LIMIT @limit',
        parameters: [
          { name: '@start', value: startTime.toISOString() },
          { name: '@end', value: endTime.toISOString() },
          { name: '@limit', value: limit },
        ],
      })
      .fetchNext();
    return (resources ?? []).map((r: Record<string, unknown>) => this.mapToAuditLog(r));
  }

  async count(params: Partial<LogSearchParams>): Promise<number> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (params.tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: params.tenantId });
    }
    if (params.startDate) {
      conditions.push('c.timestamp >= @startDate');
      parameters.push({ name: '@startDate', value: params.startDate.toISOString() });
    }
    if (params.endDate) {
      conditions.push('c.timestamp <= @endDate');
      parameters.push({ name: '@endDate', value: params.endDate.toISOString() });
    }
    const where = conditions.join(' AND ');
    const { resources } = await this.getContainer().items
      .query({ query: `SELECT VALUE COUNT(1) FROM c WHERE ${where}`, parameters: parameters as CosmosQuerySpec['parameters'] })
      .fetchNext();
    return Number(resources?.[0] ?? 0);
  }

  async deleteOlderThan(date: Date, tenantId?: string): Promise<number> {
    const container = this.getContainer();
    const conditions: string[] = ['c.timestamp < @date'];
    const parameters: { name: string; value: unknown }[] = [{ name: '@date', value: date.toISOString() }];
    if (tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: tenantId });
    }
    const where = conditions.join(' AND ');
    const { resources } = await container.items
      .query({ query: `SELECT c.id, c.tenantId FROM c WHERE ${where}`, parameters: parameters as CosmosQuerySpec['parameters'] })
      .fetchNext();
    const toDelete = (resources ?? []) as { id: string; tenantId: string }[];
    for (const doc of toDelete) {
      await container.item(doc.id, doc.tenantId).delete();
    }
    return toDelete.length;
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms: number; message?: string }> {
    const start = Date.now();
    try {
      const container = this.getContainer();
      await container.read();
      return { status: 'ok', latency_ms: Date.now() - start };
    } catch (err: unknown) {
      log.error('Cosmos DB health check failed', err);
      return {
        status: 'error',
        latency_ms: Date.now() - start,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getTimeSeries(
    params: LogAggregationParams & { interval: 'hour' | 'day' | 'week' | 'month' }
  ): Promise<{ buckets: { timestamp: string; count: number }[] }> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (params.tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: params.tenantId });
    }
    if (params.startDate) {
      conditions.push('c.timestamp >= @startDate');
      parameters.push({ name: '@startDate', value: params.startDate.toISOString() });
    }
    if (params.endDate) {
      conditions.push('c.timestamp <= @endDate');
      parameters.push({ name: '@endDate', value: params.endDate.toISOString() });
    }
    const where = conditions.join(' AND ');
    const { resources } = await this.getContainer().items
      .query({
        query: `SELECT c.timestamp FROM c WHERE ${where} ORDER BY c.timestamp ASC`,
        parameters: parameters as CosmosQuerySpec['parameters'],
      })
      .fetchNext();
    const timestamps = (resources ?? []) as { timestamp: string }[];
    const bucketMap = new Map<string, number>();
    for (const r of timestamps) {
      const d = new Date(r.timestamp);
      let key: string;
      if (params.interval === 'hour') {
        d.setMinutes(0, 0, 0);
        key = d.toISOString();
      } else if (params.interval === 'day') {
        d.setUTCHours(0, 0, 0, 0);
        key = d.toISOString().slice(0, 10);
      } else if (params.interval === 'week') {
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        d.setUTCHours(0, 0, 0, 0);
        key = d.toISOString().slice(0, 10);
      } else {
        d.setUTCDate(1);
        d.setUTCHours(0, 0, 0, 0);
        key = d.toISOString().slice(0, 7);
      }
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
    }
    const buckets = Array.from(bucketMap.entries()).map(([timestamp, count]) => ({ timestamp, count }));
    buckets.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return { buckets };
  }

  async getDistinctValues(
    field: 'action' | 'source' | 'resourceType',
    tenantId?: string,
    limit = 100
  ): Promise<string[]> {
    const conditions: string[] = ['c.' + field + ' != null'];
    const parameters: { name: string; value: unknown }[] = [];
    if (tenantId) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: tenantId });
    }
    const where = conditions.join(' AND ');
    const { resources } = await this.getContainer().items
      .query({
        query: `SELECT DISTINCT c.${field} FROM c WHERE ${where} OFFSET 0 LIMIT @limit`,
        parameters: [...parameters, { name: '@limit', value: limit }] as CosmosQuerySpec['parameters'],
      })
      .fetchNext();
    return (resources ?? []).map((r: Record<string, unknown>) => String(r[field] ?? ''));
  }
}
