// @ts-nocheck - Content generation service, not used by workers
/**
 * Microsoft PowerPoint Document Extractor
 * 
 * Extracts placeholders from Microsoft PowerPoint presentations stored in OneDrive
 * Uses Microsoft Graph API to download and parse .pptx files
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import axios from 'axios';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { BaseDocumentExtractor, DocumentAuthToken, DocumentMetadata } from './base-extractor.js';
import { PlaceholderExtractionService } from '../services/placeholder-extraction.service.js';
import {
  ExtractionRequest,
  DocumentParseResult,
  DocumentElement,
} from '../types/extraction.types.js';

const parseXml = promisify(parseString);

export class MicrosoftPowerPointExtractor extends BaseDocumentExtractor {
  private graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    monitoring: IMonitoringProvider,
    extractionService: PlaceholderExtractionService
  ) {
    super(monitoring, extractionService);
  }

  /**
   * Get document metadata from Microsoft Graph API
   */
  async getDocumentMetadata(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<DocumentMetadata> {
    try {
      const response = await axios.get(
        `${this.graphApiBaseUrl}/me/drive/items/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      const item = response.data;

      return {
        id: item.id,
        name: item.name,
        format: 'powerpoint',
        url: item.webUrl,
        modifiedTime: item.lastModifiedDateTime
          ? new Date(item.lastModifiedDateTime)
          : undefined,
        size: item.size,
        mimeType: item.file?.mimeType || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'microsoft_powerpoint.get_metadata',
        documentId,
      });
      throw new Error(`Failed to get document metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Download presentation from OneDrive
   */
  private async downloadPresentation(
    documentId: string,
    auth: DocumentAuthToken
  ): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'microsoft_powerpoint.download',
        documentId,
      });
      throw new Error(`Failed to download presentation: ${(error as Error).message}`);
    }
  }

  /**
   * Parse PowerPoint presentation and extract text content
   * 
   * Parses .pptx files (ZIP archives containing XML files) to extract text and placeholders.
   * Structure:
   * - ppt/presentation.xml: Presentation metadata and slide list
   * - ppt/slides/slide*.xml: Individual slide content
   * - ppt/notesSlides/notesSlide*.xml: Speaker notes
   */
  async parseDocument(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<DocumentParseResult> {
    try {
      // Step 1: Download presentation
      const presentationBuffer = await this.downloadPresentation(documentId, auth);

      // Step 2: Unzip .pptx file
      const zip = await JSZip.loadAsync(presentationBuffer);

      const elements: DocumentElement[] = [];
      let fullText = '';

      // Step 3: Get slide list from presentation.xml
      const presentationXml = zip.file('ppt/presentation.xml');
      if (!presentationXml) {
        throw new Error('Presentation XML not found in .pptx file');
      }

      const presContent = await presentationXml.async('string');
      const presParsed = await parseXml(presContent);
      
      // Extract slide IDs from presentation.xml
      // Structure: p:presentation -> p:sldIdLst -> p:sldId -> @r:id
      const slideIds: string[] = [];
      const sldIdLst = presParsed['p:presentation']?.['p:sldIdLst']?.[0]?.['p:sldId'];
      if (sldIdLst) {
        for (const sldId of sldIdLst) {
          const slideRelId = sldId['$']?.['r:id'];
          if (slideRelId) {
            slideIds.push(slideRelId);
          }
        }
      }

      // Step 4: Parse each slide
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      ).sort(); // Sort to maintain slide order

      for (let slideIndex = 0; slideIndex < slideFiles.length; slideIndex++) {
        const slideFile = slideFiles[slideIndex];
        const slideXml = zip.file(slideFile);
        
        if (slideXml) {
          const xmlContent = await slideXml.async('string');
          const parsed = await parseXml(xmlContent);
          const extracted = this.extractTextFromSlideXml(parsed, slideIndex + 1);
          
          fullText += extracted.text + '\n';
          elements.push(...extracted.elements);
        }
      }

      // Step 5: Parse speaker notes (optional)
      const notesFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/notesSlides/notesSlide') && name.endsWith('.xml')
      );
      
      for (let notesIndex = 0; notesIndex < notesFiles.length; notesIndex++) {
        const notesFile = notesFiles[notesIndex];
        const notesXml = zip.file(notesFile);
        
        if (notesXml) {
          const xmlContent = await notesXml.async('string');
          const parsed = await parseXml(xmlContent);
          const extracted = this.extractTextFromNotesXml(parsed, notesIndex + 1);
          
          fullText += extracted.text + '\n';
          elements.push(...extracted.elements);
        }
      }

      this.monitoring.trackEvent('content_generation.microsoft_powerpoint.parsed', {
        documentId,
        slideCount: slideFiles.length,
        elementCount: elements.length,
        textLength: fullText.length,
      });

      return {
        format: 'powerpoint',
        textContent: fullText,
        elements,
        metadata: {
          slideCount: slideFiles.length,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'extractor.parseDocument',
        format: 'powerpoint',
        documentId,
      });
      throw new Error(`Failed to parse Microsoft PowerPoint presentation: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text from a slide XML file
   * PowerPoint XML uses a: namespace for drawing elements (a:t for text)
   */
  private extractTextFromSlideXml(
    parsed: any,
    slideIndex: number
  ): { text: string; elements: DocumentElement[] } {
    const elements: DocumentElement[] = [];
    let fullText = '';

    // Navigate through PowerPoint XML structure
    // Structure: p:sld -> p:cSld -> p:spTree -> p:sp (shapes) -> p:txBody -> a:p -> a:r -> a:t (text)
    const cSld = parsed['p:sld']?.['p:cSld']?.[0];
    if (!cSld) {
      return { text: '', elements: [] };
    }

    const spTree = cSld['p:spTree']?.[0];
    if (!spTree) {
      return { text: '', elements: [] };
    }

    let elementIndex = 0;

    // Process shapes (p:sp)
    if (spTree['p:sp']) {
      for (const shape of spTree['p:sp']) {
        const shapeId = shape['$']?.['id'] || `shape-${elementIndex}`;
        const shapeText = this.extractTextFromPowerPointShape(shape);
        
        if (shapeText.trim()) {
          fullText += shapeText + '\n';

          // Determine element type based on shape properties
          const elementType: DocumentElement['type'] = 'textBox'; // Default to textBox

          elements.push({
            id: shapeId,
            type: elementType,
            content: shapeText,
            location: {
              slideIndex,
            },
          });

          elementIndex++;
        }
      }
    }

    // Process tables (p:graphicFrame with a:graphic)
    if (spTree['p:graphicFrame']) {
      for (const graphicFrame of spTree['p:graphicFrame']) {
        const tableText = this.extractTextFromPowerPointTable(graphicFrame);
        
        if (tableText.trim()) {
          fullText += tableText + '\n';

          elements.push({
            id: `table-${elementIndex}`,
            type: 'table',
            content: tableText,
            location: {
              slideIndex,
            },
          });

          elementIndex++;
        }
      }
    }

    return { text: fullText, elements };
  }

  /**
   * Extract text from a PowerPoint shape (p:sp element)
   */
  private extractTextFromPowerPointShape(shape: any): string {
    const textParts: string[] = [];

    // Shape contains text body (p:txBody) with paragraphs (a:p) containing runs (a:r) with text (a:t)
    const txBody = shape['p:txBody']?.[0];
    if (!txBody) {
      return '';
    }

    if (txBody['a:p']) {
      for (const paragraph of txBody['a:p']) {
        if (paragraph['a:r']) {
          for (const run of paragraph['a:r']) {
            // Text is in a:t elements
            if (run['a:t']) {
              for (const textNode of run['a:t']) {
                const text = typeof textNode === 'string' ? textNode : textNode._ || textNode['_'] || '';
                if (text) {
                  textParts.push(text);
                }
              }
            }
          }
        }
      }
    }

    return textParts.join('');
  }

  /**
   * Extract text from a PowerPoint table (p:graphicFrame element)
   */
  private extractTextFromPowerPointTable(graphicFrame: any): string {
    const rows: string[] = [];

    // Navigate to table structure: p:graphicFrame -> a:graphic -> a:graphicData -> a:tbl
    const graphic = graphicFrame['a:graphic']?.[0]?.['a:graphicData']?.[0];
    if (!graphic) {
      return '';
    }

    const tbl = graphic['a:tbl']?.[0];
    if (!tbl) {
      return '';
    }

    // Table contains rows (a:tr)
    if (tbl['a:tr']) {
      for (const row of tbl['a:tr']) {
        const cells: string[] = [];

        // Row contains cells (a:tc)
        if (row['a:tc']) {
          for (const cell of row['a:tc']) {
            const cellText = this.extractTextFromPowerPointCell(cell);
            cells.push(cellText);
          }
        }

        rows.push(cells.join('\t')); // Tab-separated for table cells
      }
    }

    return rows.join('\n');
  }

  /**
   * Extract text from a PowerPoint table cell (a:tc element)
   */
  private extractTextFromPowerPointCell(cell: any): string {
    const textParts: string[] = [];

    // Cell contains text body (a:txBody) with paragraphs
    const txBody = cell['a:txBody']?.[0];
    if (!txBody) {
      return '';
    }

    if (txBody['a:p']) {
      for (const paragraph of txBody['a:p']) {
        if (paragraph['a:r']) {
          for (const run of paragraph['a:r']) {
            if (run['a:t']) {
              for (const textNode of run['a:t']) {
                const text = typeof textNode === 'string' ? textNode : textNode._ || textNode['_'] || '';
                if (text) {
                  textParts.push(text);
                }
              }
            }
          }
        }
      }
    }

    return textParts.join(' ');
  }

  /**
   * Extract text from speaker notes XML
   */
  private extractTextFromNotesXml(
    parsed: any,
    slideIndex: number
  ): { text: string; elements: DocumentElement[] } {
    const elements: DocumentElement[] = [];
    let fullText = '';

    // Notes structure: p:notes -> p:cSld -> p:spTree -> p:sp (shapes) -> text
    const cSld = parsed['p:notes']?.['p:cSld']?.[0];
    if (!cSld) {
      return { text: '', elements: [] };
    }

    const spTree = cSld['p:spTree']?.[0];
    if (!spTree) {
      return { text: '', elements: [] };
    }

    // Extract text from shapes in notes
    if (spTree['p:sp']) {
      for (const shape of spTree['p:sp']) {
        const notesText = this.extractTextFromPowerPointShape(shape);
        
        if (notesText.trim()) {
          fullText += notesText + '\n';

          elements.push({
            id: `notes-${slideIndex}`,
            type: 'notes',
            content: notesText,
            location: {
              slideIndex,
            },
          });
        }
      }
    }

    return { text: fullText, elements };
  }

  /**
   * Extract colors from PowerPoint theme
   * PowerPoint presentations store theme colors in ppt/theme/theme*.xml
   */
  protected async extractColors(
    documentId: string,
    auth: DocumentAuthToken,
    request: ExtractionRequest
  ): Promise<string[]> {
    try {
      // Download presentation
      const presentationBuffer = await this.downloadPresentation(documentId, auth);
      const zip = await JSZip.loadAsync(presentationBuffer);

      const colors: Set<string> = new Set();

      // Try to read theme files
      const themeFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/theme/theme') && name.endsWith('.xml')
      );

      for (const themeFile of themeFiles) {
        const themeXml = zip.file(themeFile);
        if (themeXml) {
          const xmlContent = await themeXml.async('string');
          const parsed = await parseXml(xmlContent);
          
          // Extract colors from theme XML
          // Theme structure: a:theme -> a:themeElements -> a:colorScheme
          const colorScheme = parsed['a:theme']?.['a:themeElements']?.[0]?.['a:colorScheme']?.[0];
          if (colorScheme) {
            // Extract accent colors
            const accentColors = [
              colorScheme['a:accent1']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
              colorScheme['a:accent2']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
              colorScheme['a:accent3']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
              colorScheme['a:accent4']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
              colorScheme['a:accent5']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
              colorScheme['a:accent6']?.[0]?.['a:srgbClr']?.[0]?.['$']?.['val'],
            ].filter(Boolean);

            for (const color of accentColors) {
              if (color && /^[0-9A-Fa-f]{6}$/.test(color)) {
                colors.add(`#${color}`);
              }
            }
          }
        }
      }

      const colorArray = Array.from(colors).slice(0, 6);

      this.monitoring.trackEvent('content_generation.extractor.colors_extracted', {
        documentId,
        colorCount: colorArray.length,
        format: 'powerpoint',
      });

      return colorArray;
    } catch (error) {
      this.monitoring.trackEvent('content_generation.extractor.colors_failed', {
        documentId,
        error: (error as Error).message,
        format: 'powerpoint',
      });
      // Return empty array if color extraction fails
      return [];
    }
  }
}

