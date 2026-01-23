/**
 * Content Generation - Extraction Types
 *
 * TypeScript interfaces for placeholder extraction from documents
 */
import { DocumentFormat } from './template.types.js';
/**
 * Extraction method
 */
export type ExtractionMethod = 'regex' | 'api' | 'hybrid';
/**
 * Document parser result (format-specific)
 */
export interface DocumentParseResult {
    format: DocumentFormat;
    textContent: string;
    elements: DocumentElement[];
    metadata: {
        pageCount?: number;
        slideCount?: number;
        extractedAt: string;
    };
}
/**
 * Document element with location
 */
export interface DocumentElement {
    id: string;
    type: 'textBox' | 'shape' | 'table' | 'notes' | 'header' | 'footer' | 'slide' | 'paragraph';
    content: string;
    location: {
        slideIndex?: number;
        pageIndex?: number;
        position?: {
            x?: number;
            y?: number;
        };
    };
    style?: {
        fontFamily?: string;
        fontSize?: number;
        color?: string;
        bold?: boolean;
        italic?: boolean;
    };
}
/**
 * Regex extraction options
 */
export interface RegexExtractionOptions {
    pattern?: RegExp;
    caseSensitive?: boolean;
    includeContext?: boolean;
    contextRadius?: number;
}
/**
 * Placeholder deduplication result
 */
export interface DeduplicationResult {
    uniquePlaceholders: string[];
    duplicateCount: number;
    locationMap: Map<string, PlaceholderLocation[]>;
}
/**
 * Color extraction result
 */
export interface ColorExtractionResult {
    dominantColors: string[];
    colorFrequency: Map<string, number>;
    extractionMethod: 'api' | 'image_analysis' | 'default';
}
/**
 * Extraction error
 */
export interface ExtractionError {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
}
/**
 * Extraction progress (for async operations)
 */
export interface ExtractionProgress {
    status: 'pending' | 'parsing' | 'extracting' | 'deduplicating' | 'completed' | 'failed';
    progress: number;
    currentStep?: string;
    errors?: ExtractionError[];
}
//# sourceMappingURL=extraction.types.d.ts.map