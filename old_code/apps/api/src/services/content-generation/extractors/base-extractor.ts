// @ts-nocheck - Content generation service, not used by workers
/**
 * Base Document Extractor
 * 
 * Abstract base class for format-specific document extractors
 * All extractors must implement this interface
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ExtractionRequest,
  ExtractionResult,
  DocumentParseResult,
  PlaceholderMatch,
  PlaceholderLocation,
} from '../types/extraction.types.js';
import {
  PlaceholderDefinition,
  PlaceholderType,
} from '../types/template.types.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';

/**
 * Authentication token for document access
 */
export interface DocumentAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  userId?: string;
  tenantId?: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  id: string;
  name: string;
  format: string;
  url?: string;
  modifiedTime?: Date;
  size?: number;
  mimeType?: string;
}

/**
 * Base class for all document extractors
 */
export abstract class BaseDocumentExtractor {
  protected monitoring: IMonitoringProvider;
  protected extractionService: PlaceholderExtractionService;

  constructor(
    monitoring: IMonitoringProvider,
    extractionService: PlaceholderExtractionService
  ) {
    this.monitoring = monitoring;
    this.extractionService = extractionService;
  }

  /**
   * Extract placeholders from document
   * This is the main entry point - delegates to format-specific implementation
   */
  async extractPlaceholders(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Get document metadata
      const metadata = await this.getDocumentMetadata(documentId, auth);

      // Step 2: Parse document (format-specific)
      const parseResult = await this.parseDocument(documentId, auth, request);

      // Step 3: Extract placeholders using regex (shared logic)
      const matches = this.extractPlaceholderMatches(
        parseResult.textContent,
        parseResult.elements
      );

      // Step 4: Deduplicate placeholders (shared logic)
      const deduplicationResult = this.deduplicatePlaceholders(
        matches,
        parseResult.elements
      );

      // Step 5: Create placeholder definitions (shared logic)
      const placeholders = this.createPlaceholderDefinitions(
        deduplicationResult.uniquePlaceholders,
        deduplicationResult.locationMap
      );

      // Step 6: Extract colors (format-specific)
      const colors = await this.extractColors(documentId, auth, request);

      const duration = Date.now() - startTime;

      this.monitoring.trackEvent('content_generation.extractor.extract', {
        format: request.documentFormat,
        documentId,
        placeholderCount: placeholders.length,
        duration,
      });

      return {
        placeholders,
        dominantColors: colors,
        metadata: {
          totalMatches: matches.length,
          uniquePlaceholders: placeholders.length,
          extractionMethod: `${request.documentFormat}_api`,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.extract',
        format: request.documentFormat,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Get document metadata (format-specific)
   */
  abstract getDocumentMetadata(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<DocumentMetadata>;

  /**
   * Parse document and extract text content (format-specific)
   */
  abstract parseDocument(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<DocumentParseResult>;

  /**
   * Extract colors from document (format-specific)
   * Default implementation returns empty array
   */
  protected async extractColors(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<string[]> {
    // Default: no color extraction
    // Subclasses can override
    return [];
  }

  /**
   * Extract placeholder matches using regex (shared logic)
   * MANDATORY: Uses regex pattern /\{\{([^}]+)\}\}/g
   */
  protected extractPlaceholderMatches(
    text: string,
    elements: any[]
  ): PlaceholderMatch[] {
    return this.extractionService.extractPlaceholderMatches(text, elements);
  }

  /**
   * Deduplicate placeholders (shared logic)
   */
  protected deduplicatePlaceholders(
    matches: PlaceholderMatch[],
    elements: any[]
  ): {
    uniquePlaceholders: string[];
    locationMap: Map<string, PlaceholderLocation[]>;
  } {
    return this.extractionService.deduplicatePlaceholders(matches, elements);
  }

  /**
   * Create placeholder definitions (shared logic)
   */
  protected createPlaceholderDefinitions(
    uniquePlaceholders: string[],
    locationMap: Map<string, PlaceholderLocation[]>
  ): PlaceholderDefinition[] {
    return this.extractionService.createPlaceholderDefinitions(
      uniquePlaceholders,
      locationMap
    );
  }

  /**
   * Infer placeholder type from name and context
   */
  protected inferPlaceholderType(
    name: string,
    context?: string
  ): PlaceholderType {
    const lowerName = name.toLowerCase();

    // Chart indicators
    if (
      lowerName.includes('chart') ||
      lowerName.includes('graph') ||
      lowerName.includes('visualization')
    ) {
      return 'chart';
    }

    // Image indicators
    if (
      lowerName.includes('image') ||
      lowerName.includes('picture') ||
      lowerName.includes('photo') ||
      lowerName.includes('logo')
    ) {
      return 'image';
    }

    // Email indicators
    if (lowerName.includes('email') || lowerName.includes('mail')) {
      return 'email';
    }

    // Domain indicators
    if (lowerName.includes('domain') || lowerName.includes('url') || lowerName.includes('website')) {
      return 'domain';
    }

    // Number indicators
    if (
      lowerName.includes('count') ||
      lowerName.includes('number') ||
      lowerName.includes('amount') ||
      lowerName.includes('quantity') ||
      lowerName.includes('price') ||
      lowerName.includes('cost')
    ) {
      return 'number';
    }

    // List indicators
    if (
      lowerName.includes('list') ||
      lowerName.includes('items') ||
      lowerName.includes('bullets') ||
      lowerName.includes('array')
    ) {
      return 'list';
    }

    // Default to text
    return 'text';
  }
}











