/**
 * GraphQL Plugin for Fastify
 * Integrates Mercurius GraphQL with Fastify, caching, and authentication
 */
import mercurius from 'mercurius';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolvers } from './resolvers.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Register GraphQL plugin with Fastify
 */
export async function registerGraphQLPlugin(fastify, options) {
    try {
        // Load GraphQL schema
        const schemaPath = join(__dirname, 'schema.graphql');
        const schema = readFileSync(schemaPath, 'utf-8');
        // Register Mercurius
        await fastify.register(mercurius, {
            schema,
            resolvers,
            graphiql: process.env.NODE_ENV !== 'production',
            // Context builder - runs for every request
            context: (request, reply) => {
                // Extract user from request (set by auth middleware)
                const user = request.user;
                return {
                    request,
                    reply,
                    user,
                    cosmosContainer: options.cosmosContainer,
                    redisClient: options.redisClient,
                    monitoring: options.monitoring,
                    shardCache: options.shardCache,
                    aclCache: options.aclCache,
                    vectorSearchCache: options.vectorSearchCache,
                    loaders: {
                        // Placeholder loaders - would implement proper DataLoader batching
                        shardLoader: null,
                        shardTypeLoader: null,
                        revisionLoader: null,
                        aclLoader: null,
                        shardsByTypeLoader: null,
                    },
                };
            },
        });
        // Query complexity validation (simplified)
        fastify.graphql.addHook('preExecution', async (_schema, document, _context) => {
            // Calculate query complexity
            const complexity = calculateQueryComplexity(document);
            if (complexity > 1000) {
                throw new Error(`Query complexity (${complexity}) exceeds maximum (1000)`);
            }
            // Track query metrics
            options.monitoring?.trackMetric('graphql.query.complexity', complexity, {
                operationType: document.definitions[0]?.kind,
            });
        });
        // Post-execution hook for metrics
        fastify.graphql.addHook('onResolution', async (execution, context) => {
            const duration = Date.now() - context.startTime;
            options.monitoring?.trackMetric('graphql.query.duration', duration, {
                hasErrors: execution.errors && execution.errors.length > 0,
            });
        });
        console.log('[GraphQL] Mercurius plugin registered successfully');
        if (process.env.NODE_ENV !== 'production') {
            console.log('[GraphQL] GraphQL Playground available at /graphql');
        }
    }
    catch (error) {
        console.error('[GraphQL] Failed to register plugin:', error);
        throw error;
    }
}
/**
 * Calculate query complexity (simplified version)
 * In production, use graphql-query-complexity package
 */
function calculateQueryComplexity(document) {
    let complexity = 0;
    // Traverse the query AST and count operations
    const visit = (node, depth) => {
        if (!node) {
            return;
        }
        // Base cost for each field
        complexity += 1;
        // Higher cost for deeper nesting
        complexity += depth * 2;
        // Higher cost for lists
        if (node.selectionSet) {
            const selections = node.selectionSet.selections || [];
            if (selections.length > 10) {
                complexity += selections.length;
            }
            // Recursively visit children
            for (const selection of selections) {
                visit(selection, depth + 1);
            }
        }
    };
    // Start traversal
    if (document.definitions) {
        for (const definition of document.definitions) {
            if (definition.selectionSet) {
                visit(definition.selectionSet, 0);
            }
        }
    }
    return complexity;
}
//# sourceMappingURL=plugin.js.map