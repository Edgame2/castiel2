// @ts-nocheck - Content generation service, not used by workers
/**
 * Base Document Extractor
 *
 * Abstract base class for format-specific document extractors
 * All extractors must implement this interface
 */
/**
 * Base class for all document extractors
 */
export class BaseDocumentExtractor {
    monitoring;
    extractionService;
    constructor(monitoring, extractionService) {
        this.monitoring = monitoring;
        this.extractionService = extractionService;
    }
    /**
     * Extract placeholders from document
     * This is the main entry point - delegates to format-specific implementation
     */
    async extractPlaceholders(documentId, auth, request) {
        const startTime = Date.now();
        try {
            // Step 1: Get document metadata
            const metadata = await this.getDocumentMetadata(documentId, auth);
            // Step 2: Parse document (format-specific)
            const parseResult = await this.parseDocument(documentId, auth, request);
            // Step 3: Extract placeholders using regex (shared logic)
            const matches = this.extractPlaceholderMatches(parseResult.textContent, parseResult.elements);
            // Step 4: Deduplicate placeholders (shared logic)
            const deduplicationResult = this.deduplicatePlaceholders(matches, parseResult.elements);
            // Step 5: Create placeholder definitions (shared logic)
            const placeholders = this.createPlaceholderDefinitions(deduplicationResult.uniquePlaceholders, deduplicationResult.locationMap);
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
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'extractor.extract',
                format: request.documentFormat,
                documentId,
            });
            throw error;
        }
    }
    /**
     * Extract colors from document (format-specific)
     * Default implementation returns empty array
     */
    async extractColors(documentId, auth, request) {
        // Default: no color extraction
        // Subclasses can override
        return [];
    }
    /**
     * Extract placeholder matches using regex (shared logic)
     * MANDATORY: Uses regex pattern /\{\{([^}]+)\}\}/g
     */
    extractPlaceholderMatches(text, elements) {
        return this.extractionService.extractPlaceholderMatches(text, elements);
    }
    /**
     * Deduplicate placeholders (shared logic)
     */
    deduplicatePlaceholders(matches, elements) {
        return this.extractionService.deduplicatePlaceholders(matches, elements);
    }
    /**
     * Create placeholder definitions (shared logic)
     */
    createPlaceholderDefinitions(uniquePlaceholders, locationMap) {
        return this.extractionService.createPlaceholderDefinitions(uniquePlaceholders, locationMap);
    }
    /**
     * Infer placeholder type from name and context
     */
    inferPlaceholderType(name, context) {
        const lowerName = name.toLowerCase();
        // Chart indicators
        if (lowerName.includes('chart') ||
            lowerName.includes('graph') ||
            lowerName.includes('visualization')) {
            return 'chart';
        }
        // Image indicators
        if (lowerName.includes('image') ||
            lowerName.includes('picture') ||
            lowerName.includes('photo') ||
            lowerName.includes('logo')) {
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
        if (lowerName.includes('count') ||
            lowerName.includes('number') ||
            lowerName.includes('amount') ||
            lowerName.includes('quantity') ||
            lowerName.includes('price') ||
            lowerName.includes('cost')) {
            return 'number';
        }
        // List indicators
        if (lowerName.includes('list') ||
            lowerName.includes('items') ||
            lowerName.includes('bullets') ||
            lowerName.includes('array')) {
            return 'list';
        }
        // Default to text
        return 'text';
    }
}
//# sourceMappingURL=base-extractor.js.map