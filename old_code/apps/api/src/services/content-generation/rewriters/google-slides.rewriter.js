// @ts-nocheck - Content generation service, not used by workers
/**
 * Google Slides Document Rewriter
 *
 * Rewrites Google Slides presentations by replacing placeholders and inserting charts
 */
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../config/env.js';
import { BaseDocumentRewriter } from './base-rewriter.js';
export class GoogleSlidesRewriter extends BaseDocumentRewriter {
    slidesClient = null;
    driveClient = null;
    oauth2Client = null;
    constructor(monitoring) {
        super(monitoring);
    }
    /**
     * Initialize Google API clients
     */
    async initializeClients(auth) {
        if (this.oauth2Client && this.slidesClient) {
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
                    format: 'google_slides',
                    hasNewRefreshToken: true,
                });
            }
            else {
                // Access token was refreshed
                this.monitoring.trackEvent('content_generation.oauth.token_refreshed', {
                    format: 'google_slides',
                    hasNewRefreshToken: false,
                });
            }
        });
        // Initialize API clients
        this.slidesClient = google.slides({ version: 'v1', auth: this.oauth2Client });
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
                            format: 'google_slides',
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
                        format: 'google_slides',
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
                        format: 'google_slides',
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
                            format: 'google_slides',
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
     * Duplicate presentation to user's folder
     */
    async duplicateDocument(sourceDocumentId, newName, destinationFolderId, auth) {
        await this.initializeClients(auth);
        try {
            // Copy presentation to user's folder
            const copy = await this.driveClient.files.copy({
                fileId: sourceDocumentId,
                requestBody: {
                    name: newName,
                    parents: [destinationFolderId],
                },
                fields: 'id,webViewLink',
            });
            const presentationId = copy.data.id;
            const url = copy.data.webViewLink || `https://docs.google.com/presentation/d/${presentationId}`;
            this.monitoring.trackEvent('content_generation.rewriter.duplicated', {
                sourceId: sourceDocumentId,
                newId: presentationId,
                format: 'google_slides',
            });
            return {
                documentId: presentationId,
                url,
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.duplicate',
                format: 'google_slides',
                sourceId: sourceDocumentId,
            });
            throw new Error(`Failed to duplicate Google Slides presentation: ${error.message}`);
        }
    }
    /**
     * Replace text placeholders in presentation
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
                    if (location.documentFormat !== 'google_slides') {
                        continue;
                    }
                    // Build replacement request
                    // Note: Google Slides API requires finding the text range first
                    // For now, we'll use a simplified approach that replaces the placeholder text
                    const placeholderText = `{{${placeholder.name}}}`;
                    // Delete the placeholder text and insert the new value
                    // This is a simplified implementation - in production, we'd need to:
                    // 1. Get the slide and element
                    // 2. Find the exact text range
                    // 3. Replace it precisely
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
                await this.slidesClient.presentations.batchUpdate({
                    presentationId: documentId,
                    requestBody: { requests },
                });
                this.monitoring.trackEvent('content_generation.rewriter.placeholders_replaced', {
                    documentId,
                    placeholderCount: requests.length,
                    format: 'google_slides',
                });
            }
        }, 'replace_placeholders').catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'rewriter.replacePlaceholders',
                format: 'google_slides',
                documentId,
            });
            throw new Error(`Failed to replace placeholders in Google Slides: ${error.message}`);
        });
    }
    /**
     * Insert chart images into presentation
     */
    async insertCharts(documentId, template, generatedCharts, auth) {
        await this.initializeClients(auth);
        return this.executeWithTokenRefresh(async () => {
            if (Object.keys(generatedCharts).length === 0) {
                return; // No charts to insert
            }
            const chartPlaceholders = (template.placeholders || []).filter(p => p.type === 'chart' && generatedCharts[p.name]);
            if (chartPlaceholders.length === 0) {
                return; // No chart placeholders found
            }
            // Get presentation to find placeholder shapes
            const presentation = await this.slidesClient.presentations.get({
                presentationId: documentId,
            });
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
            // Find placeholder shapes and replace with images
            const requests = [];
            const slides = presentation.data.slides || [];
            for (const slide of slides) {
                const pageId = slide.objectId;
                if (!pageId) {
                    continue;
                }
                // Find shapes/text boxes containing placeholders
                const pageElements = slide.pageElements || [];
                for (const element of pageElements) {
                    const shape = element.shape;
                    if (!shape || !shape.text?.textElements) {
                        continue;
                    }
                    // Check if this shape contains any chart placeholder
                    const textContent = shape.text.textElements
                        .map(elem => elem.textRun?.content || '')
                        .join('');
                    for (const placeholder of chartPlaceholders) {
                        const placeholderText = `{{${placeholder.name}}}`;
                        if (textContent.includes(placeholderText)) {
                            const imageUrl = chartUrls[placeholder.name];
                            if (!imageUrl) {
                                continue;
                            }
                            const elementId = element.objectId;
                            if (!elementId) {
                                continue;
                            }
                            // Get original size and position
                            const size = element.size || {
                                width: { magnitude: 400, unit: 'PT' },
                                height: { magnitude: 300, unit: 'PT' },
                            };
                            const transform = element.transform || {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 0,
                                translateY: 0,
                                unit: 'PT',
                            };
                            // Delete the placeholder shape
                            requests.push({
                                deleteObject: {
                                    objectId: elementId,
                                },
                            });
                            // Create image with same size and position
                            requests.push({
                                createImage: {
                                    objectId: `chart_${elementId}_${Date.now()}`,
                                    url: imageUrl,
                                    elementProperties: {
                                        pageObjectId: pageId,
                                        size,
                                        transform,
                                    },
                                },
                            });
                        }
                    }
                }
            }
            // Execute batch update
            if (requests.length > 0) {
                await this.slidesClient.presentations.batchUpdate({
                    presentationId: documentId,
                    requestBody: { requests },
                });
                this.monitoring.trackEvent('content_generation.rewriter.charts_inserted', {
                    documentId,
                    chartCount: chartPlaceholders.length,
                    format: 'google_slides',
                });
            }
        }, 'insert_charts').catch((error) => {
            this.monitoring.trackException(error, {
                operation: 'rewriter.insertCharts',
                format: 'google_slides',
                documentId,
            });
            throw new Error(`Failed to insert charts in Google Slides: ${error.message}`);
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
            return file.data.webViewLink || `https://docs.google.com/presentation/d/${documentId}`;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.getDocumentUrl',
                format: 'google_slides',
                documentId,
            });
            throw new Error(`Failed to get Google Slides document URL: ${error.message}`);
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
                format: 'google_slides',
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
                format: 'google_slides',
                reason: 'cleanup_on_failure',
            });
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'rewriter.delete',
                format: 'google_slides',
                documentId,
            });
            // Log but don't throw - cleanup failures shouldn't fail the job
            this.monitoring.trackEvent('content_generation.rewriter.delete_failed', {
                documentId,
                format: 'google_slides',
                error: error.message,
            });
        }
    }
}
//# sourceMappingURL=google-slides.rewriter.js.map