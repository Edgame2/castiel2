/**
 * Alert Types
 */

export enum AlertType {
  PATTERN = 'PATTERN',
  THRESHOLD = 'THRESHOLD',
  ANOMALY = 'ANOMALY',
}

export interface AlertCondition {
  // For PATTERN
  action?: string;
  count?: number;
  windowMinutes?: number;
  
  // For THRESHOLD
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=';
  value?: number;
  
  // For ANOMALY
  baselineWindowHours?: number;
  deviationPercent?: number;
}

export interface AlertRule {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  type: AlertType;
  conditions: AlertCondition;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface CreateAlertRuleInput {
  tenantId?: string;
  name: string;
  description?: string;
  type: AlertType;
  conditions: AlertCondition;
  notificationChannels?: string[];
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  conditions?: AlertCondition;
  notificationChannels?: string[];
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface HashCheckpoint {
  id: string;
  checkpointTimestamp: Date;
  lastLogId: string;
  lastHash: string;
  logCount: bigint;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  status: VerificationStatus;
  createdAt: Date;
}

export interface VerificationResult {
  status: VerificationStatus;
  checkedLogs: number;
  invalidLogs: string[];
  lastValidHash: string;
  verifiedAt: Date;
}



