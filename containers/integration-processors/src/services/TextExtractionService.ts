/**
 * Text Extraction Service
 * Extracts text from various document formats (PDF, DOCX, XLSX, TXT, HTML)
 * @module integration-processors/services
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface TextExtractionResult {
  text: string;
  wordCount: number;
  pageCount?: number;
  language?: string;
  metadata?: {
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Text Extraction Service
 */
export class TextExtractionService {
  /**
   * Extract text from document buffer based on MIME type
   */
  async extractText(
    buffer: Buffer,
    mimeType: string,
    documentType?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'html' | 'image' | 'other'
  ): Promise<TextExtractionResult> {
    const detectedType = documentType || this.detectDocumentType(mimeType);

    try {
      switch (detectedType) {
        case 'pdf':
          return await this.extractFromPDF(buffer);
        case 'docx':
          return await this.extractFromDOCX(buffer);
        case 'xlsx':
          return await this.extractFromXLSX(buffer);
        case 'txt':
          return await this.extractFromTXT(buffer);
        case 'html':
          return await this.extractFromHTML(buffer);
        case 'image':
          // Images require OCR - will be handled separately
          throw new Error('Image OCR not yet implemented - use Azure Computer Vision');
        default:
          throw new Error(`Unsupported document type: ${detectedType}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to extract text from ${detectedType}: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text,
        wordCount: this.countWords(data.text),
        pageCount: data.numpages,
        language: data.info?.Language || undefined,
        metadata: {
          author: data.info?.Author,
          title: data.info?.Title,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        },
      };
    } catch (error: any) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX
   */
  private async extractFromDOCX(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        wordCount: this.countWords(result.value),
        metadata: {
          // DOCX metadata extraction would require additional parsing
          // For now, we extract text only
        },
      };
    } catch (error: any) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from XLSX
   */
  private async extractFromXLSX(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets: string[] = [];

      // Extract text from all sheets
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_csv(sheet);
        sheets.push(`Sheet: ${sheetName}\n${sheetData}`);
      }

      const text = sheets.join('\n\n');

      return {
        text,
        wordCount: this.countWords(text),
        metadata: {
          // XLSX metadata could include sheet names, author, etc.
        },
      };
    } catch (error: any) {
      throw new Error(`XLSX parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT
   */
  private async extractFromTXT(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const text = buffer.toString('utf-8');

      return {
        text,
        wordCount: this.countWords(text),
      };
    } catch (error: any) {
      throw new Error(`TXT parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from HTML
   */
  private async extractFromHTML(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const html = buffer.toString('utf-8');
      
      // Simple HTML text extraction (remove tags)
      // For better extraction, consider using cheerio or similar
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/&#39;/g, "'") // Replace &#39; with '
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return {
        text,
        wordCount: this.countWords(text),
      };
    } catch (error: any) {
      throw new Error(`HTML parsing failed: ${error.message}`);
    }
  }

  /**
   * Detect document type from MIME type
   */
  private detectDocumentType(mimeType: string): 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'html' | 'image' | 'other' {
    const mimeTypeLower = mimeType.toLowerCase();

    if (mimeTypeLower.includes('pdf')) return 'pdf';
    if (mimeTypeLower.includes('wordprocessingml') || mimeTypeLower.includes('msword')) return 'docx';
    if (mimeTypeLower.includes('spreadsheetml') || mimeTypeLower.includes('excel')) return 'xlsx';
    if (mimeTypeLower.includes('presentationml') || mimeTypeLower.includes('powerpoint')) return 'pptx';
    if (mimeTypeLower.includes('text/plain')) return 'txt';
    if (mimeTypeLower.includes('text/html') || mimeTypeLower.includes('html')) return 'html';
    if (mimeTypeLower.startsWith('image/')) return 'image';

    return 'other';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
}
