import { requireAuth, requireRole, requireGlobalAdmin } from '../middleware/authorization.js';
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
export async function registerDocumentRoutes(server) {
    const controller = server.documentController;
    if (!controller) {
        server.log.warn('⚠️  Document routes not registered - controller missing');
        return;
    }
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️  Document routes not registered - authentication decorator missing');
        return;
    }
    // Authentication guards - all routes require authentication
    const authGuards = [authDecorator, requireAuth()];
    // GET /api/v1/documents - List documents
    server.get('/api/v1/documents', {
        onRequest: authGuards,
    }, (request, reply) => controller.listDocuments(request, reply));
    // GET /api/v1/documents/:id - Get document metadata
    server.get('/api/v1/documents/:id', {
        onRequest: authGuards,
    }, (request, reply) => controller.getDocument(request, reply));
    // PUT /api/v1/documents/:id - Update document metadata
    server.put('/api/v1/documents/:id', {
        onRequest: authGuards,
    }, (request, reply) => controller.updateDocument(request, reply));
    // DELETE /api/v1/documents/:id - Soft delete document
    server.delete('/api/v1/documents/:id', {
        onRequest: authGuards,
    }, (request, reply) => controller.deleteDocument(request, reply));
    // POST /api/v1/documents/:id/restore - Restore deleted document
    server.post('/api/v1/documents/:id/restore', {
        onRequest: authGuards,
    }, (request, reply) => controller.restoreDocument(request, reply));
    // POST /api/v1/documents/upload - Upload file (multipart/form-data)
    server.post('/api/v1/documents/upload', {
        onRequest: authGuards,
    }, (request, reply) => controller.uploadDocument(request, reply));
    // GET /api/v1/documents/:id/download - Download file (generates SAS URL)
    server.get('/api/v1/documents/:id/download', {
        onRequest: authGuards,
    }, (request, reply) => controller.downloadDocument(request, reply));
    // GET /api/v1/documents/settings - Get effective settings for current tenant
    server.get('/api/v1/documents/settings', {
        onRequest: authGuards,
    }, (request, reply) => controller.getTenantSettings(request, reply));
    // PUT /api/v1/documents/settings - Update settings for current tenant
    server.put('/api/v1/documents/settings', {
        onRequest: [...authGuards, requireRole('admin')],
    }, (request, reply) => controller.updateTenantSettings(request, reply));
    // GET /api/v1/admin/documents/settings/global - Get global settings
    server.get('/api/v1/admin/documents/settings/global', {
        onRequest: [...authGuards, requireGlobalAdmin()],
    }, (request, reply) => controller.getGlobalSettings(request, reply));
    // PUT /api/v1/admin/documents/settings/global - Update global settings
    server.put('/api/v1/admin/documents/settings/global', {
        onRequest: [...authGuards, requireGlobalAdmin()],
    }, (request, reply) => controller.updateGlobalSettings(request, reply));
    // GET /api/v1/admin/documents/settings/tenants/:tenantId - Get tenant settings for override
    server.get('/api/v1/admin/documents/settings/tenants/:tenantId', {
        onRequest: [...authGuards, requireGlobalAdmin()],
    }, (request, reply) => controller.getTenantSettingsOverride(request, reply));
    // PUT /api/v1/admin/documents/settings/tenants/:tenantId - Override tenant settings
    server.put('/api/v1/admin/documents/settings/tenants/:tenantId', {
        onRequest: [...authGuards, requireGlobalAdmin()],
    }, (request, reply) => controller.updateTenantSettingsOverride(request, reply));
    server.log.info('✅ Document routes registered (Phase 1: metadata, CRUD, settings)');
}
//# sourceMappingURL=document.routes.js.map