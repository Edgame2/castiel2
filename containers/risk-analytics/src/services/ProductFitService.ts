/**
 * Product Fit Service (Phase 3).
 * Evaluates c_product goodFitIf/badFitIf rules against opportunity/account and writes product_fit shards.
 */

import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config';
import { log } from '../utils/logger';

export interface ProductFitRule {
  type?: string;
  field?: string;
  operator?: string;
  value?: unknown;
}

export interface ProductFitResult {
  productId: string;
  productName?: string;
  score: number;
  dimensions?: Record<string, unknown>;
}

export interface ProductFitAssessment {
  opportunityId: string;
  assessments: ProductFitResult[];
  evaluatedAt: string;
}

function evaluateRule(rule: ProductFitRule, context: Record<string, unknown>): boolean {
  const field = rule.field;
  const op = (rule.operator || 'eq').toLowerCase();
  const val = rule.value;
  if (!field) return false;
  const dataVal = context[field] ?? context[field.toLowerCase()];
  if (op === 'in' && Array.isArray(val)) {
    return val.some((v) => String(v) === String(dataVal));
  }
  if (op === 'eq') {
    return String(dataVal) === String(val);
  }
  if (op === 'gte' || op === 'lte' || op === 'gt' || op === 'lt') {
    const num = Number(dataVal);
    const limit = Number(val);
    if (Number.isNaN(num) || Number.isNaN(limit)) return false;
    if (op === 'gte') return num >= limit;
    if (op === 'lte') return num <= limit;
    if (op === 'gt') return num > limit;
    if (op === 'lt') return num < limit;
  }
  return false;
}

function scoreProduct(
  goodFitIf: ProductFitRule[],
  badFitIf: ProductFitRule[],
  context: Record<string, unknown>
): number {
  let score = 0.5;
  const good = Array.isArray(goodFitIf) ? goodFitIf : [];
  const bad = Array.isArray(badFitIf) ? badFitIf : [];
  for (const r of good) {
    if (evaluateRule(r, context)) score += 0.1;
  }
  for (const r of bad) {
    if (evaluateRule(r, context)) score -= 0.2;
  }
  return Math.max(0, Math.min(1, score));
}

export class ProductFitService {
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

  /**
   * Evaluate product fit for an opportunity and persist product_fit shards.
   */
  async evaluate(tenantId: string, opportunityId: string): Promise<ProductFitAssessment> {
    const assessments: ProductFitResult[] = [];
    if (!this.shardManagerClient || !this.getToken) {
      return { opportunityId, assessments, evaluatedAt: new Date().toISOString() };
    }
    const headers = this.headers(tenantId);
    try {
      const opportunity = await this.shardManagerClient.get<{ structuredData?: Record<string, unknown>; id?: string }>(
        `/api/v1/shards/${opportunityId}`,
        { headers }
      );
      const oppData = (opportunity?.structuredData ?? {}) as Record<string, unknown>;
      const accountId = oppData.AccountId as string | undefined;
      let accountData: Record<string, unknown> = {};
      if (accountId) {
        try {
          const account = await this.shardManagerClient.get<{ structuredData?: Record<string, unknown> }>(
            `/api/v1/shards/${accountId}`,
            { headers }
          );
          accountData = (account?.structuredData ?? {}) as Record<string, unknown>;
        } catch {
          // ignore
        }
      }
      const context = { ...accountData, ...oppData };

      const listRes = await this.shardManagerClient.get<{ items: Array<{ id: string; structuredData?: Record<string, unknown> }> }>(
        '/api/v1/shards?shardTypeName=c_product&status=active&limit=500',
        { headers }
      );
      const products = listRes?.items ?? [];
      let productFitTypeId: string | undefined;
      try {
        const types = await this.shardManagerClient.get<Array<{ id: string; name: string }>>(
          '/api/v1/shard-types?limit=100',
          { headers: { ...headers, 'X-Tenant-ID': 'system' } }
        );
        const arr = Array.isArray(types) ? types : [];
        productFitTypeId = arr.find((t) => t.name === 'product_fit')?.id;
      } catch {
        // ignore
      }

      const userId = 'system';
      for (const product of products) {
        const sd = product.structuredData ?? {};
        const goodFitIf = (sd.goodFitIf ?? []) as ProductFitRule[];
        const badFitIf = (sd.badFitIf ?? []) as ProductFitRule[];
        const score = scoreProduct(goodFitIf, badFitIf, context);
        assessments.push({
          productId: product.id,
          productName: sd.name as string,
          score,
        });

        if (productFitTypeId) {
          try {
            const existing = await this.shardManagerClient.get<{
              items: Array<{ id: string; structuredData?: { opportunityId?: string; productId?: string } }>;
            }>(
              '/api/v1/shards?shardTypeName=product_fit&status=active&limit=500',
              { headers }
            );
            const items = (existing?.items ?? []).filter(
              (s) =>
                s.structuredData?.opportunityId === opportunityId && s.structuredData?.productId === product.id
            );
            const body = {
              opportunityId,
              productId: product.id,
              score,
              source: 'product_fit_service',
              timestamp: new Date().toISOString(),
            };
            if (items.length > 0) {
              await this.shardManagerClient.put(`/api/v1/shards/${items[0].id}`, { structuredData: body }, { headers });
            } else {
              await this.shardManagerClient.post(
                '/api/v1/shards',
                {
                  shardTypeId: productFitTypeId,
                  structuredData: body,
                  userId,
                  internal_relationships: [
                    { shardId: opportunityId, relationshipType: 'for_opportunity' },
                    { shardId: product.id, relationshipType: 'product' },
                  ],
                  source: 'api',
                },
                { headers }
              );
            }
          } catch (err) {
            log.warn('ProductFitService: failed to write product_fit shard', {
              productId: product.id,
              opportunityId,
              error: err instanceof Error ? err.message : String(err),
              service: 'risk-analytics',
            });
          }
        }
      }
    } catch (err) {
      log.warn('ProductFitService.evaluate failed', {
        opportunityId,
        tenantId,
        error: err instanceof Error ? err.message : String(err),
        service: 'risk-analytics',
      });
    }
    return {
      opportunityId,
      assessments,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get product-fit assessments for an opportunity (from shards or compute on demand).
   */
  async getProductFit(tenantId: string, opportunityId: string): Promise<ProductFitResult[]> {
    if (!this.shardManagerClient || !this.getToken) return [];
    const headers = this.headers(tenantId);
    try {
      const res = await this.shardManagerClient.get<{ items: Array<{ structuredData?: Record<string, unknown> }> }>(
        '/api/v1/shards?shardTypeName=product_fit&status=active&limit=500',
        { headers }
      );
      const items = (res?.items ?? []).filter(
        (s) => (s.structuredData?.opportunityId as string) === opportunityId
      );
      return items.map((s) => ({
        productId: String(s.structuredData?.productId ?? ''),
        productName: s.structuredData?.productName as string | undefined,
        score: Number(s.structuredData?.score ?? 0.5),
        dimensions: s.structuredData?.dimensions as Record<string, unknown> | undefined,
      }));
    } catch {
      return [];
    }
  }
}
