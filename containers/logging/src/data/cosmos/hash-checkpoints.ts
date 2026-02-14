/**
 * Cosmos DB access for audit_hash_checkpoints.
 * Partition key: tenantId (tenantId or 'global' for null).
 */

import { getContainer } from '@coder/shared/database';
import { randomUUID } from 'crypto';

const PARTITION_GLOBAL = 'global';

export interface HashCheckpointRow {
  id: string;
  tenantId: string | null;
  checkpointTimestamp: Date;
  lastLogId: string;
  lastHash: string;
  logCount: number;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  status: string;
  createdAt: Date;
}

export interface HashCheckpointDoc {
  id: string;
  tenantId: string;
  checkpointTimestamp: string;
  lastLogId: string;
  lastHash: string;
  logCount: number;
  verifiedAt: string | null;
  verifiedBy: string | null;
  status: string;
  createdAt: string;
}

function partitionKey(tenantIdVal: string | null): string {
  return tenantIdVal ?? PARTITION_GLOBAL;
}

function toRow(doc: HashCheckpointDoc): HashCheckpointRow {
  return {
    id: doc.id,
    tenantId: doc.tenantId === PARTITION_GLOBAL ? null : doc.tenantId,
    checkpointTimestamp: new Date(doc.checkpointTimestamp),
    lastLogId: doc.lastLogId,
    lastHash: doc.lastHash,
    logCount: doc.logCount,
    verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt) : null,
    verifiedBy: doc.verifiedBy,
    status: doc.status,
    createdAt: new Date(doc.createdAt),
  };
}

export class CosmosHashCheckpointsRepository {
  constructor(private containerName: string) {}

  private getContainer() {
    return getContainer(this.containerName);
  }

  async create(data: {
    tenantId: string | null;
    checkpointTimestamp: Date;
    lastLogId: string;
    lastHash: string;
    logCount: number;
    verifiedBy: string | null;
    status: string;
    verifiedAt: Date | null;
  }): Promise<HashCheckpointRow> {
    const pk = partitionKey(data.tenantId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const doc: HashCheckpointDoc = {
      id,
      tenantId: pk,
      checkpointTimestamp: data.checkpointTimestamp.toISOString(),
      lastLogId: data.lastLogId,
      lastHash: data.lastHash,
      logCount: data.logCount,
      verifiedAt: data.verifiedAt?.toISOString() ?? null,
      verifiedBy: data.verifiedBy,
      status: data.status,
      createdAt: now,
    };
    await this.getContainer().items.create(doc, { partitionKey: pk } as Record<string, unknown>);
    return toRow(doc);
  }

  async findMany(args: {
    where?: { tenantId?: string | null; status?: string };
    orderBy: { checkpointTimestamp: 'desc' };
    take: number;
  }): Promise<HashCheckpointRow[]> {
    const limit = args.take;
    const conditions: string[] = [];
    const parameters: { name: string; value: string | number | boolean | null }[] = [];
    if (args.where?.tenantId !== undefined) {
      const pk = partitionKey(args.where.tenantId);
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: pk });
    }
    if (args.where?.status != null) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: args.where.status });
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM c ${whereClause} ORDER BY c.checkpointTimestamp DESC`;
    const { resources } = await this.getContainer().items
      .query({ query, parameters }, { maxItemCount: limit })
      .fetchNext();
    const items = (resources ?? []).slice(0, limit);
    return items.map((r: unknown) => toRow(r as HashCheckpointDoc));
  }

  async findUnique(args: { where: { id: string } }): Promise<HashCheckpointRow | null> {
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: args.where.id }],
      })
      .fetchNext();
    const doc = resources?.[0] as HashCheckpointDoc | undefined;
    return doc ? toRow(doc) : null;
  }
}
