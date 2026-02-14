/**
 * Audit Log Types
 */

export enum LogCategory {
  ACTION = 'ACTION',
  ACCESS = 'ACCESS',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLog {
  id: string;
  tenantId: string;
  
  // Timestamp
  timestamp: Date;
  receivedAt: Date;
  
  // Actor
  userId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  geolocation: Record<string, unknown> | null;
  
  // Action
  action: string;
  category: LogCategory;
  severity: LogSeverity;
  
  // Resource
  resourceType: string | null;
  resourceId: string | null;
  
  // Context
  message: string;
  metadata: Record<string, unknown>;
  
  // Hash Chain
  previousHash: string | null;
  hash: string;
  
  // Tracking
  source: string;
  correlationId: string | null;
  
  createdAt: Date;
}

export interface CreateLogInput {
  tenantId?: string; // Optional - can be derived from auth
  
  // Actor (optional - can be derived from auth)
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: Record<string, unknown>;
  
  // Action (required)
  action: string;
  category?: LogCategory;
  severity?: LogSeverity;
  
  // Resource (optional)
  resourceType?: string;
  resourceId?: string;
  
  // Context
  message: string;
  metadata?: Record<string, unknown>;
  
  // Tracking
  source?: string;
  correlationId?: string;
}

export interface BatchLogInput {
  logs: CreateLogInput[];
}

export interface LogSearchParams {
  tenantId?: string;
  
  // Text search
  query?: string;
  
  // Filters
  userId?: string;
  action?: string;
  category?: LogCategory;
  severity?: LogSeverity;
  resourceType?: string;
  resourceId?: string;
  source?: string;
  
  // Time range
  startDate?: Date;
  endDate?: Date;
  
  // Pagination
  limit?: number;
  offset?: number;
  cursor?: string;
  
  // Sorting
  sortBy?: 'timestamp' | 'action' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface LogSearchResult {
  items: AuditLog[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}

export interface LogAggregation {
  field: 'category' | 'severity' | 'action' | 'source' | 'resourceType';
  buckets: Array<{
    key: string;
    count: number;
  }>;
}

export interface LogAggregationParams {
  tenantId?: string;
  field: 'category' | 'severity' | 'action' | 'source' | 'resourceType';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}



