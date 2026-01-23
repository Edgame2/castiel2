/**
 * Content Generation - Placeholder Types
 * 
 * TypeScript interfaces for placeholder extraction and configuration
 */

import { PlaceholderType, PlaceholderLocation, PlaceholderDefinition } from './template.types.js';

/**
 * Placeholder match from regex extraction
 */
export interface PlaceholderMatch {
  fullMatch: string;              // e.g., "{{companyName}}"
  placeholderName: string;         // e.g., "companyName"
  startIndex: number;              // Character position in text
  endIndex: number;                // Character position in text
  context?: string;                // Surrounding text (50 chars before/after)
}

/**
 * Extraction request
 */
export interface ExtractionRequest {
  documentFormat: 'google_slides' | 'google_docs' | 'word' | 'powerpoint';
  sourceDocumentId: string;       // External document ID
  sourceDocumentUrl?: string;     // Optional document URL
  includeContext?: boolean;        // Include surrounding context
  contextRadius?: number;          // Characters before/after to include (default: 50)
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  placeholders: PlaceholderDefinition[];
  dominantColors: string[];       // Extracted colors (max 6)
  metadata: {
    totalMatches: number;          // Total placeholder matches found
    uniquePlaceholders: number;    // Unique placeholder names
    extractionMethod: string;      // e.g., "regex", "api"
    extractedAt: string;           // ISO 8601
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
  field: string;                   // e.g., "description", "type", "constraints"
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
  context?: Record<string, any>;   // Optional context for generation
}

/**
 * Placeholder preview result
 */
export interface PlaceholderPreviewResult {
  placeholderName: string;
  generatedValue: string;
  confidence?: number;              // 0-1 confidence score
  model?: string;                   // Model used for generation
  tokensUsed?: number;             // Tokens consumed
  duration?: number;                // Generation time in ms
}


