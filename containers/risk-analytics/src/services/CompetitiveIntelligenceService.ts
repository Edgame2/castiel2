/**
 * Competitive Intelligence Service
 * CRUD and tracking for competitors and risk_competitor_tracking. Plan §3.1.1, §3.1.2, §10 Phase 1.
 * Phase 1.2: optional shard path (competitors_use_shards); new data written to c_competitor and c_opportunity_competitor shards.
 */

import { getContainer } from '@coder/shared/database';
import type { ServiceClient } from '@coder/shared';

const WIN_LOSS_REASONS_CONTAINER = 'risk_win_loss_reasons';

/** Optional context for dual-source competitors (shards + legacy containers). */
export interface CompetitiveIntelligenceShardContext {
  useShards: boolean;
  shardManagerClient: ServiceClient;
  getToken: (tenantId: string) => string;
  /** Tenant id where shard types are registered (e.g. system). Defaults to tenantId when listing. */
  bootstrapTenantId?: string;
  /** User id for creating shards (e.g. system or request user). */
  systemUserId?: string;
  /** Resolved on first use if missing */
  cCompetitorTypeId?: string;
  cOpportunityCompetitorTypeId?: string;
}

export interface CompetitorTrackingRow {
  id: string;
  tenantId: string;
  opportunityId: string;
  competitorId: string;
  competitorName: string;
  detectedDate?: string;
  mentionCount?: number;
  lastMentionDate?: string;
  sentiment?: number;
  winLikelihood?: number;
}

export interface TrackCompetitorInput {
  opportunityId: string;
  competitorName?: string;
  mentionCount?: number;
  sentiment?: number;
  winLikelihood?: number;
}

export interface TrackCompetitorResult {
  id: string;
  tenantId: string;
  opportunityId: string;
  competitorId: string;
  competitorName: string;
  detectedDate: string;
  lastMentionDate: string;
  mentionCount: number;
  sentiment?: number;
  winLikelihood?: number;
}

export interface CompetitorForOpportunity {
  competitorId: string;
  competitorName: string;
  detectedDate?: string;
  mentionCount?: number;
  lastMentionDate?: string;
  sentiment?: number;
  winLikelihood?: number;
}

export interface CompetitorCatalogItem {
  id: string;
  name: string;
  aliases?: string[];
  industry?: string;
}

/** Resolve shard type ids for c_competitor and c_opportunity_competitor (bootstrap tenant). */
async function ensureCompetitorShardTypeIds(
  ctx: CompetitiveIntelligenceShardContext,
  tenantId: string
): Promise<void> {
  if (ctx.cCompetitorTypeId && ctx.cOpportunityCompetitorTypeId) return;
  const typeTenantId = ctx.bootstrapTenantId ?? tenantId;
  try {
    const list = await ctx.shardManagerClient.get<Array<{ id: string; name: string }>>(
      '/api/v1/shard-types?limit=100',
      { headers: { 'X-Tenant-ID': typeTenantId, Authorization: `Bearer ${ctx.getToken(typeTenantId)}` } }
    );
    const arr = Array.isArray(list) ? list : [];
    const cCompetitor = arr.find((t) => t.name === 'c_competitor');
    const cOppComp = arr.find((t) => t.name === 'c_opportunity_competitor');
    if (cCompetitor) (ctx as { cCompetitorTypeId?: string }).cCompetitorTypeId = cCompetitor.id;
    if (cOppComp) (ctx as { cOpportunityCompetitorTypeId?: string }).cOpportunityCompetitorTypeId = cOppComp.id;
  } catch {
    // ignore; type ids stay undefined and create will fail
  }
}

/**
 * List competitors in the tenant catalog (Plan Gap 4: for CompetitorSelectModal).
 * Queries the competitors container; when ctx.useShards, merges with c_competitor shards from shard-manager.
 */
