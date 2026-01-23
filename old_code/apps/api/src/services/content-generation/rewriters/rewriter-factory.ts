// @ts-nocheck - Content generation service, not used by workers
/**
 * Document Rewriter Factory
 * 
 * Factory for creating format-specific document rewriters
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentRewriter } from './base-rewriter.js';
import { DocumentFormat } from '../types/template.types.js';

export class DocumentRewriterFactory {
  private rewriters: Map<string, typeof BaseDocumentRewriter> = new Map();

  constructor(private monitoring: IMonitoringProvider) {}

  /**
   * Create a rewriter for the specified format
   */
  async createRewriter(format: DocumentFormat): Promise<BaseDocumentRewriter> {
    // Lazy load rewriter if not already loaded
    if (!this.rewriters.has(format)) {
      await this.loadRewriter(format);
    }

    const rewriterClass = this.rewriters.get(format);
    if (!rewriterClass) {
      throw new Error(`No rewriter available for format: ${format}`);
    }

    return new rewriterClass(this.monitoring);
  }

  /**
   * Lazy load rewriter based on format
   */
  private async loadRewriter(format: string): Promise<void> {
    try {
      switch (format) {
        case 'google_slides':
          const { GoogleSlidesRewriter } = await import('./google-slides.rewriter.js');
          this.rewriters.set(format, GoogleSlidesRewriter);
          break;
        case 'google_docs':
          const { GoogleDocsRewriter } = await import('./google-docs.rewriter.js');
          this.rewriters.set(format, GoogleDocsRewriter);
          break;
        case 'word':
          const { MicrosoftWordRewriter } = await import('./microsoft-word.rewriter.js');
          this.rewriters.set(format, MicrosoftWordRewriter);
          break;
        case 'powerpoint':
          const { MicrosoftPowerPointRewriter } = await import('./microsoft-powerpoint.rewriter.js');
          this.rewriters.set(format, MicrosoftPowerPointRewriter);
          break;
        default:
          throw new Error(`Unsupported document format: ${format}`);
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'rewriter.factory.load',
        format,
      });
      throw new Error(`Failed to load rewriter for format: ${format}. ${(error as Error).message}`);
    }
  }

  /**
   * Check if rewriter is available for format
   */
  isRewriterAvailable(format: string): boolean {
    return this.rewriters.has(format);
  }
}











