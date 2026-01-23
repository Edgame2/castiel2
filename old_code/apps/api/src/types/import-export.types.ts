/**
 * Import/Export Types
 * 
 * Types for shard data import and export operations
 */

/**
 * Supported export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'xlsx',
  NDJSON = 'ndjson', // Newline-delimited JSON
}

/**
 * Supported import formats
 */
export enum ImportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'xlsx',
  NDJSON = 'ndjson',
}

/**
 * Export job status
 */
export enum ExportJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Import job status
 */
export enum ImportJobStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  shardTypeId?: string;
  shardIds?: string[];
  includeMetadata?: boolean;
  includeRelationships?: boolean;
  includeRevisions?: boolean;
  flattenStructuredData?: boolean;
  fields?: string[]; // Specific fields to export
  filters?: {
    status?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    tags?: string[];
  };
  csvDelimiter?: string;
  dateFormat?: string;
}

/**
 * Export job definition
 */
export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  options: ExportOptions;
  status: ExportJobStatus;
  
  // Progress tracking
  totalShards: number;
  processedShards: number;
  
  // Output
  fileUrl?: string;
  fileSize?: number;
  fileName?: string;
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  
  // Errors
  error?: string;
}

/**
 * Column mapping for import
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformer?: string;
  defaultValue?: any;
  required?: boolean;
}

/**
 * Import options
 */
export interface ImportOptions {
  format: ImportFormat;
  shardTypeId: string;
  columnMappings: ColumnMapping[];
  skipFirstRow?: boolean; // For CSV with headers
  validateBeforeImport?: boolean;
  updateExisting?: boolean; // Update if matching ID found
  matchField?: string; // Field to match for updates
  onError?: 'skip' | 'abort';
  csvDelimiter?: string;
  dateFormat?: string;
  batchSize?: number;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    field?: string;
    error: string;
    value?: any;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    warning: string;
  }>;
  preview: Array<{
    row: number;
    data: Record<string, any>;
  }>;
}

/**
 * Import job definition
 */
export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  options: ImportOptions;
  status: ImportJobStatus;
  
  // Input file
  sourceFileName: string;
  sourceFileSize: number;
  
  // Progress tracking
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  
  // Validation
  validationResult?: ImportValidationResult;
  
  // Created shard IDs
  createdShardIds: string[];
  updatedShardIds: string[];
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Errors
  errors: Array<{
    row: number;
    error: string;
  }>;
}

/**
 * Import preview request
 */
export interface ImportPreviewRequest {
  format: ImportFormat;
  shardTypeId: string;
  fileContent: string; // Base64 encoded
  columnMappings?: ColumnMapping[];
  skipFirstRow?: boolean;
  previewRows?: number;
}

/**
 * Export request
 */
export interface CreateExportRequest {
  format: ExportFormat;
  shardTypeId?: string;
  shardIds?: string[];
  options?: Omit<ExportOptions, 'format' | 'shardTypeId' | 'shardIds'>;
}

/**
 * Import request
 */
export interface CreateImportRequest {
  format: ImportFormat;
  shardTypeId: string;
  fileContent: string; // Base64 encoded
  fileName: string;
  options?: Omit<ImportOptions, 'format' | 'shardTypeId' | 'columnMappings'>;
  columnMappings: ColumnMapping[];
}

