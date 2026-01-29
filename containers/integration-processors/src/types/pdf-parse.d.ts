/**
 * Declaration for pdf-parse (no @types/pdf-parse package).
 */
declare module 'pdf-parse' {
  interface PdfParseOptions {
    pagerender?: (pageData: unknown) => string;
    max?: number;
    version?: string;
    password?: string;
  }

  interface PdfInfo {
    PDFFormatVersion?: string;
    Language?: string;
    Author?: string;
    Title?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string | number | Date;
    ModDate?: string | number | Date;
  }

  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: PdfInfo | undefined;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: PdfParseOptions
  ): Promise<PdfParseResult>;

  export = pdfParse;
}
