/**
 * GraphQL Plugin for Fastify
 * Integrates Mercurius GraphQL with Fastify, caching, and authentication
 */

import type { FastifyInstance } from 'fastify';
import type { Container } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import mercurius from 'mercurius';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolvers } from './resolvers.js';
import type { GraphQLContext, GraphQLUser } from './types.js';
import type { ShardCacheService } from '../services/shard-cache.service.js';
import type { ACLCacheService } from '../services/acl-cache.service.js';
import type { VectorSearchCacheService } from '../services/vector-search-cache.service.js';
import type { ShardRepository } from '@castiel/api-core';
import type { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import type { RevisionRepository } from '../repositories/revision.repository.js';
import type { ACLService } from '../services/acl.service.js';
import { createGraphQLLoaders } from './loaders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GraphQLPluginOptions {
  cosmosContainer: Container;
  redisClient?: Redis;
  monitoring?: IMonitoringProvider;
  shardCache?: ShardCacheService;
  aclCache?: ACLCacheService;
  vectorSearchCache?: VectorSearchCacheService;
  // Repositories and services for DataLoaders
  shardRepository?: ShardRepository;
  shardTypeRepository?: ShardTypeRepository;
  revisionRepository?: RevisionRepository;
  aclService?: ACLService;
}

/**
 * Register GraphQL plugin with Fastify
 */
export async function registerGraphQLPlugin(
  fastify: FastifyInstance,
  options: GraphQLPluginOptions
): Promise<void> {
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
      context: (request, reply): Partial<GraphQLContext> => {
        // Extract user from request (set by auth middleware)
        const user = (request as any).user as GraphQLUser | undefined;

        // Create DataLoaders if repositories/services are available
        let loaders: GraphQLContext['loaders'] | undefined;
        if (
          options.shardRepository &&
          options.shardTypeRepository &&
          options.revisionRepository &&
          options.aclService &&
          options.monitoring
        ) {
          const createdLoaders = createGraphQLLoaders({
            shardRepository: options.shardRepository,
            shardTypeRepository: options.shardTypeRepository,
            revisionRepository: options.revisionRepository,
            aclService: options.aclService,
            monitoring: options.monitoring,
          });
          loaders = createdLoaders;
        } else {
          // Fallback to placeholder loaders if dependencies not available
          // This allows GraphQL to work even without full DataLoader support
          loaders = {
            shardLoader: null as any,
            shardTypeLoader: null as any,
            revisionLoader: null as any,
            aclLoader: null as any,
            shardsByTypeLoader: null as any,
          };
        }

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
          loaders,
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
      const duration = Date.now() - (context as any).startTime;
      
      options.monitoring?.trackMetric('graphql.query.duration', duration, {
        hasErrors: execution.errors && execution.errors.length > 0,
      });
    });

    options.monitoring?.trackEvent('graphql.plugin.registered', {
      success: true,
    });
    
    if (process.env.NODE_ENV !== 'production') {
      options.monitoring?.trackEvent('graphql.playground.available', {
        path: '/graphql',
      });
    }
  } catch (error: unknown) {
    options.monitoring?.trackException(
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: 'graphql.plugin.register',
      }
    );
    throw error;
  }
}

/**
 * Calculate query complexity (simplified version)
 * In production, use graphql-query-complexity package
 */
function calculateQueryComplexity(document: any): number {
  let complexity = 0;

  // Traverse the query AST and count operations
  const visit = (node: any, depth: number) => {
    if (!node) {return;}

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
