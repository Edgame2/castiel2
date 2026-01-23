/**
 * Collection Controller
 * Manages document collections (folders, tags, smart collections)
 * Collections have independent ACL from documents
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  AuditLogService,
} from '@castiel/api-core';
import { DocumentAuditIntegration } from '../services/document-audit-integration.service.js';
import type { AuthUser } from '../types/auth.types.js';
import { PermissionLevel } from '../types/shard.types.js';
import { CollectionType, CollectionStructuredData } from '../types/document.types.js';

/**
 * Collection Controller
 * Handles CRUD operations for document collections
 */
export class CollectionController {
  private shardRepository: ShardRepository;
  private documentAuditIntegration?: DocumentAuditIntegration;

  constructor(
    private readonly monitoring: IMonitoringProvider,
    private readonly auditLogService?: AuditLogService,
  ) {
    this.shardRepository = new ShardRepository(monitoring);

    // Initialize audit integration if service provided
    if (auditLogService) {
      this.documentAuditIntegration = new DocumentAuditIntegration(auditLogService);
    }

    // Bind methods
    this.createCollection = this.createCollection.bind(this);
    this.getCollection = this.getCollection.bind(this);
    this.listCollections = this.listCollections.bind(this);
    this.updateCollection = this.updateCollection.bind(this);
    this.deleteCollection = this.deleteCollection.bind(this);
    this.addDocuments = this.addDocuments.bind(this);
    this.removeDocument = this.removeDocument.bind(this);
    this.getCollectionDocuments = this.getCollectionDocuments.bind(this);
  }

  /**
   * Initialize repositories
   */
  async initialize(): Promise<void> {
    await this.shardRepository.ensureContainer();
  }

  /**
   * POST /api/v1/collections
   * Create a new collection
   */
  async createCollection(
    request: FastifyRequest<{
      Body: {
        name: string;
        description?: string;
        collectionType: CollectionType;
        visibility?: string;
        tags?: string[];
        query?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { name, description, collectionType, visibility, tags, query } = request.body;

      if (!name || !collectionType) {
        return reply.status(400).send({
          error: 'Missing required fields: name, collectionType'
        });
      }

      // Validate collection type
      if (!Object.values(CollectionType).includes(collectionType)) {
        return reply.status(400).send({
          error: `Invalid collectionType. Must be one of: ${Object.values(CollectionType).join(', ')}`
        });
      }

      // For smart collections, query is required
      if (collectionType === CollectionType.SMART && !query) {
        return reply.status(400).send({
          error: 'Smart collections require a query definition'
        });
      }

      const structuredData: CollectionStructuredData = {
        name,
        description,
        collectionType,
        documentIds: [],
        visibility: visibility || 'internal',
        tags: tags || [],
        ...(query && { query }),
      };

      // Create collection shard
      const collection = await this.shardRepository.create({
        tenantId: auth.tenantId,
        userId: auth.id,
        shardTypeId: 'c_documentcollection',
        structuredData,
        acl: [
          {
            userId: auth.id,
            permissions: [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE, PermissionLevel.ADMIN],
            grantedBy: auth.id,
            grantedAt: new Date(),
          },
        ],
        metadata: {
        },
      });

      // Log collection creation
      try {
        await this.documentAuditIntegration?.logUpdate(
          auth.tenantId,
          auth.id,
          collection.id,
          name,
          {
            action: 'created',
            collectionType,
            visibility,
            tags,
          },
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('collection.audit.error', 1, { event: 'create' });
      }

      this.monitoring.trackMetric('collection.create.success', 1, {
        tenantId: auth.tenantId,
        collectionType,
      });

      reply.status(201).send({
        success: true,
        data: collection,
        message: 'Collection created successfully',
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.create.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Collection creation failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to create collection',
      });
    }
  }

  /**
   * GET /api/v1/collections/:id
   * Get collection metadata
   */
  async getCollection(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;

      // Get collection shard
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.READ)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      reply.status(200).send({
        success: true,
        data: collection,
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.get.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Get collection failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to get collection',
      });
    }
  }

