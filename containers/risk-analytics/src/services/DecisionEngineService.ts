/**
 * Decision Engine Service (Plan W5 Layer 6)
 * Evaluates rules, makes decisions, persists to Cosmos. W7 Gap 1: catalog-driven rules.
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import type {
  Decision,
  Rule,
  RuleResult,
  Action,
  EvaluateDecisionRequest,
  MappedRisk,
  ApplyCatalogRulesRequest,
  MethodologyFeaturesInput,
} from '../types/decision.types';
import type { RiskCatalog } from '../types/risk-catalog.types';
import type { RiskCatalogService as RiskCatalogServiceType } from './RiskCatalogService';
import type { SalesMethodologyService } from './SalesMethodologyService';

/** W8 – Fetches methodology features from ml-service (Layer 2). */
export type GetMethodologyFeaturesFn = (tenantId: string, opportunityId: string) => Promise<MethodologyFeaturesInput | null>;

export class DecisionEngineService {
  private config: ReturnType<typeof loadConfig>;
  private decisionsContainerName: string;
  private rulesContainerName: string;
  private riskCatalogService: RiskCatalogServiceType | null;
  private getMethodologyFeatures: GetMethodologyFeaturesFn | null;

  constructor(
    riskCatalogService?: RiskCatalogServiceType,
    _salesMethodologyService?: SalesMethodologyService | null,
    getMethodologyFeatures?: GetMethodologyFeaturesFn | null
  ) {
    this.config = loadConfig();
    this.decisionsContainerName = this.config.cosmos_db.containers.decisions ?? 'risk_decisions';
    this.rulesContainerName = this.config.cosmos_db.containers.rules ?? 'risk_rules';
    this.riskCatalogService = riskCatalogService ?? null;
    this.getMethodologyFeatures = getMethodologyFeatures ?? null;
  }

