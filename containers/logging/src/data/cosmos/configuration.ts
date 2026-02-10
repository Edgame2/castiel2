/**
 * Cosmos DB access for audit_configurations.
 * Partition key: tenantId (organizationId or 'global' for null org).
 */

import { getContainer } from '@coder/shared/database';
import { randomUUID } from 'crypto';
import type { OrganizationConfig } from '../../types';

const PARTITION_GLOBAL = 'global';

export interface ConfigurationDoc {
  id: string;
  tenantId: string;
  organizationId: string | null;
  captureIpAddress: boolean;
  captureUserAgent: boolean;
  captureGeolocation: boolean;
  redactSensitiveData: boolean;
  redactionPatterns: string[];
  hashChainEnabled: boolean;
  alertsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function tenantId(organizationId: string | null | undefined): string {
  return organizationId ?? PARTITION_GLOBAL;
}

function toConfig(doc: ConfigurationDoc): OrganizationConfig {
  return {
    id: doc.id,
    organizationId: doc.organizationId ?? undefined,
    captureIpAddress: doc.captureIpAddress,
    captureUserAgent: doc.captureUserAgent,
    captureGeolocation: doc.captureGeolocation,
    redactSensitiveData: doc.redactSensitiveData,
    redactionPatterns: doc.redactionPatterns ?? [],
    hashChainEnabled: doc.hashChainEnabled,
    alertsEnabled: doc.alertsEnabled,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

export class CosmosConfigurationRepository {
  constructor(private containerName: string) {}

  private getContainer() {
    return getContainer(this.containerName);
  }

  async findFirst(args: { where: { organizationId: string | null } }): Promise<OrganizationConfig | null> {
    const pk = tenantId(args.where.organizationId);
    const { resources } = await this.getContainer().items
      .query({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
        parameters: [{ name: '@tenantId', value: pk }],
      })
      .fetchNext();
    return resources?.length ? toConfig(resources[0] as ConfigurationDoc) : null;
  }

  async upsert(organizationId: string | undefined, data: Record<string, unknown>): Promise<OrganizationConfig> {
    const pk = tenantId(organizationId);
    const existing = await this.findFirst({ where: { organizationId: organizationId ?? null } });
    const now = new Date().toISOString();
    const id = existing?.id ?? randomUUID();
    const doc: ConfigurationDoc = {
      id,
      tenantId: pk,
      organizationId: organizationId ?? null,
      captureIpAddress: (data.captureIpAddress as boolean) ?? true,
      captureUserAgent: (data.captureUserAgent as boolean) ?? true,
      captureGeolocation: (data.captureGeolocation as boolean) ?? false,
      redactSensitiveData: (data.redactSensitiveData as boolean) ?? true,
      redactionPatterns: Array.isArray(data.redactionPatterns) ? (data.redactionPatterns as string[]) : [],
      hashChainEnabled: (data.hashChainEnabled as boolean) ?? true,
      alertsEnabled: (data.alertsEnabled as boolean) ?? true,
      createdAt: existing ? (existing as { createdAt?: Date }).createdAt?.toISOString?.() ?? now : now,
      updatedAt: now,
    };
    await this.getContainer().item(id, pk).replace(doc);
    return toConfig(doc);
  }

  async delete(args: { where: { organizationId: string | null } }): Promise<void> {
    const config = await this.findFirst({ where: args.where });
    if (!config) return;
    const pk = tenantId(args.where.organizationId);
    await this.getContainer().item(config.id, pk).delete();
  }
}
