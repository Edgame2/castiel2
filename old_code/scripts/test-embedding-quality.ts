#!/usr/bin/env ts-node
/**
 * Embedding Quality Test Harness
 * 
 * Tests end-to-end embedding generation with quality metrics:
 * - Vector dimensions consistency
 * - L2 normalization verification
 * - Sample cosine similarity
 * - Token usage tracking
 * 
 * Usage:
 *   pnpm tsx scripts/test-embedding-quality.ts <shardId> <tenantId>
 */

import { Container } from '../apps/api/src/infrastructure/container.js';

interface EmbeddingQualityReport {
  shardId: string;
  success: boolean;
  vectorsGenerated: number;
  dimensions: number;
  isNormalized: boolean;
  avgMagnitude: number;
  minMagnitude: number;
  maxMagnitude: number;
  templateUsed: string;
  isDefaultTemplate: boolean;
  processingTimeMs: number;
  sampleVectors?: {
    index: number;
    magnitude: number;
    firstFive: number[];
  }[];
  cosineSimilarity?: {
    vector1: number;
    vector2: number;
    similarity: number;
  };
  error?: string;
}

async function testEmbeddingQuality(
  shardId: string,
  tenantId: string
): Promise<EmbeddingQualityReport> {
  const container = Container.getInstance();
  const shardEmbeddingService = container.get('shardEmbeddingService');
  const shardRepository = container.get('shardRepository');

  try {
    // Fetch shard
    const shard = await shardRepository.findById(shardId, tenantId);
    if (!shard) {
      return {
        shardId,
        success: false,
        vectorsGenerated: 0,
        dimensions: 0,
        isNormalized: false,
        avgMagnitude: 0,
        minMagnitude: 0,
        maxMagnitude: 0,
        templateUsed: 'none',
        isDefaultTemplate: false,
        processingTimeMs: 0,
        error: 'Shard not found',
      };
    }

    // Generate embeddings (force regenerate)
    const result = await shardEmbeddingService.generateEmbeddingsForShard(
      shard,
      tenantId,
      { forceRegenerate: true }
    );

    // Fetch updated shard with vectors
    const updatedShard = await shardRepository.findById(shardId, tenantId);
    const vectors = updatedShard?.vectors || [];

    if (vectors.length === 0) {
      return {
        shardId,
        success: false,
        vectorsGenerated: 0,
        dimensions: 0,
        isNormalized: false,
        avgMagnitude: 0,
        minMagnitude: 0,
        maxMagnitude: 0,
        templateUsed: result.templateUsed,
        isDefaultTemplate: result.isDefaultTemplate,
        processingTimeMs: result.processingTimeMs,
        error: 'No vectors generated',
      };
    }

    // Calculate quality metrics
    const dimensions = vectors[0]?.dimensions || vectors[0]?.embedding?.length || 0;
    const magnitudes = vectors.map((v) => calculateMagnitude(v.embedding));
    const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const minMagnitude = Math.min(...magnitudes);
    const maxMagnitude = Math.max(...magnitudes);

    // Check if normalized (L2 magnitude ≈ 1.0)
    const isNormalized = magnitudes.every((m) => Math.abs(m - 1.0) < 0.01);

    // Sample vectors for inspection
    const sampleVectors = vectors.slice(0, 3).map((v, index) => ({
      index,
      magnitude: magnitudes[index],
      firstFive: v.embedding.slice(0, 5),
    }));

    // Calculate cosine similarity between first two vectors (if available)
    let cosineSimilarity;
    if (vectors.length >= 2) {
      const similarity = calculateCosineSimilarity(
        vectors[0].embedding,
        vectors[1].embedding
      );
      cosineSimilarity = {
        vector1: 0,
        vector2: 1,
        similarity,
      };
    }

    return {
      shardId,
      success: true,
      vectorsGenerated: result.vectorsGenerated,
      dimensions,
      isNormalized,
      avgMagnitude,
      minMagnitude,
      maxMagnitude,
      templateUsed: result.templateUsed,
      isDefaultTemplate: result.isDefaultTemplate,
      processingTimeMs: result.processingTimeMs,
      sampleVectors,
      cosineSimilarity,
    };
  } catch (error: any) {
    return {
      shardId,
      success: false,
      vectorsGenerated: 0,
      dimensions: 0,
      isNormalized: false,
      avgMagnitude: 0,
      minMagnitude: 0,
      maxMagnitude: 0,
      templateUsed: 'unknown',
      isDefaultTemplate: false,
      processingTimeMs: 0,
      error: error.message || String(error),
    };
  }
}

function calculateMagnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = calculateMagnitude(vec1);
  const mag2 = calculateMagnitude(vec2);

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
}

function printReport(report: EmbeddingQualityReport): void {
  console.log('\n=== EMBEDDING QUALITY REPORT ===\n');
  console.log(`Shard ID: ${report.shardId}`);
  console.log(`Success: ${report.success ? '✅' : '❌'}`);

  if (report.error) {
    console.log(`Error: ${report.error}`);
    return;
  }

  console.log(`\nGeneration:`);
  console.log(`  Vectors Generated: ${report.vectorsGenerated}`);
  console.log(`  Template: ${report.templateUsed} ${report.isDefaultTemplate ? '(default)' : '(custom)'}`);
  console.log(`  Processing Time: ${report.processingTimeMs}ms`);

  console.log(`\nVector Quality:`);
  console.log(`  Dimensions: ${report.dimensions}`);
  console.log(`  Normalized (L2): ${report.isNormalized ? '✅' : '❌'}`);
  console.log(`  Avg Magnitude: ${report.avgMagnitude.toFixed(4)}`);
  console.log(`  Min Magnitude: ${report.minMagnitude.toFixed(4)}`);
  console.log(`  Max Magnitude: ${report.maxMagnitude.toFixed(4)}`);

  if (report.sampleVectors && report.sampleVectors.length > 0) {
    console.log(`\nSample Vectors:`);
    report.sampleVectors.forEach((sample) => {
      console.log(`  [${sample.index}] magnitude=${sample.magnitude.toFixed(4)} first5=[${sample.firstFive.map(n => n.toFixed(4)).join(', ')}]`);
    });
  }

  if (report.cosineSimilarity) {
    console.log(`\nCosine Similarity:`);
    console.log(`  Between vector ${report.cosineSimilarity.vector1} and ${report.cosineSimilarity.vector2}: ${report.cosineSimilarity.similarity.toFixed(4)}`);
    console.log(`  ${report.cosineSimilarity.similarity > 0.8 ? '⚠️  Very similar (may be duplicates)' : report.cosineSimilarity.similarity > 0.3 ? '✅ Reasonably similar' : '✅ Diverse'}`);
  }

  console.log('\n=== END REPORT ===\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: pnpm tsx scripts/test-embedding-quality.ts <shardId> <tenantId>');
    process.exit(1);
  }

  const [shardId, tenantId] = args;

  console.log(`Testing embedding quality for shard ${shardId} in tenant ${tenantId}...`);

  const report = await testEmbeddingQuality(shardId, tenantId);
  printReport(report);

  process.exit(report.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
