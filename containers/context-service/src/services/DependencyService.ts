/**
 * Dependency Service
 * Handles dependency tracking and tree building
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { ContextService } from './ContextService';
import {
  DependencyTree,
} from '../types/context.types';

export class DependencyService {
  private containerName = 'context_dependency_trees';
  private contextService: ContextService;

  constructor(contextService: ContextService) {
    this.contextService = contextService;
  }

  /**
   * Build dependency tree for a path
   */
  async buildTree(
    rootPath: string,
    tenantId: string,
    maxDepth: number = 10
  ): Promise<DependencyTree> {
    if (!rootPath || !tenantId) {
      throw new BadRequestError('rootPath and tenantId are required');
    }

    const rootContext = await this.contextService.getByPath(rootPath, tenantId);
    if (!rootContext) {
      throw new NotFoundError(`Context not found for path: ${rootPath}`);
    }

    const tree = await this.buildTreeRecursive(rootContext, tenantId, maxDepth, 0, new Set());

    const dependencyTree: DependencyTree = {
      id: uuidv4(),
      tenantId,
      rootPath,
      tree,
      depth: this.calculateDepth(tree),
      totalNodes: this.countNodes(tree),
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(dependencyTree, {
        partitionKey: tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create dependency tree');
      }

      return resource as DependencyTree;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Build tree recursively
   */
  private async buildTreeRecursive(
    context: any,
    tenantId: string,
    maxDepth: number,
    currentDepth: number,
    visited: Set<string>
  ): Promise<DependencyTree['tree']> {
    if (currentDepth >= maxDepth || visited.has(context.id)) {
      return {
        path: context.path,
        type: context.type,
        dependencies: [],
      };
    }

    visited.add(context.id);

    const dependencies: DependencyTree['tree'][] = [];

    if (context.dependencies && context.dependencies.length > 0) {
      for (const depId of context.dependencies) {
        try {
          const depContext = await this.contextService.getById(depId, tenantId);
          const depTree = await this.buildTreeRecursive(
            depContext,
            tenantId,
            maxDepth,
            currentDepth + 1,
            visited
          );
          dependencies.push(depTree);
        } catch (error) {
          // Skip if dependency not found
        }
      }
    }

    return {
      path: context.path,
      type: context.type,
      dependencies,
    };
  }

  /**
   * Calculate tree depth
   */
  private calculateDepth(tree: DependencyTree['tree']): number {
    if (!tree.dependencies || tree.dependencies.length === 0) {
      return 1;
    }

    return 1 + Math.max(...tree.dependencies.map((dep) => this.calculateDepth(dep)));
  }

  /**
   * Count total nodes in tree
   */
  private countNodes(tree: DependencyTree['tree']): number {
    let count = 1;
    if (tree.dependencies) {
      count += tree.dependencies.reduce((sum, dep) => sum + this.countNodes(dep), 0);
    }
    return count;
  }

  /**
   * Get dependency tree by ID
   */
  async getById(treeId: string, tenantId: string): Promise<DependencyTree> {
    if (!treeId || !tenantId) {
      throw new BadRequestError('treeId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(treeId, tenantId).read<DependencyTree>();

      if (!resource) {
        throw new NotFoundError(`Dependency tree ${treeId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Dependency tree ${treeId} not found`);
      }
      throw error;
    }
  }
}

