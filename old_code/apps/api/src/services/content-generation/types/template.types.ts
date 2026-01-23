/**
 * Content Generation - Template Types
 * 
 * TypeScript interfaces for document templates stored in Cosmos DB
 */

/**
 * Document format types supported by the system
 */
export type DocumentFormat = 'google_slides' | 'google_docs' | 'word' | 'powerpoint';

/**
 * Template status
 */
export type TemplateStatus = 'draft' | 'active' | 'archived';

/**
 * Template version metadata
 */
export interface TemplateVersion {
  versionNumber: number;        // 1, 2, 3, etc.
  createdAt: string;              // ISO 8601
  createdBy: string;              // User ID
  changes: string;                // Description of changes
  snapshot: {
    placeholders: PlaceholderDefinition[];
    dominantColors: string[];
  };
}

/**
 * Placeholder definition (extracted from document)
 */
export interface PlaceholderDefinition {
  name: string;                   // Unique placeholder name (e.g., "companyName", "salesRep")
  type: PlaceholderType;          // Inferred or configured type
  locations: PlaceholderLocation[]; // All locations where this placeholder appears
  defaultValue?: string;          // Optional default value
}

/**
 * Placeholder type
 */
export type PlaceholderType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'domain' 
  | 'list' 
  | 'chart' 
  | 'image';

/**
 * Placeholder location in document
 */
export interface PlaceholderLocation {
  elementType: 'textBox' | 'shape' | 'table' | 'notes' | 'header' | 'footer' | 'slide' | 'paragraph';
  elementId?: string;             // Element ID in document (if available)
  slideIndex?: number;            // For presentations
  pageIndex?: number;             // For documents
  position?: {
    x?: number;
    y?: number;
  };
  context?: string;               // Surrounding text for context
}

/**
 * Placeholder configuration (tenant admin configured)
 */
export interface PlaceholderConfiguration {
  placeholderName: string;        // References PlaceholderDefinition.name
  typeOverride?: PlaceholderType; // Override inferred type
  description: string;            // REQUIRED: AI prompt for generation
  tone?: string;                  // e.g., "professional", "casual", "friendly"
  temperature?: number;           // Optional temperature override (0.0-2.0, default: 0.7)
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;             // Regex pattern
    required?: boolean;
  };
  chartConfig?: ChartConfiguration; // If type is 'chart'
  contextTemplateId?: string;     // Optional link to c_contextTemplate Shard
  isRequired: boolean;             // Whether placeholder must be filled
}

/**
 * Chart configuration (for chart placeholders)
 */
export interface ChartConfiguration {
  chartType: 'bar' | 'line' | 'pie' | 'column' | 'area';
  dataSource?: string;             // Data source description
  colors?: string[];              // Chart colors (from template dominantColors)
  labels?: string[];              // Chart labels
  showLegend?: boolean;
  showGrid?: boolean;
}

/**
 * Document Template (root document in Cosmos DB)
 */
export interface DocumentTemplate {
  // Identity
  id: string;                    // UUID
  tenantId: string;               // Partition key
  userId: string;                 // Creator user ID
  
  // Metadata
  name: string;                   // Template name
  description?: string;
  documentFormat: DocumentFormat;
  sourceDocumentId: string;       // External ID (Google Drive/OneDrive file ID)
  sourceDocumentUrl?: string;    // Original document URL
  
  // Template Colors (up to 6 dominant colors)
  dominantColors: string[];        // Array of hex colors (max 6)
  
  // Placeholder Configuration
  placeholders: PlaceholderDefinition[];  // All unique placeholders
  placeholderConfigs: PlaceholderConfiguration[]; // Admin configurations
  
  // Optional Context Template Link
  contextTemplateId?: string;     // Optional link to c_contextTemplate Shard
  
  // Status
  status: TemplateStatus;
  
  // Version Management (max 5 versions)
  versions: TemplateVersion[];    // Version history (max 5)
  currentVersion: number;          // Current version number
  
  // Timestamps
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  activatedAt?: string;           // ISO 8601 (when status changed to 'active')
  archivedAt?: string;             // ISO 8601 (when status changed to 'archived')
}

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  documentFormat: DocumentFormat;
  sourceDocumentId: string;
  sourceDocumentUrl?: string;
  contextTemplateId?: string;
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  placeholderConfigs?: PlaceholderConfiguration[];
  dominantColors?: string[];
  contextTemplateId?: string;
}

/**
 * Template filters for listing
 */
export interface TemplateFilters {
  status?: TemplateStatus;
  documentFormat?: DocumentFormat;
  search?: string;
}

/**
 * Version diff result
 */
export interface VersionDiff {
  version1: number;
  version2: number;
  addedPlaceholders: string[];
  removedPlaceholders: string[];
  modifiedPlaceholders: string[];
  colorChanges: {
    added: string[];
    removed: string[];
  };
}


