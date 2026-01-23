/**
 * Compliance Service types
 * Core data model for regulatory and policy compliance
 */

export enum ComplianceStandard {
  WCAG = 'wcag', // Web Content Accessibility Guidelines
  OWASP = 'owasp', // OWASP Top 10
  GDPR = 'gdpr', // General Data Protection Regulation
  HIPAA = 'hipaa', // Health Insurance Portability and Accountability Act
  SOC2 = 'soc2', // System and Organization Controls 2
  PCI_DSS = 'pci_dss', // Payment Card Industry Data Security Standard
  ISO27001 = 'iso27001', // Information Security Management
  CUSTOM = 'custom',
}

export enum ComplianceCheckStatus {
  PENDING = 'pending',
  CHECKING = 'checking',
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIAL = 'partial',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ComplianceSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum PolicyType {
  SECURITY = 'security',
  PRIVACY = 'privacy',
  ACCESSIBILITY = 'accessibility',
  DATA_PROTECTION = 'data_protection',
  CODE_STANDARDS = 'code_standards',
  CUSTOM = 'custom',
}

/**
 * Compliance Check
 */
export interface ComplianceCheck {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  standard: ComplianceStandard;
  status: ComplianceCheckStatus;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'endpoint' | 'organization';
    path: string;
    identifier?: string;
  };
  requirements?: ComplianceRequirement[];
  violations?: ComplianceViolation[];
  summary?: {
    totalRequirements: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notApplicable: number;
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
 * Compliance Requirement
 */
export interface ComplianceRequirement {
  id: string;
  tenantId: string; // Partition key
  checkId: string;
  standard: ComplianceStandard;
  requirementId: string; // e.g., "WCAG-2.1.1", "GDPR-Article-5"
  title: string;
  description: string;
  category?: string;
  severity: ComplianceSeverity;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence?: string;
  notes?: string;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Compliance Violation
 */
export interface ComplianceViolation {
  id: string;
  tenantId: string; // Partition key
  checkId: string;
  requirementId: string;
  standard: ComplianceStandard;
  severity: ComplianceSeverity;
  title: string;
  description: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
    endpoint?: string;
    component?: string;
  };
  evidence?: string;
  remediation?: {
    description: string;
    steps?: string[];
    code?: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Compliance Policy
 */
export interface CompliancePolicy {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: PolicyType;
  standard: ComplianceStandard;
  rules: Array<{
    id: string;
    name: string;
    description: string;
    condition: string; // Rule condition
    severity: ComplianceSeverity;
    remediation?: string;
  }>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create compliance check input
 */
export interface CreateComplianceCheckInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  standard: ComplianceStandard;
  target: {
    type: 'file' | 'directory' | 'module' | 'project' | 'endpoint' | 'organization';
    path: string;
    identifier?: string;
  };
}

/**
 * Update compliance check input
 */
export interface UpdateComplianceCheckInput {
  name?: string;
  description?: string;
  status?: ComplianceCheckStatus;
  requirements?: ComplianceRequirement[];
  violations?: ComplianceViolation[];
  summary?: ComplianceCheck['summary'];
  error?: string;
}

/**
 * Run compliance check input
 */
export interface RunComplianceCheckInput {
  tenantId: string;
  userId: string;
  checkId: string;
  options?: {
    includeNotApplicable?: boolean;
    severityThreshold?: ComplianceSeverity;
    policyIds?: string[];
  };
}

/**
 * Create compliance policy input
 */
export interface CreateCompliancePolicyInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: PolicyType;
  standard: ComplianceStandard;
  rules: Array<{
    name: string;
    description: string;
    condition: string;
    severity: ComplianceSeverity;
    remediation?: string;
  }>;
  enabled?: boolean;
}

/**
 * Update compliance policy input
 */
export interface UpdateCompliancePolicyInput {
  name?: string;
  description?: string;
  rules?: Array<{
    name: string;
    description: string;
    condition: string;
    severity: ComplianceSeverity;
    remediation?: string;
  }>;
  enabled?: boolean;
}

