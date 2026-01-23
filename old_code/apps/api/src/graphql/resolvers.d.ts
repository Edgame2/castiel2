/**
 * GraphQL Resolvers
 *
 * This is a starter set of resolvers that can be extended as needed
 */
export declare const resolvers: {
    Query: {
        hello: () => Promise<string>;
        health: () => Promise<{
            status: string;
            service: string;
            timestamp: string;
        }>;
    };
};
//# sourceMappingURL=resolvers.d.ts.map