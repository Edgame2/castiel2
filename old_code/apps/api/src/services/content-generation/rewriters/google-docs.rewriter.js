// @ts-nocheck - Content generation service, not used by workers
/**
 * Google Docs Document Rewriter
 *
 * Rewrites Google Docs documents by replacing placeholders and inserting charts
 */
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../config/env.js';
import { BaseDocumentRewriter } from './base-rewriter.js';
export class GoogleDocsRewriter extends BaseDocumentRewriter {
    docsClient = null;
    driveClient = null;
    oauth2Client = null;
    constructor(monitoring) {
        super(monitoring);
    }
    /**
     * Initialize Google API clients
     */
    async initializeClients(auth) {
        if (this.oauth2Client && this.docsClient) {
            return; // Already initialized
        }
        // Get OAuth config from environment
        const clientId = config.googleWorkspace?.clientId || '';
        const clientSecret = config.googleWorkspace?.clientSecret || '';
        if (!clientId || !clientSecret) {
            throw new Error('Google Workspace OAuth credentials not configured');
        }
        // Create OAuth2 client
        this.oauth2Client = new OAuth2Client(clientId, clientSecret);
        // Set credentials
        this.oauth2Client.setCredentials({
            access_token: auth.accessToken,
            refresh_token: auth.refreshToken,
        });
        // Listen for token refresh events
        // Google's OAuth2Client automatically refreshes tokens when they expire
        // We track this for monitoring purposes
        this.oauth2Client.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                // Refresh token was rotated (rare, but possible)
                this.monitoring.trackEvent('content_generation.oauth.token_refreshed', {
                    format: 'google_docs',
                    hasNewRefreshToken: true,
                });
            }
            else {
                // Access token was refreshed
                this.monitoring.trackEvent('content_generation.oauth.token_refreshed', {
                    format: 'google_docs',
                    hasNewRefreshToken: false,
                });
            }
        });
        // Initialize API clients
        this.docsClient = google.docs({ version: 'v1', auth: this.oauth2Client });
        this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
    }
    /**
     * Execute API call with automatic token refresh on 401 errors and rate limit handling
     * Google's OAuth2Client should handle token refresh automatically, but we add explicit handling
     * Also handles rate limits (429) with exponential backoff
     */
    async executeWithTokenRefresh(operation, operationName, maxRetries = 3) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await operation();
            }
            catch (error) {
                attempt++;
                const statusCode = error.code || error.response?.status;
                // Handle rate limiting (429) with exponential backoff
                if (statusCode === 429) {
                    if (attempt >= maxRetries) {
                        this.monitoring.trackException(error, {
                            operation: `rewriter.${operationName}`,
                            format: 'google_docs',
                            errorType: 'rate_limit_exceeded',
                            attempts: attempt,
                        });
                        throw new Error(`Google API rate limit exceeded after ${maxRetries} attempts. Please try again later. ` +
                            `Original error: ${error.message}`);
                    }
                    // Calculate exponential backoff: 2^attempt seconds (capped at 60 seconds)
                    const backoffSeconds = Math.min(Math.pow(2, attempt), 60);
                    const retryAfter = error.response?.headers?.['retry-after']
                        ? parseInt(error.response.headers['retry-after'], 10)
                        : backoffSeconds;
                    this.monitoring.trackEvent('content_generation.rate_limit.retry', {
                        format: 'google_docs',
                        operation: operationName,
                        attempt,
                        retryAfter,
                    });
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue; // Retry the operation
                }
                // Handle token expiration (401)
                if (statusCode === 401) {
                    this.monitoring.trackEvent('content_generation.oauth.token_expired', {
                        format: 'google_docs',
                        operation: operationName,
                    });
                    // Google's OAuth2Client should have automatically refreshed the token
                    // If it didn't, the refresh token might be invalid
                    // Try the operation once more (in case token was refreshed)
                    try {
                        return await operation();
                    }
                    catch (retryError) {
                        // If retry also fails, the refresh token is likely invalid
                        this.monitoring.trackException(retryError, {
                            operation: `rewriter.${operationName}`,
                            format: 'google_docs',
                            errorType: 'token_refresh_failed',
                        });
                        throw new Error(`OAuth token expired and refresh failed. Please reconnect your Google Workspace integration. ` +
                            `Original error: ${error.message}`);
                    }
                }
                // For other errors, throw immediately
                throw error;
            }
        }
        // This should never be reached, but TypeScript needs it
        throw new Error('Operation failed after maximum retries');
    }
    /**
     * Duplicate document to user's folder
     */
    async duplicateDocument(sourceDocumentId, newName, destinationFolderId, auth) {
        await this.initializeClients(auth);
        return this.executeWithTokenRefresh(async () => {
            // Copy document to user's folder
            const copy = await this.driveClient.files.copy({
                fileId: sourceDocumentId,
                requestBody: {
                    name: newName,
                    parents: [destinationFolderId],
                },
                fields: 'id,webViewLink',
            });
            const documentId = copy.data.id;
            const url = copy.data.webViewLink || `https://docs.google.com/document/d/${documentId}`;
            this.monitoring.trackEvent('content_generation.rewriter.duplicated', {
                sourceId: sourceDocumentId,
                newId: documentId,
                format: 'google_docs',
            });
            return {
                documentId,
                url,
            };
        }, 'duplicate').catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'rewriter.duplicate',
                format: 'google_docs',
                sourceId: sourceDocumentId,
            });
            throw new Error(`Failed to duplicate Google Docs document: ${error.message}`);
        });
    }
    /**
     * Replace text placeholders in document
     */
    async replacePlaceholders(documentId, template, generatedValues, auth) {
        await this.initializeClients(auth);
        return this.executeWithTokenRefresh(async () => {
            const requests = [];
            // Process each placeholder
            for (const placeholder of template.placeholders || []) {
                const value = generatedValues[placeholder.name];
                if (!value) {
                    continue; // Skip if no generated value
                }
                // Process each location where this placeholder appears
                for (const location of placeholder.locations || []) {
                    if (location.documentFormat !== 'google_docs') {
                        continue;
                    }
                    // Build replacement request
                    // Note: Google Docs API supports replaceAllText for simple replacements
                    // For more precise replacements with exact indices, we could use:
                    // deleteContentRange + insertText (requires exact startIndex/endIndex)
                    const placeholderText = `{{${placeholder.name}}}`;
                    // Use replaceAllText for simple replacement
                    // This replaces all occurrences of the placeholder in the document
                    requests.push({
                        replaceAllText: {
                            containsText: {
                                text: placeholderText,
                                matchCase: false,
                            },
                            replaceText: value,
                        },
                    });
                }
            }
            // Execute batch update if there are requests
            if (requests.length > 0) {
                await this.docsClient.documents.batchUpdate({
                    documentId,
                    requestBody: { requests },
                });
                this.monitoring.trackEvent('content_generation.rewriter.placeholders_replaced', {
                    documentId,
                    placeholderCount: requests.length,
                    format: 'google_docs',
                });
            }
        }, 'replace_placeholders').catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'rewriter.replacePlaceholders',
                format: 'google_docs',
                documentId,
            });
            throw new Error(`Failed to replace placeholders in Google Docs: ${error.message}`);
        });
    }
    /**
     * Insert chart images into document
     */
    async insertCharts(documentId, template, generatedCharts, auth) {
        await this.initializeClients(auth);
        return this.executeWithTokenRefresh(async () => {
            if (Object.keys(generatedCharts).length === 0) {
                return; // No charts to insert
            }
            const requests = [];
            const chartPlaceholders = (template.placeholders || []).filter(p => p.type === 'chart' && generatedCharts[p.name]);
            if (chartPlaceholders.length === 0) {
                return; // No chart placeholders found
            }
            // First, upload all images and prepare URLs
            const chartUrls = {};
            for (const placeholder of chartPlaceholders) {
                const chartImage = generatedCharts[placeholder.name];
                if (!chartImage) {
                    continue;
                }
                // Upload chart image to Drive
                const imageFile = await this.uploadChartImageToDrive(chartImage, `chart-${placeholder.name}-${Date.now()}.png`, auth);
                // Make image publicly accessible
                await this.makeImagePublic(imageFile.id, auth);
                // Store URL
                chartUrls[placeholder.name] = `https://drive.google.com/uc?export=view&id=${imageFile.id}`;
            }
            // Get document to find placeholder positions
            const doc = await this.docsClient.documents.get({
                documentId,
            });
            // Find all placeholder positions and replace with images
            const imageRequests = [];
            const placeholderTexts = chartPlaceholders.map(p => `{{${p.name}}}`);
            // Search through document content to find placeholders
            const findAndReplacePlaceholders = (content, baseIndex = 1) => {
                for (const element of content) {
                    if (element.paragraph?.elements) {
                        for (const elem of element.paragraph.elements) {
                            if (elem.textRun?.content) {
                                const text = elem.textRun.content;
                                const startIndex = elem.startIndex || baseIndex;
                                const endIndex = elem.endIndex || startIndex;
                                // Check if this text contains any placeholder
                                for (const placeholder of chartPlaceholders) {
                                    const placeholderText = `{{${placeholder.name}}}`;
                                    const placeholderIndex = text.indexOf(placeholderText);
                                    if (placeholderIndex !== -1) {
                                        const placeholderStart = startIndex + placeholderIndex;
                                        const placeholderEnd = placeholderStart + placeholderText.length;
                                        const imageUrl = chartUrls[placeholder.name];
                                        if (imageUrl) {
                                            // Delete placeholder text
                                            imageRequests.push({
                                                deleteContentRange: {
                                                    range: {
                                                        startIndex: placeholderStart,
                                                        endIndex: placeholderEnd,
                                                        segmentId: '',
                                                    },
                                                },
                                            });
                                            // Insert image
                                            imageRequests.push({
                                                insertInlineImage: {
                                                    location: {
                                                        index: placeholderStart,
                                                        segmentId: '',
                                                    },
                                                    uri: imageUrl,
                                                    objectSize: {
                                                        height: {
                                                            magnitude: 300, // 300 points (~4 inches)
                                                            unit: 'PT',
                                                        },
                                                        width: {
                                                            magnitude: 400, // 400 points (~5.5 inches)
                                                            unit: 'PT',
                                                        },
                                                    },
                                                },
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Recursively process nested content (tables, etc.)
                    if (element.table?.tableRows) {
                        for (const row of element.table.tableRows) {
                            for (const cell of row.tableCells || []) {
                                findAndReplacePlaceholders(cell.content || [], baseIndex);
                            }
                        }
                    }
                }
            };
            findAndReplacePlaceholders(doc.data.body?.content || []);
            // Execute image insertion
            if (imageRequests.length > 0) {
                await this.docsClient.documents.batchUpdate({
                    documentId,
                    requestBody: { requests: imageRequests },
                });
            }
            this.monitoring.trackEvent('content_generation.rewriter.charts_inserted', {
                documentId,
                chartCount: chartPlaceholders.length,
                format: 'google_docs',
            });
        }, 'insert_charts').catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'rewriter.insertCharts',
                format: 'google_docs',
                documentId,
            });
            throw new Error(`Failed to insert charts in Google Docs: ${error.message}`);
        });
    }
    /**
     * Upload chart image to Google Drive
     */
    async uploadChartImageToDrive(imageBuffer, fileName, auth) {
        const file = await this.driveClient.files.create({
            requestBody: {
                name: fileName,
                mimeType: 'image/png',
            },
            media: {
                mimeType: 'image/png',
                body: imageBuffer,
            },
            fields: 'id',
        });
        return { id: file.data.id };
    }
    /**
     * Make image publicly accessible
     */
    async makeImagePublic(fileId, _auth) {
        await this.driveClient.permissions.create({
            fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    }
    /**
     * Get document URL
     */
    async getDocumentUrl(documentId, auth) {
        await this.initializeClients(auth);
        try {
            const file = await this.driveClient.files.get({
                fileId: documentId,
                fields: 'webViewLink',
            });
            return file.data.webViewLink || `https://docs.google.com/document/d/${documentId}`;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.getDocumentUrl',
                format: 'google_docs',
                documentId,
            });
            throw new Error(`Failed to get Google Docs document URL: ${error.message}`);
        }
    }
    /**
     * Get folder path
     */
    async getFolderPath(folderId, auth) {
        await this.initializeClients(auth);
        try {
            const pathParts = [];
            let currentFolderId = folderId;
            // Traverse up the folder hierarchy
            while (currentFolderId) {
                const folder = await this.driveClient.files.get({
                    fileId: currentFolderId,
                    fields: 'name,parents',
                });
                const folderName = folder.data.name || 'Unknown';
                pathParts.unshift(folderName);
                // Get parent folder ID
                const parents = folder.data.parents;
                if (parents && parents.length > 0) {
                    currentFolderId = parents[0];
                }
                else {
                    currentFolderId = null; // Reached root
                }
                // Safety limit to prevent infinite loops
                if (pathParts.length > 20) {
                    break;
                }
            }
            return '/' + pathParts.join('/');
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.getFolderPath',
                format: 'google_docs',
                folderId,
            });
            throw new Error(`Failed to get Google Drive folder path: ${error.message}`);
        }
    }
    /**
     * Delete a document (for cleanup on failure)
     */
    async deleteDocument(documentId, auth) {
        await this.initializeClients(auth);
        try {
            await this.driveClient.files.delete({
                fileId: documentId,
            });
            this.monitoring.trackEvent('content_generation.rewriter.deleted', {
                documentId,
                format: 'google_docs',
                reason: 'cleanup_on_failure',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.delete',
                format: 'google_docs',
                documentId,
            });
            // Log but don't throw - cleanup failures shouldn't fail the job
            this.monitoring.trackEvent('content_generation.rewriter.delete_failed', {
                documentId,
                format: 'google_docs',
                error: error.message,
            });
        }
    }
}
//# sourceMappingURL=google-docs.rewriter.js.map