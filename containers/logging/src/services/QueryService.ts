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
  /** User's organization ID */
  organizationId?: string;
  /** Whether user can access cross-org data (Super Admin) */
  canAccessCrossOrg: boolean;
  /** Whether user can only see own activity */
  ownActivityOnly: boolean;
}

export class QueryService {
  private storage: IStorageProvider;

  constructor(storage: IStorageProvider) {
    this.storage = storage;
  }

  /**
   * Search logs with advanced filtering and organization isolation
   */
  async search(params: LogSearchParams, context: QueryContext): Promise<LogSearchResult> {
    try {
      // Apply organization isolation
      const isolatedParams = this.applyOrgIsolation(params, context);
      
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
      // Apply organization isolation
      const isolatedParams = this.applyOrgIsolationAgg(params, context);
      
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
      // Apply organization isolation
      const isolatedParams = this.applyOrgIsolation(params as LogSearchParams, context);
      
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
      const auditLog = await this.storage.getById(id);
      
      if (!auditLog) {
        return null;
      }
      
      // Check access
      if (!this.canAccessLog(auditLog, context)) {
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
   * Apply organization isolation to search params
   */
  private applyOrgIsolation(params: LogSearchParams, context: QueryContext): LogSearchParams {
    const isolated = { ...params };
    
    // Super Admin can query any organization
    if (context.canAccessCrossOrg) {
      // Allow organizationId filter from params, or no filter (all orgs)
      return isolated;
    }
    
    // Regular users are restricted to their organization
    if (!context.organizationId) {
      // User has no org - they can only see system logs or logs they created
      isolated.userId = context.userId;
      return isolated;
    }
    
    // Force organization isolation
    isolated.organizationId = context.organizationId;
    
    // If user can only see own activity, add user filter
    if (context.ownActivityOnly) {
      isolated.userId = context.userId;
    }
    
    return isolated;
  }

  /**
   * Apply organization isolation to aggregation params
   */
  private applyOrgIsolationAgg(params: LogAggregationParams, context: QueryContext): LogAggregationParams {
    const isolated = { ...params };
    
    // Super Admin can query any organization
    if (context.canAccessCrossOrg) {
      return isolated;
    }
    
    // Regular users are restricted to their organization
    if (context.organizationId) {
      isolated.organizationId = context.organizationId;
    }
    
    return isolated;
  }

  /**
   * Check if user can access a specific log
   */
  private canAccessLog(auditLog: any, context: QueryContext): boolean {
    // Super Admin can access any log
    if (context.canAccessCrossOrg) {
      return true;
    }
    
    // User must be in the same organization
    if (auditLog.organizationId !== context.organizationId) {
      return false;
    }
    
    // If user can only see own activity, check user ID
    if (context.ownActivityOnly && auditLog.userId !== context.userId) {
      return false;
    }
    
    return true;
  }
}
