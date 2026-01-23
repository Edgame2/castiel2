// @ts-nocheck - Content generation service, not used by workers
/**
 * Microsoft Word Document Rewriter
 * 
 * Rewrites Microsoft Word documents by replacing placeholders and inserting charts
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

export class MicrosoftWordRewriter extends BaseDocumentRewriter {
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
              format: 'word',
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
            format: 'word',
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
              format: 'word',
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
            format: 'word',
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
              format: 'word',
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
            format: 'word',
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
   * Duplicate document to user's folder
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
        throw new Error('Failed to find copied document');
      }

      const newItem = items[0];
      const url = newItem.webUrl || `https://onedrive.live.com/edit.aspx?id=${newItem.id}`;

      this.monitoring.trackEvent('content_generation.rewriter.duplicated', {
        sourceId: sourceDocumentId,
        newId: newItem.id,
        format: 'word',
      });

      return {
        documentId: newItem.id,
        url,
      };
    }, 'duplicate');
  }

  /**
   * Replace text placeholders in document
   * 
   * Downloads the .docx file, unzips it, replaces placeholders in XML files,
   * re-zips it, and uploads the modified document back to OneDrive.
   */
  async replacePlaceholders(
    documentId: string,
    _template: DocumentTemplate,
    generatedValues: Record<string, string>,
    auth: DocumentAuthToken
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      try {
        // Step 1: Download document content
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

        const docxBuffer = Buffer.from(downloadResponse.data);

        // Step 2: Unzip .docx file
        const zip = await JSZip.loadAsync(docxBuffer);

        // Step 3: Replace placeholders in XML files
        // Process main document
        await this.replacePlaceholdersInXmlFile(zip, 'word/document.xml', generatedValues);
        
        // Process headers
        const headerFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('word/header') && name.endsWith('.xml')
        );
        for (const headerFile of headerFiles) {
          await this.replacePlaceholdersInXmlFile(zip, headerFile, generatedValues);
        }

        // Process footers
        const footerFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('word/footer') && name.endsWith('.xml')
        );
        for (const footerFile of footerFiles) {
          await this.replacePlaceholdersInXmlFile(zip, footerFile, generatedValues);
        }

        // Step 4: Re-zip the document
        const modifiedDocxBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        // Step 5: Upload modified document back to OneDrive
        // Use PUT to replace the existing file
        await axios.put(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          modifiedDocxBuffer,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        this.monitoring.trackEvent('content_generation.rewriter.placeholders_replaced', {
          documentId,
          placeholderCount: Object.keys(generatedValues).length,
          format: 'word',
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.replacePlaceholders',
          format: 'word',
          documentId,
        });
        throw new Error(`Failed to replace placeholders in Word document: ${(error as Error).message}`);
      }
    }, 'replace_placeholders');
  }

  /**
   * Replace placeholders in a single XML file within the ZIP
   */
  private async replacePlaceholdersInXmlFile(
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
      // Use a regex to match placeholders that may span multiple XML text nodes
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
   * Insert chart images into document
   * 
   * Downloads the .docx file, unzips it, inserts chart images into the document,
   * updates relationships, re-zips it, and uploads the modified document back to OneDrive.
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
        // Step 1: Download document content
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

        const docxBuffer = Buffer.from(downloadResponse.data);

        // Step 2: Unzip .docx file
        const zip = await JSZip.loadAsync(docxBuffer);

        // Step 3: Process each chart placeholder
        const chartPlaceholders = (template.placeholders || []).filter(
          p => p.type === 'chart' && generatedCharts[p.name]
        );

        if (chartPlaceholders.length === 0) {
          return; // No chart placeholders found
        }

        // Get or create relationships file
        const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') || this.getDefaultRelsXml();
        const rels = await parseXml(relsXml);
        const relationshipId = this.getNextRelationshipId(rels);

        // Process main document
        await this.insertChartsInXmlFile(
          zip,
          'word/document.xml',
          chartPlaceholders,
          generatedCharts,
          rels,
          relationshipId
        );

        // Process headers
        const headerFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('word/header') && name.endsWith('.xml')
        );
        for (const headerFile of headerFiles) {
          await this.insertChartsInXmlFile(
            zip,
            headerFile,
            chartPlaceholders,
            generatedCharts,
            rels,
            relationshipId
          );
        }

        // Process footers
        const footerFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('word/footer') && name.endsWith('.xml')
        );
        for (const footerFile of footerFiles) {
          await this.insertChartsInXmlFile(
            zip,
            footerFile,
            chartPlaceholders,
            generatedCharts,
            rels,
            relationshipId
          );
        }

        // Step 4: Update relationships file
        const builder = new Builder({ headless: true });
        const updatedRelsXml = builder.buildObject(rels);
        zip.file('word/_rels/document.xml.rels', updatedRelsXml);

        // Step 5: Re-zip the document
        const modifiedDocxBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        // Step 6: Upload modified document back to OneDrive
        await axios.put(
          `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
          modifiedDocxBuffer,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
            timeout: this.config.apiRequestTimeoutMs,
          }
        );

        this.monitoring.trackEvent('content_generation.rewriter.charts_inserted', {
          documentId,
          chartCount: chartPlaceholders.length,
          format: 'word',
        });
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.insertCharts',
          format: 'word',
          documentId,
        });
        throw new Error(`Failed to insert charts in Microsoft Word document: ${(error as Error).message}`);
      }
    }, 'insert_charts');
  }

  /**
   * Insert charts into a single XML file within the ZIP
   */
  private async insertChartsInXmlFile(
    zip: JSZip,
    xmlPath: string,
    chartPlaceholders: any[],
    generatedCharts: Record<string, Buffer>,
    rels: any,
    relationshipId: { current: number }
  ): Promise<void> {
    const xmlFile = zip.file(xmlPath);
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
        const mediaPath = `word/media/${imageFileName}`;

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
            Target: `media/${imageFileName}`,
          },
        });

        // Create image drawing XML
        const imageDrawingXml = this.createImageDrawingXml(relId, 400, 300); // Default size: 400x300 points

        // Replace placeholder with image drawing
        xmlContent = xmlContent.replace(
          new RegExp(placeholderText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          imageDrawingXml
        );
      }
    }

    // Update the file in the ZIP
    zip.file(xmlPath, xmlContent);
  }

  /**
   * Create image drawing XML for Word document
   */
  private createImageDrawingXml(relId: string, width: number, height: number): string {
    // Word uses EMU (English Metric Units) for dimensions: 1 point = 12700 EMU
    const widthEmu = width * 12700;
    const heightEmu = height * 12700;

    return `<w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="1" name="Chart"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="Chart"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>`;
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
    try {
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
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'rewriter.get_url',
        format: 'word',
        documentId,
      });
      throw new Error(`Failed to get document URL: ${(error as Error).message}`);
    }
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
        format: 'word',
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
          format: 'word',
        });
      } catch (error: any) {
        // If document doesn't exist (404), that's okay - it's already deleted
        if (error.response?.status === 404) {
          this.monitoring.trackEvent('content_generation.rewriter.delete_not_found', {
            documentId,
            format: 'word',
          });
          return;
        }

        this.monitoring.trackException(error as Error, {
          operation: 'rewriter.delete',
          format: 'word',
          documentId,
        });
        throw new Error(`Failed to delete Word document: ${(error as Error).message}`);
      }
    }, 'delete');
  }
}

