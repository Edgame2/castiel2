/**
 * Call Graph Service
 * Handles call graph building and analysis
 */
// @ts-nocheck - Cosmos SDK typings in Docker build
import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextService } from './ContextService';
import {
  CallGraph,
  ContextScope,
} from '../types/context.types';

export class CallGraphService {
  private containerName = 'context_call_graphs';
  private contextService: ContextService;

  constructor(contextService: ContextService) {
    this.contextService = contextService;
  }

  /**
   * Build call graph for a scope
   */
  async buildGraph(
    scope: ContextScope,
    tenantId: string,
    rootFunction?: string
  ): Promise<CallGraph> {
    if (!scope || !tenantId) {
      throw new BadRequestError('scope and tenantId are required');
    }

    // Get all contexts in scope
    const { items: contexts } = await this.contextService.list(tenantId, { scope });

    const nodes: CallGraph['nodes'] = [];
    const edges: CallGraph['edges'] = [];
    const nodeMap = new Map<string, number>();

    // Build nodes
    for (const ctx of contexts) {
      if ((ctx.type as string) === 'function' || (ctx.type as string) === 'method' || (ctx.type as string) === 'class' || (ctx.type as string) === 'module') {
        const nodeId = ctx.id;
        nodeMap.set(nodeId, nodes.length);
        nodes.push({
          id: nodeId,
          name: ctx.name,
          type: ctx.type as any,
          path: ctx.path,
          metadata: ctx.metadata,
        });
      }
    }

    // Build edges from callers/callees
    for (const ctx of contexts) {
      const fromIndex = nodeMap.get(ctx.id);
      if (fromIndex === undefined) continue;

      // Add edges for callers
      if (ctx.callers && ctx.callers.length > 0) {
        for (const callerId of ctx.callers) {
          const toIndex = nodeMap.get(callerId);
          if (toIndex !== undefined) {
            edges.push({
              from: nodes[toIndex].id,
              to: nodes[fromIndex].id,
              type: 'call',
            });
          }
        }
      }

      // Add edges for callees
      if (ctx.callees && ctx.callees.length > 0) {
        for (const calleeId of ctx.callees) {
          const toIndex = nodeMap.get(calleeId);
          if (toIndex !== undefined) {
            edges.push({
              from: nodes[fromIndex].id,
              to: nodes[toIndex].id,
              type: 'call',
            });
          }
        }
      }
    }

    const callGraph: CallGraph = {
      id: uuidv4(),
      tenantId,
      rootFunction,
      scope,
      nodes,
      edges,
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName, undefined as any) as any;
      const { resource } = await container.items.create(callGraph, { partitionKey: tenantId });

      if (!resource) {
        throw new Error('Failed to create call graph');
      }

      return resource as CallGraph;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get call graph by ID
   */
  async getById(graphId: string, tenantId: string): Promise<CallGraph> {
    if (!graphId || !tenantId) {
      throw new BadRequestError('graphId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName, undefined as any) as any;
      const { resource } = await (container.item(graphId, tenantId) as unknown as { read(): Promise<{ resource: CallGraph | undefined }> }).read();

      if (!resource) {
        throw new NotFoundError(`Call graph ${graphId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Call graph ${graphId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get callers of a function
   */
  async getCallers(functionPath: string, tenantId: string): Promise<any[]> {
    const context = await this.contextService.getByPath(functionPath, tenantId);
    if (!context || !context.callers) {
      return [];
    }

    const callers = await Promise.all(
      context.callers.map((callerId) =>
        this.contextService.getById(callerId, tenantId).catch(() => null)
      )
    );

    return callers.filter(Boolean) as any[];
  }

  /**
   * Get callees of a function
   */
  async getCallees(functionPath: string, tenantId: string): Promise<any[]> {
    const context = await this.contextService.getByPath(functionPath, tenantId);
    if (!context || !context.callees) {
      return [];
    }

    const callees = await Promise.all(
      context.callees.map((calleeId) =>
        this.contextService.getById(calleeId, tenantId).catch(() => null)
      )
    );

    return callees.filter(Boolean) as any[];
  }
}

