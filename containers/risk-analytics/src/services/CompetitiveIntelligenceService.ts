/**
 * Competitive Intelligence Service
 * CRUD and tracking for competitors and risk_competitor_tracking. Plan §3.1.1, §3.1.2, §10 Phase 1.
 */

import { getContainer } from '@coder/shared/database';

const WIN_LOSS_REASONS_CONTAINER = 'risk_win_loss_reasons';

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

/**
 * List competitors in the tenant catalog (Plan Gap 4: for CompetitorSelectModal).
 * Queries the competitors container; partition key tenantId.
 */
export async function listCompetitors(tenantId: string): Promise<CompetitorCatalogItem[]> {
  try {
    const container = getContainer('competitors');
    const { resources } = await container.items
      .query<{ id: string; name?: string; aliases?: string[]; industry?: string }>(
        { query: 'SELECT c.id, c.name, c.aliases, c.industry FROM c', parameters: [] },
        { partitionKey: tenantId }
      )
      .fetchAll();
    return (resources ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? 'Unknown',
      ...(Array.isArray(r.aliases) && r.aliases.length > 0 && { aliases: r.aliases }),
      ...(typeof r.industry === 'string' && r.industry && { industry: r.industry }),
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Get competitors linked to an opportunity from risk_competitor_tracking.
 * Enriches name from competitors container when available.
 */
export async function getCompetitorsForOpportunity(
  tenantId: string,
  opportunityId: string
): Promise<CompetitorForOpportunity[]> {
  const container = getContainer('risk_competitor_tracking');
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

  if (!resources || resources.length === 0) {
    return [];
  }

  const out: CompetitorForOpportunity[] = resources.map((r) => ({
    competitorId: r.competitorId,
    competitorName: r.competitorName || 'Unknown',
    ...(r.detectedDate && { detectedDate: r.detectedDate }),
    ...(typeof r.mentionCount === 'number' && { mentionCount: r.mentionCount }),
    ...(r.lastMentionDate && { lastMentionDate: r.lastMentionDate }),
    ...(typeof r.sentiment === 'number' && { sentiment: r.sentiment }),
    ...(typeof r.winLikelihood === 'number' && { winLikelihood: r.winLikelihood }),
  }));
  return out;
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
 * Id = {tenantId}_{opportunityId}_{competitorId}. Increments mentionCount, sets lastMentionDate=now.
 */
export async function trackCompetitor(
  tenantId: string,
  competitorId: string,
  input: TrackCompetitorInput
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
  // Preserve existing sentiment/winLikelihood when not overridden
  if (typeof input.sentiment !== 'number' && typeof existing?.sentiment === 'number') doc.sentiment = existing.sentiment;
  if (typeof input.winLikelihood !== 'number' && typeof existing?.winLikelihood === 'number') doc.winLikelihood = existing.winLikelihood;

  await container.items.upsert(doc);

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