  /**
   * GET /api/v1/collections
   * List collections
   */
  async listCollections(
    request: FastifyRequest<{
      Querystring: {
        limit?: string;
        continuationToken?: string;
        collectionType?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { limit, continuationToken, collectionType } = request.query;

      // Validate and sanitize limit
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const validatedLimit = isNaN(limitNum) || limitNum < 1 ? 50 : Math.min(limitNum, 1000); // Max 1000 items per page

      const result = await this.shardRepository.list({
        filter: {
          tenantId: auth.tenantId,
          shardTypeId: 'c_documentcollection',
        },
        limit: validatedLimit,
        continuationToken,
      });

      // Filter by collection type if specified
      let collections = result.shards;
      if (collectionType) {
        collections = collections.filter(
          (c: any) => c.structuredData.collectionType === collectionType
        );
      }

      reply.status(200).send({
        success: true,
        data: collections,
        continuationToken: result.continuationToken,
        hasMore: !!result.continuationToken,
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.list.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'List collections failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to list collections',
      });
    }
  }

  /**
   * PUT /api/v1/collections/:id
   * Update collection metadata
   */
  async updateCollection(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        description?: string;
        visibility?: string;
        tags?: string[];
        query?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;
      const updates = request.body;

      // Get existing collection
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check WRITE permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.WRITE)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Update structured data
      const updatedStructuredData = {
        ...collection.structuredData,
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.visibility && { visibility: updates.visibility }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.query && { query: updates.query }),
      };

      // Update collection
      const updatedCollection = await this.shardRepository.update(id, auth.tenantId, {
        structuredData: updatedStructuredData,
      });