export async function listCompetitors(
  tenantId: string,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<CompetitorCatalogItem[]> {
  const fromContainer: CompetitorCatalogItem[] = [];
  try {
    const container = getContainer('competitors');
    const { resources } = await container.items
      .query<{ id: string; name?: string; aliases?: string[]; industry?: string }>(
        { query: 'SELECT c.id, c.name, c.aliases, c.industry FROM c', parameters: [] },
        { partitionKey: tenantId }
      )
      .fetchAll();
    fromContainer.push(
      ...(resources ?? []).map((r) => ({
        id: r.id,
        name: r.name ?? 'Unknown',
        ...(Array.isArray(r.aliases) && r.aliases.length > 0 && { aliases: r.aliases }),
        ...(typeof r.industry === 'string' && r.industry && { industry: r.industry }),
      }))
    );
  } catch {
    // ignore
  }

  if (ctx?.useShards && ctx.shardManagerClient) {
    try {
      const res = await ctx.shardManagerClient.get<{ items: Array<{ id: string; structuredData?: { name?: string; industry?: string } }> }>(
        '/api/v1/shards?shardTypeName=c_competitor&status=active&limit=1000',
        { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` } }
      );
      const items = res?.items ?? [];
      const fromContainerIds = new Set(fromContainer.map((c) => c.id));
      for (const s of items) {
        if (!fromContainerIds.has(s.id)) {
          fromContainerIds.add(s.id);
          fromContainer.push({
            id: s.id,
            name: s.structuredData?.name ?? 'Unknown',
            ...(typeof s.structuredData?.industry === 'string' && s.structuredData.industry && { industry: s.structuredData.industry }),
          });
        }
      }
    } catch {
      // fallback to container only
    }
  }
  return fromContainer;
}

/**
 * Get competitors linked to an opportunity from risk_competitor_tracking.
 * When ctx.useShards, merges with c_opportunity_competitor shards (filtered by opportunityId).
 */
export async function getCompetitorsForOpportunity(
  tenantId: string,
  opportunityId: string,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<CompetitorForOpportunity[]> {
  const out: CompetitorForOpportunity[] = [];
  const container = getContainer('risk_competitor_tracking');
  try {
    const { resources } = await container.items
      .query<CompetitorTrackingRow>(
        {
          query:
            'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId ORDER BY c.mentionCount DESC, c.lastMentionDate DESC',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@opportunityId', value: opportunityId },
          ],
        },
        { partitionKey: tenantId }
      )
      .fetchAll();
    for (const r of resources ?? []) {
      out.push({
        competitorId: r.competitorId,
        competitorName: r.competitorName || 'Unknown',
        ...(r.detectedDate && { detectedDate: r.detectedDate }),
        ...(typeof r.mentionCount === 'number' && { mentionCount: r.mentionCount }),
        ...(r.lastMentionDate && { lastMentionDate: r.lastMentionDate }),
        ...(typeof r.sentiment === 'number' && { sentiment: r.sentiment }),
        ...(typeof r.winLikelihood === 'number' && { winLikelihood: r.winLikelihood }),
      });
    }
  } catch {
    // ignore
  }

  if (ctx?.useShards && ctx.shardManagerClient) {
    try {
      const res = await ctx.shardManagerClient.get<{ items: Array<{ id: string; structuredData?: Record<string, unknown> }> }>(
        '/api/v1/shards?shardTypeName=c_opportunity_competitor&status=active&limit=1000',
        { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` } }
      );
      const items = (res?.items ?? []).filter((s) => s.structuredData?.opportunityId === opportunityId);
      const seen = new Set(out.map((o) => o.competitorId));
      for (const s of items) {
        const competitorId = String(s.structuredData?.competitorId ?? '');
        if (!competitorId || seen.has(competitorId)) continue;
        seen.add(competitorId);
        let competitorName = 'Unknown';
        try {
          const comp = await ctx.shardManagerClient.get<{ structuredData?: { name?: string } }>(
            `/api/v1/shards/${competitorId}`,
            { headers: { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` } }
          );
          competitorName = comp?.structuredData?.name ?? competitorName;
        } catch {
          // keep Unknown
        }
        out.push({
          competitorId,
          competitorName,
          ...(s.structuredData?.detectedAt != null ? { detectedDate: String(s.structuredData.detectedAt) } : {}),
          ...(typeof s.structuredData?.mentionCount === 'number' ? { mentionCount: s.structuredData.mentionCount } : {}),
          ...(s.structuredData?.lastMentionDate != null ? { lastMentionDate: String(s.structuredData.lastMentionDate) } : {}),
          ...(typeof s.structuredData?.sentiment === 'number' ? { sentiment: s.structuredData.sentiment } : {}),
          ...(typeof s.structuredData?.winLikelihood === 'number' ? { winLikelihood: s.structuredData.winLikelihood } : {}),
        });
      }
    } catch {
      // fallback to container only
    }
  }
  return out.sort((a, b) => (b.mentionCount ?? 0) - (a.mentionCount ?? 0));
}

/**
 * Resolve competitor name from competitors container when not provided.
 */
async function resolveCompetitorName(tenantId: string, competitorId: string): Promise<string | null> {
  try {
    const container = getContainer('competitors');
    const { resource } = await container.item(competitorId, tenantId).read();
    return (resource as { name?: string } | null)?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Track a competitor on an opportunity: upsert risk_competitor_tracking.
 * When ctx.useShards, also create/update c_competitor and c_opportunity_competitor shards.
 * Id = {tenantId}_{opportunityId}_{competitorId}. Increments mentionCount, sets lastMentionDate=now.
 */
export async function trackCompetitor(
  tenantId: string,
  competitorId: string,
  input: TrackCompetitorInput,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<TrackCompetitorResult> {
  const now = new Date().toISOString();
  const competitorName =
    input.competitorName ?? (await resolveCompetitorName(tenantId, competitorId)) ?? 'Unknown';

  const id = `${tenantId}_${input.opportunityId}_${competitorId}`;
  const container = getContainer('risk_competitor_tracking');

  let existing: CompetitorTrackingRow | null = null;
  try {
    const { resource } = await container.item(id, tenantId).read();
    existing = resource as CompetitorTrackingRow | null;
  } catch {
    // not found
  }

  const mentionCount =
    typeof input.mentionCount === 'number'
      ? input.mentionCount
      : (existing?.mentionCount ?? 0) + 1;
  const detectedDate = existing?.detectedDate ?? now;
  const doc: CompetitorTrackingRow = {
    id,
    tenantId,
    opportunityId: input.opportunityId,
    competitorId,
    competitorName,
    detectedDate,
    lastMentionDate: now,
    mentionCount,
    ...(typeof input.sentiment === 'number' && { sentiment: input.sentiment }),
    ...(typeof input.winLikelihood === 'number' && { winLikelihood: input.winLikelihood }),
  };
  if (typeof input.sentiment !== 'number' && typeof existing?.sentiment === 'number') doc.sentiment = existing.sentiment;
  if (typeof input.winLikelihood !== 'number' && typeof existing?.winLikelihood === 'number') doc.winLikelihood = existing.winLikelihood;

  await container.items.upsert(doc);

  if (ctx?.useShards && ctx.shardManagerClient) {
    await ensureCompetitorShardTypeIds(ctx, tenantId);
  }
  if (ctx?.useShards && ctx.shardManagerClient && ctx.cCompetitorTypeId && ctx.cOpportunityCompetitorTypeId) {
    try {
      const typeIdComp = ctx.cCompetitorTypeId;
      const typeIdOppComp = ctx.cOpportunityCompetitorTypeId;
      const userId = ctx.systemUserId ?? 'system';
      const headers = { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` };
      let competitorShardId = competitorId;
      if (typeIdComp) {
        try {
          await ctx.shardManagerClient.get(`/api/v1/shards/${competitorId}`, { headers });
        } catch {
          const createComp = await ctx.shardManagerClient.post<{ id: string }>(
            '/api/v1/shards',
            {
              shardTypeId: typeIdComp,
              structuredData: { name: competitorName },
              userId,
              source: 'api',
            },
            { headers }
          );
          competitorShardId = createComp?.id ?? competitorId;
        }
      }
      if (typeIdOppComp) {
        const listRes = await ctx.shardManagerClient.get<{ items: Array<{ id: string; structuredData?: Record<string, unknown> }> }>(
          '/api/v1/shards?shardTypeName=c_opportunity_competitor&status=active&limit=500',
          { headers }
        );
        const items = (listRes?.items ?? []).filter(
          (s) => s.structuredData?.opportunityId === input.opportunityId && s.structuredData?.competitorId === competitorId
        );
        const body = {
          opportunityId: input.opportunityId,
          competitorId: competitorShardId,
          mentionCount,
          detectedAt: detectedDate,
          lastMentionDate: now,
          ...(typeof doc.sentiment === 'number' && { sentiment: doc.sentiment }),
          ...(typeof doc.winLikelihood === 'number' && { winLikelihood: doc.winLikelihood }),
        };
        const internal_relationships = [
          { shardId: input.opportunityId, relationshipType: 'for_opportunity' },
          { shardId: competitorShardId, relationshipType: 'competitor' },
        ];
        if (items.length > 0) {
          await ctx.shardManagerClient.put(`/api/v1/shards/${items[0].id}`, { structuredData: body, internal_relationships }, { headers });
        } else {
          await ctx.shardManagerClient.post(
            '/api/v1/shards',
            { shardTypeId: typeIdOppComp, structuredData: body, userId, internal_relationships, source: 'api' },
            { headers }
          );
        }
      }
    } catch {
      // shard write best-effort; container already updated
    }
  }

  const result: TrackCompetitorResult = {
    id: doc.id,
    tenantId: doc.tenantId,
    opportunityId: doc.opportunityId,
    competitorId: doc.competitorId,
    competitorName: doc.competitorName,
    detectedDate: doc.detectedDate!,
    lastMentionDate: doc.lastMentionDate ?? now,
    mentionCount: doc.mentionCount ?? 1,
  };
  if (typeof doc.sentiment === 'number') result.sentiment = doc.sentiment;
  if (typeof doc.winLikelihood === 'number') result.winLikelihood = doc.winLikelihood;
  return result;
}

/** Input for creating a competitor (c_competitor shard). Plan Full UI: CRUD for competitor master when using shards. */
export interface CreateCompetitorInput {
  name: string;
  segment?: string;
  strengths?: string[];
  weaknesses?: string[];
  differentiation?: string;
  website?: string;
  region?: string;
  industry?: string;
}

/** Create a competitor in the catalog. When ctx.useShards, creates c_competitor shard; otherwise not supported. */
export async function createCompetitor(
  tenantId: string,
  input: CreateCompetitorInput,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<{ id: string; name: string }> {
  if (!ctx?.useShards || !ctx.shardManagerClient) {
    throw new Error('Competitor catalog create requires competitors_use_shards and shard-manager');
  }
  await ensureCompetitorShardTypeIds(ctx, tenantId);
  if (!ctx.cCompetitorTypeId) throw new Error('c_competitor shard type not found');
  const userId = ctx.systemUserId ?? 'system';
  const headers = { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` };
  const created = await ctx.shardManagerClient.post<{ id: string; structuredData?: { name?: string } }>(
    '/api/v1/shards',
    {
      shardTypeId: ctx.cCompetitorTypeId,
      structuredData: {
        name: input.name,
        ...(input.segment && { segment: input.segment }),
        ...(Array.isArray(input.strengths) && { strengths: input.strengths }),
        ...(Array.isArray(input.weaknesses) && { weaknesses: input.weaknesses }),
        ...(input.differentiation && { differentiation: input.differentiation }),
        ...(input.website && { website: input.website }),
        ...(input.region && { region: input.region }),
        ...(input.industry && { industry: input.industry }),
      },
      userId,
      source: 'api',
    },
    { headers }
  );
  return { id: created?.id ?? '', name: created?.structuredData?.name ?? input.name };
}

/** Update a competitor. When ctx.useShards, updates c_competitor shard. */
export async function updateCompetitor(
  tenantId: string,
  id: string,
  input: Partial<CreateCompetitorInput>,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<void> {
  if (!ctx?.useShards || !ctx.shardManagerClient) {
    throw new Error('Competitor catalog update requires competitors_use_shards and shard-manager');
  }
  const headers = { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` };
  const existing = await ctx.shardManagerClient.get<{ structuredData?: Record<string, unknown> }>(
    `/api/v1/shards/${id}`,
    { headers }
  );
  const structuredData = { ...(existing?.structuredData ?? {}), ...input };
  await ctx.shardManagerClient.put(`/api/v1/shards/${id}`, { structuredData }, { headers });
}

/** Delete (archive) a competitor. When ctx.useShards, deletes c_competitor shard. */
export async function deleteCompetitor(
  tenantId: string,
  id: string,
  ctx?: CompetitiveIntelligenceShardContext
): Promise<void> {
  if (!ctx?.useShards || !ctx.shardManagerClient) {
    throw new Error('Competitor catalog delete requires competitors_use_shards and shard-manager');
  }
  const headers = { 'X-Tenant-ID': tenantId, Authorization: `Bearer ${ctx.getToken(tenantId)}` };
  await ctx.shardManagerClient.delete(`/api/v1/shards/${id}`, { headers });
}

export interface CompetitiveIntelligenceDashboard {
  totalOpportunitiesWithCompetitors: number;
  totalMentions: number;
  topCompetitorsByMentions: { competitorId: string; competitorName: string; mentionCount: number }[];
  recentMentionCount: number;
  winLoss: { wins: number; losses: number; winRate: number };
}

/**
 * Get competitive intelligence dashboard: aggregates from risk_competitor_tracking.
 * winLoss is stub (wins/losses/winRate=0) until c_opportunity IsClosed/IsWon is wired via shard-manager.
 * Plan §4.1 getDashboard: Win/loss, landscape.
 */
export async function getDashboard(tenantId: string): Promise<CompetitiveIntelligenceDashboard> {
  const container = getContainer('risk_competitor_tracking');
  const { resources } = await container.items
    .query<CompetitorTrackingRow>(
      { query: 'SELECT * FROM c WHERE c.tenantId = @tenantId', parameters: [{ name: '@tenantId', value: tenantId }] },
      { partitionKey: tenantId }
    )
    .fetchAll();

  const rows = resources ?? [];
  const opportunityIds = new Set(rows.map((r) => r.opportunityId).filter(Boolean));
  const totalMentions = rows.reduce((s, r) => s + (typeof r.mentionCount === 'number' ? r.mentionCount : 0), 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentMentionCount = rows.filter((r) => {
    const d = r.lastMentionDate;
    return d && new Date(d) >= sevenDaysAgo;
  }).length;

  const byCompetitor = new Map<string, { competitorName: string; mentionCount: number }>();
  for (const r of rows) {
    const id = r.competitorId || 'unknown';
    const cur = byCompetitor.get(id);
    const inc = typeof r.mentionCount === 'number' ? r.mentionCount : 0;
    if (!cur) {
      byCompetitor.set(id, { competitorName: r.competitorName || 'Unknown', mentionCount: inc });
    } else {
      cur.mentionCount += inc;
    }
  }
  const topCompetitorsByMentions = Array.from(byCompetitor.entries())
    .map(([competitorId, v]) => ({ competitorId, competitorName: v.competitorName, mentionCount: v.mentionCount }))
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 10);

  // Plan §11.8, §943: winLoss from risk_win_loss_reasons (lossReason/winReason ingestion)
  let wins = 0;
  let losses = 0;
  try {
    const wlContainer = getContainer(WIN_LOSS_REASONS_CONTAINER);
    const { resources: wlRows } = await wlContainer.items
      .query<{ winReason?: string; lossReason?: string }>(
        { query: 'SELECT c.winReason, c.lossReason FROM c WHERE c.tenantId = @tenantId', parameters: [{ name: '@tenantId', value: tenantId }] },
        { partitionKey: tenantId }
      )
      .fetchAll();
    for (const r of wlRows ?? []) {
      if (typeof r.winReason === 'string' && r.winReason.trim()) wins += 1;
      if (typeof r.lossReason === 'string' && r.lossReason.trim()) losses += 1;
    }
  } catch {
    // container missing or query error: keep 0,0
  }
  const total = wins + losses;
  const winRate = total > 0 ? wins / total : 0;

  return {
    totalOpportunitiesWithCompetitors: opportunityIds.size,
    totalMentions,
    topCompetitorsByMentions,
    recentMentionCount,
    winLoss: { wins, losses, winRate },
  };
}

export interface WinLossByCompetitorRow {
  competitorId: string;
  competitorName: string;
  wins: number;
  losses: number;
  winRate: number;
}

export interface CompetitiveWinLossResponse {
  byCompetitor: WinLossByCompetitorRow[];
  totalWins: number;
  totalLosses: number;
  overallWinRate: number;
}

/** Plan §11.8, §943: win/loss reasons per opportunity. Stored in risk_win_loss_reasons. */
export interface WinLossReasons {
  opportunityId: string;
  tenantId: string;
  lossReason?: string;
  winReason?: string;
  competitorId?: string;
  recordedAt: string;
}

export interface RecordWinLossReasonsInput {
  lossReason?: string;
  winReason?: string;
  competitorId?: string;
}

/**
 * Win/loss by competitor. Uses risk_competitor_tracking for competitor list and risk_win_loss_reasons for wins/losses (Plan §11.8, §943).
 * Plan §4.1 analyzeWinLossByCompetitor.
 */
export async function analyzeWinLossByCompetitor(tenantId: string): Promise<CompetitiveWinLossResponse> {
  const container = getContainer('risk_competitor_tracking');
  const { resources } = await container.items
    .query<CompetitorTrackingRow>(
      { query: 'SELECT * FROM c WHERE c.tenantId = @tenantId', parameters: [{ name: '@tenantId', value: tenantId }] },
      { partitionKey: tenantId }
    )
    .fetchAll();

  const rows = resources ?? [];
  const byCompetitor = new Map<string, { competitorName: string; wins: number; losses: number }>();
  for (const r of rows) {
    const id = r.competitorId || 'unknown';
    if (!byCompetitor.has(id)) {
      byCompetitor.set(id, { competitorName: r.competitorName || 'Unknown', wins: 0, losses: 0 });
    }
  }

  let totalWins = 0;
  let totalLosses = 0;
  try {
    const wlContainer = getContainer(WIN_LOSS_REASONS_CONTAINER);
    const { resources: wlRows } = await wlContainer.items
      .query<{ winReason?: string; lossReason?: string; competitorId?: string }>(
        { query: 'SELECT c.winReason, c.lossReason, c.competitorId FROM c WHERE c.tenantId = @tenantId', parameters: [{ name: '@tenantId', value: tenantId }] },
        { partitionKey: tenantId }
      )
      .fetchAll();
    for (const r of wlRows ?? []) {
      if (typeof r.winReason === 'string' && r.winReason.trim()) totalWins += 1;
      if (typeof r.lossReason === 'string' && r.lossReason.trim()) {
        totalLosses += 1;
        const cid = (typeof r.competitorId === 'string' && r.competitorId.trim()) ? r.competitorId : 'unknown';
        let cur = byCompetitor.get(cid);
        if (!cur) {
          cur = { competitorName: cid, wins: 0, losses: 0 };
          byCompetitor.set(cid, cur);
        }
        cur.losses += 1;
      }
    }
  } catch {
    // keep 0,0 and byCompetitor from tracking only
  }

  const overallWinRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0;
  const byCompetitorList: WinLossByCompetitorRow[] = Array.from(byCompetitor.entries()).map(
    ([competitorId, v]) => ({
      competitorId,
      competitorName: v.competitorName,
      wins: v.wins,
      losses: v.losses,
      winRate: v.wins + v.losses > 0 ? v.wins / (v.wins + v.losses) : 0,
    })
  );

  return {
    byCompetitor: byCompetitorList.sort((a, b) => a.competitorName.localeCompare(b.competitorName)),
    totalWins,
    totalLosses,
    overallWinRate,
  };
}

/**
 * Record win/loss reasons for an opportunity (Plan §11.8, §943). Upserts risk_win_loss_reasons.
 * Feeds CompetitiveIntelligenceService; use in win/loss analytics when c_opportunity IsClosed/IsWon is wired.
 */
export async function recordWinLossReasons(
  opportunityId: string,
  tenantId: string,
  input: RecordWinLossReasonsInput
): Promise<WinLossReasons> {
  const now = new Date().toISOString();
  const container = getContainer(WIN_LOSS_REASONS_CONTAINER);
  const id = opportunityId;
  let existing: WinLossReasons | null = null;
  try {
    const { resource } = await container.item(id, tenantId).read();
    existing = resource as WinLossReasons | null;
  } catch {
    // not found
  }
  const doc: WinLossReasons & { id: string } = {
    id,
    opportunityId,
    tenantId,
    lossReason: input.lossReason ?? existing?.lossReason,
    winReason: input.winReason ?? existing?.winReason,
    competitorId: input.competitorId ?? existing?.competitorId,
    recordedAt: now,
  };
  await container.items.upsert(doc);
  return { opportunityId: doc.opportunityId, tenantId: doc.tenantId, lossReason: doc.lossReason, winReason: doc.winReason, competitorId: doc.competitorId, recordedAt: doc.recordedAt };
}

/**
 * Get win/loss reasons for an opportunity (Plan §11.8, §943).
 */
export async function getWinLossReasons(opportunityId: string, tenantId: string): Promise<WinLossReasons | null> {
  const container = getContainer(WIN_LOSS_REASONS_CONTAINER);
  try {
    const { resource } = await container.item(opportunityId, tenantId).read();
    const r = resource as (WinLossReasons & { id?: string }) | null;
    if (!r) return null;
    return { opportunityId: r.opportunityId ?? opportunityId, tenantId: r.tenantId ?? tenantId, lossReason: r.lossReason, winReason: r.winReason, competitorId: r.competitorId, recordedAt: r.recordedAt };
  } catch {
    return null;
  }
}
