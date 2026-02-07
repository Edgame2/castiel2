/**
 * Stakeholder Graph Service (Plan §924)
 * Builds stakeholder graph from shard-manager relationships: has_contact (opportunity→contact),
 * has_stakeholder (alias), reports_to (contact→contact). Optional Azure ML centrality: Phase 2.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';

export interface StakeholderGraphNode {
  id: string;
  type: 'opportunity' | 'contact';
  label?: string;
}

export interface StakeholderGraphEdge {
  source: string;
  target: string;
  relationshipType: string;
}

export interface StakeholderGraphResponse {
  nodes: StakeholderGraphNode[];
  edges: StakeholderGraphEdge[];
}

export class StakeholderGraphService {
  private app: FastifyInstance | null;
  private shardManagerClient: ServiceClient;

  constructor(app: FastifyInstance | null) {
    this.app = app ?? null;
    const config = loadConfig();
    this.shardManagerClient = new ServiceClient({
      baseURL: config.services?.shard_manager?.url || '',
      timeout: 15000,
      retries: 2,
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) return '';
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Get stakeholder graph for an opportunity. Nodes: opportunity + contacts (has_contact/has_stakeholder).
   * Edges: opportunity→contact, contact→contact (reports_to). Centrality: Phase 2 (Azure ML).
   */
  async getGraph(opportunityId: string, tenantId: string): Promise<StakeholderGraphResponse> {
    const nodes: StakeholderGraphNode[] = [{ id: opportunityId, type: 'opportunity', label: opportunityId }];
    const edges: StakeholderGraphEdge[] = [];
    const contactIds = new Set<string>();

    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      for (const relType of ['has_contact', 'has_stakeholder']) {
        const r = await this.shardManagerClient.get<{ sourceShardId?: string; targetShardId?: string; relationshipType?: string }[] | { edges?: { sourceShardId?: string; targetShardId?: string; relationshipType?: string }[] }>(
          `/api/v1/shards/${opportunityId}/relationships?relationshipType=${relType}&limit=100`,
          { headers }
        );
        const list = Array.isArray(r) ? r : (r as { edges?: unknown[] })?.edges ?? [];
        for (const e of list) {
          const src = (e as { sourceShardId?: string }).sourceShardId;
          const tgt = (e as { targetShardId?: string }).targetShardId;
          const typ = (e as { relationshipType?: string }).relationshipType ?? relType;
          if (src && tgt) {
            const other = src === opportunityId ? tgt : src;
            contactIds.add(other);
            edges.push({ source: src, target: tgt, relationshipType: typ });
          }
        }
      }

      for (const cid of contactIds) {
        nodes.push({ id: cid, type: 'contact', label: cid });
      }

      for (const cid of contactIds) {
        const r = await this.shardManagerClient.get<{ sourceShardId?: string; targetShardId?: string; relationshipType?: string }[] | { edges?: { sourceShardId?: string; targetShardId?: string; relationshipType?: string }[] }>(
          `/api/v1/shards/${cid}/relationships?relationshipType=reports_to&limit=50`,
          { headers }
        );
        const list = Array.isArray(r) ? r : (r as { edges?: unknown[] })?.edges ?? [];
        for (const e of list) {
          const src = (e as { sourceShardId?: string }).sourceShardId;
          const tgt = (e as { targetShardId?: string }).targetShardId;
          if (src && tgt) {
            if (contactIds.has(src) || contactIds.has(tgt)) {
              edges.push({ source: src, target: tgt, relationshipType: 'reports_to' });
              contactIds.add(src);
              contactIds.add(tgt);
            }
          }
        }
      }

      for (const cid of contactIds) {
        if (!nodes.some(n => n.id === cid)) {
          nodes.push({ id: cid, type: 'contact', label: cid });
        }
      }

      return { nodes, edges };
    } catch (e) {
      log.warn('StakeholderGraphService.getGraph failed', { error: e instanceof Error ? e.message : String(e), opportunityId, tenantId, service: 'risk-analytics' });
      return { nodes, edges };
    }
  }
}
