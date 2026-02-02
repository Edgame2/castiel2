/**
 * Text Extraction Service unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextExtractionService } from '../../../src/services/TextExtractionService';

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_csv: vi.fn(),
  },
}));

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

describe('TextExtractionService', () => {
  let service: TextExtractionService;

  beforeEach(() => {
    service = new TextExtractionService();
    vi.clearAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from TXT buffer', async () => {
      const buffer = Buffer.from('Hello world from plain text.', 'utf-8');
      const result = await service.extractText(buffer, 'text/plain');
      expect(result.text).toBe('Hello world from plain text.');
      expect(result.wordCount).toBe(5);
    });

    it('should extract text from HTML buffer', async () => {
      const html = '<html><body><p>Hello</p> <script>ignore</script> <b>world</b></body></html>';
      const buffer = Buffer.from(html, 'utf-8');
      const result = await service.extractText(buffer, 'text/html');
      expect(result.text).toContain('Hello');
      expect(result.text).toContain('world');
      expect(result.text).not.toContain('ignore');
      expect(result.wordCount).toBe(2);
    });

    it('should throw for image MIME type', async () => {
      const buffer = Buffer.from('fake');
      await expect(service.extractText(buffer, 'image/png')).rejects.toThrow(/Image OCR not yet implemented/);
    });

    it('should throw for unsupported document type', async () => {
      const buffer = Buffer.from('data');
      await expect(service.extractText(buffer, 'application/octet-stream')).rejects.toThrow(/Unsupported document type/);
    });

    it('should extract from PDF when pdf-parse resolves', async () => {
      vi.mocked(pdfParse).mockResolvedValue({
        text: 'PDF content here',
        numpages: 2,
        info: { Author: 'Test' },
      } as any);
      const buffer = Buffer.from('pdf-bytes');
      const result = await service.extractText(buffer, 'application/pdf');
      expect(result.text).toBe('PDF content here');
      expect(result.wordCount).toBe(3);
      expect(result.pageCount).toBe(2);
      expect(result.metadata?.author).toBe('Test');
    });

    it('should extract from DOCX when mammoth resolves', async () => {
      vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: 'Docx content here' } as any);
      const buffer = Buffer.from('docx-bytes');
      const result = await service.extractText(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.text).toBe('Docx content here');
      expect(result.wordCount).toBe(3);
    });

    it('should extract from XLSX when xlsx resolves', async () => {
      vi.mocked(XLSX.read).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      } as any);
      vi.mocked(XLSX.utils.sheet_to_csv).mockReturnValue('a,b,c\n1,2,3');
      const buffer = Buffer.from('xlsx-bytes');
      const result = await service.extractText(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.text).toContain('Sheet1');
      expect(result.text).toContain('a,b,c');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should use explicit documentType when provided', async () => {
      const buffer = Buffer.from('plain text', 'utf-8');
      const result = await service.extractText(buffer, 'application/unknown', 'txt');
      expect(result.text).toBe('plain text');
    });
  });
});
