/**
 * Cosmos DB access for audit_alert_rules. Partition key: tenantId (organizationId or 'global').
 */

import { getContainer } from '@coder/shared/database';
import { randomUUID } from 'crypto';

const PARTITION_GLOBAL = 'global';

export interface AlertRuleDoc {
  id: string;
  tenantId: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  type: string;
  conditions: Record<string, unknown>;
  notificationChannels: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AlertRuleRow {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  type: string;
  conditions: Record<string, unknown>;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

function tenantId(organizationId: string | null): string {
  return organizationId ?? PARTITION_GLOBAL;
}

function toRow(doc: AlertRuleDoc): AlertRuleRow {
  return {
    id: doc.id,
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description,
    enabled: doc.enabled,
    type: doc.type,
    conditions: doc.conditions,
    notificationChannels: doc.notificationChannels ?? [],
    createdBy: doc.createdBy,
    createdAt: new Date(doc.createdAt),
    updatedBy: doc.updatedBy,
    updatedAt: new Date(doc.updatedAt),
  };
}

export class CosmosAlertRulesRepository {
  constructor(private containerName: string) {}

  private getContainer() {
    return getContainer(this.containerName);
  }

  async findMany(args: { where?: { enabled?: boolean; organizationId?: string | null }; orderBy?: { createdAt: string } }): Promise<AlertRuleRow[]> {
    const conditions: string[] = ['1=1'];
    const parameters: { name: string; value: unknown }[] = [];
    if (args.where?.enabled !== undefined) {
      conditions.push('c.enabled = @enabled');
      parameters.push({ name: '@enabled', value: args.where.enabled });
    }
    if (args.where?.organizationId !== undefined) {
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: args.where.organizationId ?? PARTITION_GLOBAL });
    }
    const order = args.orderBy?.createdAt === 'desc' ? 'DESC' : 'ASC';
    const { resources } = await this.getContainer().items
      .query({
        query: `SELECT * FROM c WHERE ${conditions.join(' AND ')} ORDER BY c.createdAt ${order}`,
        parameters: parameters as { name: string; value: string | number | boolean | null }[],
      })
      .fetchNext();
    return (resources ?? []).map((r: unknown) => toRow(r as AlertRuleDoc));
  }

  async findUnique(args: { where: { id: string } }): Promise<AlertRuleRow | null> {
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: args.where.id }] as { name: string; value: string | number | boolean | null }[],
      })
      .fetchNext();
    return resources?.length ? toRow(resources[0] as AlertRuleDoc) : null;
  }

  /** Get rule by id within tenant partition (tenant-scoped). */
  async findUniqueByIdAndTenant(id: string, organizationId: string): Promise<AlertRuleRow | null> {
    const pk = tenantId(organizationId);
    const { resources } = await this.getContainer().items
      .query(
        {
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: id }] as { name: string; value: string | number | boolean | null }[],
        },
        { partitionKey: pk }
      )
      .fetchNext();
    return resources?.length ? toRow(resources[0] as AlertRuleDoc) : null;
  }

  async create(args: {
    data: {
      id?: string;
      organizationId: string | null;
      name: string;
      description: string | null;
      enabled: boolean;
      type: string;
      conditions: Record<string, unknown>;
      notificationChannels: unknown;
      createdBy: string;
      updatedBy: string;
    };
  }): Promise<AlertRuleRow> {
    const id = args.data.id ?? randomUUID();
    const now = new Date().toISOString();
    const doc: AlertRuleDoc = {
      id,
      tenantId: tenantId(args.data.organizationId),
      organizationId: args.data.organizationId,
      name: args.data.name,
      description: args.data.description,
      enabled: args.data.enabled,
      type: args.data.type,
      conditions: args.data.conditions,
      notificationChannels: Array.isArray(args.data.notificationChannels) ? args.data.notificationChannels : [],
      createdBy: args.data.createdBy,
      createdAt: now,
      updatedBy: args.data.updatedBy,
      updatedAt: now,
    };
    await this.getContainer().items.create(doc, { partitionKey: doc.tenantId } as Record<string, unknown>);
    return toRow(doc);
  }

  async update(args: { where: { id: string }; data: Partial<AlertRuleRow> & { updatedBy: string } }): Promise<AlertRuleRow> {
    const existing = await this.findUnique({ where: { id: args.where.id } });
    if (!existing) throw new Error('Alert rule not found');
    const pk = tenantId(existing.organizationId);
    const now = new Date().toISOString();
    const doc: AlertRuleDoc = {
      id: existing.id,
      tenantId: pk,
      organizationId: existing.organizationId,
      name: args.data.name ?? existing.name,
      description: args.data.description !== undefined ? args.data.description : existing.description,
      enabled: args.data.enabled !== undefined ? args.data.enabled : existing.enabled,
      type: args.data.type ?? existing.type,
      conditions: (args.data.conditions as Record<string, unknown>) ?? existing.conditions,
      notificationChannels: (args.data.notificationChannels as string[]) ?? existing.notificationChannels,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt.toISOString(),
      updatedBy: args.data.updatedBy,
      updatedAt: now,
    };
    await this.getContainer().item(existing.id, pk).replace(doc);
    return toRow(doc);
  }

  async delete(args: { where: { id: string } }): Promise<void> {
    const existing = await this.findUnique({ where: { id: args.where.id } });
    if (!existing) return;
    await this.getContainer().item(existing.id, tenantId(existing.organizationId)).delete();
  }
}
