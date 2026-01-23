import type { FastifyInstance } from 'fastify';
/**
 * Register Document Management routes
 *
 * Implementation Status:
 * - ✅ Document metadata CRUD (GET, PUT, DELETE, POST restore)
 * - ✅ List documents with pagination
 * - ✅ File upload/download (uses @fastify/multipart plugin)
 * - ✅ DocumentUploadService and AzureBlobStorageService integrated
 *
 * Note: Chunked upload with Redis session storage is available for large files.
 * The @fastify/multipart plugin is registered in the main server initialization.
 */
export declare function registerDocumentRoutes(server: FastifyInstance): Promise<void>;
//# sourceMappingURL=document.routes.d.ts.map