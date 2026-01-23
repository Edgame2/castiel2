/**
 * Document Rewriter Factory
 *
 * Factory for creating format-specific document rewriters
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseDocumentRewriter } from './base-rewriter.js';
import { DocumentFormat } from '../types/template.types.js';
export declare class DocumentRewriterFactory {
    private monitoring;
    private rewriters;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Create a rewriter for the specified format
     */
    createRewriter(format: DocumentFormat): Promise<BaseDocumentRewriter>;
    /**
     * Lazy load rewriter based on format
     */
    private loadRewriter;
    /**
     * Check if rewriter is available for format
     */
    isRewriterAvailable(format: string): boolean;
}
//# sourceMappingURL=rewriter-factory.d.ts.map