/**
 * Document Service
 * Handles document CRUD operations with tenant isolation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentStatus,
  VisibilityLevel,
  StorageProvider,
  DownloadResponse,
} from '../types/document.types';
import { BlobStorageService } from './BlobStorageService';

export class DocumentService {
  private containerName = 'document_documents';
  private blobStorage: BlobStorageService;

  constructor(blobStorage: BlobStorageService) {
    this.blobStorage = blobStorage;
  }

  /**
   * Create a new document
   */
  async create(input: CreateDocumentInput): Promise<Document> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.mimeType) {
      throw new BadRequestError('mimeType is required');
    }
    if (!input.fileSize || input.fileSize <= 0) {
      throw new BadRequestError('fileSize must be greater than 0');
    }

    const document: Document = {
      id: uuidv4(),
      tenantId: input.tenantId,
      userId: input.userId,
      shardId: input.shardId,
      structuredData: {
        name: input.name,
        description: input.description,
        documentType: input.documentType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageProvider: input.storageProvider,
        storagePath: input.storagePath,
        tags: input.tags || [],
        visibility: input.visibility || VisibilityLevel.INTERNAL,
        version: 1,
        versionHistory: [
          {
            version: 1,
            storagePath: input.storagePath,
            uploadedBy: input.userId,
            uploadedAt: new Date(),
            fileSize: input.fileSize,
          },
        ],
        uploadedBy: input.userId,
        uploadedAt: new Date(),
      },
      status: DocumentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(document, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create document');
      }

      return resource as Document;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Document with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getById(documentId: string, tenantId: string): Promise<Document> {
    if (!documentId || !tenantId) {
      throw new BadRequestError('documentId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(documentId, tenantId).read<Document>();

      if (!resource) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }

      // Check if deleted
      if (resource.status === DocumentStatus.DELETED) {
        throw new NotFoundError(`Document ${documentId} has been deleted`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update document
   */
  async update(documentId: string, tenantId: string, input: UpdateDocumentInput): Promise<Document> {
    const existing = await this.getById(documentId, tenantId);

    // Check if archived or deleted
    if (existing.status === DocumentStatus.ARCHIVED) {
      throw new ForbiddenError('Cannot update archived document');
    }
    if (existing.status === DocumentStatus.DELETED) {
      throw new ForbiddenError('Cannot update deleted document');
    }

    const updated: Document = {
      ...existing,
      structuredData: {
        ...existing.structuredData,
        ...input,
        tags: input.tags || existing.structuredData.tags,
      },
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(documentId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update document');
      }

      return resource as Document;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete document (soft delete)
   */
  async delete(documentId: string, tenantId: string, userId: string): Promise<void> {
    const existing = await this.getById(documentId, tenantId);

    if (existing.status === DocumentStatus.DELETED) {
      return; // Already deleted
    }

    const deleted: Document = {
      ...existing,
      status: DocumentStatus.DELETED,
      structuredData: {
        ...existing.structuredData,
        deletedBy: userId,
        deletedAt: new Date(),
      },
      updatedAt: new Date(),
    };

    const container = getContainer(this.containerName);
    await container.item(documentId, tenantId).replace(deleted);
  }

  /**
   * List documents with filtering
   */
  async list(
    tenantId: string,
    filters?: {
      category?: string;
      documentType?: string;
      tags?: string[];
      visibility?: VisibilityLevel;
      status?: DocumentStatus;
      uploadedBy?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Document[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    // Build query with filters
    if (filters?.category) {
      query += ' AND c.structuredData.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.documentType) {
      query += ' AND c.structuredData.documentType = @documentType';
      parameters.push({ name: '@documentType', value: filters.documentType });
    }

    if (filters?.visibility) {
      query += ' AND c.structuredData.visibility = @visibility';
      parameters.push({ name: '@visibility', value: filters.visibility });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    } else {
      // Exclude deleted by default
      query += ' AND c.status != @deletedStatus';
      parameters.push({ name: '@deletedStatus', value: DocumentStatus.DELETED });
    }

    if (filters?.uploadedBy) {
      query += ' AND c.structuredData.uploadedBy = @uploadedBy';
      parameters.push({ name: '@uploadedBy', value: filters.uploadedBy });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Document>({
          query,
          parameters,
        })
        .fetchNext();

      // Filter by tags if provided (client-side filtering for array contains)
      let filtered = resources;
      if (filters?.tags && filters.tags.length > 0) {
        filtered = resources.filter((doc) => {
          const docTags = doc.structuredData.tags || [];
          return filters.tags!.some((tag) => docTags.includes(tag));
        });
      }

      return {
        items: filtered.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  /**
   * Generate download URL
   */
  async generateDownloadUrl(
    documentId: string,
    tenantId: string,
    expiresInMinutes: number = 15
  ): Promise<DownloadResponse> {
    const document = await this.getById(documentId, tenantId);

    if (document.status === DocumentStatus.DELETED) {
      throw new NotFoundError('Document has been deleted');
    }

    const { url, expiresAt } = this.blobStorage.generateDownloadUrl(
      document.structuredData.storagePath,
      expiresInMinutes
    );

    return {
      downloadUrl: url,
      expiresAt,
      fileName: document.structuredData.name,
      mimeType: document.structuredData.mimeType,
      fileSize: document.structuredData.fileSize,
    };
  }
}

