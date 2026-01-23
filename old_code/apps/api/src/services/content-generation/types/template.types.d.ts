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
    versionNumber: number;
    createdAt: string;
    createdBy: string;
    changes: string;
    snapshot: {
        placeholders: PlaceholderDefinition[];
        dominantColors: string[];
    };
}
/**
 * Placeholder definition (extracted from document)
 */
export interface PlaceholderDefinition {
    name: string;
    type: PlaceholderType;
    locations: PlaceholderLocation[];
    defaultValue?: string;
}
/**
 * Placeholder type
 */
export type PlaceholderType = 'text' | 'number' | 'email' | 'domain' | 'list' | 'chart' | 'image';
/**
 * Placeholder location in document
 */
export interface PlaceholderLocation {
    elementType: 'textBox' | 'shape' | 'table' | 'notes' | 'header' | 'footer' | 'slide' | 'paragraph';
    elementId?: string;
    slideIndex?: number;
    pageIndex?: number;
    position?: {
        x?: number;
        y?: number;
    };
    context?: string;
}
/**
 * Placeholder configuration (tenant admin configured)
 */
export interface PlaceholderConfiguration {
    placeholderName: string;
    typeOverride?: PlaceholderType;
    description: string;
    tone?: string;
    temperature?: number;
    constraints?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        required?: boolean;
    };
    chartConfig?: ChartConfiguration;
    contextTemplateId?: string;
    isRequired: boolean;
}
/**
 * Chart configuration (for chart placeholders)
 */
export interface ChartConfiguration {
    chartType: 'bar' | 'line' | 'pie' | 'column' | 'area';
    dataSource?: string;
    colors?: string[];
    labels?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
}
/**
 * Document Template (root document in Cosmos DB)
 */
export interface DocumentTemplate {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    documentFormat: DocumentFormat;
    sourceDocumentId: string;
    sourceDocumentUrl?: string;
    dominantColors: string[];
    placeholders: PlaceholderDefinition[];
    placeholderConfigs: PlaceholderConfiguration[];
    contextTemplateId?: string;
    status: TemplateStatus;
    versions: TemplateVersion[];
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
    activatedAt?: string;
    archivedAt?: string;
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
//# sourceMappingURL=template.types.d.ts.map