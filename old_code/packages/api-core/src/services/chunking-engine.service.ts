import { InvocationContext } from '@azure/functions';
import { createHash } from 'crypto';
import {
  DocumentChunk,
  ChunkingResult,
  TextExtractionMetadata,
} from '../types/document-chunking.types.js';

export class ChunkingEngineService {
  private readonly CHUNK_SIZE_TOKENS = 512;
  private readonly OVERLAP_TOKENS = 50;
  private readonly TOKENS_PER_WORD = 1.3; // Approximation

  constructor(private context: InvocationContext) {}

  chunk(text: string, extractionMetadata: TextExtractionMetadata): ChunkingResult {
    const startTime = Date.now();

    // Split into sentences
    const sentences = this.splitIntoSentences(text);

    // Group sentences into chunks
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let charOffset = 0;
    let sequenceNumber = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      // Start new chunk if adding this sentence would exceed limit
      if (currentTokenCount + sentenceTokens > this.CHUNK_SIZE_TOKENS && currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        chunks.push(this.createChunk(
          chunkText,
          sequenceNumber++,
          charOffset,
          currentTokenCount,
          extractionMetadata
        ));

        charOffset += chunkText.length + 1;

        // Reset with overlap
        const overlapSentences = this.getOverlapSentences(
          currentChunk,
          this.OVERLAP_TOKENS
        );
        currentChunk = overlapSentences;
        currentTokenCount = overlapSentences.reduce((sum, s) => sum + this.estimateTokens(s), 0);
      }

      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      chunks.push(this.createChunk(
        chunkText,
        sequenceNumber,
        charOffset,
        currentTokenCount,
        extractionMetadata
      ));
    }

    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const durationMs = Date.now() - startTime;

    this.context.log(
      `Chunked text into ${chunks.length} chunks (${totalTokens} total tokens) in ${durationMs}ms`
    );

    return {
      chunks,
      metadata: {
        totalTokens,
        averageTokensPerChunk: chunks.length > 0 ? totalTokens / chunks.length : 0,
        chunkingDurationMs: durationMs,
      },
    };
  }

  private createChunk(
    text: string,
    sequenceNumber: number,
    startOffset: number,
    tokenCount: number,
    extractionMetadata: TextExtractionMetadata
  ): DocumentChunk {
    return {
      id: this.generateChunkId(text),
      sequenceNumber,
      text,
      startOffset,
      endOffset: startOffset + text.length,
      tokenCount,
      metadata: {
        depth: 0,
        pageNumber: extractionMetadata.pageCount > 1 ? 1 : undefined,
      },
    };
  }

  private generateChunkId(text: string): string {
    // Hash-based ID for deduplication
    return createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting on . ! ? with handling for abbreviations
    const sentences: string[] = [];
    let current = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      current += char;

      if (/[.!?]/.test(char)) {
        const next = text[i + 1];
        // Don't split on abbreviations (e.g., "Dr.", "U.S.")
        if (next === ' ' && i + 2 < text.length && /[A-Z]/.test(text[i + 2])) {
          continue;
        }
      }

      if (current.trim().length > 0 && /[.!?]\s+$/.test(current)) {
        sentences.push(current.trim());
        current = '';
      }
    }

    if (current.trim().length > 0) {
      sentences.push(current.trim());
    }

    return sentences;
  }

  private estimateTokens(text: string): number {
    const words = (text.match(/\b\w+\b/g) || []).length;
    return Math.ceil(words * this.TOKENS_PER_WORD);
  }

  private getOverlapSentences(sentences: string[], overlapTokens: number): string[] {
    let tokenCount = 0;
    const overlap: string[] = [];

    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.estimateTokens(sentences[i]);
      if (tokenCount + sentenceTokens > overlapTokens) {
        break;
      }
      overlap.unshift(sentences[i]);
      tokenCount += sentenceTokens;
    }

    return overlap;
  }
}
