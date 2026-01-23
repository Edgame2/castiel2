import { InvocationContext } from '@azure/functions';
import { BlobClient } from '@azure/storage-blob';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { TextExtractionResult, TextExtractionMetadata } from '../types/document-chunking.types.js';

export class TextExtracterService {
  private formRecognizerClient: DocumentAnalysisClient;
  private readonly modelId = 'prebuilt-read';

  constructor(
    private blobClient: BlobClient,
    private context: InvocationContext
  ) {
    const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || '';
    const apiKey = process.env.AZURE_FORM_RECOGNIZER_API_KEY || '';

    if (!endpoint || !apiKey) {
      throw new Error('Form Recognizer configuration missing: AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_API_KEY required');
    }

    this.formRecognizerClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  }

  async extract(): Promise<TextExtractionResult> {
    const startTime = Date.now();
    const context = this.context;

    try {
      context.log('Extracting text with Azure Form Recognizer...');

      // Download blob to buffer
      const downloadBlockBlobResponse = await this.blobClient.download();
      const chunks: Buffer[] = [];

      for await (const chunk of downloadBlockBlobResponse.readableStreamBody!) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      // Analyze document
      const poller = await this.formRecognizerClient.beginAnalyzeDocument(
        this.modelId,
        buffer
      );

      const analyzeResult = await poller.pollUntilDone();
      const { content, pages, tables, paragraphs } = analyzeResult;

      // Debug logging
      if (process.env.DEBUG === 'true') {
        context.log('=== Azure Form Recognizer Full Response ===');
        context.log(JSON.stringify(analyzeResult, null, 2));
        context.log('=== End of Form Recognizer Response ===');
      }

      // Extract metadata
      const pageCount = pages?.length || 1;
      const characterCount = content.length;

      context.log(`Successfully extracted ${characterCount} characters from ${pageCount} pages`);

      // Build extraction result
      const result: TextExtractionResult = {
        text: content,
        metadata: {
          pageCount,
          language: 'en',
          confidence: 0.95,
          extractorUsed: 'azure-form-recognizer',
          extractionDurationMs: Date.now() - startTime,
          hasImages: !!paragraphs?.some(p => (p as any).kind === 'imageLike'),
          hasFormFields: !!tables && tables.length > 0,
          hasTableContent: !!tables && tables.length > 0,
          characterCount,
        },
        pages: pages?.map((page, idx) => ({
          pageNumber: idx + 1,
          content: (page as any).content || (page as any).text || '',
          language: 'en',
          confidence: 0.95,
          wordCount: ((page as any).content || (page as any).text || '').match(/\b\w+\b/g)?.length || 0,
        })),
        tables: tables?.map((table, idx) => ({
          pageNumber: (table as any).boundingRegions?.[0]?.pageNumber || 1,
          tableIndex: idx,
          content: (table as any).content || '',
          rows: table.rowCount,
          columns: table.columnCount,
        })),
      };

      return result;
    } catch (error) {
      context.error(`Text extraction failed: ${error}`);
      throw error;
    }
  }
}
