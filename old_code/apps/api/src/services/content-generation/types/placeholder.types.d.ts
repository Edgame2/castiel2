/**
 * Content Generation - Placeholder Types
 *
 * TypeScript interfaces for placeholder extraction and configuration
 */
import { PlaceholderDefinition } from './template.types.js';
/**
 * Placeholder match from regex extraction
 */
export interface PlaceholderMatch {
    fullMatch: string;
    placeholderName: string;
    startIndex: number;
    endIndex: number;
    context?: string;
}
/**
 * Extraction request
 */
export interface ExtractionRequest {
    documentFormat: 'google_slides' | 'google_docs' | 'word' | 'powerpoint';
    sourceDocumentId: string;
    sourceDocumentUrl?: string;
    includeContext?: boolean;
    contextRadius?: number;
}
/**
 * Extraction result
 */
export interface ExtractionResult {
    placeholders: PlaceholderDefinition[];
    dominantColors: string[];
    metadata: {
        totalMatches: number;
        uniquePlaceholders: number;
        extractionMethod: string;
        extractedAt: string;
    };
}
/**
 * Placeholder validation result
 */
export interface PlaceholderValidationResult {
    isValid: boolean;
    errors: PlaceholderValidationError[];
    warnings: PlaceholderValidationWarning[];
}
/**
 * Placeholder validation error
 */
export interface PlaceholderValidationError {
    placeholderName: string;
    field: string;
    message: string;
}
/**
 * Placeholder validation warning
 */
export interface PlaceholderValidationWarning {
    placeholderName: string;
    field: string;
    message: string;
    suggestion?: string;
}
/**
 * Placeholder preview request
 */
export interface PlaceholderPreviewRequest {
    placeholderName: string;
    templateId: string;
    tenantId: string;
    context?: Record<string, any>;
}
/**
 * Placeholder preview result
 */
export interface PlaceholderPreviewResult {
    placeholderName: string;
    generatedValue: string;
    confidence?: number;
    model?: string;
    tokensUsed?: number;
    duration?: number;
}
//# sourceMappingURL=placeholder.types.d.ts.map