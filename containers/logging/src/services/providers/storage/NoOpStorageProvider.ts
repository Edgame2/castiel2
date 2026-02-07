/**
 * No-op storage provider for Cosmos mode.
 * Used when storage.provider is 'cosmos'; actual persistence may be via Cosmos client elsewhere.
 */

import { IStorageProvider } from './IStorageProvider';
import {
  AuditLog,
  LogSearchParams,
  LogSearchResult,
  LogAggregation,
  LogAggregationParams,
} from '../../../types';

export class NoOpStorageProvider implements IStorageProvider {
  async store(log: AuditLog): Promise<AuditLog> {
    return log;
  }

  async storeBatch(logs: AuditLog[]): Promise<AuditLog[]> {
    return logs;
  }

  async getById(_id: string, _organizationId?: string): Promise<AuditLog | null> {
    return null;
  }

  async search(_params: LogSearchParams): Promise<LogSearchResult> {
    return { items: [], total: 0, hasMore: false };
  }

  async aggregate(params: LogAggregationParams): Promise<LogAggregation> {
    return { field: params.field, buckets: [] };
  }

  async getLastLog(_organizationId?: string): Promise<AuditLog | null> {
    return null;
  }

  async getByIds(_ids: string[]): Promise<AuditLog[]> {
    return [];
  }

  async getLogsInRange(_startTime: Date, _endTime: Date, _limit?: number): Promise<AuditLog[]> {
    return [];
  }

  async count(_params: Partial<LogSearchParams>): Promise<number> {
    return 0;
  }

  async deleteOlderThan(_date: Date, _organizationId?: string): Promise<number> {
    return 0;
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms: number; message?: string }> {
    return { status: 'ok', latency_ms: 0 };
  }
}
