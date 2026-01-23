/**
 * Vector search types and interfaces
 * Supports semantic and hybrid search with caching
 */
/**
 * Vector search type
 */
export var VectorSearchType;
(function (VectorSearchType) {
    VectorSearchType["SEMANTIC"] = "semantic";
    VectorSearchType["HYBRID"] = "hybrid";
})(VectorSearchType || (VectorSearchType = {}));
/**
 * Vector search similarity metric
 */
export var SimilarityMetric;
(function (SimilarityMetric) {
    SimilarityMetric["COSINE"] = "cosine";
    SimilarityMetric["DOT_PRODUCT"] = "dotProduct";
    SimilarityMetric["EUCLIDEAN"] = "euclidean";
})(SimilarityMetric || (SimilarityMetric = {}));
/**
 * Vector search error
 */
export class VectorSearchError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'VectorSearchError';
    }
}
/**
 * Embedding generation error
 */
export class EmbeddingError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'EmbeddingError';
    }
}
/**
 * Helper function to generate consistent query hash
 */
export function generateQueryHash(input) {
    // Create a stable string representation
    const parts = [
        `type:${input.searchType}`,
        `query:${input.query.toLowerCase().trim()}`,
        `topK:${input.topK || 10}`,
        `metric:${input.similarityMetric || 'cosine'}`,
    ];
    if (input.minScore !== undefined) {
        parts.push(`minScore:${input.minScore}`);
    }
    if (input.filter) {
        if (input.filter.shardTypeId) {
            parts.push(`typeId:${input.filter.shardTypeId}`);
        }
        if (input.filter.shardTypeIds) {
            parts.push(`typeIds:${input.filter.shardTypeIds.sort().join(',')}`);
        }
        if (input.filter.userId) {
            parts.push(`userId:${input.filter.userId}`);
        }
        if (input.filter.status) {
            parts.push(`status:${input.filter.status}`);
        }
        if (input.filter.tags) {
            parts.push(`tags:${input.filter.tags.sort().join(',')}`);
        }
        if (input.filter.category) {
            parts.push(`category:${input.filter.category}`);
        }
    }
    // Hybrid-specific
    if (input.searchType === VectorSearchType.HYBRID) {
        if (input.keywordWeight !== undefined) {
            parts.push(`kwWeight:${input.keywordWeight}`);
        }
        if (input.vectorWeight !== undefined) {
            parts.push(`vWeight:${input.vectorWeight}`);
        }
        if (input.keywordFields) {
            parts.push(`kwFields:${input.keywordFields.sort().join(',')}`);
        }
    }
    // Simple hash: Use base64 of the joined string
    const hashInput = parts.join('|');
    return Buffer.from(hashInput).toString('base64').replace(/[=+/]/g, '');
}
/**
 * Helper function to build cache key for vector search
 */
export function buildVectorSearchCacheKey(tenantId, queryHash) {
    return `tenant:${tenantId}:vsearch:${queryHash}`;
}
/**
 * Helper function to build invalidation pattern for tenant's vector searches
 */
export function buildVectorSearchInvalidationPattern(tenantId) {
    return `tenant:${tenantId}:vsearch:*`;
}
//# sourceMappingURL=vector-search.types.js.map