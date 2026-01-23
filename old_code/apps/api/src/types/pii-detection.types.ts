/**
 * PII Detection Types
 * Phase 3.1: PII Detection and Redaction System
 */

/**
 * Types of PII that can be detected
 */
export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  ADDRESS = 'address',
  NAME = 'name',
  IP_ADDRESS = 'ip_address',
  DATE_OF_BIRTH = 'date_of_birth',
  DRIVER_LICENSE = 'driver_license',
  PASSPORT = 'passport',
  BANK_ACCOUNT = 'bank_account',
  CUSTOM = 'custom',
}

/**
 * Redaction strategy to apply
 */
export enum RedactionStrategy {
  REMOVAL = 'removal', // Complete removal
  MASKING = 'masking', // Partial masking (e.g., xxx-xx-1234)
  TOKENIZATION = 'tokenization', // Replace with token
  PSEUDONYMIZATION = 'pseudonymization', // Replace with pseudonym
  GENERALIZATION = 'generalization', // Generalize (e.g., "a major city")
}

/**
 * Detected PII instance
 */
export interface DetectedPII {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number; // 0-1, confidence in detection
  context?: string; // Surrounding text for context
  fieldPath?: string; // Field path if detected in structured data
}

/**
 * PII detection result
 */
export interface PIIDetectionResult {
  detected: DetectedPII[];
  totalCount: number;
  byType: Record<PIIType, number>;
  hasPII: boolean;
}

/**
 * Sensitivity level configuration
 */
export enum SensitivityLevel {
  LOW = 'low', // Basic PII (emails, names)
  MEDIUM = 'medium', // Moderate PII (phone, addresses)
  HIGH = 'high', // High PII (SSN, credit cards)
  CRITICAL = 'critical', // Critical PII (medical records, financial data)
}

/**
 * Compliance requirements
 */
export enum ComplianceRequirement {
  GDPR = 'GDPR', // General Data Protection Regulation (EU)
  HIPAA = 'HIPAA', // Health Insurance Portability and Accountability Act (US)
  PCI_DSS = 'PCI-DSS', // Payment Card Industry Data Security Standard
  CCPA = 'CCPA', // California Consumer Privacy Act
  SOX = 'SOX', // Sarbanes-Oxley Act
  FERPA = 'FERPA', // Family Educational Rights and Privacy Act
}

/**
 * Per-field sensitivity classification
 */
export interface FieldSensitivity {
  fieldPath: string; // e.g., 'structuredData.email', 'structuredData.patientInfo.ssn'
  sensitivityLevel: SensitivityLevel;
  requiredTypes?: PIIType[]; // PII types that must be detected in this field
  redactionStrategy?: RedactionStrategy; // Override default strategy for this field
  complianceRelevant?: boolean; // Whether this field is relevant for compliance
}

/**
 * PII detection configuration per tenant
 */
export interface PIIDetectionConfig {
  tenantId: string;
  enabled: boolean;
  sensitivityLevel: SensitivityLevel; // Global sensitivity level
  detectTypes: PIIType[]; // Which PII types to detect
  redactionStrategy: Record<PIIType, RedactionStrategy>; // Strategy per PII type
  customPatterns?: Array<{
    name: string;
    pattern: string; // Regex pattern
    sensitivity: SensitivityLevel;
  }>;
  industrySpecific?: {
    industry: string; // e.g., 'healthcare', 'finance', 'education'
    additionalTypes?: PIIType[];
    complianceRequirements?: ComplianceRequirement[]; // e.g., 'HIPAA', 'GDPR', 'PCI-DSS'
  };
  // Phase 3.1: Per-field sensitivity classifications
  fieldSensitivity?: FieldSensitivity[]; // Field-level sensitivity overrides
  // Phase 3.1: Compliance-driven configuration
  complianceConfig?: {
    requirements: ComplianceRequirement[];
    autoConfigured: boolean; // Whether config was auto-configured from compliance requirements
    lastComplianceCheck?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Redaction result
 * Phase 3.1: Enhanced with context-aware options support
 */
export interface RedactionResult {
  original: string;
  redacted: string;
  redactions: Array<{
    type: PIIType;
    originalValue: string;
    redactedValue: string;
    strategy: RedactionStrategy;
    startIndex: number;
    endIndex: number;
    fieldPath?: string; // Phase 3.1: Field path where PII was detected
    token?: string; // Phase 3.1: Reversible token for tokenization strategy
  }>;
  auditInfo: {
    redactedAt: Date;
    redactedBy?: string;
    reason: string;
    method: string;
    modelName?: string; // Phase 3.1: AI model for which redaction was applied
    preserveForAudit?: boolean; // Phase 3.1: Whether original was preserved
  };
  // Phase 3.1: Reversible redaction mapping (for tokenization strategy)
  reversibleMapping?: Map<string, string>; // token -> originalValue
}

/**
 * Context-aware redaction options
 */
export interface ContextAwareRedactionOptions {
  preserveForAudit: boolean; // Keep original in audit trail
  modelSpecific?: Record<string, RedactionStrategy>; // Different strategies per AI model
  allowReversible: boolean; // Allow authorized users to access unredacted
  requiredForAnalysis?: PIIType[]; // PII types that may be necessary for analysis
}
