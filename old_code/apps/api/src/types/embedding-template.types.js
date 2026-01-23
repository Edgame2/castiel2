/**
 * Embedding Template Types
 * Defines how shards should be embedded using AI models for vector search
 *
 * Templates are stored in ShardType and specify:
 * - Which fields to include and their weights
 * - How to preprocess data before embedding
 * - Which embedding model to use
 * - How to normalize and store embeddings
 */
/**
 * Default embedding template
 * Used for all shard types that don't have a custom template
 *
 * Characteristics:
 * - Combines all fields with equal weighting
 * - Basic preprocessing (combining, chunking)
 * - L2 normalization for cosine similarity
 * - Uses default embedding model
 */
export const DEFAULT_EMBEDDING_TEMPLATE = {
    version: 1,
    name: 'Default Embedding Template',
    description: 'Default template for all shard types. Combines all fields with equal weighting.',
    isDefault: true,
    fields: [
        {
            name: 'all',
            weight: 1.0,
            include: true,
            preprocess: {
                maxLength: 8000,
            },
        },
    ],
    preprocessing: {
        combineFields: true,
        fieldSeparator: ' ',
        chunking: {
            chunkSize: 512,
            overlap: 50,
            splitBySentence: true,
            minChunkSize: 100,
            maxChunkSize: 1000,
        },
        removeStopWords: false,
        normalize: false,
    },
    normalization: {
        l2Normalize: true,
        minMaxScale: false,
        removeOutliers: false,
        reduction: {
            enabled: false,
        },
    },
    modelConfig: {
        strategy: 'default',
        modelId: 'text-embedding-3-small',
        fallbackModelId: 'text-embedding-ada-002',
    },
    parentContext: {
        mode: 'whenScoped',
        sourceShardType: 'c_project',
        weight: 0.25,
        fields: ['name', 'tags', 'summary'],
        asContextPrefix: true,
        separator: ' — ',
        maxLength: 120,
    },
    storeInShard: true,
    enableVectorSearch: true,
};
//# sourceMappingURL=embedding-template.types.js.map