      // Log collection update
      try {
        const changes: any = {};
        if (updates.name) {changes.name = { old: collection.structuredData?.name, new: updates.name };}
        if (updates.description !== undefined) {changes.description = { old: collection.structuredData?.description, new: updates.description };}
        if (updates.visibility) {changes.visibility = { old: collection.structuredData?.visibility, new: updates.visibility };}
        if (updates.tags) {changes.tags = { old: collection.structuredData?.tags, new: updates.tags };}

        await this.documentAuditIntegration?.logUpdate(
          auth.tenantId,
          auth.id,
          id,
          updatedCollection?.structuredData?.name || id,
          changes,
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('collection.audit.error', 1, { event: 'update' });
      }

      reply.status(200).send({
        success: true,
        data: updatedCollection,
        message: 'Collection updated successfully',
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.update.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Collection update failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to update collection',
      });
    }
  }

  /**
   * DELETE /api/v1/collections/:id
   * Delete a collection (does not delete documents)
   */
  async deleteCollection(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;

      // Get collection
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check DELETE permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.DELETE)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Delete collection (documents remain intact)
      await this.shardRepository.delete(id, auth.tenantId);

      // Log collection deletion
      try {
        await this.documentAuditIntegration?.logDelete(
          auth.tenantId,
          auth.id,
          id,
          collection.structuredData?.name || id,
          {
            documentId: id,
            fileName: collection.structuredData?.name || id,
            softDelete: true,
            reason: 'Collection deleted by user',
          },
          request.ip,
          request.headers['user-agent'],
        );
      } catch (auditErr: any) {
        this.monitoring.trackMetric('collection.audit.error', 1, { event: 'delete' });
      }

      reply.status(200).send({
        success: true,
        message: 'Collection deleted successfully (documents retained)',
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.delete.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Collection delete failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to delete collection',
      });
    }
  }

  /**
   * POST /api/v1/collections/:id/documents
   * Add documents to collection
   */
  async addDocuments(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        documentIds: string[];
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;
      const { documentIds } = request.body;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return reply.status(400).send({
          error: 'documentIds array is required and must not be empty'
        });
      }

      // Get collection
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check write permission on collection
      const collectionPermission = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!collectionPermission.hasAccess || !collectionPermission.permissions.includes(PermissionLevel.WRITE)) {
        return reply.status(403).send({ 
          error: 'Insufficient permissions on collection' 
        });
      }

      // Verify user has read access to all documents
      // Use Promise.allSettled to ensure all checks complete even if some fail
      const accessResults = await Promise.allSettled(
        documentIds.map(async (docId) => {
          try {
            const doc = await this.shardRepository.findById(docId, auth.tenantId);
            if (!doc) {
              return { id: docId, error: 'not_found' };
            }

            const hasAccess = await this.shardRepository.checkPermission(
              docId,
              auth.tenantId,
              auth.id
            );

            if (!hasAccess.hasAccess || !hasAccess.permissions.includes(PermissionLevel.READ)) {
              return { id: docId, error: 'no_permission' };
            }

            return { id: docId, success: true };
          } catch (error) {
            // Log individual failures but continue processing other documents
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
              operation: 'collection.verifyAccess',
              documentId: docId,
              tenantId: auth.tenantId,
              userId: auth.id,
            });
            return { id: docId, error: 'check_failed' };
          }
        })
      );

      // Extract results from Promise.allSettled
      const resolvedResults = accessResults.map((result) => 
        result.status === 'fulfilled' ? result.value : { id: 'unknown', error: 'check_failed' }
      );

      // Check for errors
      const errors = resolvedResults.filter((r) => r.error);
      if (errors.length > 0) {
        return reply.status(403).send({
          error: 'Cannot add some documents',
          details: errors,
        });
      }

      // Add documents to collection (avoid duplicates)
      const structuredData = collection.structuredData as CollectionStructuredData;
      const existingIds = new Set(structuredData.documentIds || []);
      const newIds = documentIds.filter((id) => !existingIds.has(id));

      if (newIds.length === 0) {
        return reply.status(200).send({
          success: true,
          message: 'All documents already in collection',
          data: collection,
        });
      }

      const updatedDocumentIds = [...(structuredData.documentIds || []), ...newIds];

      // Update collection
      const updatedCollection = await this.shardRepository.update(id, auth.tenantId, {
        structuredData: {
          ...structuredData,
          documentIds: updatedDocumentIds,
        },
      });

      // Log audit for each added document
      try {
        for (const docId of newIds) {
          await this.auditLogService?.log({
            tenantId: auth.tenantId,
            actorId: auth.id,
            actorEmail: auth.email,
            category: 'data_management' as any,
            eventType: 'document.added_to_collection' as any,
            outcome: 'success' as any,
            targetId: id,
            targetType: 'collection',
            message: `Document ${docId} added to collection ${id}`,
            details: {
              documentId: docId,
              collectionName: structuredData.name,
            },
          });
        }
      } catch (auditErr: any) {
        this.monitoring.trackMetric('collection.audit.error', 1, { event: 'add_documents' });
      }

      this.monitoring.trackMetric('collection.documents.add.success', newIds.length, {
        tenantId: auth.tenantId,
        collectionId: id,
      });

      reply.status(200).send({
        success: true,
        data: updatedCollection,
        message: `Added ${newIds.length} document(s) to collection`,
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.documents.add.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Add documents to collection failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to add documents to collection',
      });
    }
  }

  /**
   * DELETE /api/v1/collections/:id/documents/:documentId
   * Remove document from collection
   */
  async removeDocument(
    request: FastifyRequest<{
      Params: { id: string; documentId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id, documentId } = request.params;

      // Get collection
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check write permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.WRITE)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      // Remove document from collection
      const structuredData = collection.structuredData as CollectionStructuredData;
      const updatedDocumentIds = (structuredData.documentIds || []).filter(
        (id) => id !== documentId
      );

      if (updatedDocumentIds.length === (structuredData.documentIds || []).length) {
        return reply.status(404).send({
          error: 'Document not found in collection'
        });
      }

      // Update collection
      const updatedCollection = await this.shardRepository.update(id, auth.tenantId, {
        structuredData: {
          ...structuredData,
          documentIds: updatedDocumentIds,
        },
      });

      // Log audit for document removal
      try {
        await this.auditLogService?.log({
          tenantId: auth.tenantId,
          actorId: auth.id,
          actorEmail: auth.email,
          category: 'data_management' as any,
          eventType: 'document.removed_from_collection' as any,
          outcome: 'success' as any,
          targetId: id,
          targetType: 'collection',
          message: `Document removed from collection ${id}`,
          details: {
            documentId,
            collectionName: structuredData.name,
          },
        });
      } catch (auditErr: any) {
        this.monitoring.trackMetric('collection.audit.error', 1, { event: 'remove_document' });
      }

      reply.status(200).send({
        success: true,
        data: updatedCollection,
        message: 'Document removed from collection',
      });
    } catch (error: any) {
      this.monitoring.trackMetric('collection.documents.remove.error', 1, {
        error: error.message,
      });

      request.log.error({ error }, 'Remove document from collection failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to remove document from collection',
      });
    }
  }

  /**
   * GET /api/v1/collections/:id/documents
   * Get all documents in a collection
   */
  async getCollectionDocuments(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: {
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const { id } = request.params;
      const { limit, offset } = request.query;

      // Get collection
      const collection = await this.shardRepository.findById(id, auth.tenantId);
      if (!collection) {
        return reply.status(404).send({ error: 'Collection not found' });
      }

      // Check read permission
      const permissionCheck = await this.shardRepository.checkPermission(
        id,
        auth.tenantId,
        auth.id
      );

      if (!permissionCheck.hasAccess || !permissionCheck.permissions.includes(PermissionLevel.READ)) {
        return reply.status(403).send({ error: 'Insufficient permissions' });
      }

      const structuredData = collection.structuredData as CollectionStructuredData;
      
      // Handle pagination with validation
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      
      // Validate limit and offset to prevent DoS attacks
      const validatedLimit = isNaN(limitNum) || limitNum < 1 ? 50 : Math.min(limitNum, 1000); // Max 1000 items per page
      const validatedOffset = isNaN(offsetNum) || offsetNum < 0 ? 0 : offsetNum;

      let documents: any[] = [];
      let total = 0;

      // Handle smart collections differently - execute query dynamically
      if (structuredData.collectionType === CollectionType.SMART && structuredData.query) {
        // Smart collection: execute query to find matching documents
        try {
          // Build structuredDataFilters from CollectionQuery
          const structuredDataFilters: Record<string, any> = {};

          // Apply query filters from CollectionQuery.filters
          if (structuredData.query.filters) {
            if (structuredData.query.filters.category && structuredData.query.filters.category.length > 0) {
              structuredDataFilters.category = structuredData.query.filters.category[0]; // Use first category for now
            }
            if (structuredData.query.filters.tags && structuredData.query.filters.tags.length > 0) {
              structuredDataFilters.tags = structuredData.query.filters.tags;
            }
            if (structuredData.query.filters.visibility && structuredData.query.filters.visibility.length > 0) {
              structuredDataFilters.visibility = structuredData.query.filters.visibility[0]; // Use first visibility for now
            }
            if (structuredData.query.filters.documentType && structuredData.query.filters.documentType.length > 0) {
              structuredDataFilters.documentType = structuredData.query.filters.documentType[0];
            }
          }

          // Build filter for shard repository
          const queryFilter: any = {
            tenantId: auth.tenantId,
            shardTypeId: 'c_document', // Only documents can be in collections
            status: 'active' as any,
            structuredDataFilters,
          };

          // Apply date range filters
          if (structuredData.query.filters?.dateRange) {
            if (structuredData.query.filters.dateRange.start) {
              queryFilter.createdAfter = new Date(structuredData.query.filters.dateRange.start);
            }
            if (structuredData.query.filters.dateRange.end) {
              queryFilter.createdBefore = new Date(structuredData.query.filters.dateRange.end);
            }
          }

          // Execute query - get more results to handle offset
          const queryLimit = validatedLimit + validatedOffset;
          const queryResult = await this.shardRepository.list({
            filter: queryFilter,
            limit: queryLimit,
            orderBy: 'updatedAt',
            orderDirection: 'desc',
          });

          // Apply offset manually (since Cosmos DB doesn't support offset directly)
          documents = queryResult.shards.slice(validatedOffset, validatedOffset + validatedLimit);
          total = queryResult.shards.length; // Approximate total (would need separate count query for exact)
        } catch (queryError: any) {
          this.monitoring.trackException(
            queryError instanceof Error ? queryError : new Error(String(queryError)),
            {
              operation: 'collection.getCollectionDocuments.smartQuery',
              collectionId: id,
              tenantId: auth.tenantId,
            }
          );
          return reply.status(500).send({
            success: false,
            error: 'Failed to execute smart collection query',
            message: queryError.message || 'Unknown error during query execution',
          });
        }
      } else {
        // Manual collection (folder/tag): use documentIds array
        const documentIds = structuredData.documentIds || [];
        const paginatedIds = documentIds.slice(validatedOffset, validatedOffset + validatedLimit);

        // Fetch documents (only those user has access to)
        // Use Promise.allSettled to ensure all requests complete even if some fail
        const documentResults = await Promise.allSettled(
          paginatedIds.map(async (docId) => {
            try {
              const doc = await this.shardRepository.findById(docId, auth.tenantId);
              if (!doc) {return null;}

              const hasAccess = await this.shardRepository.checkPermission(
                docId,
                auth.tenantId,
                auth.id
              );

              return hasAccess.hasAccess && hasAccess.permissions.includes(PermissionLevel.READ) ? doc : null;
            } catch (error) {
              // Log individual failures but don't fail the entire request
              this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
                operation: 'collection.getDocument',
                documentId: docId,
                tenantId: auth.tenantId,
              });
              return null;
            }
          })
        );

        // Extract successful results, filtering out nulls and rejected promises
        documents = documentResults
          .map((result) => result.status === 'fulfilled' ? result.value : null)
          .filter((doc) => doc !== null);
        
        total = documentIds.length;
      }

      // Filter documents by user permissions (final security check)
      const accessibleDocuments = await Promise.all(
        documents.map(async (doc) => {
          try {
            const hasAccess = await this.shardRepository.checkPermission(
              doc.id,
              auth.tenantId,
              auth.id
            );
            return hasAccess.hasAccess && hasAccess.permissions.includes(PermissionLevel.READ) ? doc : null;
          } catch (error) {
            this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
              operation: 'collection.getDocument.permissionCheck',
              documentId: doc.id,
              tenantId: auth.tenantId,
            });
            return null;
          }
        })
      );

      const filteredDocuments = accessibleDocuments.filter((doc) => doc !== null);

      reply.status(200).send({
        success: true,
        data: filteredDocuments,
        total,
        limit: validatedLimit,
        offset: validatedOffset,
        hasMore: validatedOffset + validatedLimit < total,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackMetric('collection.documents.get.error', 1, {
        error: errorMessage,
      });

      request.log.error({ error }, 'Get collection documents failed');

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to get collection documents',
      });
    }
  }
}
