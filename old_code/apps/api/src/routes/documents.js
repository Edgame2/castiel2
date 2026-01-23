import { Router } from 'express';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
});
// Azure Blob Storage configuration
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING || '');
const containerName = 'tenant-documents';
// Cosmos DB configuration
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT || '',
    key: process.env.COSMOS_DB_KEY || '',
});
const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE || 'castiel');
const container = database.container('documents');
/**
 * POST /api/v1/documents/upload
 * Upload a document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { category, visibility, tags, description } = req.body;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        // Get tenant ID from authenticated user
        const tenantId = req.user?.tenantId || 'default-tenant';
        const userId = req.user?.id || 'anonymous';
        // Generate unique document ID
        const documentId = uuidv4();
        const storagePath = `${tenantId}/${documentId}/${file.originalname}`;
        // Upload to Azure Blob Storage
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();
        const blockBlobClient = containerClient.getBlockBlobClient(storagePath);
        await blockBlobClient.upload(file.buffer, file.size, {
            blobHTTPHeaders: {
                blobContentType: file.mimetype,
            },
            metadata: {
                tenantId,
                documentId,
                uploadedBy: userId,
            },
        });
        // Create document metadata in Cosmos DB
        const document = {
            id: documentId,
            tenantId,
            name: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            storagePath: blockBlobClient.url,
            category: category || undefined,
            visibility: visibility || 'internal',
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            description: description || undefined,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
            updatedBy: userId,
        };
        await container.items.create(document);
        res.status(201).json({
            message: 'Document uploaded successfully',
            document,
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to upload document',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/documents
 * List documents with filters
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { search, category, visibility, status, tags, dateFrom, dateTo, } = req.query;
        // Build query
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
        const parameters = [{ name: '@tenantId', value: tenantId }];
        if (search) {
            query += ' AND CONTAINS(LOWER(c.name), LOWER(@search))';
            parameters.push({ name: '@search', value: search });
        }
        if (category) {
            query += ' AND c.category = @category';
            parameters.push({ name: '@category', value: category });
        }
        if (visibility) {
            const visibilityArray = Array.isArray(visibility) ? visibility : [visibility];
            query += ` AND c.visibility IN (${visibilityArray.map((_, i) => `@visibility${i}`).join(', ')})`;
            visibilityArray.forEach((v, i) => {
                parameters.push({ name: `@visibility${i}`, value: v });
            });
        }
        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            query += ` AND c.status IN (${statusArray.map((_, i) => `@status${i}`).join(', ')})`;
            statusArray.forEach((s, i) => {
                parameters.push({ name: `@status${i}`, value: s });
            });
        }
        if (dateFrom) {
            query += ' AND c.createdAt >= @dateFrom';
            parameters.push({ name: '@dateFrom', value: dateFrom });
        }
        if (dateTo) {
            query += ' AND c.createdAt <= @dateTo';
            parameters.push({ name: '@dateTo', value: dateTo });
        }
        query += ' ORDER BY c.createdAt DESC';
        const { resources } = await container.items
            .query({
            query,
            parameters,
        })
            .fetchAll();
        res.json(resources);
    }
    catch (error) {
        console.error('List documents error:', error);
        res.status(500).json({
            error: 'Failed to list documents',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/documents/:id
 * Get a single document
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { resource } = await container.item(id, tenantId).read();
        if (!resource) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(resource);
    }
    catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({
            error: 'Failed to get document',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * PATCH /api/v1/documents/:id
 * Update document metadata
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId || 'default-tenant';
        const userId = req.user?.id || 'anonymous';
        const { category, visibility, tags, description } = req.body;
        const { resource: document } = await container.item(id, tenantId).read();
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Update fields
        if (category !== undefined) {
            document.category = category;
        }
        if (visibility !== undefined) {
            document.visibility = visibility;
        }
        if (tags !== undefined) {
            document.tags = tags;
        }
        if (description !== undefined) {
            document.description = description;
        }
        document.updatedAt = new Date().toISOString();
        document.updatedBy = userId;
        const { resource: updated } = await container
            .item(id, tenantId)
            .replace(document);
        res.json(updated);
    }
    catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({
            error: 'Failed to update document',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * DELETE /api/v1/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { resource: document } = await container.item(id, tenantId).read();
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Delete from Cosmos DB (soft delete)
        document.status = 'deleted';
        document.updatedAt = new Date().toISOString();
        await container.item(id, tenantId).replace(document);
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            error: 'Failed to delete document',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/documents/:id/download
 * Download a document
 */
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { resource: document } = await container.item(id, tenantId).read();
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        // Get blob from Azure Storage
        const storagePath = `${tenantId}/${id}/${document.name}`;
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(storagePath);
        const downloadResponse = await blockBlobClient.download();
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
        downloadResponse.readableStreamBody?.pipe(res);
    }
    catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({
            error: 'Failed to download document',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/documents/categories
 * Get available categories
 */
router.get('/categories', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { resources } = await container.items
            .query({
            query: 'SELECT DISTINCT c.category FROM c WHERE c.tenantId = @tenantId AND IS_DEFINED(c.category)',
            parameters: [{ name: '@tenantId', value: tenantId }],
        })
            .fetchAll();
        const categories = resources.map((r) => r.category).filter(Boolean);
        res.json(categories);
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Failed to get categories',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/v1/documents/tags
 * Get available tags
 */
router.get('/tags', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 'default-tenant';
        const { resources } = await container.items
            .query({
            query: 'SELECT c.tags FROM c WHERE c.tenantId = @tenantId AND IS_DEFINED(c.tags)',
            parameters: [{ name: '@tenantId', value: tenantId }],
        })
            .fetchAll();
        const allTags = new Set();
        resources.forEach((r) => {
            if (Array.isArray(r.tags)) {
                r.tags.forEach((tag) => allTags.add(tag));
            }
        });
        res.json(Array.from(allTags));
    }
    catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            error: 'Failed to get tags',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
//# sourceMappingURL=documents.js.map