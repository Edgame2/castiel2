/**
 * Graph Neural Network Service
 * Graph-based relationship analysis for opportunities and stakeholders
 */

import { CosmosClient, Database, Container, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { OpportunityService } from './opportunity.service.js';

export interface GraphNode {
  nodeId: string;
  type: 'opportunity' | 'account' | 'contact' | 'stakeholder' | 'document' | 'meeting';
  properties: Record<string, any>;
  embedding?: number[]; // Node embedding
}

export interface GraphEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  type: 'owns' | 'belongs_to' | 'has_stakeholder' | 'attended' | 'related_to' | 'influences';
  weight: number; // 0-1: Edge strength
  properties?: Record<string, any>;
}

export interface RelationshipGraph {
  graphId: string;
  tenantId: string;
  opportunityId?: string; // Optional: opportunity-specific graph
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    communities?: string[]; // Detected communities
    centralNodes?: string[]; // Most influential nodes
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InfluenceAnalysis {
  nodeId: string;
  influenceScore: number; // 0-1: How influential this node is
  reach: number; // Number of nodes reachable
  centrality: number; // Centrality measure
}

export interface PathAnalysis {
  pathId: string;
  startNodeId: string;
  endNodeId: string;
  path: string[]; // Sequence of node IDs
  distance: number; // Path length
  strength: number; // 0-1: Path strength (product of edge weights)
}

/**
 * Graph Neural Network Service
 */
export class GraphNeuralNetworkService {
  private client: CosmosClient;
  private database: Database;
  private graphsContainer: Container;
  private redis?: Redis;
  private monitoring?: IMonitoringProvider;
  private relationshipService?: ShardRelationshipService;
  private opportunityService?: OpportunityService;

  constructor(
    cosmosClient: CosmosClient,
    redis?: Redis,
    monitoring?: IMonitoringProvider,
    relationshipService?: ShardRelationshipService,
    opportunityService?: OpportunityService
  ) {
    this.redis = redis;
    this.monitoring = monitoring;
    this.relationshipService = relationshipService;
    this.opportunityService = opportunityService;

    // Initialize Cosmos client
    const connectionPolicy: ConnectionPolicy = {
      connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
      requestTimeout: 30000,
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 9,
        fixedRetryIntervalInMilliseconds: 0,
        maxWaitTimeInSeconds: 30,
      } as RetryOptions,
    };

