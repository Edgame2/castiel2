/**
 * Prompt Injection Defense Types
 * Phase 3.3: Enhanced Prompt Injection Defense
 */

/**
 * Injection detection result
 */
export interface InjectionDetectionResult {
  detected: boolean;
  confidence: number; // 0-1, confidence in detection
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: DetectedPattern[];
  riskScore: number; // 0-100, overall risk score
  recommendations: string[];
}

/**
 * Detected injection pattern
 */
export interface DetectedPattern {
  type: InjectionPatternType;
  pattern: string;
  matchedText: string;
  position: number;
  confidence: number;
}

/**
 * Types of injection patterns
 */
export enum InjectionPatternType {
  SYSTEM_MESSAGE_INJECTION = 'system_message_injection',
  INSTRUCTION_OVERRIDE = 'instruction_override',
  ROLE_CONFUSION = 'role_confusion',
  CONTEXT_POISONING = 'context_poisoning',
  OUTPUT_MANIPULATION = 'output_manipulation',
  TOKEN_EXHAUSTION = 'token_exhaustion',
  ENCODING_BYPASS = 'encoding_bypass',
  SEMANTIC_INJECTION = 'semantic_injection',
}

/**
 * Prompt structure validation result
 */
export interface PromptStructureValidationResult {
  valid: boolean;
  issues: PromptStructureIssue[];
  enforced: boolean; // Whether structure was enforced/corrected
  correctedPrompt?: string;
}

/**
 * Prompt structure issues
 */
export interface PromptStructureIssue {
  type: 'missing_delimiter' | 'unclear_boundary' | 'mixed_roles' | 'unsafe_format';
  severity: 'low' | 'medium' | 'high';
  message: string;
  position?: number;
}

/**
 * Output validation result
 */
export interface OutputValidationResult {
  suspicious: boolean;
  indicators: OutputIndicator[];
  riskScore: number; // 0-100
  action: 'allow' | 'warn' | 'block';
}

/**
 * Output indicators of injection
 */
export interface OutputIndicator {
  type: 'instruction_leakage' | 'role_confusion' | 'format_anomaly' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
}

/**
 * Defense configuration
 */
export interface PromptInjectionDefenseConfig {
  tenantId: string;
  enabled: boolean;
  
  // Layer 1: Input sanitization
  enableInputSanitization: boolean;
  sanitizationLevel: 'basic' | 'standard' | 'strict';
  
  // Layer 2: Pattern detection
  enablePatternDetection: boolean;
  patternDatabase: 'default' | 'extended' | 'custom';
  customPatterns?: string[];
  enableSemanticAnalysis: boolean; // ML-based anomaly detection
  
  // Layer 3: Prompt structure enforcement
  enableStructureEnforcement: boolean;
  useDelimiters: boolean;
  delimiterType: 'xml' | 'markdown' | 'custom';
  customDelimiters?: {
    systemStart: string;
    systemEnd: string;
    userStart: string;
    userEnd: string;
  };
  
  // Layer 4: Output validation
  enableOutputValidation: boolean;
  outputValidationLevel: 'basic' | 'standard' | 'strict';
  
  // Behavioral monitoring
  enableBehavioralMonitoring: boolean;
  trackSanitizationSuccess: boolean;
  alertThreshold: number; // Risk score threshold for alerts
  
  // Actions
  actionOnDetection: 'block' | 'sanitize' | 'warn' | 'log';
  actionOnOutputAnomaly: 'block' | 'warn' | 'log';
  
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  original: string;
  sanitized: string;
  removed: string[];
  detected: InjectionDetectionResult;
  sanitizedAt: Date;
}

/**
 * Behavioral monitoring metrics
 */
export interface BehavioralMetrics {
  totalRequests: number;
  detections: number;
  blockedRequests: number;
  sanitizedRequests: number;
  outputAnomalies: number;
  successRate: number; // % of requests that passed all checks
  averageRiskScore: number;
  patternFrequency: Record<InjectionPatternType, number>;
  timestamp: Date;
}
