/**
 * Text Processing Utilities
 * Extract and chunk text from Shards for vectorization
 */

import {
  ChunkingStrategy,
  TextChunk,
  TextSource,
  estimateTokenCount,
} from '../types/vectorization.types.js';
import type { Shard, StructuredData } from '../types/shard.types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract text from a Shard based on text sources configuration
 */
export function extractTextFromShard(
  shard: Shard,
  textSources: TextSource[]
): { text: string; sources: string[] } {
  const extractedTexts: Array<{ text: string; source: string; weight: number }> = [];

  for (const source of textSources) {
    const text = extractFieldText(shard, source.field);
    if (text) {
      extractedTexts.push({
        text: source.prefix ? `${source.prefix}${text}` : text,
        source: source.field,
        weight: source.weight || 1.0,
      });
    }
  }

  // Combine texts, weighted sources get repeated or prioritized
  const combinedText = extractedTexts
    .map((item) => item.text)
    .filter(Boolean)
    .join('\n\n');

  const sources = extractedTexts.map((item) => item.source);

  return {
    text: combinedText,
    sources,
  };
}

/**
 * Extract text from a specific field path in the Shard
 */
function extractFieldText(shard: Shard, fieldPath: string): string {
  // Handle special field paths
  if (fieldPath === 'structuredData') {
    return extractFromStructuredData(shard.structuredData);
  }

  if (fieldPath === 'unstructuredData.text') {
    return shard.unstructuredData?.text || '';
  }

  if (fieldPath === 'unstructuredData.files') {
    // For files, extract file names and any text content
    const files = shard.unstructuredData?.files || [];
    return files.map((f) => f.name).join(', ');
  }

  // Handle nested paths (e.g., 'structuredData.title')
  const parts = fieldPath.split('.');
  let value: any = shard;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return '';
    }
  }

  return extractValue(value);
}

/**
 * Extract text from structured data (recursively flatten object)
 */
function extractFromStructuredData(data: StructuredData): string {
  const texts: string[] = [];

  function traverse(obj: any) {
    if (!obj) {return;}

    if (typeof obj === 'string') {
      texts.push(obj);
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      texts.push(String(obj));
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return texts.join(' ');
}

/**
 * Extract string value from any type
 */
function extractValue(value: any): string {
  if (!value) {return '';}

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(extractValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return extractFromStructuredData(value);
  }

  return '';
}

/**
 * Chunk text based on strategy
 */
export function chunkText(
  text: string,
  strategy: ChunkingStrategy,
  chunkSize: number = 512,
  overlap: number = 50,
  source: string = 'text',
  weight: number = 1.0
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  switch (strategy) {
    case ChunkingStrategy.FIXED_SIZE:
      return chunkByFixedSize(text, chunkSize, overlap, source, weight);
    case ChunkingStrategy.SENTENCE:
      return chunkBySentence(text, chunkSize, source, weight);
    case ChunkingStrategy.PARAGRAPH:
      return chunkByParagraph(text, chunkSize, source, weight);
    case ChunkingStrategy.SEMANTIC:
      // TODO: Implement semantic chunking with embeddings
      return chunkBySentence(text, chunkSize, source, weight);
    case ChunkingStrategy.NONE:
      return [createChunk(text, 0, text.length, source, weight)];
    default:
      return chunkBySentence(text, chunkSize, source, weight);
  }
}

/**
 * Chunk by fixed token size with overlap
 */
function chunkByFixedSize(
  text: string,
  chunkSize: number,
  overlap: number,
  source: string,
  weight: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor(chunkSize / 1.3); // Rough estimate: 1 token ≈ 1.3 words
  const overlapWords = Math.floor(overlap / 1.3);

  for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    const startIndex = text.indexOf(chunkWords[0], i > 0 ? chunks[chunks.length - 1]?.endIndex || 0 : 0);
    const endIndex = startIndex + chunkText.length;

    if (chunkText.trim()) {
      chunks.push(createChunk(chunkText, startIndex, endIndex, source, weight));
    }
  }

  return chunks;
}

/**
 * Chunk by sentences
 */
function chunkBySentence(
  text: string,
  maxChunkSize: number,
  source: string,
  weight: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const sentences = splitIntoSentences(text);

  let currentChunk = '';
  let startIndex = 0;

  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    const tokenCount = estimateTokenCount(potentialChunk);

    if (tokenCount > maxChunkSize && currentChunk) {
      // Save current chunk and start new one
      const endIndex = startIndex + currentChunk.length;
      chunks.push(createChunk(currentChunk, startIndex, endIndex, source, weight));
      startIndex = endIndex + 1;
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    const endIndex = startIndex + currentChunk.length;
    chunks.push(createChunk(currentChunk, startIndex, endIndex, source, weight));
  }

  return chunks;
}

/**
 * Chunk by paragraphs
 */
function chunkByParagraph(
  text: string,
  maxChunkSize: number,
  source: string,
  weight: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  let startIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {continue;}

    const tokenCount = estimateTokenCount(trimmed);

    if (tokenCount > maxChunkSize) {
      // Paragraph too large, chunk by sentences
      const sentenceChunks = chunkBySentence(trimmed, maxChunkSize, source, weight);
      chunks.push(...sentenceChunks);
    } else {
      const endIndex = startIndex + trimmed.length;
      chunks.push(createChunk(trimmed, startIndex, endIndex, source, weight));
    }

    startIndex += paragraph.length + 2; // +2 for \n\n
  }

  return chunks;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting (can be improved with NLP library)
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Create a text chunk
 */
function createChunk(
  text: string,
  startIndex: number,
  endIndex: number,
  source: string,
  weight: number
): TextChunk {
  return {
    id: uuidv4(),
    text: text.trim(),
    source,
    weight,
    startIndex,
    endIndex,
    tokenCount: estimateTokenCount(text),
  };
}

/**
 * Combine chunks into a single text (for single embedding)
 */
export function combineChunks(chunks: TextChunk[]): string {
  return chunks.map((chunk) => chunk.text).join('\n\n');
}

/**
 * Validate text for vectorization
 */
export function validateText(text: string, maxTokens: number): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text is empty' };
  }

  const tokenCount = estimateTokenCount(text);
  if (tokenCount > maxTokens) {
    return {
      valid: false,
      error: `Text too long: ${tokenCount} tokens exceeds limit of ${maxTokens}`,
    };
  }

  return { valid: true };
}

/**
 * Prepare text for embedding (cleanup, normalize)
 */
export function prepareTextForEmbedding(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

/**
 * Calculate chunking statistics
 */
export function calculateChunkingStats(chunks: TextChunk[]) {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokensPerChunk: 0,
      minTokens: 0,
      maxTokens: 0,
    };
  }

  const tokenCounts = chunks.map((c) => c.tokenCount);
  const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalChunks: chunks.length,
    totalTokens,
    avgTokensPerChunk: totalTokens / chunks.length,
    minTokens: Math.min(...tokenCounts),
    maxTokens: Math.max(...tokenCounts),
  };
}
