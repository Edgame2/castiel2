// @ts-nocheck - Content generation service, not used by workers
/**
 * Microsoft Word Document Extractor
 *
 * Extracts placeholders from Microsoft Word documents stored in OneDrive
 * Uses Microsoft Graph API to download and parse .docx files
 */
import axios from 'axios';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { BaseDocumentExtractor } from './base-extractor.js';
const parseXml = promisify(parseString);
export class MicrosoftWordExtractor extends BaseDocumentExtractor {
    graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
    constructor(monitoring, extractionService) {
        super(monitoring, extractionService);
    }
    /**
     * Get document metadata from Microsoft Graph API
     */
    async getDocumentMetadata(documentId, auth) {
        try {
            const response = await axios.get(`${this.graphApiBaseUrl}/me/drive/items/${documentId}`, {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                },
            });
            const item = response.data;
            return {
                id: item.id,
                name: item.name,
                format: 'word',
                url: item.webUrl,
                modifiedTime: item.lastModifiedDateTime
                    ? new Date(item.lastModifiedDateTime)
                    : undefined,
                size: item.size,
                mimeType: item.file?.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'microsoft_word.get_metadata',
                documentId,
            });
            throw new Error(`Failed to get document metadata: ${error.message}`);
        }
    }
    /**
     * Download document from OneDrive
     */
    async downloadDocument(documentId, auth) {
        try {
            const response = await axios.get(`${this.graphApiBaseUrl}/me/drive/items/${documentId}/content`, {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                },
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'microsoft_word.download',
                documentId,
            });
            throw new Error(`Failed to download document: ${error.message}`);
        }
    }
    /**
     * Parse Word document and extract text content
     *
     * Parses .docx files (ZIP archives containing XML files) to extract text and placeholders.
     * Structure:
     * - word/document.xml: Main document content
     * - word/header*.xml: Header content
     * - word/footer*.xml: Footer content
     */
    async parseDocument(documentId, auth, request) {
        try {
            // Step 1: Download document
            const documentBuffer = await this.downloadDocument(documentId, auth);
            // Step 2: Unzip .docx file
            const zip = await JSZip.loadAsync(documentBuffer);
            const elements = [];
            let fullText = '';
            const pageIndex = 0;
            let paragraphIndex = 0;
            // Step 3: Parse main document (word/document.xml)
            const documentXml = zip.file('word/document.xml');
            if (documentXml) {
                const xmlContent = await documentXml.async('string');
                const parsed = await parseXml(xmlContent);
                const extracted = this.extractTextFromWordXml(parsed, 'paragraph', pageIndex);
                fullText += extracted.text + '\n';
                elements.push(...extracted.elements);
                paragraphIndex += extracted.elements.length;
            }
            // Step 4: Parse headers (word/header*.xml)
            const headerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/header') && name.endsWith('.xml'));
            for (const headerFile of headerFiles) {
                const headerXml = zip.file(headerFile);
                if (headerXml) {
                    const xmlContent = await headerXml.async('string');
                    const parsed = await parseXml(xmlContent);
                    const extracted = this.extractTextFromWordXml(parsed, 'header', pageIndex);
                    fullText += extracted.text + '\n';
                    elements.push(...extracted.elements);
                }
            }
            // Step 5: Parse footers (word/footer*.xml)
            const footerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/footer') && name.endsWith('.xml'));
            for (const footerFile of footerFiles) {
                const footerXml = zip.file(footerFile);
                if (footerXml) {
                    const xmlContent = await footerXml.async('string');
                    const parsed = await parseXml(xmlContent);
                    const extracted = this.extractTextFromWordXml(parsed, 'footer', pageIndex);
                    fullText += extracted.text + '\n';
                    elements.push(...extracted.elements);
                }
            }
            // Estimate page count (rough approximation: ~500 words per page)
            const wordCount = fullText.split(/\s+/).length;
            const estimatedPageCount = Math.max(1, Math.ceil(wordCount / 500));
            this.monitoring.trackEvent('content_generation.microsoft_word.parsed', {
                documentId,
                elementCount: elements.length,
                textLength: fullText.length,
                estimatedPageCount,
            });
            return {
                format: 'word',
                textContent: fullText,
                elements,
                metadata: {
                    pageCount: estimatedPageCount,
                    extractedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'extractor.parseDocument',
                format: 'word',
                documentId,
            });
            throw new Error(`Failed to parse Microsoft Word document: ${error.message}`);
        }
    }
    /**
     * Extract text from Word XML structure
     * Word XML uses w: namespace for elements (w:p for paragraphs, w:t for text)
     */
    extractTextFromWordXml(parsed, elementType, pageIndex) {
        const elements = [];
        let fullText = '';
        // Navigate through Word XML structure
        // Structure: w:document -> w:body -> w:p (paragraphs) -> w:r (runs) -> w:t (text)
        const body = parsed['w:document']?.['w:body']?.[0];
        if (!body) {
            return { text: '', elements: [] };
        }
        let paragraphIndex = 0;
        // Process paragraphs
        if (body['w:p']) {
            for (const paragraph of body['w:p']) {
                const paragraphText = this.extractTextFromWordParagraph(paragraph);
                if (paragraphText.trim()) {
                    fullText += paragraphText + '\n';
                    elements.push({
                        id: `${elementType}-${paragraphIndex}`,
                        type: elementType,
                        content: paragraphText,
                        location: {
                            pageIndex: pageIndex + 1,
                        },
                    });
                    paragraphIndex++;
                }
            }
        }
        // Process tables
        if (body['w:tbl']) {
            for (const table of body['w:tbl']) {
                const tableText = this.extractTextFromWordTable(table);
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
        }
        return { text: fullText, elements };
    }
    /**
     * Extract text from a Word paragraph (w:p element)
     */
    extractTextFromWordParagraph(paragraph) {
        const textParts = [];
        // Paragraph contains runs (w:r) which contain text (w:t)
        if (paragraph['w:r']) {
            for (const run of paragraph['w:r']) {
                // Text can be in w:t or w:t with xml:space="preserve"
                if (run['w:t']) {
                    for (const textNode of run['w:t']) {
                        const text = typeof textNode === 'string' ? textNode : textNode._ || textNode['_'] || '';
                        if (text) {
                            textParts.push(text);
                        }
                    }
                }
            }
        }
        return textParts.join('');
    }
    /**
     * Extract text from a Word table (w:tbl element)
     */
    extractTextFromWordTable(table) {
        const rows = [];
        // Table contains rows (w:tr)
        if (table['w:tr']) {
            for (const row of table['w:tr']) {
                const cells = [];
                // Row contains cells (w:tc)
                if (row['w:tc']) {
                    for (const cell of row['w:tc']) {
                        // Cell contains paragraphs
                        const cellText = this.extractTextFromWordCell(cell);
                        cells.push(cellText);
                    }
                }
                rows.push(cells.join('\t')); // Tab-separated for table cells
            }
        }
        return rows.join('\n');
    }
    /**
     * Extract text from a Word table cell (w:tc element)
     */
    extractTextFromWordCell(cell) {
        const textParts = [];
        // Cell contains paragraphs
        if (cell['w:p']) {
            for (const paragraph of cell['w:p']) {
                const paraText = this.extractTextFromWordParagraph(paragraph);
                if (paraText.trim()) {
                    textParts.push(paraText);
                }
            }
        }
        return textParts.join(' ');
    }
    /**
     * Extract colors from Word document theme
     * Word documents store theme colors in word/theme/theme1.xml
     */
    async extractColors(documentId, auth, request) {
        try {
            // Download document
            const documentBuffer = await this.downloadDocument(documentId, auth);
            const zip = await JSZip.loadAsync(documentBuffer);
            const colors = new Set();
            // Try to read theme file
            const themeFiles = Object.keys(zip.files).filter(name => name.startsWith('word/theme/theme') && name.endsWith('.xml'));
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
                format: 'word',
            });
            return colorArray;
        }
        catch (error) {
            this.monitoring.trackEvent('content_generation.extractor.colors_failed', {
                documentId,
                error: error.message,
                format: 'word',
            });
            // Return empty array if color extraction fails
            return [];
        }
    }
}
//# sourceMappingURL=microsoft-word.extractor.js.map