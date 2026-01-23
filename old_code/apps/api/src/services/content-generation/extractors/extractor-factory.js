// @ts-nocheck - Content generation service, not used by workers
/**
 * Document Extractor Factory
 *
 * Creates the appropriate extractor based on document format
 */
/**
 * Factory for creating document extractors
 */
export class DocumentExtractorFactory {
    monitoring;
    extractionService;
    extractors = new Map();
    constructor(monitoring, extractionService) {
        this.monitoring = monitoring;
        this.extractionService = extractionService;
        // Register extractors lazily (imported when needed)
    }
    /**
     * Register an extractor for a specific format
     */
    registerExtractor(format, extractorClass) {
        this.extractors.set(format, extractorClass);
    }
    /**
     * Create extractor for document format
     */
    async createExtractor(format) {
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
    async loadExtractor(format) {
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'extractor.factory.load',
                format,
            });
            throw new Error(`Failed to load extractor for format: ${format}. ${error.message}`);
        }
    }
    /**
     * Check if extractor is available for format
     */
    isExtractorAvailable(format) {
        return this.extractors.has(format);
    }
}
//# sourceMappingURL=extractor-factory.js.map