    this.client = cosmosClient || new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
      connectionPolicy,
    });

    this.database = this.client.database(config.cosmosDb.databaseId);
    // Using learning_outcomes container for now, could create dedicated graphs container
    this.graphsContainer = this.database.container(config.cosmosDb.containers.learningOutcomes);
  }

  /**
   * Build relationship graph for an opportunity
   */
  async buildRelationshipGraph(
    opportunityId: string,
    tenantId: string
  ): Promise<RelationshipGraph> {
    const graphId = uuidv4();
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();

    // Add opportunity node
    nodes.set(opportunityId, {
      nodeId: opportunityId,
      type: 'opportunity',
      properties: {
        id: opportunityId,
      },
    });

    // TODO: Load relationships from ShardRelationshipService
    // For now, create placeholder structure

    // Example: Add account node
    const accountId = `account_${opportunityId}`;
    nodes.set(accountId, {
      nodeId: accountId,
      type: 'account',
      properties: {
        id: accountId,
      },
    });

    // Add edge: opportunity -> account
    const edgeId = `${opportunityId}:${accountId}`;
    edges.set(edgeId, {
      edgeId,
      sourceId: opportunityId,
      targetId: accountId,
      type: 'belongs_to',
      weight: 0.9,
    });

    const graph: RelationshipGraph = {
      graphId,
      tenantId,
      opportunityId,
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.size,
        edgeCount: edges.size,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Analyze graph
    graph.metadata.communities = this.detectCommunities(graph);
    graph.metadata.centralNodes = this.findCentralNodes(graph);

    // Save graph
    await this.saveGraph(graph);

    this.monitoring?.trackEvent('graph_neural_network.graph_built', {
      tenantId,
      opportunityId,
      nodeCount: nodes.size,
      edgeCount: edges.size,
    });

    return graph;
  }

  /**
   * Analyze influence propagation
   */
  async analyzeInfluencePropagation(
    graph: RelationshipGraph,
    sourceNodeId: string
  ): Promise<InfluenceAnalysis[]> {
    const influences: Map<string, InfluenceAnalysis> = new Map();

    // BFS to calculate influence propagation
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number; influence: number }> = [
      { nodeId: sourceNodeId, distance: 0, influence: 1.0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      // Calculate influence (decays with distance)
      const influence = current.influence * Math.exp(-current.distance * 0.5);

      if (!influences.has(current.nodeId)) {
        influences.set(current.nodeId, {
          nodeId: current.nodeId,
          influenceScore: 0,
          reach: 0,
          centrality: 0,
        });
      }

      const analysis = influences.get(current.nodeId)!;
      analysis.influenceScore += influence;
      analysis.reach = visited.size - 1;

      // Add neighbors to queue
      for (const edge of graph.edges.values()) {
        if (edge.sourceId === current.nodeId && !visited.has(edge.targetId)) {
          queue.push({
            nodeId: edge.targetId,
            distance: current.distance + 1,
            influence: influence * edge.weight,
          });
        }
      }
    }

    return Array.from(influences.values()).sort((a, b) => b.influenceScore - a.influenceScore);
  }

  /**
   * Detect communities in graph
   */
  detectCommunities(graph: RelationshipGraph): string[] {
    // Simple community detection: connected components
    const visited = new Set<string>();
    const communities: string[] = [];

    for (const nodeId of graph.nodes.keys()) {
      if (visited.has(nodeId)) continue;

      // BFS to find connected component
      const component: string[] = [];
      const queue = [nodeId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        component.push(current);

        // Add neighbors
        for (const edge of graph.edges.values()) {
          if (edge.sourceId === current && !visited.has(edge.targetId)) {
            queue.push(edge.targetId);
          }
          if (edge.targetId === current && !visited.has(edge.sourceId)) {
            queue.push(edge.sourceId);
          }
        }
      }

      if (component.length > 1) {
        communities.push(component.join(','));
      }
    }

    return communities;
  }

  /**
   * Find optimal path between nodes
   */
  async findOptimalPath(
    graph: RelationshipGraph,
    startNodeId: string,
    endNodeId: string
  ): Promise<PathAnalysis | null> {
    // Dijkstra's algorithm to find shortest path
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(graph.nodes.keys());

    // Initialize distances
    for (const nodeId of graph.nodes.keys()) {
      distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity);
      previous.set(nodeId, null);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let minNode: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId)!;
        if (dist < minDistance) {
          minDistance = dist;
          minNode = nodeId;
        }
      }

      if (minNode === null || minDistance === Infinity) break;
      unvisited.delete(minNode);

      // Update distances to neighbors
      for (const edge of graph.edges.values()) {
        if (edge.sourceId === minNode && unvisited.has(edge.targetId)) {
          const alt = minDistance + (1 - edge.weight); // Lower weight = shorter distance
          if (alt < distances.get(edge.targetId)!) {
            distances.set(edge.targetId, alt);
            previous.set(edge.targetId, minNode);
          }
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = endNodeId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path[0] !== startNodeId) {
      return null; // No path found
    }

    // Calculate path strength
    let strength = 1.0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = Array.from(graph.edges.values()).find(
        (e) => e.sourceId === path[i] && e.targetId === path[i + 1]
      );
      if (edge) {
        strength *= edge.weight;
      }
    }

    return {
      pathId: uuidv4(),
      startNodeId,
      endNodeId,
      path,
      distance: path.length - 1,
      strength,
    };
  }

  /**
   * Find central nodes (most influential)
   */
  private findCentralNodes(graph: RelationshipGraph): string[] {
    // Calculate degree centrality
    const degrees = new Map<string, number>();

    for (const nodeId of graph.nodes.keys()) {
      degrees.set(nodeId, 0);
    }

    for (const edge of graph.edges.values()) {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
    }

    // Sort by degree
    const sorted = Array.from(degrees.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nodeId]) => nodeId);

    return sorted;
  }

  /**
   * Save graph
   */
  private async saveGraph(graph: RelationshipGraph): Promise<void> {
    // Convert Maps to arrays for JSON serialization
    const serializable = {
      ...graph,
      nodes: Array.from(graph.nodes.entries()),
      edges: Array.from(graph.edges.entries()),
      type: 'relationship_graph',
      partitionKey: graph.tenantId,
    };

    await this.graphsContainer.items.upsert(serializable);

    // Cache in Redis
    if (this.redis && graph.opportunityId) {
      const key = `graph:${graph.tenantId}:${graph.opportunityId}`;
      await this.redis.setex(key, 3600, JSON.stringify(serializable));
    }
  }
}
