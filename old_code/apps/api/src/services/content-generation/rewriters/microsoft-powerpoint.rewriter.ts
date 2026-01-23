// @ts-nocheck - Content generation service, not used by workers
/**
 * Microsoft PowerPoint Document Rewriter
 * 
 * Rewrites Microsoft PowerPoint presentations by replacing placeholders and inserting charts
 * Uses Microsoft Graph API for OneDrive operations
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import axios from 'axios';
import JSZip from 'jszip';
import { parseString, Builder } from 'xml2js';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { BaseDocumentRewriter, DocumentAuthToken, DuplicateResult } from './base-rewriter.js';
import { DocumentTemplate } from '../types/template.types.js';
import { getContentGenerationConfig } from '../config/content-generation.config.js';

const parseXml = promisify(parseString);

export class MicrosoftPowerPointRewriter extends BaseDocumentRewriter {
  private graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
  private config = getContentGenerationConfig();

  constructor(monitoring: IMonitoringProvider) {
    super(monitoring);
  }

  /**
   * Execute API call with automatic retry for rate limits and transient errors
   * Handles rate limiting (429) and service unavailable (503) with exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        const statusCode = error.response?.status;
        const errorCode = error.code;
        
        // Handle rate limiting (429) with exponential backoff
        if (statusCode === 429) {
          if (attempt >= maxRetries) {
            this.monitoring.trackException(error as Error, {
              operation: `rewriter.${operationName}`,
              format: 'powerpoint',
              errorType: 'rate_limit_exceeded',
              attempts: attempt,
            });
            throw new Error(
              `Microsoft Graph API rate limit exceeded after ${maxRetries} attempts. Please try again later. ` +
              `Original error: ${(error as Error).message}`
            );
          }

          // Calculate exponential backoff: 2^attempt seconds (capped at 60 seconds)
          const backoffSeconds = Math.min(Math.pow(2, attempt), 60);
          const retryAfter = error.response?.headers?.['retry-after'] 
            ? parseInt(error.response.headers['retry-after'], 10)
            : backoffSeconds;

          this.monitoring.trackEvent('content_generation.rate_limit.retry', {
            format: 'powerpoint',
            operation: operationName,
            attempt,
            retryAfter,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue; // Retry the operation
        }

        // Handle service unavailable (503) with exponential backoff
        if (statusCode === 503 || statusCode === 502 || statusCode === 504) {
          if (attempt >= maxRetries) {
            this.monitoring.trackException(error as Error, {
              operation: `rewriter.${operationName}`,
              format: 'powerpoint',
              errorType: 'service_unavailable',
              attempts: attempt,
              httpStatus: statusCode,
            });
            throw new Error(
              `Microsoft Graph API service unavailable after ${maxRetries} attempts. Please try again later. ` +
              `Original error: ${(error as Error).message}`
            );
          }

          // Calculate exponential backoff: 2^attempt seconds (capped at 60 seconds)
          const backoffSeconds = Math.min(Math.pow(2, attempt), 60);
          
          this.monitoring.trackEvent('content_generation.service_unavailable.retry', {
            format: 'powerpoint',
            operation: operationName,
            attempt,
            httpStatus: statusCode,
            backoffSeconds,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
          continue; // Retry the operation
        }

        // Handle timeout errors - retry once more if under max retries
        if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT' || error.message?.includes('timeout')) {
          if (attempt >= maxRetries) {
            this.monitoring.trackException(error as Error, {
              operation: `rewriter.${operationName}`,
              format: 'powerpoint',
              errorType: 'timeout',
              timeoutMs: this.config.apiRequestTimeoutMs,
              attempts: attempt,
            });
            throw new Error(
              `Microsoft Graph API request timed out after ${maxRetries} attempts. ` +
              `This may be due to network issues or slow API response. Please try again. ` +
              `Original error: ${(error as Error).message}`
            );
          }

          // Calculate exponential backoff: 2^attempt seconds (capped at 30 seconds for timeouts)
          const backoffSeconds = Math.min(Math.pow(2, attempt), 30);
          
          this.monitoring.trackEvent('content_generation.timeout.retry', {
            format: 'powerpoint',
            operation: operationName,
            attempt,
            backoffSeconds,
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
          continue; // Retry the operation
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
  async duplicateDocument(
    sourceDocumentId: string,
    newName: string,
    destinationFolderId: string,
    auth: DocumentAuthToken
  ): Promise<DuplicateResult> {
    return this.executeWithRetry(async () => {
      // Copy file to destination folder
      const _response = await axios.post(
        `${this.graphApiBaseUrl}/me/drive/items/${sourceDocumentId}/copy`,
        {
          name: newName,
          parentReference: {
            id: destinationFolderId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.apiRequestTimeoutMs,
        }
      );

      // The copy operation returns a location header, but we need to get the item details
      // Wait a moment for the copy to complete, then get the new item
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the copied item by name from the destination folder
      const folderResponse = await axios.get(
        `${this.graphApiBaseUrl}/me/drive/items/${destinationFolderId}/children?$filter=name eq '${encodeURIComponent(newName)}'`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          timeout: this.config.apiRequestTimeoutMs,
        }
      );

      const items = folderResponse.data.value;
      if (!items || items.length === 0) {
        throw new Error('Failed to find copied presentation');
      }

      const newItem = items[0];
      const url = newItem.webUrl || `https://onedrive.live.com/edit.aspx?id=${newItem.id}`;

      this.monitoring.trackEvent('content_generation.rewriter.duplicated', {
        sourceId: sourceDocumentId,
        newId: newItem.id,
        format: 'powerpoint',
      });

      return {
        documentId: newItem.id,
        url,
      };
    }, 'duplicate');
  }

  /**
   * Replace text placeholders in presentation
   * 
   * Downloads the .pptx file, unzips it, replaces placeholders in slide XML files,
   * re-zips it, and uploads the modified presentation back to OneDrive.
   */
  async replacePlaceholders(
    documentId: string,
    _template: DocumentTemplate,
    generatedValues: Record<string, string>,
    auth: DocumentAuthToken
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      try {
        // Step 1: Download presentation content
        const downloadResponse = await axios.get(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
            responseType: 'arraybuffer',
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        const pptxBuffer = Buffer.from(downloadResponse.data);

        // Step 2: Unzip .pptx file
        const zip = await JSZip.loadAsync(pptxBuffer);

        // Step 3: Replace placeholders in slide XML files
        const slideFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
        );
        
        for (const slideFile of slideFiles) {
          await this.replacePlaceholdersInSlideXml(zip, slideFile, generatedValues);
        }

        // Step 4: Re-zip the presentation
        const modifiedPptxBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        // Step 5: Upload modified presentation back to OneDrive
        // Use PUT to replace the existing file
        await axios.put(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          modifiedPptxBuffer,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            },
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        this.monitoring.trackEvent('content_generation.rewriter.placeholders_replaced', {
          documentId,
          placeholderCount: Object.keys(generatedValues).length,
          format: 'powerpoint',
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.replacePlaceholders',
          format: 'powerpoint',
          documentId,
        });
        throw new Error(`Failed to replace placeholders in PowerPoint presentation: ${(error as Error).message}`);
      }
    }, 'replace_placeholders');
  }

  /**
   * Replace placeholders in a slide XML file
   * PowerPoint uses a:t (text) elements within a:p (paragraph) elements
   */
  private async replacePlaceholdersInSlideXml(
    zip: JSZip,
    xmlPath: string,
    generatedValues: Record<string, string>
  ): Promise<void> {
    const xmlFile = zip.file(xmlPath);
    if (!xmlFile) {
      return; // File doesn't exist, skip
    }

    let xmlContent = await xmlFile.async('string');

    // Replace each placeholder with its generated value
    for (const [placeholderName, value] of Object.entries(generatedValues)) {
      if (!value) {
        continue; // Skip empty values
      }

      // Escape XML special characters in the replacement value
      const escapedValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      // Replace {{placeholderName}} with the value
      // PowerPoint placeholders may span multiple a:t elements, so we need to handle this carefully
      const placeholderPattern = new RegExp(
        `\\{\\{${placeholderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`,
        'g'
      );
      xmlContent = xmlContent.replace(placeholderPattern, escapedValue);
    }

    // Update the file in the ZIP
    zip.file(xmlPath, xmlContent);
  }

  /**
   * Insert chart images into presentation
   * 
   * Downloads the .pptx file, unzips it, inserts chart images into slides,
   * updates relationships, re-zips it, and uploads the modified presentation back to OneDrive.
   */
  async insertCharts(
    documentId: string,
    template: DocumentTemplate,
    generatedCharts: Record<string, Buffer>,
    auth: DocumentAuthToken
  ): Promise<void> {
    if (Object.keys(generatedCharts).length === 0) {
      return; // No charts to insert
    }

    return this.executeWithRetry(async () => {
      try {
        // Step 1: Download presentation content
        const downloadResponse = await axios.get(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
            responseType: 'arraybuffer',
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        const pptxBuffer = Buffer.from(downloadResponse.data);

        // Step 2: Unzip .pptx file
        const zip = await JSZip.loadAsync(pptxBuffer);

        // Step 3: Process each chart placeholder
        const chartPlaceholders = (template.placeholders || []).filter(
          p => p.type === 'chart' && generatedCharts[p.name]
        );

        if (chartPlaceholders.length === 0) {
          return; // No chart placeholders found
        }

        // Step 4: Process each slide
        const slideFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
        );

        for (const slideFile of slideFiles) {
          // Extract slide number from filename (e.g., "ppt/slides/slide1.xml" -> "1")
          const slideMatch = slideFile.match(/slide(\d+)\.xml$/);
          if (!slideMatch) {
            continue;
          }
          const slideNumber = slideMatch[1];
          const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;

          // Get or create relationships file for this slide
          const relsXml = await zip.file(relsFile)?.async('string') || this.getDefaultRelsXml();
          const rels = await parseXml(relsXml);
          const relationshipId = this.getNextRelationshipId(rels);

          // Insert charts in this slide
          await this.insertChartsInSlideXml(
            zip,
            slideFile,
            relsFile,
            chartPlaceholders,
            generatedCharts,
            rels,
            relationshipId
          );

          // Update relationships file
          const builder = new Builder({ headless: true });
          const updatedRelsXml = builder.buildObject(rels);
          zip.file(relsFile, updatedRelsXml);
        }

        // Step 5: Re-zip the presentation
        const modifiedPptxBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        // Step 6: Upload modified presentation back to OneDrive
        await axios.put(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          modifiedPptxBuffer,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            },
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        this.monitoring.trackEvent('content_generation.rewriter.charts_inserted', {
          documentId,
          chartCount: chartPlaceholders.length,
          format: 'powerpoint',
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.insertCharts',
          format: 'powerpoint',
          documentId,
        });
        throw new Error(`Failed to insert charts in Microsoft PowerPoint presentation: ${(error as Error).message}`);
      }
    }, 'insert_charts');
  }

  /**
   * Insert charts into a slide XML file
   */
  private async insertChartsInSlideXml(
    zip: JSZip,
    slideFile: string,
    _relsFile: string,
    chartPlaceholders: any[],
    generatedCharts: Record<string, Buffer>,
    rels: any,
    relationshipId: { current: number }
  ): Promise<void> {
    const xmlFile = zip.file(slideFile);
    if (!xmlFile) {
      return; // File doesn't exist, skip
    }

    let xmlContent = await xmlFile.async('string');

    // Process each chart placeholder
    for (const placeholder of chartPlaceholders) {
      const chartImage = generatedCharts[placeholder.name];
      if (!chartImage) {
        continue;
      }

      const placeholderText = `{{${placeholder.name}}}`;
      
      // Find and replace placeholder with image
      if (xmlContent.includes(placeholderText)) {
        // Generate unique image filename
        const imageId = uuidv4();
        const imageFileName = `image${imageId.substring(0, 8)}.png`;
        const mediaPath = `ppt/media/${imageFileName}`;

        // Add image to ZIP
        zip.file(mediaPath, chartImage);

        // Add relationship
        const relId = `rId${relationshipId.current++}`;
        if (!rels.Relationships) {
          rels.Relationships = { $: { xmlns: 'http://schemas.openxmlformats.org/package/2006/relationships' }, Relationship: [] };
        }
        if (!rels.Relationships.Relationship) {
          rels.Relationships.Relationship = [];
        }
        rels.Relationships.Relationship.push({
          $: {
            Id: relId,
            Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
            Target: `../media/${imageFileName}`,
          },
        });

        // Create image picture XML for PowerPoint
        const imagePictureXml = this.createImagePictureXml(relId, 400, 300); // Default size: 400x300 points

        // Replace placeholder with image picture
        xmlContent = xmlContent.replace(
          new RegExp(placeholderText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          imagePictureXml
        );
      }
    }

    // Update the file in the ZIP
    zip.file(slideFile, xmlContent);
  }

  /**
   * Create image picture XML for PowerPoint slide
   */
  private createImagePictureXml(relId: string, width: number, height: number): string {
    // PowerPoint uses EMU (English Metric Units) for dimensions: 1 point = 12700 EMU
    const widthEmu = width * 12700;
    const heightEmu = height * 12700;

    return `<p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:nvPicPr>
        <p:cNvPr id="0" name="Chart"/>
        <p:cNvPicPr>
          <a:picLocks noChangeAspect="1"/>
        </p:cNvPicPr>
        <p:nvPr/>
      </p:nvPicPr>
      <p:blipFill>
        <a:blip r:embed="${relId}"/>
        <a:stretch>
          <a:fillRect/>
        </a:stretch>
      </p:blipFill>
      <p:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
      </p:spPr>
    </p:pic>`;
  }

  /**
   * Get default relationships XML structure
   */
  private getDefaultRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
  }

  /**
   * Get next available relationship ID
   */
  private getNextRelationshipId(rels: any): { current: number } {
    let maxId = 0;
    if (rels.Relationships && rels.Relationships.Relationship) {
      const relationships = Array.isArray(rels.Relationships.Relationship)
        ? rels.Relationships.Relationship
        : [rels.Relationships.Relationship];
      
      for (const rel of relationships) {
        if (rel.$ && rel.$.Id) {
          const match = rel.$.Id.match(/^rId(\d+)$/);
          if (match) {
            const id = parseInt(match[1], 10);
            if (id > maxId) {
              maxId = id;
            }
          }
        }
      }
    }
    return { current: maxId + 1 };
  }

  /**
   * Get document URL
   */
  async getDocumentUrl(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      const response = await axios.get(
        `${this.graphApiBaseUrl}/me/drive/items/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          timeout: this.config.apiRequestTimeoutMs,
        }
      );

      return response.data.webUrl || `https://onedrive.live.com/edit.aspx?id=${documentId}`;
    }, 'get_url').catch((error) => {
      this.monitoring.trackException(error as Error, {
        operation: 'rewriter.get_url',
        format: 'powerpoint',
        documentId,
      });
      throw new Error(`Failed to get presentation URL: ${(error as Error).message}`);
    });
  }

  /**
   * Get folder path
   */
  async getFolderPath(
    folderId: string,
    auth: DocumentAuthToken
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      const response = await axios.get(
        `${this.graphApiBaseUrl}/me/drive/items/${folderId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          timeout: this.config.apiRequestTimeoutMs,
        }
      );

      // Return folder name or path
      return response.data.name || response.data.webUrl || '';
    }, 'get_folder_path').catch((error) => {
      this.monitoring.trackException(error as Error, {
        operation: 'rewriter.get_folder_path',
        format: 'powerpoint',
        folderId,
      });
      throw new Error(`Failed to get folder path: ${(error as Error).message}`);
    });
  }

  /**
   * Delete a document (for cleanup on failure)
   */
  async deleteDocument(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      try {
        await axios.delete(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}`,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        this.monitoring.trackEvent('content_generation.rewriter.deleted', {
          documentId,
          format: 'powerpoint',
        });
      } catch (error: any) {
        // If document doesn't exist (404), that's okay - it's already deleted
        if (error.response?.status === 404) {
          this.monitoring.trackEvent('content_generation.rewriter.delete_not_found', {
            documentId,
            format: 'powerpoint',
          });
          return;
        }

        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.delete',
          format: 'powerpoint',
          documentId,
        });
        throw new Error(`Failed to delete PowerPoint presentation: ${(error as Error).message}`);
      }
    }, 'delete');
  }
}

