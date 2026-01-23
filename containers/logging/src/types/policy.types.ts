/**
 * Retention Policy Types
 */

import { LogCategory, LogSeverity } from './log.types';

export interface RetentionPolicy {
  id: string;
  organizationId: string | null;
  
  // Scope
  category: LogCategory | null;
  severity: LogSeverity | null;
  
  // Retention
  retentionDays: number;
  archiveAfterDays: number | null;
  deleteAfterDays: number;
  
  // Constraints
  minRetentionDays: number;
  maxRetentionDays: number;
  
  // Settings
  immutable: boolean;
  
  // Audit
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface CreateRetentionPolicyInput {
  organizationId?: string;
  category?: LogCategory;
  severity?: LogSeverity;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays: number;
  minRetentionDays?: number;
  maxRetentionDays?: number;
  immutable?: boolean;
}

export interface UpdateRetentionPolicyInput {
  retentionDays?: number;
  archiveAfterDays?: number | null;
  deleteAfterDays?: number;
  immutable?: boolean;
}

export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
}

export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ExportJob {
  id: string;
  organizationId: string;
  format: ExportFormat;
  filters: Record<string, unknown>;
  status: ExportStatus;
  progress: number;
  totalRecords: number | null;
  fileUrl: string | null;
  fileSizeBytes: bigint | null;
  expiresAt: Date | null;
  errorMessage: string | null;
  requestedBy: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateExportInput {
  format: ExportFormat;
  filters?: {
    startDate?: Date;
    endDate?: Date;
    category?: LogCategory;
    severity?: LogSeverity;
    action?: string;
    userId?: string;
  };
}



