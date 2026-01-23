// @ts-nocheck - Content generation types, not used by workers
/**
 * Content Generation - Extraction Types
 * 
 * TypeScript interfaces for placeholder extraction from documents
 */

import { PlaceholderMatch, ExtractionRequest, ExtractionResult } from './placeholder.types.js';
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
  textContent: string;              // All text extracted from document
  elements: DocumentElement[];      // Structured elements with locations
  metadata: {
    pageCount?: number;             // For documents
    slideCount?: number;            // For presentations
    extractedAt: string;            // ISO 8601
  };
}

/**
 * Document element with location
 */
export interface DocumentElement {
  id: string;                        // Element ID (if available)
  type: 'textBox' | 'shape' | 'table' | 'notes' | 'header' | 'footer' | 'slide' | 'paragraph';
  content: string;                   // Text content
  location: {
    slideIndex?: number;             // For presentations
    pageIndex?: number;              // For documents
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
  pattern?: RegExp;                  // Default: /\{\{([^}]+)\}\}/g
  caseSensitive?: boolean;          // Default: false
  includeContext?: boolean;          // Include surrounding text
  contextRadius?: number;            // Characters before/after (default: 50)
}

/**
 * Placeholder deduplication result
 */
export interface DeduplicationResult {
  uniquePlaceholders: string[];     // Unique placeholder names
  duplicateCount: number;            // Number of duplicate matches removed
  locationMap: Map<string, PlaceholderLocation[]>; // Map of placeholder name to all locations
}

/**
 * Color extraction result
 */
export interface ColorExtractionResult {
  dominantColors: string[];         // Hex colors (max 6)
  colorFrequency: Map<string, number>; // Color usage frequency
  extractionMethod: 'api' | 'image_analysis' | 'default';
}

/**
 * Extraction error
 */
export interface ExtractionError {
  code: string;                      // Error code
  message: string;
  details?: any;
  recoverable: boolean;             // Can retry extraction
}

/**
 * Extraction progress (for async operations)
 */
export interface ExtractionProgress {
  status: 'pending' | 'parsing' | 'extracting' | 'deduplicating' | 'completed' | 'failed';
  progress: number;                 // 0-100
  currentStep?: string;              // Current operation description
  errors?: ExtractionError[];
}











