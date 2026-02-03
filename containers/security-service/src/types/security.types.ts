/**
 * Security Service types
 * Core data model for security analysis and protection
 */

export enum SecurityScanType {
  SECRET_SCAN = 'secret_scan',
  VULNERABILITY_SCAN = 'vulnerability_scan',
  PII_DETECTION = 'pii_detection',
  SAST = 'sast', // Static Application Security Testing
  DAST = 'dast', // Dynamic Application Security Testing
  SCA = 'sca', // Software Composition Analysis
  COMPLIANCE_CHECK = 'compliance_check',
  THREAT_DETECTION = 'threat_detection',
  CUSTOM = 'custom',
}

export enum SecurityScanStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum SecuritySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum SecurityFindingType {
  SECRET_LEAK = 'secret_leak',
  VULNERABILITY = 'vulnerability',
  PII_EXPOSURE = 'pii_exposure',
  CODE_INJECTION = 'code_injection',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  CSRF = 'csrf',
  AUTHENTICATION_ISSUE = 'authentication_issue',
  AUTHORIZATION_ISSUE = 'authorization_issue',
  DEPENDENCY_VULNERABILITY = 'dependency_vulnerability',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  THREAT = 'threat',
  CUSTOM = 'custom',
}

/**
 * Security Scan
 */
export interface SecurityScan {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  type: SecurityScanType;
  status: SecurityScanStatus;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'dependency' | 'endpoint';
    path: string;
    identifier?: string;
  };
  findings?: SecurityFinding[];
  summary?: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
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
 * Security Finding
 */
export interface SecurityFinding {
  id: string;
  tenantId: string; // Partition key
  scanId: string;
  type: SecurityFindingType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
    endpoint?: string;
    identifier?: string;
  };
  evidence?: string; // Code snippet or evidence
  recommendation?: string;
  remediation?: {
    description: string;
    code?: string; // Fixed code example
    steps?: string[];
  };
  cwe?: string; // Common Weakness Enumeration
  cve?: string; // Common Vulnerabilities and Exposures
  owasp?: string; // OWASP Top 10 reference
  metadata?: Record<string, any>;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Secret Detection Result
 */
export interface SecretDetection {
  id: string;
  tenantId: string; // Partition key
  scanId: string;
  secretType: string; // API key, password, token, etc.
  value?: string; // Masked value
  location: {
    file: string;
    line: number;
    column?: number;
  };
  confidence: number; // 0-1
  isFalsePositive?: boolean;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * PII Detection Result
 */
export interface PIIDetection {
  id: string;
  tenantId: string; // Partition key
  scanId: string;
  piiType: string; // SSN, email, phone, credit card, etc.
  value?: string; // Masked value
  location: {
    file?: string;
    line?: number;
    column?: number;
  };
  confidence: number; // 0-1
  isFalsePositive?: boolean;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create security scan input
 */
export interface CreateSecurityScanInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  type: SecurityScanType;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'dependency' | 'endpoint';
    path: string;
    identifier?: string;
  };
}

/**
 * Update security scan input
 */
export interface UpdateSecurityScanInput {
  name?: string;
  description?: string;
  status?: SecurityScanStatus;
  findings?: SecurityFinding[];
  summary?: SecurityScan['summary'];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

/**
 * Run security scan input
 */
export interface RunSecurityScanInput {
  tenantId: string;
  userId: string;
  scanId: string;
  options?: {
    includeFalsePositives?: boolean;
    severityThreshold?: SecuritySeverity;
    customRules?: string[];
  };
}

