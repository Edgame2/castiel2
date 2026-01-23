// @ts-nocheck - Content generation service, not used by workers
/**
 * Document Rewriter Factory
 *
 * Factory for creating format-specific document rewriters
 */
export class DocumentRewriterFactory {
    monitoring;
    rewriters = new Map();
    constructor(monitoring) {
        this.monitoring = monitoring;
    }
    /**
     * Create a rewriter for the specified format
     */
    async createRewriter(format) {
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
    async loadRewriter(format) {
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.factory.load',
                format,
            });
            throw new Error(`Failed to load rewriter for format: ${format}. ${error.message}`);
        }
    }
    /**
     * Check if rewriter is available for format
     */
    isRewriterAvailable(format) {
        return this.rewriters.has(format);
    }
}
//# sourceMappingURL=rewriter-factory.js.map