/**
 * At-Risk Reasons Service (Plan §11.11, §944)
 * Aggregates atRiskReasons from risk_evaluations for "Top at-risk reasons" in dashboard.
 */

import { getContainer } from '@coder/shared/database';

export interface TopAtRiskReason {
  reason: string;
  count: number;
  /** Plan §944: from at_risk_reasons_mitigation config when key matches */
  suggestedMitigation?: string;
}

/**
 * Get top at-risk reasons for the tenant from risk_evaluations. For "Top at-risk reasons" widget in manager/executive dashboard.
 * @param mitigationMap - Optional map reason -> playbook/action id or label (Plan §11.11, §944). From config at_risk_reasons_mitigation.
 */
export async function getTopAtRiskReasons(
  tenantId: string,
  limit = 15,
  mitigationMap?: Record<string, string>
): Promise<TopAtRiskReason[]> {
  const container = getContainer('risk_evaluations');
  const { resources } = await container.items
    .query<{ atRiskReasons?: string[] }>({
      query: 'SELECT c.atRiskReasons FROM c WHERE c.tenantId = @tenantId',
      parameters: [{ name: '@tenantId', value: tenantId }],
    }, { partitionKey: tenantId })
    .fetchAll();

  const counts = new Map<string, number>();
  for (const r of resources ?? []) {
    const arr = r.atRiskReasons;
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      if (typeof s === 'string' && s.trim()) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
  }

  const map = mitigationMap ?? {};
  return Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      ...(map[reason] && { suggestedMitigation: map[reason] }),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
