// @ts-nocheck - Content generation service, not used by workers
/**
 * Document Extractor Factory
 * 
 * Creates the appropriate extractor based on document format
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentExtractor, DocumentAuthToken } from './base-extractor.js';
import { ExtractionRequest } from '../types/extraction.types.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';

/**
 * Factory for creating document extractors
 */
export class DocumentExtractorFactory {
  private extractors: Map<string, new (monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService) => BaseDocumentExtractor> = new Map();

  constructor(private monitoring: IMonitoringProvider, private extractionService: PlaceholderExtractionService) {
    // Register extractors lazily (imported when needed)
  }

  /**
   * Register an extractor for a specific format
   */
  registerExtractor(
    format: string,
    extractorClass: new (monitoring: IMonitoringProvider, extractionService: PlaceholderExtractionService) => BaseDocumentExtractor
  ): void {
    this.extractors.set(format, extractorClass);
  }

  /**
   * Create extractor for document format
   */
  async createExtractor(format: ExtractionRequest['documentFormat']): Promise<BaseDocumentExtractor> {
    const extractorClass = this.extractors.get(format);

    if (!extractorClass) {
      // Lazy load extractor if not registered
      await this.loadExtractor(format);
    }

    const finalExtractorClass = this.extractors.get(format);
    if (!finalExtractorClass) {
      throw new Error(`No extractor available for format: ${format}`);
    }

    return new finalExtractorClass(this.monitoring, this.extractionService);
  }

  /**
   * Lazy load extractor based on format
   */
  private async loadExtractor(format: string): Promise<void> {
    try {
      switch (format) {
        case 'google_slides':
          const { GoogleSlidesExtractor } = await import('./google-slides.extractor.js');
          this.extractors.set(format, GoogleSlidesExtractor);
          break;
        case 'google_docs':
          const { GoogleDocsExtractor } = await import('./google-docs.extractor.js');
          this.extractors.set(format, GoogleDocsExtractor);
          break;
        case 'word':
          const { MicrosoftWordExtractor } = await import('./microsoft-word.extractor.js');
          this.extractors.set(format, MicrosoftWordExtractor);
          break;
        case 'powerpoint':
          const { MicrosoftPowerPointExtractor } = await import('./microsoft-powerpoint.extractor.js');
          this.extractors.set(format, MicrosoftPowerPointExtractor);
          break;
        default:
          throw new Error(`Unsupported document format: ${format}`);
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.factory.load',
        format,
      });
      throw new Error(`Failed to load extractor for format: ${format}. ${(error as Error).message}`);
    }
  }

  /**
   * Check if extractor is available for format
   */
  isExtractorAvailable(format: string): boolean {
    return this.extractors.has(format);
  }
}











