// @ts-nocheck - Content generation service, not used by workers
/**
 * Google Slides Document Extractor
 * 
 * Extracts placeholders from Google Slides presentations using Google Slides API
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { google, slides_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../config/env.js';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import {
  ExtractionRequest,
  DocumentParseResult,
  DocumentElement,
} from '../types/extraction.types.js';

export class GoogleSlidesExtractor extends BaseDocumentExtractor {
  private slidesClient: slides_v1.Slides | null = null;
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

    // Initialize API clients
    this.slidesClient = google.slides({ version: 'v1', auth: this.oauth2Client });
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
      // Get presentation metadata
      const presentation = await this.slidesClient!.presentations.get({
        presentationId: documentId,
        fields: 'presentationId,title,revisionId',
      });

      // Get Drive file metadata for additional info
      let fileMetadata: any = null;
      try {
        fileMetadata = await this.driveClient!.files.get({
          fileId: documentId,
          fields: 'name,mimeType,size,modifiedTime,webViewLink',
        });
      } catch (error) {
        // Drive API might not have access, continue with Slides API data only
        this.monitoring.trackEvent('content_generation.extractor.drive_metadata_failed', {
          documentId,
        });
      }

      return {
        id: documentId,
        name: presentation.data.title || fileMetadata?.data?.name || 'Untitled Presentation',
        format: 'google_slides',
        url: fileMetadata?.data?.webViewLink || `https://docs.google.com/presentation/d/${documentId}`,
        modifiedTime: fileMetadata?.data?.modifiedTime
          ? new Date(fileMetadata.data.modifiedTime)
          : undefined,
        size: fileMetadata?.data?.size ? parseInt(fileMetadata.data.size, 10) : undefined,
        mimeType: fileMetadata?.data?.mimeType || 'application/vnd.google-apps.presentation',
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.getMetadata',
        format: 'google_slides',
        documentId,
      });
      throw new Error(`Failed to get Google Slides metadata: ${(error as Error).message}`);
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
      // Get full presentation
      const presentation = await this.slidesClient!.presentations.get({
        presentationId: documentId,
        fields: 'slides,title',
      });

      const slides = presentation.data.slides || [];
      const slideCount = slides.length;

      // Extract from each slide
      for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
        const slide = slides[slideIndex];
        const slideId = slide.objectId!;
        const pageNumber = slideIndex + 1;

        // Get slide details
        const slideData = await this.slidesClient!.presentations.pages.get({
          presentationId: documentId,
          pageObjectId: slideId,
        });

        const pageElements = slideData.data.pageElements || [];

        // Extract from text elements
        for (const element of pageElements) {
          const elementId = element.objectId || '';
          const elementType = this.getElementType(element);

          // Extract text from shape
          if (element.shape?.text) {
            const textContent = this.extractTextFromShape(element.shape.text);
            
            if (textContent.trim()) {
              fullText += textContent + '\n';

              elements.push({
                id: elementId,
                type: elementType,
                content: textContent,
                location: {
                  slideIndex: pageNumber,
                  position: element.transform
                    ? {
                        x: element.transform.translateX?.magnitude || 0,
                        y: element.transform.translateY?.magnitude || 0,
                      }
                    : undefined,
                },
                style: this.extractStyle(element.shape),
              });
            }
          }

          // Extract from tables
          if (element.table) {
            const tableText = this.extractTextFromTable(element.table);
            
            if (tableText.trim()) {
              fullText += tableText + '\n';

              elements.push({
                id: elementId,
                type: 'table',
                content: tableText,
                location: {
                  slideIndex: pageNumber,
                  position: element.transform
                    ? {
                        x: element.transform.translateX?.magnitude || 0,
                        y: element.transform.translateY?.magnitude || 0,
                      }
                    : undefined,
                },
              });
            }
          }
        }

        // Extract from speaker notes (if requested)
        if (request.includeContext) {
          const notesPageId = slide.slideProperties?.notesPage?.notesPageId;
          if (notesPageId) {
            try {
              const notesData = await this.slidesClient!.presentations.pages.get({
                presentationId: documentId,
                pageObjectId: notesPageId,
              });

              const notesText = this.extractTextFromPageElements(
                notesData.data.pageElements || []
              );

              if (notesText.trim()) {
                fullText += notesText + '\n';

                elements.push({
                  id: `notes-${slideId}`,
                  type: 'notes',
                  content: notesText,
                  location: {
                    slideIndex: pageNumber,
                  },
                });
              }
            } catch (error) {
              // Notes might not be accessible, continue
              this.monitoring.trackEvent('content_generation.extractor.notes_failed', {
                documentId,
                slideIndex: pageNumber,
              });
            }
          }
        }
      }

      return {
        format: 'google_slides',
        textContent: fullText,
        elements,
        metadata: {
          slideCount,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.parseDocument',
        format: 'google_slides',
        documentId,
      });
      throw new Error(`Failed to parse Google Slides document: ${(error as Error).message}`);
    }
  }

  /**
   * Extract colors from presentation theme
   */
  protected async extractColors(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<string[]> {
    await this.initializeClients(auth);

    try {
      // Get presentation theme
      const presentation = await this.slidesClient!.presentations.get({
        presentationId: documentId,
        fields: 'presentationId,slides(pageElements(shape(shapeBackgroundFill)))',
      });

      const colors: Set<string> = new Set();
      const slides = presentation.data.slides || [];

      // Extract colors from slide backgrounds and shapes
      for (const slide of slides) {
        const pageElements = slide.pageElements || [];
        
        for (const element of pageElements) {
          if (element.shape?.shapeBackgroundFill) {
            const fill = element.shape.shapeBackgroundFill;
            
            // Extract solid fill color
            if (fill.solidFill?.color) {
              const color = fill.solidFill.color;
              const hex = this.rgbToHex(color);
              if (hex) {
                colors.add(hex);
              }
            }
          }
        }
      }

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
   * Extract text from shape text element
   */
  private extractTextFromShape(text: slides_v1.Schema$TextContent): string {
    if (!text.textElements) {
      return '';
    }

    return text.textElements
      .map((el) => el.textRun?.content || '')
      .join('');
  }

  /**
   * Extract text from table
   */
  private extractTextFromTable(table: slides_v1.Schema$Table): string {
    const rows: string[] = [];

    for (const row of table.tableRows || []) {
      const cells: string[] = [];

      for (const cell of row.tableCells || []) {
        const cellText = this.extractTextFromShape(cell.text || {});
        cells.push(cellText);
      }

      rows.push(cells.join(' | '));
    }

    return rows.join('\n');
  }

  /**
   * Extract text from page elements (for notes)
   */
  private extractTextFromPageElements(
    pageElements: slides_v1.Schema$PageElement[]
  ): string {
    let text = '';

    for (const element of pageElements) {
      if (element.shape?.text) {
        text += this.extractTextFromShape(element.shape.text) + '\n';
      }
    }

    return text.trim();
  }

  /**
   * Get element type from page element
   */
  private getElementType(element: slides_v1.Schema$PageElement): DocumentElement['type'] {
    if (element.shape) {
      if (element.shape.shapeType === 'TEXT_BOX') {
        return 'textBox';
      }
      return 'shape';
    }
    if (element.table) {
      return 'table';
    }
    return 'shape'; // Default
  }

  /**
   * Extract style from shape
   */
  private extractStyle(shape: slides_v1.Schema$Shape): DocumentElement['style'] {
    const textStyle = shape.text?.textStyle;
    
    return {
      fontFamily: textStyle?.fontFamily,
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
  private rgbToHex(color: slides_v1.Schema$OpaqueColor): string | undefined {
    if (color.rgbColor) {
      const r = Math.round((color.rgbColor.red || 0) * 255);
      const g = Math.round((color.rgbColor.green || 0) * 255);
      const b = Math.round((color.rgbColor.blue || 0) * 255);
      return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
    return undefined;
  }
}











