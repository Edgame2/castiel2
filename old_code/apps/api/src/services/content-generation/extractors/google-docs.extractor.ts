// @ts-nocheck - Content generation service, not used by workers
/**
 * Google Docs Document Extractor
 * 
 * Extracts placeholders from Google Docs documents using Google Docs API
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { google, docs_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../config/env.js';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import {
  ExtractionRequest,
  DocumentParseResult,
  DocumentElement,
} from '../types/extraction.types.js';

export class GoogleDocsExtractor extends BaseDocumentExtractor {
  private docsClient: docs_v1.Docs | null = null;
  private driveClient: any = null;
  private oauth2Client: OAuth2Client | null = null;

  constructor(
    monitoring: IMonitoringProvider,
    extractionService: PlaceholderExtractionService
  ) {
    super(monitoring, extractionService);
  }

  /**
   * Initialize Google API clients
   */
  private async initializeClients(auth: DocumentAuthToken): Promise<void> {
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

    // Initialize API clients
    this.docsClient = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<DocumentMetadata> {
    await this.initializeClients(auth);

    try {
      // Get document metadata
      const document = await this.docsClient!.documents.get({
        documentId,
        fields: 'documentId,title,revisionId',
      });

      // Get Drive file metadata for additional info
      let fileMetadata: any = null;
      try {
        fileMetadata = await this.driveClient!.files.get({
          fileId: documentId,
          fields: 'name,mimeType,size,modifiedTime,webViewLink',
        });
      } catch (error) {
        // Drive API might not have access, continue with Docs API data only
        this.monitoring.trackEvent('content_generation.extractor.drive_metadata_failed', {
          documentId,
        });
      }

      return {
        id: documentId,
        name: document.data.title || fileMetadata?.data?.name || 'Untitled Document',
        format: 'google_docs',
        url: fileMetadata?.data?.webViewLink || `https://docs.google.com/document/d/${documentId}`,
        modifiedTime: fileMetadata?.data?.modifiedTime
          ? new Date(fileMetadata.data.modifiedTime)
          : undefined,
        size: fileMetadata?.data?.size ? parseInt(fileMetadata.data.size, 10) : undefined,
        mimeType: fileMetadata?.data?.mimeType || 'application/vnd.google-apps.document',
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.getMetadata',
        format: 'google_docs',
        documentId,
      });
      throw new Error(`Failed to get Google Docs metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Parse document and extract text content
   */
  async parseDocument(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<DocumentParseResult> {
    await this.initializeClients(auth);

    const elements: DocumentElement[] = [];
    let fullText = '';

    try {
      // Get full document
      const document = await this.docsClient!.documents.get({
        documentId,
        fields: 'body,title',
      });

      const body = document.data.body;
      if (!body || !body.content) {
        return {
          format: 'google_docs',
          textContent: '',
          elements: [],
          metadata: {
            extractedAt: new Date().toISOString(),
          },
        };
      }

      let pageIndex = 0;
      let paragraphIndex = 0;

      // Extract from body content
      for (const element of body.content) {
        // Extract from paragraphs
        if (element.paragraph) {
          const paragraph = element.paragraph;
          const text = this.extractTextFromParagraph(paragraph);
          
          if (text.trim()) {
            fullText += text + '\n';

            // Determine element type (header vs paragraph)
            const namedStyleType = paragraph.paragraphStyle?.namedStyleType || '';
            const isHeader = namedStyleType.startsWith('HEADING');
            const elementType: DocumentElement['type'] = isHeader ? 'header' : 'paragraph';

            elements.push({
              id: `para-${paragraphIndex}`,
              type: elementType,
              content: text,
              location: {
                pageIndex: pageIndex + 1,
              },
              style: this.extractStyleFromParagraph(paragraph),
            });

            paragraphIndex++;
          }
        }

        // Extract from tables
        if (element.table) {
          const table = element.table;
          const tableText = this.extractTextFromTable(table);
          
          if (tableText.trim()) {
            fullText += tableText + '\n';

            elements.push({
              id: `table-${elements.length}`,
              type: 'table',
              content: tableText,
              location: {
                pageIndex: pageIndex + 1,
              },
            });
          }
        }

        // Increment page index (approximate - Google Docs doesn't have explicit page breaks in API)
        // We'll use paragraph count as a proxy
        if (element.paragraph && paragraphIndex > 0 && paragraphIndex % 20 === 0) {
          pageIndex++;
        }
      }

      return {
        format: 'google_docs',
        textContent: fullText,
        elements,
        metadata: {
          pageCount: pageIndex + 1,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.parseDocument',
        format: 'google_docs',
        documentId,
      });
      throw new Error(`Failed to parse Google Docs document: ${(error as Error).message}`);
    }
  }

  /**
   * Extract colors from document theme
   */
  protected async extractColors(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<string[]> {
    await this.initializeClients(auth);

    try {
      // Get document with styling information
      const document = await this.docsClient!.documents.get({
        documentId,
        fields: 'documentStyle',
      });

      const colors: Set<string> = new Set();
      const documentStyle = document.data.documentStyle;

      // Extract background color
      if (documentStyle?.background?.color) {
        const hex = this.rgbToHex(documentStyle.background.color);
        if (hex) {
          colors.add(hex);
        }
      }

      // Extract colors from default paragraph styles
      if (documentStyle?.defaultParagraphStyle?.paragraphStyle) {
        const paraStyle = documentStyle.defaultParagraphStyle.paragraphStyle;
        
        // Extract text color
        if (paraStyle.foregroundColor) {
          const hex = this.rgbToHex(paraStyle.foregroundColor);
          if (hex) {
            colors.add(hex);
          }
        }
      }

      // Extract colors from named styles (if available)
      // Note: Named styles are not directly accessible via API, but we can extract from paragraph styles
      // This is a simplified approach - full color extraction would require parsing all paragraphs

      // Convert to array and limit to 6 colors
      const colorArray = Array.from(colors).slice(0, 6);

      this.monitoring.trackEvent('content_generation.extractor.colors_extracted', {
        documentId,
        colorCount: colorArray.length,
      });

      return colorArray;
    } catch (error) {
      this.monitoring.trackEvent('content_generation.extractor.colors_failed', {
        documentId,
        error: (error as Error).message,
      });
      // Return empty array if color extraction fails
      return [];
    }
  }

  /**
   * Extract text from paragraph
   */
  private extractTextFromParagraph(paragraph: docs_v1.Schema$Paragraph): string {
    if (!paragraph.elements) {
      return '';
    }

    return paragraph.elements
      .map((el) => el.textRun?.content || '')
      .join('');
  }

  /**
   * Extract text from table
   */
  private extractTextFromTable(table: docs_v1.Schema$Table): string {
    const rows: string[] = [];

    for (const row of table.tableRows || []) {
      const cells: string[] = [];

      for (const cell of row.tableCells || []) {
        // Extract text from cell content
        const cellText = this.extractTextFromCellContent(cell.content || []);
        cells.push(cellText);
      }

      rows.push(cells.join(' | '));
    }

    return rows.join('\n');
  }

  /**
   * Extract text from cell content (array of structural elements)
   */
  private extractTextFromCellContent(content: docs_v1.Schema$StructuralElement[]): string {
    let text = '';

    for (const element of content) {
      if (element.paragraph) {
        text += this.extractTextFromParagraph(element.paragraph);
      }
    }

    return text.trim();
  }

  /**
   * Extract style from paragraph
   */
  private extractStyleFromParagraph(paragraph: docs_v1.Schema$Paragraph): DocumentElement['style'] {
    const paragraphStyle = paragraph.paragraphStyle;
    const firstTextRun = paragraph.elements?.[0]?.textRun;
    const textStyle = firstTextRun?.textStyle;

    return {
      fontFamily: textStyle?.weightedFontFamily?.fontFamily,
      fontSize: textStyle?.fontSize?.magnitude
        ? Math.round(textStyle.fontSize.magnitude / 12700) // Convert EMU to points
        : undefined,
      color: textStyle?.foregroundColor
        ? this.rgbToHex(textStyle.foregroundColor)
        : undefined,
      bold: textStyle?.bold,
      italic: textStyle?.italic,
    };
  }

  /**
   * Convert RGB color to hex
   */
  private rgbToHex(color: docs_v1.Schema$OptionalColor): string | undefined {
    if (color.rgbColor) {
      const r = Math.round((color.rgbColor.red || 0) * 255);
      const g = Math.round((color.rgbColor.green || 0) * 255);
      const b = Math.round((color.rgbColor.blue || 0) * 255);
      return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
    return undefined;
  }
}











