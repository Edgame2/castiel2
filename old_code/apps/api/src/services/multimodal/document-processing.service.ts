/**
 * Document Processing Service
 * Extracts text and metadata from documents using Azure OpenAI Vision API
 * Can be extended to use Azure Document Intelligence for more advanced processing
 */

import { IMonitoringProvider } from '@castiel/monitoring';

export interface DocumentProcessingConfig {
  endpoint: string;
  apiKey: string;
  deploymentName?: string; // Default: gpt-4-vision
  apiVersion?: string; // Default: 2024-02-15-preview
  timeout?: number; // Default: 60000ms
}

export interface DocumentProcessingResult {
  text: string;
  pages?: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    language?: string;
    pageCount?: number;
  };
  structure?: {
    headings?: Array<{
      level: number;
      text: string;
      page?: number;
    }>;
    paragraphs?: Array<{
      text: string;
      page?: number;
    }>;
    tables?: Array<{
      rows: number;
      columns: number;
      data?: string[][];
      page?: number;
    }>;
  };
  entities?: string[];
  summary?: string;
}

/**
 * Document Processing Service using Azure OpenAI Vision API
 * For PDFs and document images, uses GPT-4 Vision to extract text and structure
 */
export class DocumentProcessingService {
  private config: Required<DocumentProcessingConfig>;

  constructor(
    config: DocumentProcessingConfig,
    private monitoring: IMonitoringProvider
  ) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      deploymentName: config.deploymentName || 'gpt-4-vision',
      apiVersion: config.apiVersion || '2024-02-15-preview',
      timeout: config.timeout || 60000,
    };
  }

  /**
   * Process a document (extract text, structure, metadata)
   */
  async processDocument(documentUrl: string): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    try {
      this.monitoring.trackEvent('document_processing_started', {
        documentUrl,
      });

      // For now, use GPT-4 Vision to extract text from document
      // This works for PDFs and document images
      // In the future, this could be enhanced with Azure Document Intelligence
      const extraction = await this.extractTextWithVision(documentUrl);

      const duration = Date.now() - startTime;
      this.monitoring.trackMetric('document_processing_duration_ms', duration);
      this.monitoring.trackEvent('document_processing_completed', {
        textLength: extraction.text.length,
        hasStructure: !!extraction.structure,
        durationMs: duration,
      });

      return extraction;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'document_processing.process',
        documentUrl,
      });
      throw error;
    }
  }

  /**
   * Extract text from document using GPT-4 Vision
   */
  private async extractTextWithVision(documentUrl: string): Promise<DocumentProcessingResult> {
    // Normalize endpoint
    let baseEndpoint = this.config.endpoint.trim();
    if (baseEndpoint.endsWith('/openai/')) {
      baseEndpoint = baseEndpoint.slice(0, -8);
    } else if (baseEndpoint.endsWith('/openai')) {
      baseEndpoint = baseEndpoint.slice(0, -7);
    }

    const url = `${baseEndpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const prompt = `Extract all text from this document. Preserve the structure as much as possible:
- Extract all headings with their hierarchy levels
- Extract all paragraphs
- Identify any tables and extract their data
- Extract document metadata if visible (title, author, date, etc.)
- Identify key entities (people, organizations, locations, dates)

Format your response as JSON with this structure:
{
  "text": "full extracted text",
  "metadata": {
    "title": "...",
    "author": "...",
    "subject": "...",
    "keywords": ["..."],
    "language": "...",
    "pageCount": number
  },
  "structure": {
    "headings": [{"level": 1-6, "text": "...", "page": number}],
    "paragraphs": [{"text": "...", "page": number}],
    "tables": [{"rows": number, "columns": number, "data": [["cell1", "cell2"], ...], "page": number}]
  },
  "entities": ["entity1", "entity2", ...],
  "summary": "brief summary of the document"
}`;

    const body = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: documentUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 4000, // Higher limit for documents
      temperature: 0.1, // Lower temperature for more accurate extraction
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        text: parsed.text || content,
        pages: parsed.metadata?.pageCount,
        metadata: parsed.metadata,
        structure: parsed.structure,
        entities: parsed.entities || [],
        summary: parsed.summary,
      };
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      this.monitoring.trackEvent('document_processing_json_parse_failed', {
        contentLength: content.length,
      });

      return {
        text: content,
        summary: content.substring(0, 200),
      };
    }
  }

  /**
   * Get supported document formats
   */
  getSupportedFormats(): string[] {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/markdown',
      'image/png', // Document images
      'image/jpeg', // Document images
    ];
  }

  /**
   * Get maximum file size (in bytes)
   */
  getMaxFileSize(): number {
    // Azure OpenAI Vision API limit: 20 MB for images
    // For PDFs, this depends on the number of pages
    return 20 * 1024 * 1024;
  }
}









