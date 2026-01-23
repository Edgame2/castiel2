/**
 * Pattern Recognition types
 * Core data model for pattern learning and enforcement
 */

export enum PatternType {
  DESIGN_PATTERN = 'design_pattern',
  ANTI_PATTERN = 'anti_pattern',
  CODE_STYLE = 'code_style',
  ARCHITECTURE = 'architecture',
  NAMING_CONVENTION = 'naming_convention',
  STRUCTURE = 'structure',
  CUSTOM = 'custom',
}

export enum PatternCategory {
  CREATIONAL = 'creational',
  STRUCTURAL = 'structural',
  BEHAVIORAL = 'behavioral',
  CONCURRENCY = 'concurrency',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STYLE = 'style',
}

export enum PatternMatchSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Pattern
 */
export interface Pattern {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  type: PatternType;
  category?: PatternCategory;
  language?: string; // Programming language
  patternDefinition: {
    ast?: any; // AST pattern
    regex?: string; // Regex pattern
    structure?: any; // Structural pattern
    examples?: string[]; // Example code snippets
    antiExamples?: string[]; // Anti-pattern examples
  };
  metadata?: {
    tags?: string[];
    author?: string;
    source?: string; // Where pattern was learned from
    confidence?: number; // 0-1 confidence score
    frequency?: number; // How often pattern appears
    version?: string;
  };
  enforcement?: {
    enabled: boolean;
    severity: PatternMatchSeverity;
    autoFix?: boolean; // Can pattern be auto-fixed
    fixTemplate?: string; // Template for auto-fix
  };
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
 * Pattern Match
 */
export interface PatternMatch {
  id: string;
  tenantId: string; // Partition key
  patternId: string;
  patternName: string;
  patternType: PatternType;
  scanId: string; // Reference to pattern scan
  location: {
    file: string;
    line?: number;
    column?: number;
    range?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    code?: string; // Matched code snippet
  };
  confidence: number; // 0-1 match confidence
  severity: PatternMatchSeverity;
  isAntiPattern: boolean; // True if this is an anti-pattern match
  suggestions?: string[]; // Suggestions for improvement
  autoFixable?: boolean;
  fixed?: boolean; // Whether match has been fixed
  createdAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Pattern Scan
 */
export interface PatternScan {
  id: string;
  tenantId: string; // Partition key
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  patterns?: string[]; // Pattern IDs to scan for (if not specified, scan all)
  patternTypes?: PatternType[]; // Types to scan for
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: {
    totalMatches: number;
    designPatterns: number;
    antiPatterns: number;
    codeStyle: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
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
 * Pattern Library
 */
export interface PatternLibrary {
  id: string;
  tenantId: string; // Partition key
  name: string;
  description?: string;
  patterns: string[]; // Pattern IDs
  category?: PatternCategory;
  language?: string;
  isDefault: boolean; // Default library for tenant
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
 * Create pattern input
 */
export interface CreatePatternInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  type: PatternType;
  category?: PatternCategory;
  language?: string;
  patternDefinition: {
    ast?: any;
    regex?: string;
    structure?: any;
    examples?: string[];
    antiExamples?: string[];
  };
  metadata?: {
    tags?: string[];
    source?: string;
    confidence?: number;
    frequency?: number;
    version?: string;
  };
  enforcement?: {
    enabled?: boolean;
    severity?: PatternMatchSeverity;
    autoFix?: boolean;
    fixTemplate?: string;
  };
}

/**
 * Update pattern input
 */
export interface UpdatePatternInput {
  name?: string;
  description?: string;
  category?: PatternCategory;
  patternDefinition?: {
    ast?: any;
    regex?: string;
    structure?: any;
    examples?: string[];
    antiExamples?: string[];
  };
  metadata?: {
    tags?: string[];
    confidence?: number;
    frequency?: number;
    version?: string;
  };
  enforcement?: {
    enabled?: boolean;
    severity?: PatternMatchSeverity;
    autoFix?: boolean;
    fixTemplate?: string;
  };
}

/**
 * Scan for patterns input
 */
export interface ScanPatternsInput {
  tenantId: string;
  userId: string;
  name?: string;
  description?: string;
  target: {
    type: 'file' | 'directory' | 'module' | 'project';
    path: string;
    language?: string;
  };
  patterns?: string[];
  patternTypes?: PatternType[];
}

