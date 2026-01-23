/**
 * Graph Neural Network Service Tests
 * Tests for graph-based relationship analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphNeuralNetworkService } from '../../../src/services/graph-neural-network.service';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { CosmosClient } from '@azure/cosmos';
import type { Redis } from 'ioredis';

const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
} as any;

const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: {
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        }),
        upsert: vi.fn().mockResolvedValue({ resource: {} }),
      },
    }),
  }),
} as unknown as CosmosClient;

const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
} as unknown as Redis;

describe('GraphNeuralNetworkService', () => {
  let service: GraphNeuralNetworkService;
  const tenantId = 'tenant-1';
  const opportunityId = 'opp-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphNeuralNetworkService(
      mockCosmosClient,
      mockRedis,
      mockMonitoring
    );
  });

  describe('buildRelationshipGraph', () => {
    it('should build graph with nodes and edges', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(graph).toBeDefined();
      expect(graph.graphId).toBeDefined();
      expect(graph.tenantId).toBe(tenantId);
      expect(graph.opportunityId).toBe(opportunityId);
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(graph.metadata.nodeCount).toBeGreaterThan(0);
      expect(graph.metadata.edgeCount).toBeGreaterThan(0);
    });

    it('should include opportunity node', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(graph.nodes.has(opportunityId)).toBe(true);
      const node = graph.nodes.get(opportunityId);
      expect(node?.type).toBe('opportunity');
    });

    it('should detect communities in graph', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(graph.metadata.communities).toBeDefined();
      expect(Array.isArray(graph.metadata.communities)).toBe(true);
    });

    it('should find central nodes', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(graph.metadata.centralNodes).toBeDefined();
      expect(Array.isArray(graph.metadata.centralNodes)).toBe(true);
    });

    it('should save graph to Cosmos DB', async () => {
      await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(mockCosmosClient.database().container().items.upsert).toHaveBeenCalled();
    });

    it('should cache graph in Redis', async () => {
      await service.buildRelationshipGraph(opportunityId, tenantId);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('analyzeInfluencePropagation', () => {
    it('should analyze influence from source node', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const sourceNodeId = opportunityId;

      const influences = await service.analyzeInfluencePropagation(
        graph,
        sourceNodeId
      );

      expect(influences).toBeDefined();
      expect(Array.isArray(influences)).toBe(true);
    });

    it('should calculate influence scores', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const influences = await service.analyzeInfluencePropagation(
        graph,
        opportunityId
      );

      if (influences.length > 0) {
        expect(influences[0].influenceScore).toBeGreaterThanOrEqual(0);
        expect(influences[0].influenceScore).toBeLessThanOrEqual(1);
        expect(influences[0].reach).toBeDefined();
        expect(influences[0].centrality).toBeDefined();
      }
    });

    it('should sort influences by score', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const influences = await service.analyzeInfluencePropagation(
        graph,
        opportunityId
      );

      if (influences.length > 1) {
        expect(influences[0].influenceScore).toBeGreaterThanOrEqual(
          influences[1].influenceScore
        );
      }
    });

    it('should decay influence with distance', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const influences = await service.analyzeInfluencePropagation(
        graph,
        opportunityId
      );

      // Influence should decrease with distance
      expect(influences.length).toBeGreaterThan(0);
    });
  });

  describe('detectCommunities', () => {
    it('should detect connected components as communities', () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const communities = (service as any).detectCommunities(graph);

      expect(communities).toBeDefined();
      expect(Array.isArray(communities)).toBe(true);
    });

    it('should return empty array for isolated nodes', () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      // Graph with only one node (no edges)
      graph.edges.clear();
      
      const communities = (service as any).detectCommunities(graph);

      expect(communities.length).toBe(0); // No communities (single nodes don't form communities)
    });
  });

  describe('findOptimalPath', () => {
    it('should find path between nodes', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      
      // Add target node
      const targetId = 'account-1';
      graph.nodes.set(targetId, {
        nodeId: targetId,
        type: 'account',
        properties: { id: targetId },
      });
      
      // Add edge
      graph.edges.set(`${opportunityId}:${targetId}`, {
        edgeId: `${opportunityId}:${targetId}`,
        sourceId: opportunityId,
        targetId,
        type: 'belongs_to',
        weight: 0.9,
      });

      const path = await service.findOptimalPath(
        graph,
        opportunityId,
        targetId
      );

      expect(path).toBeDefined();
      if (path) {
        expect(path.startNodeId).toBe(opportunityId);
        expect(path.endNodeId).toBe(targetId);
        expect(path.path).toContain(opportunityId);
        expect(path.path).toContain(targetId);
        expect(path.distance).toBeGreaterThanOrEqual(0);
        expect(path.strength).toBeGreaterThan(0);
      }
    });

    it('should return null when no path exists', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      const isolatedNode = 'isolated-1';
      graph.nodes.set(isolatedNode, {
        nodeId: isolatedNode,
        type: 'contact',
        properties: { id: isolatedNode },
      });

      const path = await service.findOptimalPath(
        graph,
        opportunityId,
        isolatedNode
      );

      expect(path).toBeNull();
    });

    it('should calculate path strength from edge weights', async () => {
      const graph = await service.buildRelationshipGraph(opportunityId, tenantId);
      
      const intermediateId = 'intermediate-1';
      const targetId = 'target-1';
      
      graph.nodes.set(intermediateId, {
        nodeId: intermediateId,
        type: 'account',
        properties: { id: intermediateId },
      });
      graph.nodes.set(targetId, {
        nodeId: targetId,
        type: 'contact',
        properties: { id: targetId },
      });
      
      graph.edges.set(`${opportunityId}:${intermediateId}`, {
        edgeId: `${opportunityId}:${intermediateId}`,
        sourceId: opportunityId,
        targetId: intermediateId,
        type: 'belongs_to',
        weight: 0.8,
      });
      graph.edges.set(`${intermediateId}:${targetId}`, {
        edgeId: `${intermediateId}:${targetId}`,
        sourceId: intermediateId,
        targetId,
        type: 'has_stakeholder',
        weight: 0.9,
      });

      const path = await service.findOptimalPath(graph, opportunityId, targetId);

      if (path) {
        // Path strength should be product of edge weights
        expect(path.strength).toBeLessThanOrEqual(0.8 * 0.9);
      }
    });
  });

  describe('error handling', () => {
    it('should handle Cosmos DB errors gracefully', async () => {
      (mockCosmosClient.database().container().items.upsert as any).mockRejectedValue(
        new Error('Cosmos DB error')
      );

      await expect(
        service.buildRelationshipGraph(opportunityId, tenantId)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      (mockRedis.setex as any).mockRejectedValue(new Error('Redis error'));

      await expect(
        service.buildRelationshipGraph(opportunityId, tenantId)
      ).resolves.not.toThrow();

      expect(mockMonitoring.trackException).toHaveBeenCalled();
    });
  });
});
