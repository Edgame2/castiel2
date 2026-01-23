import { getDatabaseClient } from '@coder/shared';

export interface CodeEmbeddingData {
  id: string;
  projectId?: string;
  filePath?: string;
  content: string;
  vector: number[];
  metadata?: Record<string, any>;
  embeddingModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimilaritySearchResult {
  embedding: CodeEmbeddingData;
  similarity: number;
}

export class EmbeddingService {
  private db = getDatabaseClient();

  async storeEmbedding(
    projectId: string | undefined,
    filePath: string | undefined,
    content: string,
    vector: number[],
    metadata?: Record<string, any>,
    embeddingModel?: string
  ): Promise<CodeEmbeddingData> {
    const where: any = {};
    if (projectId && filePath) {
      where.projectId_filePath = {
        projectId,
        filePath,
      };
    } else {
      where.id = 'new'; // Will create new
    }

    const embedding = await this.db.emb_documents.upsert({
      where: projectId && filePath ? {
        projectId_filePath: {
          projectId,
          filePath,
        },
      } : { id: 'new' },
      update: {
        content,
        vector: vector as any,
        metadata: metadata as any,
        embeddingModel,
      },
      create: {
        projectId,
        filePath,
        content,
        vector: vector as any,
        metadata: metadata as any,
        embeddingModel,
      },
    });

    return this.mapToEmbeddingData(embedding);
  }

  async storeEmbeddingsBatch(
    embeddings: Array<{
      projectId?: string;
      filePath?: string;
      content: string;
      vector: number[];
      metadata?: Record<string, any>;
      embeddingModel?: string;
    }>
  ): Promise<CodeEmbeddingData[]> {
    const results: CodeEmbeddingData[] = [];

    for (const emb of embeddings) {
      const result = await this.storeEmbedding(
        emb.projectId,
        emb.filePath,
        emb.content,
        emb.vector,
        emb.metadata,
        emb.embeddingModel
      );
      results.push(result);
    }

    return results;
  }

  async getEmbedding(id: string): Promise<CodeEmbeddingData | null> {
    const embedding = await this.db.emb_documents.findUnique({
      where: { id },
    });

    if (!embedding) {
      return null;
    }

    return this.mapToEmbeddingData(embedding);
  }

  async searchSimilar(
    queryVector: number[],
    projectId?: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    // Note: This is a simplified version. In production, use pgvector for efficient similarity search
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const embeddings = await this.db.emb_documents.findMany({
      where,
    });

    // Calculate cosine similarity (simplified - in production use pgvector)
    const results: SimilaritySearchResult[] = [];
    for (const emb of embeddings) {
      const vector = emb.vector as number[];
      if (vector && vector.length === queryVector.length) {
        const similarity = this.cosineSimilarity(queryVector, vector);
        if (similarity >= threshold) {
          results.push({
            embedding: this.mapToEmbeddingData(emb),
            similarity,
          });
        }
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  async deleteEmbedding(id: string): Promise<void> {
    await this.db.emb_documents.delete({
      where: { id },
    });
  }

  async deleteEmbeddingsByProject(projectId: string): Promise<number> {
    const result = await this.db.emb_documents.deleteMany({
      where: { projectId },
    });
    return result.count;
  }

  private mapToEmbeddingData(embedding: any): CodeEmbeddingData {
    return {
      id: embedding.id,
      projectId: embedding.projectId,
      filePath: embedding.filePath,
      content: embedding.content,
      vector: embedding.vector as number[],
      metadata: embedding.metadata as Record<string, any> | undefined,
      embeddingModel: embedding.embeddingModel,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
