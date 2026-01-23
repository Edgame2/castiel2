/**
 * Document Check Type Definitions
 * Handles security checks for documents before moving from quarantine to documents container
 */

/**
 * Message format for documents sent to the check queue
 */
export interface DocumentCheckMessage {
  shardId: string;
  tenantId: string;
  userId?: string; // Optional: default to 'system' when not provided
  documentFileName: string;
  filePath: string;
  metadata?: DocumentMetadata;
  enqueuedAt: string;
}

/**
 * Document metadata to be stored with the document
 */
export interface DocumentMetadata {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Result of individual security check
 */
export interface SecurityCheckResult {
  checkType: SecurityCheckType;
  passed: boolean;
  timestamp: string;
  details?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Types of security checks performed
 */
export type SecurityCheckType =
  | 'file-type-validation'
  | 'file-size-validation'
  | 'virus-scan'
  | 'content-filter';

/**
 * Complete security metadata for a document
 */
export interface DocumentSecurityMetadata {
  documentId: string;
  shardId: string;
  tenantId: string;
  documentFileName: string;
  userId?: string;
  checkStatus: 'passed' | 'failed' | 'quarantined';
  checksPerformed: SecurityCheckResult[];
  overallRiskLevel: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  failureReason?: string;
  checkedAt: string;
  movedAt?: string;
  deletedAt?: string;
  shardMetadata?: DocumentMetadata;
}

/**
 * Audit log entry for document security checks
 */
export interface DocumentCheckAuditLog {
  id: string;
  documentId: string;
  shardId: string;
  tenantId: string;
  documentFileName: string;
  userId?: string;
  action: 'checked' | 'approved' | 'rejected' | 'deleted';
  checkDetails: SecurityCheckResult[];
  overallRiskLevel: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  failureReason?: string;
  timestamp: string;
  blobSourcePath?: string;
  blobDestinationPath?: string;
  duration: number;
}

/**
 * Notification for failed security checks
 */
export interface DocumentCheckNotification {
  id: string;
  documentId: string;
  shardId: string;
  tenantId: string;
  documentFileName: string;
  userId?: string;
  notificationType: 'security-failed' | 'document-deleted' | 'check-error';
  message: string;
  details: SecurityCheckResult[];
  overallRiskLevel: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  createdAt: string;
  read?: boolean;
}

/**
 * Configuration for security checks
 */
export interface SecurityCheckConfig {
  maxFileSizeMB: number;
  allowedFileTypes: string[];
  enableVirusScan: boolean;
  enableContentFilter: boolean;
  maxRetries: number;
  retryDelayMs: number;
}



