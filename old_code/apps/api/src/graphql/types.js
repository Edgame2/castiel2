/**
 * GraphQL Context and Types
 * TypeScript types for GraphQL resolvers and context
 */
/**
 * Cursor encoding/decoding helpers
 */
export const encodeCursor = (value) => {
    return Buffer.from(value).toString('base64');
};
export const decodeCursor = (cursor) => {
    return Buffer.from(cursor, 'base64').toString('utf-8');
};
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const validatePaginationArgs = (args) => {
    const first = Math.min(args.first ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    let offset = 0;
    if (args.after) {
        try {
            const decoded = decodeCursor(args.after);
            offset = parseInt(decoded, 10);
            if (isNaN(offset) || offset < 0) {
                offset = 0;
            }
        }
        catch {
            offset = 0;
        }
    }
    return { limit: first, offset };
};
export const DEFAULT_COMPLEXITY_CONFIG = {
    maxComplexity: 1000,
    defaultFieldComplexity: 1,
    scalarCost: 0,
    objectCost: 1,
    listMultiplier: 10,
};
//# sourceMappingURL=types.js.map