/**
 * Cosmos DB access for audit_retention_policies.
 * Partition key: tenantId (tenantId or 'global' for null).
 */

import { getContainer } from '@coder/shared/database';
import { randomUUID } from 'crypto';
import type { RetentionPolicy } from '../../types/policy.types';

const PARTITION_GLOBAL = 'global';

export interface RetentionPolicyDoc {
  id: string;
  tenantId: string;
  category: string | null;
  severity: string | null;
  retentionDays: number;
  archiveAfterDays: number | null;
  deleteAfterDays: number;
  minRetentionDays: number;
  maxRetentionDays: number;
  immutable: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

function partitionKey(tenantId: string | null): string {
  return tenantId ?? PARTITION_GLOBAL;
}

function toPolicy(doc: RetentionPolicyDoc): RetentionPolicy {
  return {
    id: doc.id,
    tenantId: doc.tenantId === PARTITION_GLOBAL ? null : doc.tenantId,
    category: doc.category as RetentionPolicy['category'],
    severity: doc.severity as RetentionPolicy['severity'],
    retentionDays: doc.retentionDays,
    archiveAfterDays: doc.archiveAfterDays,
    deleteAfterDays: doc.deleteAfterDays,
    minRetentionDays: doc.minRetentionDays,
    maxRetentionDays: doc.maxRetentionDays,
    immutable: doc.immutable,
    createdBy: doc.createdBy,
    createdAt: new Date(doc.createdAt),
    updatedBy: doc.updatedBy,
    updatedAt: new Date(doc.updatedAt),
  };
}

export class CosmosRetentionPoliciesRepository {
  constructor(private containerName: string) {}

  private getContainer() {
    return getContainer(this.containerName);
  }

  async findFirst(args: {
    where: { tenantId: string | null; category?: string | null; severity?: string | null };
    orderBy?: { tenantId: string };
  }): Promise<RetentionPolicy | null> {
    const pk = partitionKey(args.where.tenantId);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: { name: string; value: string | number | boolean | null }[] = [
      { name: '@tenantId', value: pk },
    ];
    if (args.where.category != null) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: args.where.category });
    }
    if (args.where.severity != null) {
      query += ' AND c.severity = @severity';
      parameters.push({ name: '@severity', value: args.where.severity });
    }
    query += ' ORDER BY c.category ASC, c.severity ASC';
    const { resources } = await this.getContainer().items
      .query({ query, parameters })
      .fetchNext();
    const first = resources?.[0] as RetentionPolicyDoc | undefined;
    return first ? toPolicy(first) : null;
  }

  async findUnique(args: { where: { id: string } }): Promise<RetentionPolicy | null> {
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: args.where.id }],
      })
      .fetchNext();
    const doc = resources?.[0] as RetentionPolicyDoc | undefined;
    return doc ? toPolicy(doc) : null;
  }

  async findMany(args: {
    where?: { tenantId?: string | null };
    orderBy?: Array<{ tenantId?: string; category?: string; severity?: string }>;
  }): Promise<RetentionPolicy[]> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: string | number | boolean | null }[] = [];
    if (args.where?.tenantId !== undefined) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: args.where.tenantId ?? PARTITION_GLOBAL });
    }
    const orderBy = args.orderBy ?? [
      { tenantId: 'asc' as const },
      { category: 'asc' as const },
      { severity: 'asc' as const },
    ];
    const orderParts: string[] = [];
    for (const o of orderBy) {
      const key = Object.keys(o)[0];
      const dir = (Object.values(o)[0] as string) === 'asc' ? 'ASC' : 'DESC';
      orderParts.push(`c.${key} ${dir}`);
    }
    const orderClause = orderParts.length ? orderParts.join(', ') : 'c.createdAt ASC';
    const { resources } = await this.getContainer().items
      .query({
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY ${orderClause}`,
        parameters,
      })
      .fetchNext();
    return (resources ?? []).map((r: unknown) => toPolicy(r as RetentionPolicyDoc));
  }

  async create(data: {
    tenantId: string | null;
    category?: string | null;
    severity?: string | null;
    retentionDays: number;
    archiveAfterDays?: number | null;
    deleteAfterDays: number;
    minRetentionDays: number;
    maxRetentionDays: number;
    immutable?: boolean;
    createdBy: string;
    updatedBy: string;
  }): Promise<RetentionPolicy> {
    const pk = partitionKey(data.tenantId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const doc: RetentionPolicyDoc = {
      id,
      tenantId: pk,
      category: data.category ?? null,
      severity: data.severity ?? null,
      retentionDays: data.retentionDays,
      archiveAfterDays: data.archiveAfterDays ?? null,
      deleteAfterDays: data.deleteAfterDays,
      minRetentionDays: data.minRetentionDays,
      maxRetentionDays: data.maxRetentionDays,
      immutable: data.immutable ?? false,
      createdBy: data.createdBy,
      createdAt: now,
      updatedBy: data.updatedBy,
      updatedAt: now,
    };
    await this.getContainer().items.create(doc, { partitionKey: pk } as Record<string, unknown>);
    return toPolicy(doc);
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      retentionDays?: number;
      archiveAfterDays?: number | null;
      deleteAfterDays?: number;
      immutable?: boolean;
      updatedBy: string;
    }
  ): Promise<RetentionPolicy> {
    const pk = partitionKey(tenantId);
    const { resource: existing } = await this.getContainer().item(id, pk).read<RetentionPolicyDoc>();
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Retention policy not found');
    }
    const now = new Date().toISOString();
    const updated: RetentionPolicyDoc = {
      ...existing,
      retentionDays: data.retentionDays ?? existing.retentionDays,
      archiveAfterDays: data.archiveAfterDays !== undefined ? data.archiveAfterDays : existing.archiveAfterDays,
      deleteAfterDays: data.deleteAfterDays ?? existing.deleteAfterDays,
      immutable: data.immutable ?? existing.immutable,
      updatedBy: data.updatedBy,
      updatedAt: now,
    };
    await this.getContainer().item(id, pk).replace(updated as unknown as Record<string, unknown>);
    return toPolicy(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const pk = partitionKey(tenantId);
    const { resource: existing } = await this.getContainer().item(id, pk).read<RetentionPolicyDoc>();
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Retention policy not found');
    }
    await this.getContainer().item(id, pk).delete();
  }
}
