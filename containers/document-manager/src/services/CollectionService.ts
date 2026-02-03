/**
 * Collection Service
 * Handles document collection management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import {
  DocumentCollection,
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionType,
} from '../types/document.types';

export class CollectionService {
  private containerName = 'document_collections';

  /**
   * Create a new collection
   */
  async create(input: CreateCollectionInput): Promise<DocumentCollection> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }

    // Validate smart collection has filter criteria
    if (input.type === CollectionType.SMART && !input.filterCriteria) {
      throw new BadRequestError('Smart collections require filterCriteria');
    }

    const collection: DocumentCollection = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      type: input.type,
      parentCollectionId: input.parentCollectionId,
      documentIds: input.documentIds || [],
      filterCriteria: input.filterCriteria,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await (container.items as any).create(collection, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create collection');
      }

      return resource as DocumentCollection;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Collection with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get collection by ID
   */
  async getById(collectionId: string, tenantId: string): Promise<DocumentCollection> {
    if (!collectionId || !tenantId) {
      throw new BadRequestError('collectionId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(collectionId, tenantId).read<DocumentCollection>();

      if (!resource) {
        throw new NotFoundError('Collection', collectionId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Collection', collectionId);
      }
      throw error;
    }
  }

  /**
   * Update collection
   */
  async update(
    collectionId: string,
    tenantId: string,
    input: UpdateCollectionInput
  ): Promise<DocumentCollection> {
    const existing = await this.getById(collectionId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot update system collection');
    }

    const updated: DocumentCollection = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(collectionId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update collection');
      }

      return resource as DocumentCollection;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Collection', collectionId);
      }
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async delete(collectionId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(collectionId, tenantId);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot delete system collection');
    }

    const container = getContainer(this.containerName);
    await container.item(collectionId, tenantId).delete();
  }

  /**
   * List collections
   */
  async list(
    tenantId: string,
    filters?: {
      type?: CollectionType;
      parentCollectionId?: string | null;
      limit?: number;
    }
  ): Promise<DocumentCollection[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.type) {
      query += ' AND c.type = @type';
      parameters.push({ name: '@type', value: filters.type });
    }

    if (filters?.parentCollectionId !== undefined) {
      if (filters.parentCollectionId === null) {
        query += ' AND (c.parentCollectionId = null OR NOT IS_DEFINED(c.parentCollectionId))';
      } else {
        query += ' AND c.parentCollectionId = @parentCollectionId';
        parameters.push({ name: '@parentCollectionId', value: filters.parentCollectionId });
      }
    }

    query += ' ORDER BY c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<DocumentCollection>({
          query,
          parameters,
        })
        .fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  /**
   * Add document to collection
   */
  async addDocument(
    collectionId: string,
    tenantId: string,
    documentId: string
  ): Promise<DocumentCollection> {
    const collection = await this.getById(collectionId, tenantId);

    if (collection.documentIds.includes(documentId)) {
      return collection; // Already in collection
    }

    const updated: DocumentCollection = {
      ...collection,
      documentIds: [...collection.documentIds, documentId],
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(collectionId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to add document to collection');
    }

    return resource as DocumentCollection;
  }

  /**
   * Remove document from collection
   */
  async removeDocument(
    collectionId: string,
    tenantId: string,
    documentId: string
  ): Promise<DocumentCollection> {
    const collection = await this.getById(collectionId, tenantId);

    const updated: DocumentCollection = {
      ...collection,
      documentIds: collection.documentIds.filter((id) => id !== documentId),
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    const { resource } = await container.item(collectionId, tenantId).replace(updated);

    if (!resource) {
      throw new Error('Failed to remove document from collection');
    }

    return resource as DocumentCollection;
  }
}

