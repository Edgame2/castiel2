/**
 * Query Service
 * Advanced search and filtering for audit logs
 * Per ModuleImplementationGuide Section 7: API Standards
 */

import { IStorageProvider } from './providers/storage/IStorageProvider';
import {
  LogSearchParams,
  LogSearchResult,
  LogAggregationParams,
  LogAggregation,
} from '../types/log.types';
import { log } from '../utils/logger';

export interface QueryContext {
  /** User making the query */
  userId: string;
  /** User's tenant ID (scope for log isolation) */
  tenantId?: string;
  /** Whether user can access cross-tenant data (Super Admin) */
  canAccessCrossTenant: boolean;
  /** Whether user can only see own activity */
  ownActivityOnly: boolean;
}

export class QueryService {
  private storage: IStorageProvider;

  constructor(storage: IStorageProvider) {
    this.storage = storage;
  }

  /**
   * Search logs with advanced filtering and tenant isolation
   */
  async search(params: LogSearchParams, context: QueryContext): Promise<LogSearchResult> {
    try {
      // Apply tenant isolation
      const isolatedParams = this.applyTenantIsolation(params, context);
      
      log.debug('Searching logs', { params: isolatedParams, context });
      
      return await this.storage.search(isolatedParams);
    } catch (error) {
      log.error('Search failed', error, { params });
      throw error;
    }
  }

  /**
   * Get aggregation statistics
   */
  async aggregate(params: LogAggregationParams, context: QueryContext): Promise<LogAggregation> {
    try {
      // Apply tenant isolation
      const isolatedParams = this.applyTenantIsolationAgg(params, context);
      
      return await this.storage.aggregate(isolatedParams);
    } catch (error) {
      log.error('Aggregation failed', error, { params });
      throw error;
    }
  }

  /**
   * Count logs matching criteria
   */
  async count(params: Partial<LogSearchParams>, context: QueryContext): Promise<number> {
    try {
      // Apply tenant isolation
      const isolatedParams = this.applyTenantIsolation(params as LogSearchParams, context);
      
      return await this.storage.count(isolatedParams);
    } catch (error) {
      log.error('Count failed', error, { params });
      throw error;
    }
  }

  /**
   * Get a single log by ID with access control
   */
  async getById(id: string, context: QueryContext): Promise<any | null> {
    try {
      const auditLog = await this.storage.getById(id, context.tenantId);
      
      if (!auditLog) {
        return null;
      }
      
      // Check access
      if (!this.canAccessLog({ tenantId: auditLog.tenantId, userId: auditLog.userId ?? undefined }, context)) {
        log.warn('Access denied to log', { logId: id, userId: context.userId });
        return null;
      }
      
      return auditLog;
    } catch (error) {
      log.error('GetById failed', error, { id });
      throw error;
    }
  }

  /**
   * Apply tenant isolation to search params
   */
  private applyTenantIsolation(params: LogSearchParams, context: QueryContext): LogSearchParams {
    const isolated = { ...params };
    if (context.canAccessCrossTenant) return isolated;
    if (!context.tenantId) {
      isolated.userId = context.userId;
      return isolated;
    }
    isolated.tenantId = context.tenantId;
    if (context.ownActivityOnly) isolated.userId = context.userId;
    return isolated;
  }

  /**
   * Apply tenant isolation to aggregation params
   */
  private applyTenantIsolationAgg(params: LogAggregationParams, context: QueryContext): LogAggregationParams {
    const isolated = { ...params };
    if (context.canAccessCrossTenant) return isolated;
    if (context.tenantId) isolated.tenantId = context.tenantId;
    return isolated;
  }

  /**
   * Check if user can access a specific log
   */
  private canAccessLog(auditLog: { tenantId?: string; userId?: string }, context: QueryContext): boolean {
    if (context.canAccessCrossTenant) return true;
    if (auditLog.tenantId !== context.tenantId) return false;
    
    // If user can only see own activity, check user ID
    if (context.ownActivityOnly && auditLog.userId !== context.userId) {
      return false;
    }
    
    return true;
  }
}
