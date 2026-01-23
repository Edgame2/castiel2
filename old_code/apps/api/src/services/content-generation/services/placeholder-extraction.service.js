// @ts-nocheck - Content generation service, not used by workers
/**
 * Placeholder Extraction Service
 *
 * Extracts placeholders from documents using regex pattern: /\{\{([^}]+)\}\}/g
 * MANDATORY: Must use this exact regex pattern for all document formats
 */
import { getContentGenerationConfig } from '../config/content-generation.config.js';
import { DocumentExtractorFactory } from '../extractors/extractor-factory.js';
export class PlaceholderExtractionService {
    monitoring;
    config = getContentGenerationConfig();
    extractorFactory;
    constructor(monitoring) {
        this.monitoring = monitoring;
        this.extractorFactory = new DocumentExtractorFactory(monitoring, this);
    }
    /**
     * Extract placeholders from document
     * MANDATORY: Uses regex pattern /\{\{([^}]+)\}\}/g
     *
     * @param request Extraction request
     * @param auth Optional auth token (if not provided, will need to be retrieved from integration system)
     */
    async extractPlaceholders(request, auth) {
        const startTime = Date.now();
        try {
            // If auth token is provided, use format-specific extractor
            if (auth && request.sourceDocumentId) {
                const extractor = await this.extractorFactory.createExtractor(request.documentFormat);
                return await extractor.extractPlaceholders(request.sourceDocumentId, auth, request);
            }
            // Fallback to legacy method (for backward compatibility)
            // This will return empty results but won't break existing code
            this.monitoring.trackEvent('content_generation.placeholder_extraction.legacy', {
                documentFormat: request.documentFormat,
            });
            // Step 1: Parse document (format-specific) - deprecated
            const parseResult = await this.parseDocument(request);
            // Step 2: Extract placeholders using regex
            const matches = this.extractPlaceholderMatches(parseResult.textContent, parseResult.elements);
            // Step 3: Deduplicate placeholders
            const deduplicationResult = this.deduplicatePlaceholders(matches, parseResult.elements);
            // Step 4: Infer placeholder types
            const placeholders = this.createPlaceholderDefinitions(deduplicationResult.uniquePlaceholders, deduplicationResult.locationMap);
            // Step 5: Extract colors (if applicable)
            const colors = await this.extractColors(request);
            const duration = Date.now() - startTime;
            this.monitoring.trackEvent('content_generation.placeholder_extraction', {
                documentFormat: request.documentFormat,
                uniquePlaceholders: placeholders.length,
                totalMatches: matches.length,
                duration,
            });
            return {
                placeholders,
                dominantColors: colors,
                metadata: {
                    totalMatches: matches.length,
                    uniquePlaceholders: placeholders.length,
                    extractionMethod: 'regex',
                    extractedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'placeholder_extraction',
                documentFormat: request.documentFormat,
            });
            throw error;
        }
    }
    /**
     * Parse document (format-specific)
     * This method is now deprecated - use DocumentExtractorFactory instead
     * Kept for backward compatibility
     */
    async parseDocument(request) {
        // This method is no longer used - extraction is handled by format-specific extractors
        // via DocumentExtractorFactory
        // Keeping for backward compatibility but should not be called
        this.monitoring.trackEvent('content_generation.placeholder_extraction.deprecated_parse', {
            documentFormat: request.documentFormat,
        });
        return {
            format: request.documentFormat,
            textContent: '',
            elements: [],
            metadata: {
                extractedAt: new Date().toISOString(),
            },
        };
    }
    /**
     * Extract placeholder matches using regex
     * MANDATORY: Uses pattern /\{\{([^}]+)\}\}/g
     * Public method for use by extractors
     */
    extractPlaceholderMatches(textContent, elements) {
        const matches = [];
        const regex = this.config.placeholderRegex; // /\{\{([^}]+)\}\}/g
        // Extract from full text
        let match;
        while ((match = regex.exec(textContent)) !== null) {
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;
            const placeholderName = match[1].trim();
            // Get context (surrounding text)
            const contextStart = Math.max(0, startIndex - this.config.extractionContextRadius);
            const contextEnd = Math.min(textContent.length, endIndex + this.config.extractionContextRadius);
            const context = textContent.substring(contextStart, contextEnd);
            matches.push({
                fullMatch: match[0],
                placeholderName,
                startIndex,
                endIndex,
                context,
            });
        }
        // Also extract from individual elements to track locations
        for (const element of elements) {
            regex.lastIndex = 0; // Reset regex
            while ((match = regex.exec(element.content)) !== null) {
                const placeholderName = match[1].trim();
                // Check if we already have this match in the main text
                const existingMatch = matches.find(m => m.placeholderName === placeholderName &&
                    m.startIndex >= 0 // Placeholder for element-based matches
                );
                if (!existingMatch) {
                    matches.push({
                        fullMatch: match[0],
                        placeholderName,
                        startIndex: -1, // Indicates element-based match
                        endIndex: -1,
                        context: element.content.substring(Math.max(0, match.index - this.config.extractionContextRadius), Math.min(element.content.length, match.index + match[0].length + this.config.extractionContextRadius)),
                    });
                }
            }
        }
        return matches;
    }
    /**
     * Deduplicate placeholders (same name = one definition)
     * Public method for use by extractors
     */
    deduplicatePlaceholders(matches, elements) {
        const uniquePlaceholders = new Set();
        const locationMap = new Map();
        for (const match of matches) {
            uniquePlaceholders.add(match.placeholderName);
            // Build location map
            if (!locationMap.has(match.placeholderName)) {
                locationMap.set(match.placeholderName, []);
            }
            // Find element for this match
            const element = this.findElementForMatch(match, elements);
            if (element) {
                const locations = locationMap.get(match.placeholderName);
                locations.push({
                    elementType: element.type,
                    elementId: element.id,
                    slideIndex: element.location.slideIndex,
                    pageIndex: element.location.pageIndex,
                    position: element.location.position,
                    context: match.context,
                });
            }
        }
        return {
            uniquePlaceholders: Array.from(uniquePlaceholders),
            duplicateCount: matches.length - uniquePlaceholders.size,
            locationMap,
        };
    }
    /**
     * Find element for a match
     */
    findElementForMatch(match, elements) {
        // If match has valid indices, find element containing those indices
        if (match.startIndex >= 0) {
            // Find element that contains this position
            // This is simplified - actual implementation will track character positions per element
            for (const element of elements) {
                if (element.content.includes(match.fullMatch)) {
                    return element;
                }
            }
        }
        else {
            // Element-based match - find by content
            for (const element of elements) {
                if (element.content.includes(match.fullMatch)) {
                    return element;
                }
            }
        }
        return null;
    }
    /**
     * Create placeholder definitions from unique placeholders
     */
    createPlaceholderDefinitions(uniquePlaceholders, locationMap) {
        return uniquePlaceholders.map(name => {
            const locations = locationMap.get(name) || [];
            const inferredType = this.inferPlaceholderType(name);
            return {
                name,
                type: inferredType,
                locations,
            };
        });
    }
    /**
     * Infer placeholder type from name
     */
    inferPlaceholderType(name) {
        const lowerName = name.toLowerCase();
        // Type inference rules
        if (lowerName.includes('email') || lowerName.includes('mail')) {
            return 'email';
        }
        if (lowerName.includes('domain') || lowerName.includes('url') || lowerName.includes('website')) {
            return 'domain';
        }
        if (lowerName.includes('chart') || lowerName.includes('graph') || lowerName.includes('visualization')) {
            return 'chart';
        }
        if (lowerName.includes('image') || lowerName.includes('picture') || lowerName.includes('photo')) {
            return 'image';
        }
        if (lowerName.includes('list') || lowerName.includes('items') || lowerName.includes('array')) {
            return 'list';
        }
        if (/^\d+$/.test(name) || lowerName.includes('number') || lowerName.includes('count') || lowerName.includes('quantity')) {
            return 'number';
        }
        // Default to text
        return 'text';
    }
    /**
     * Extract colors from document
     *
     * Note: This is the legacy path. The modern path uses format-specific extractors
     * which already implement color extraction. This method provides a fallback
     * default color palette when auth is not available.
     */
    async extractColors(request) {
        // Legacy path: No auth available, so we can't use format-specific extractors
        // Return default color palette as fallback
        // Format-specific extractors (GoogleDocsExtractor, GoogleSlidesExtractor, etc.)
        // already implement proper color extraction when auth is available
        this.monitoring.trackEvent('content_generation.placeholder_extraction.colors_legacy', {
            documentFormat: request.documentFormat,
        });
        // Default color palette (professional, accessible colors)
        return [
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#ec4899', // pink
            '#14b8a6', // teal
            '#f59e0b', // amber
            '#ef4444', // red
        ];
    }
}
//# sourceMappingURL=placeholder-extraction.service.js.map