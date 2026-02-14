/**
 * Cosmos DB access for audit_exports.
 * Partition key: tenantId.
 */

import { getContainer } from '@coder/shared/database';
import { randomUUID } from 'crypto';

export interface ExportJobRow {
  id: string;
  tenantId: string;
  format: string;
  filters: Record<string, unknown>;
  status: string;
  progress: number;
  totalRecords: number | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  expiresAt: Date | null;
  errorMessage: string | null;
  requestedBy: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ExportJobDoc {
  id: string;
  tenantId: string;
  format: string;
  filters: Record<string, unknown>;
  status: string;
  progress: number;
  totalRecords: number | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  errorMessage: string | null;
  requestedBy: string;
  createdAt: string;
  completedAt: string | null;
}

function toRow(doc: ExportJobDoc): ExportJobRow {
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    format: doc.format,
    filters: doc.filters ?? {},
    status: doc.status,
    progress: doc.progress,
    totalRecords: doc.totalRecords,
    fileUrl: doc.fileUrl,
    fileSizeBytes: doc.fileSizeBytes,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
    errorMessage: doc.errorMessage,
    requestedBy: doc.requestedBy,
    createdAt: new Date(doc.createdAt),
    completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
  };
}

export class CosmosExportsRepository {
  constructor(private containerName: string) {}

  private getContainer() {
    return getContainer(this.containerName);
  }

  async create(data: {
    tenantId: string;
    format: string;
    filters: Record<string, unknown>;
    status: string;
    progress: number;
    requestedBy: string;
  }): Promise<ExportJobRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const doc: ExportJobDoc = {
      id,
      tenantId: data.tenantId,
      format: data.format,
      filters: data.filters,
      status: data.status,
      progress: data.progress,
      totalRecords: null,
      fileUrl: null,
      fileSizeBytes: null,
      expiresAt: null,
      errorMessage: null,
      requestedBy: data.requestedBy,
      createdAt: now,
      completedAt: null,
    };
    await this.getContainer().items.create(doc, {
      partitionKey: data.tenantId,
    } as Record<string, unknown>);
    return toRow(doc);
  }

  async findUnique(args: { where: { id: string } }): Promise<ExportJobRow | null> {
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: args.where.id }],
      })
      .fetchNext();
    const doc = resources?.[0] as ExportJobDoc | undefined;
    return doc ? toRow(doc) : null;
  }

  async findMany(args: {
    where?: { tenantId?: string };
    orderBy: { createdAt: 'desc' };
    take: number;
  }): Promise<ExportJobRow[]> {
    const limit = args.take;
    if (args.where?.tenantId) {
      const pk = args.where.tenantId;
      const { resources } = await this.getContainer().items
        .query(
          {
            query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
            parameters: [{ name: '@tenantId', value: pk }],
          },
          { maxItemCount: limit }
        )
        .fetchNext();
      const items = (resources ?? []).slice(0, limit);
      return items.map((r: unknown) => toRow(r as ExportJobDoc));
    }
    const { resources } = await this.getContainer().items
      .query(
        {
          query: 'SELECT * FROM c ORDER BY c.createdAt DESC',
          parameters: [],
        },
        { maxItemCount: limit }
      )
      .fetchNext();
    const items = (resources ?? []).slice(0, limit);
    return items.map((r: unknown) => toRow(r as ExportJobDoc));
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<{
      status: string;
      progress: number;
      totalRecords: number;
      fileUrl: string;
      fileSizeBytes: number;
      expiresAt: Date;
      errorMessage: string;
      completedAt: Date;
    }>
  ): Promise<ExportJobRow> {
    const { resource: existing } = await this.getContainer()
      .item(id, tenantId)
      .read<ExportJobDoc>();
    if (!existing) throw new Error('Export job not found');
    const updated: ExportJobDoc = {
      ...existing,
      status: data.status ?? existing.status,
      progress: data.progress ?? existing.progress,
      totalRecords: data.totalRecords !== undefined ? data.totalRecords : existing.totalRecords,
      fileUrl: data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl,
      fileSizeBytes: data.fileSizeBytes !== undefined ? data.fileSizeBytes : existing.fileSizeBytes,
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : existing.expiresAt,
      errorMessage: data.errorMessage !== undefined ? data.errorMessage : existing.errorMessage,
      completedAt: data.completedAt ? data.completedAt.toISOString() : existing.completedAt,
    };
    await this.getContainer()
      .item(id, tenantId)
      .replace(updated as unknown as Record<string, unknown>);
    return toRow(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.getContainer().item(id, tenantId).delete();
  }

  /** Find completed exports with expiresAt before the given date (for cleanup). */
  async findExpired(before: Date): Promise<ExportJobRow[]> {
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.status = @status AND IS_DEFINED(c.expiresAt) AND c.expiresAt < @before',
        parameters: [
          { name: '@status', value: 'COMPLETED' },
          { name: '@before', value: before.toISOString() },
        ],
      })
      .fetchNext();
    return (resources ?? []).map((r: unknown) => toRow(r as ExportJobDoc));
  }
}