  /**
   * Get enabled rules for tenant (partitionKey tenantId).
   */
  async getRules(tenantId: string): Promise<Rule[]> {
    const container = getContainer(this.rulesContainerName);
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.enabled = true ORDER BY c.priority DESC',
        parameters: [],
      }, { partitionKey: tenantId })
      .fetchAll();
    return (resources ?? []) as Rule[];
  }

  /**
   * Get all rules for tenant (enabled and disabled). Used for conflict detection (Super Admin §6.3).
   */
  async getAllRules(tenantId: string): Promise<Rule[]> {
    const container = getContainer(this.rulesContainerName);
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c ORDER BY c.priority DESC',
        parameters: [],
      }, { partitionKey: tenantId })
      .fetchAll();
    return (resources ?? []) as Rule[];
  }

  /**
   * Evaluate rules against context (stub: match by riskScore >= threshold if condition field is riskScore).
   */
  evaluateRules(context: { riskScore?: number; opportunityId: string }, rules: Rule[]): RuleResult[] {
    const results: RuleResult[] = [];
    const riskScore = context.riskScore ?? 0;
    for (const rule of rules) {
      let matched = false;
      if (rule.conditions.length === 0) {
        matched = true;
      } else {
        const outcomes = rule.conditions.map((c) => {
          if (c.field === 'riskScore' && (c.operator === '>=' || c.operator === '>')) {
            const threshold = typeof c.value === 'number' ? c.value : Number(c.value);
            return c.operator === '>=' ? riskScore >= threshold : riskScore > threshold;
          }
          return false;
        });
        matched = rule.conditionLogic === 'AND' ? outcomes.every(Boolean) : outcomes.some(Boolean);
      }
      results.push({
        ruleId: rule.id,
        matched,
        actions: matched ? rule.actions : [],
      });
    }
    return results;
  }

  /**
   * Make decision: combine rule results, build Decision, persist.
   */
  async makeDecision(request: EvaluateDecisionRequest, tenantId: string): Promise<Decision> {
    const rules = await this.getRules(tenantId);
    const context = {
      opportunityId: request.opportunityId,
      riskScore: request.riskScore,
    };
    const ruleResults = this.evaluateRules(context, rules);
    const allActions: Action[] = [];
    for (const rr of ruleResults) {
      if (rr.matched && rr.actions.length > 0) {
        for (const a of rr.actions) {
          allActions.push({
            ...a,
            idempotencyKey: a.idempotencyKey || `dec_${request.opportunityId}_${a.type}_${Date.now()}`,
          });
        }
      }
    }
    const now = new Date().toISOString();
    const id = `decision_${request.opportunityId}_${now.replace(/[:.]/g, '-')}`;
    const decision: Decision = {
      id,
      tenantId,
      opportunityId: request.opportunityId,
      decisionType: 'risk_based',
      priority: 'medium',
      rationale: ruleResults.some((r) => r.matched) ? 'Rules matched for opportunity risk context.' : 'No rules matched.',
      source: 'rule',
      ruleResults,
      actions: allActions,
      status: 'pending',
      createdAt: now,
    };
    await this.saveDecision(decision);
    return decision;
  }

  async saveDecision(decision: Decision): Promise<void> {
    const container = getContainer(this.decisionsContainerName);
    try {
      await container.items.upsert(decision);
    } catch (error) {
      log.error('Failed to persist Decision', error, { service: 'risk-analytics', id: decision.id, tenantId: decision.tenantId });
      throw error;
    }
  }

  async getDecision(decisionId: string, tenantId: string): Promise<Decision | null> {
    const container = getContainer(this.decisionsContainerName);
    try {
      const { resource } = await container.item(decisionId, tenantId).read();
      return resource as Decision | null;
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 404) return null;
      throw err;
    }
  }

  /**
   * Create or update a rule (for POST/PUT rules API).
   */
  async upsertRule(rule: Rule): Promise<Rule> {
    const container = getContainer(this.rulesContainerName);
    const now = new Date().toISOString();
    const doc: Rule = {
      ...rule,
      updatedAt: now,
      createdAt: rule.createdAt ?? now,
    };
    await container.items.upsert(doc);
    return doc;
  }

  /**
   * Delete a rule by id (partitionKey = tenantId). §6.1.1.
   */
  async deleteRule(tenantId: string, ruleId: string): Promise<void> {
    const container = getContainer(this.rulesContainerName);
    await container.item(ruleId, tenantId).delete();
  }

  /**
   * Test rule against sample data (stub: run evaluateRules with test context).
   */
  async testRule(rule: Rule, testData: { riskScore?: number; opportunityId: string }): Promise<{ matched: boolean; actions: Action[] }> {
    const results = this.evaluateRules(testData, [rule]);
    const r = results[0];
    return { matched: r?.matched ?? false, actions: r?.actions ?? [] };
  }

  /**
   * W7 Gap 1 – Get rules linked to catalog risk IDs (FR-6.5).
   */
  async getRulesForCatalogRisks(tenantId: string, catalogRiskIds: string[]): Promise<Rule[]> {
    if (catalogRiskIds.length === 0) return [];
    const allRules = await this.getRules(tenantId);
    const idSet = new Set(catalogRiskIds);
    return allRules.filter((r) => r.catalogRiskId && idSet.has(r.catalogRiskId));
  }

  /**
   * W7 Gap 1 – Map detected risks to catalog entries (by riskId or category).
   */
  mapRisksToCatalog(
    detectedRisks: Array<{ riskId: string; riskName: string; category: string; confidence?: number }>,
    catalog: RiskCatalog[]
  ): MappedRisk[] {
    const mapped: MappedRisk[] = [];
    for (const dr of detectedRisks) {
      const byId = catalog.find((c) => c.riskId === dr.riskId);
      if (byId) {
        mapped.push({
          detectedRisk: { riskId: dr.riskId, riskName: dr.riskName, category: dr.category, confidence: dr.confidence },
          catalogRiskId: byId.riskId,
          mappingConfidence: 1,
        });
        continue;
      }
      const byCategory = catalog.find((c) => c.category === dr.category);
      if (byCategory) {
        mapped.push({
          detectedRisk: { riskId: dr.riskId, riskName: dr.riskName, category: dr.category, confidence: dr.confidence },
          catalogRiskId: byCategory.riskId,
          mappingConfidence: 0.8,
        });
      }
    }
    return mapped;
  }

  /**
   * W7 Gap 1 – Apply risk catalog–driven rules (FR-6.5).
   * Gets catalog, maps detected risks to catalog, gets rules for those catalog risks, evaluates and persists decision.
   */
  async applyRiskCatalogRules(request: ApplyCatalogRulesRequest, tenantId: string): Promise<Decision | null> {
    if (!this.riskCatalogService) {
      log.warn('RiskCatalogService not set; skipping applyRiskCatalogRules', { service: 'risk-analytics' });
      return null;
    }
    const detectedRisks = request.detectedRisks ?? [];
    if (detectedRisks.length === 0) {
      return null;
    }
    const catalog = await this.riskCatalogService.getCatalog(tenantId, request.industry);
    const mapped = this.mapRisksToCatalog(detectedRisks, catalog);
    const catalogRiskIds = [...new Set(mapped.map((m) => m.catalogRiskId))];
    const rules = await this.getRulesForCatalogRisks(tenantId, catalogRiskIds);
    const context = {
      opportunityId: request.opportunityId,
      riskScore: request.riskScore ?? 0,
    };
    const ruleResults = this.evaluateRules(context, rules);
    const allActions: Action[] = [];
    for (const rr of ruleResults) {
      if (rr.matched && rr.actions.length > 0) {
        for (const a of rr.actions) {
          allActions.push({
            ...a,
            idempotencyKey: a.idempotencyKey || `dec_${request.opportunityId}_${a.type}_${Date.now()}`,
          });
        }
      }
    }
    const now = new Date().toISOString();
    const id = `decision_${request.opportunityId}_${now.replace(/[:.]/g, '-')}`;
    const decision: Decision = {
      id,
      tenantId,
      opportunityId: request.opportunityId,
      decisionType: 'risk_catalog',
      priority: 'medium',
      rationale: mapped.length > 0
        ? `Catalog-driven rules applied for ${mapped.length} mapped risk(s).`
        : 'No catalog rules matched.',
      source: 'rule',
      ruleResults,
      actions: allActions,
      status: 'pending',
      createdAt: now,
    };
    await this.saveDecision(decision);
    return decision;
  }

  /**
   * W8 – Make methodology-based decisions (Layer 6, FR-6.6).
   * Fetches methodology features from ml-service, builds actions for stage requirements, duration anomaly, methodology fields, MEDDIC.
   */
  async makeMethodologyDecisions(tenantId: string, opportunityId: string): Promise<Decision | null> {
    if (!this.getMethodologyFeatures) {
      log.warn('getMethodologyFeatures not set; skipping makeMethodologyDecisions', { service: 'risk-analytics' });
      return null;
    }
    const features = await this.getMethodologyFeatures(tenantId, opportunityId);
    if (!features) return null;

    const actions: Action[] = [];
    const now = Date.now();

    if (features.stageRequirementsMet < 0.8 && features.stageRequirementsMissing?.length > 0) {
      actions.push({
        type: 'playbook_assignment',
        details: {
          recommendationType: 'stage_requirements_missing',
          reason: `Only ${Math.round(features.stageRequirementsMet * 100)}% of stage requirements met`,
          missing: features.stageRequirementsMissing,
        },
        priority: 'high',
        idempotencyKey: `methodology_${opportunityId}_stage_req_${now}`,
      });
    }

    if (features.stageDurationAnomaly) {
      actions.push({
        type: 'notification',
        details: {
          recommendationType: 'stage_duration_anomaly',
          reason: `Opportunity in stage ${features.daysInCurrentStage} days (expected ~${features.expectedDaysInStage})`,
          daysInCurrentStage: features.daysInCurrentStage,
          expectedDaysInStage: features.expectedDaysInStage,
        },
        priority: 'medium',
        idempotencyKey: `methodology_${opportunityId}_duration_${now}`,
      });
    }

    if (features.methodologyFieldsComplete < 0.7 && features.methodologyFieldsMissing?.length > 0) {
      actions.push({
        type: 'task_creation',
        details: {
          recommendationType: 'methodology_incomplete',
          missing: features.methodologyFieldsMissing,
        },
        priority: 'medium',
        idempotencyKey: `methodology_${opportunityId}_fields_${now}`,
      });
    }

    if (features.meddic && features.meddic.meddicScore < 0.6) {
      const recs: string[] = [];
      if (!features.meddic.economicBuyerIdentified) recs.push('Identify and engage economic buyer');
      if (!features.meddic.championIdentified) recs.push('Identify and develop champion');
      if (!features.meddic.metricsIdentified) recs.push('Quantify business value metrics');
      if (!features.meddic.decisionCriteriaKnown) recs.push('Understand decision criteria');
      actions.push({
        type: 'playbook_assignment',
        details: {
          recommendationType: 'meddic_score_low',
          reason: `MEDDIC score ${features.meddic.meddicScore} (target >0.6)`,
          meddicScore: features.meddic.meddicScore,
          recommendations: recs,
        },
        priority: 'high',
        idempotencyKey: `methodology_${opportunityId}_meddic_${now}`,
      });
    }

    if (actions.length === 0) return null;

    const priority = actions.some((a) => a.priority === 'high') ? 'high' : 'medium';
    const decisionId = `decision_${opportunityId}_methodology_${now}`;
    const createdAt = new Date().toISOString();
    const decision: Decision = {
      id: decisionId,
      tenantId,
      opportunityId,
      decisionType: 'methodology',
      priority,
      rationale: `Methodology-based: ${actions.length} recommendation(s) (stage requirements, duration, fields, MEDDIC).`,
      source: 'methodology',
      actions,
      status: 'pending',
      createdAt,
    };
    await this.saveDecision(decision);
    return decision;
  }
}
