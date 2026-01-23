/**
 * Bug Detection types
 * Core data model for bug detection and fixing
 */

export enum BugType {
  SYNTAX_ERROR = 'syntax_error',
  RUNTIME_ERROR = 'runtime_error',
  LOGIC_ERROR = 'logic_error',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  MEMORY_LEAK = 'memory_leak',
  RACE_CONDITION = 'race_condition',
  NULL_POINTER = 'null_pointer',
  TYPE_ERROR = 'type_error',
  ANOMALY = 'anomaly',
  REGRESSION = 'regression',
  VULNERABILITY = 'vulnerability',
  CUSTOM = 'custom',
}

export enum BugSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum BugStatus {
  DETECTED = 'detected',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  FIXED = 'fixed',
  VERIFIED = 'verified',
  FALSE_POSITIVE = 'false_positive',
  WONT_FIX = 'wont_fix',
  CLOSED = 'closed',
}

export enum DetectionMethod {
  STATIC_ANALYSIS = 'static_analysis',
  RUNTIME_MONITORING = 'runtime_monitoring',
  ANOMALY_DETECTION = 'anomaly_detection',
  PREDICTION = 'prediction',
  MANUAL = 'manual',
  AI_DETECTION = 'ai_detection',
}

/**
 * Bug
 */
export interface Bug {
  id: string;
  tenantId: string; // Partition key
  title: string;
  description?: string;
  type: BugType;
  severity: BugSeverity;
  status: BugStatus;
  detectionMethod: DetectionMethod;
  location: {
    file: string;
    line?: number;
    column?: number;
    function?: string;
    module?: string;
    code?: string; // Code snippet
  };
  rootCause?: {
    analysis?: string;
    factors?: string[];
    confidence?: number; // 0-1
  };
  impact?: {
    affectedUsers?: number;
    frequency?: number;
    cost?: number;
    description?: string;
  };
  fix?: {
    suggested?: boolean;
    autoFixable?: boolean;
    fixCode?: string;
    fixDescription?: string;
    applied?: boolean;
    appliedAt?: Date;
    appliedBy?: string;
  };
  regression?: {
    isRegression: boolean;
    originalBugId?: string;
    introducedIn?: string; // Version/commit
  };
  metadata?: {
    tags?: string[];
    category?: string;
    firstDetected?: Date;
    lastSeen?: Date;
    occurrenceCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  detectedBy?: string; // User ID or system
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Bug Detection Scan
 */
export interface BugDetectionScan {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  detectionMethods?: DetectionMethod[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: {
    totalBugs: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    autoFixable: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Bug Fix
 */
export interface BugFix {
  id: string;
  tenantId: string; // Partition key
  bugId: string;
  fixType: 'auto' | 'manual' | 'suggested';
  fixCode: string;
  fixDescription?: string;
  validation?: {
    tests?: string[]; // Test IDs
    passed?: boolean;
    errors?: string[];
  };
  applied: boolean;
  appliedAt?: Date;
  appliedBy?: string;
  reverted?: boolean;
  revertedAt?: Date;
  revertedBy?: string;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create bug input
 */
export interface CreateBugInput {
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  type: BugType;
  severity: BugSeverity;
  detectionMethod: DetectionMethod;
  location: {
    file: string;
    line?: number;
    column?: number;
    function?: string;
    module?: string;
    code?: string;
  };
  rootCause?: {
    analysis?: string;
    factors?: string[];
    confidence?: number;
  };
  impact?: {
    affectedUsers?: number;
    frequency?: number;
    cost?: number;
    description?: string;
  };
  metadata?: {
    tags?: string[];
    category?: string;
  };
}

/**
 * Update bug input
 */
export interface UpdateBugInput {
  title?: string;
  description?: string;
  severity?: BugSeverity;
  status?: BugStatus;
  rootCause?: {
    analysis?: string;
    factors?: string[];
    confidence?: number;
  };
  impact?: {
    affectedUsers?: number;
    frequency?: number;
    cost?: number;
    description?: string;
  };
  fix?: {
    suggested?: boolean;
    autoFixable?: boolean;
    fixCode?: string;
    fixDescription?: string;
    applied?: boolean;
  };
  metadata?: {
    tags?: string[];
    category?: string;
  };
}

/**
 * Scan for bugs input
 */
export interface ScanBugsInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  detectionMethods?: DetectionMethod[];
}

/**
 * Apply fix input
 */
export interface ApplyFixInput {
  tenantId: string;
  userId: string;
  bugId: string;
  fixCode?: string; // Override suggested fix
  validate?: boolean; // Run validation after fix
}

