/**
 * Product Service (Plan Full UI).
 * CRUD for c_product shards via shard-manager.
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config/index.js';

export interface ProductRule {
  type?: string;
  field?: string;
  operator?: string;
  value?: unknown;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  goodFitIf?: ProductRule[];
  badFitIf?: ProductRule[];
  website?: string;
  region?: string;
  industry?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  status?: string;
  goodFitIf?: ProductRule[];
  badFitIf?: ProductRule[];
}

export class ProductService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient | null = null;
  private getToken: ((tenantId: string) => string) | null = null;

  constructor(getToken?: (tenantId: string) => string) {
    this.config = loadConfig();
    const url = this.config.services?.shard_manager?.url;
    if (url) {
      this.shardManagerClient = new ServiceClient({
        baseURL: url,
        timeout: 15000,
        retries: 2,
        circuitBreaker: { enabled: true },
      });
    }
    this.getToken = getToken ?? null;
  }

  private headers(tenantId: string): Record<string, string> {
    const h: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (this.getToken) h['Authorization'] = `Bearer ${this.getToken(tenantId)}`;
    return h;
  }

  async list(tenantId: string): Promise<Product[]> {
    if (!this.shardManagerClient || !this.getToken) return [];
    const headers = this.headers(tenantId);
    try {
      const res = await this.shardManagerClient.get<{ items: Array<{ id: string; structuredData?: Record<string, unknown> }> }>(
        '/api/v1/shards?shardTypeName=c_product&status=active&limit=500',
        { headers }
      );
      const items = res?.items ?? [];
      return items.map((s) => ({
        id: s.id,
        name: String(s.structuredData?.name ?? ''),
        description: s.structuredData?.description as string | undefined,
        category: s.structuredData?.category as string | undefined,
        status: s.structuredData?.status as string | undefined,
        goodFitIf: s.structuredData?.goodFitIf as ProductRule[] | undefined,
        badFitIf: s.structuredData?.badFitIf as ProductRule[] | undefined,
        website: s.structuredData?.website as string | undefined,
        region: s.structuredData?.region as string | undefined,
        industry: s.structuredData?.industry as string | undefined,
      }));
    } catch {
      return [];
    }
  }

  async getById(tenantId: string, id: string): Promise<Product | null> {
    if (!this.shardManagerClient || !this.getToken) return null;
    const headers = this.headers(tenantId);
    try {
      const s = await this.shardManagerClient.get<{ id: string; structuredData?: Record<string, unknown> }>(
        `/api/v1/shards/${id}`,
        { headers }
      );
      if (!s) return null;
      return {
        id: s.id,
        name: String(s.structuredData?.name ?? ''),
        description: s.structuredData?.description as string | undefined,
        category: s.structuredData?.category as string | undefined,
        status: s.structuredData?.status as string | undefined,
        goodFitIf: s.structuredData?.goodFitIf as ProductRule[] | undefined,
        badFitIf: s.structuredData?.badFitIf as ProductRule[] | undefined,
        website: s.structuredData?.website as string | undefined,
        region: s.structuredData?.region as string | undefined,
        industry: s.structuredData?.industry as string | undefined,
      };
    } catch {
      return null;
    }
  }

  async create(tenantId: string, input: CreateProductInput, userId: string): Promise<Product> {
    if (!this.shardManagerClient || !this.getToken) throw new Error('Product service requires shard-manager');
    const headers = this.headers(tenantId);
    const types = await this.shardManagerClient.get<Array<{ id: string; name: string }>>(
      '/api/v1/shard-types?limit=100',
      { headers: { ...headers, 'X-Tenant-ID': 'system' } }
    );
    const typeId = Array.isArray(types) ? types.find((t) => t.name === 'c_product')?.id : undefined;
    if (!typeId) throw new Error('c_product shard type not found');
    const created = await this.shardManagerClient.post<{ id: string; structuredData?: Record<string, unknown> }>(
      '/api/v1/shards',
      {
        shardTypeId: typeId,
        structuredData: {
          name: input.name,
          ...(input.description && { description: input.description }),
          ...(input.category && { category: input.category }),
          ...(input.status && { status: input.status }),
          ...(Array.isArray(input.goodFitIf) && { goodFitIf: input.goodFitIf }),
          ...(Array.isArray(input.badFitIf) && { badFitIf: input.badFitIf }),
        },
        userId,
        source: 'api',
      },
      { headers }
    );
    const sd = created?.structuredData ?? {};
    return {
      id: created?.id ?? '',
      name: String(sd.name ?? input.name),
      description: sd.description as string | undefined,
      category: sd.category as string | undefined,
      status: sd.status as string | undefined,
      goodFitIf: sd.goodFitIf as ProductRule[] | undefined,
      badFitIf: sd.badFitIf as ProductRule[] | undefined,
    };
  }

  async update(tenantId: string, id: string, input: Partial<CreateProductInput>, _userId: string): Promise<void> {
    if (!this.shardManagerClient || !this.getToken) throw new Error('Product service requires shard-manager');
    const headers = this.headers(tenantId);
    const existing = await this.shardManagerClient.get<{ structuredData?: Record<string, unknown> }>(
      `/api/v1/shards/${id}`,
      { headers }
    );
    const structuredData = { ...(existing?.structuredData ?? {}), ...input };
    await this.shardManagerClient.put(`/api/v1/shards/${id}`, { structuredData }, { headers });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    if (!this.shardManagerClient || !this.getToken) throw new Error('Product service requires shard-manager');
    const headers = this.headers(tenantId);
    await this.shardManagerClient.delete(`/api/v1/shards/${id}`, { headers });
  }
}
