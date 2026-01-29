/**
 * ChainOfThoughtService (Plan W5 Layer 5)
 * Stub implementation: returns deterministic mock output; persists LLMOutput to Cosmos.
 * Real LLM integration (Azure OpenAI, Anthropic) can replace the stub later.
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import type {
  LLMOutput,
  LLMOutputType,
  LLMInputContext,
  LLMOutputData,
  Recommendation,
  Scenario,
  LLMReasoningRequest,
  ReactivationRecommendation,
  ReactivationStrategyRequest,
} from '../types/llm.types';

export class ChainOfThoughtService {
  private config: ReturnType<typeof loadConfig>;
  private containerName: string;

  constructor() {
    this.config = loadConfig();
    this.containerName = this.config.cosmos_db.containers.llm_outputs;
  }

  async explain(context: LLMReasoningRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: context.opportunityId,
      predictionId: context.predictionId,
      explanationId: context.explanationId,
      context: context.context,
    };
    const text = `Stub explanation for opportunity ${context.opportunityId}. Risk factors and key drivers will be populated when LLM provider is configured.`;
    const output: LLMOutputData = { text };
    await this.saveOutput(tenantId, 'explanation', context.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  async generateRecommendations(context: LLMReasoningRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: context.opportunityId,
      predictionId: context.predictionId,
      explanationId: context.explanationId,
      context: context.context,
    };
    const recommendations: Recommendation[] = [
      { action: 'Schedule executive alignment call', priority: 'high', rationale: 'Stub: align with decision makers.' },
      { action: 'Update opportunity stage', priority: 'medium', rationale: 'Stub: keep CRM in sync.' },
    ];
    const output: LLMOutputData = { recommendations };
    await this.saveOutput(tenantId, 'recommendations', context.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  async analyzeScenarios(context: LLMReasoningRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: context.opportunityId,
      predictionId: context.predictionId,
      explanationId: context.explanationId,
      context: context.context,
    };
    const scenarios: Scenario[] = [
      { type: 'best', probability: 0.3, description: 'Stub best case.', assumptions: ['Timely approval'] },
      { type: 'base', probability: 0.5, description: 'Stub base case.', assumptions: ['Current pace'] },
      { type: 'worst', probability: 0.2, description: 'Stub worst case.', assumptions: ['Delays'] },
    ];
    const output: LLMOutputData = { scenarios };
    await this.saveOutput(tenantId, 'scenarios', context.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  async generateSummary(context: LLMReasoningRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: context.opportunityId,
      predictionId: context.predictionId,
      explanationId: context.explanationId,
      context: context.context,
    };
    const text = `Stub summary for opportunity ${context.opportunityId}. Key insights and narrative will be generated when LLM is configured.`;
    const output: LLMOutputData = { text };
    await this.saveOutput(tenantId, 'summary', context.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  async generatePlaybook(context: LLMReasoningRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: context.opportunityId,
      predictionId: context.predictionId,
      explanationId: context.explanationId,
      context: context.context,
    };
    const text = `Stub playbook for opportunity ${context.opportunityId}. Step-by-step actions will be generated when LLM is configured.`;
    const output: LLMOutputData = { text };
    await this.saveOutput(tenantId, 'playbook', context.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  /**
   * W9 – Generate reactivation strategy (FR-5.4). Stub: builds strategy from dormant features and reactivation prediction when provided.
   */
  async generateReactivationStrategy(request: ReactivationStrategyRequest, tenantId: string): Promise<LLMOutputData> {
    const t0 = Date.now();
    const inputContext: LLMInputContext = {
      opportunityId: request.opportunityId,
      context: {
        dormantFeatures: request.dormantFeatures,
        reactivationPrediction: request.reactivationPrediction,
      },
    };
    const strategy = this.buildReactivationStrategyStub(request);
    const output: LLMOutputData = { reactivationStrategy: strategy };
    await this.saveOutput(tenantId, 'reactivation_strategy', request.opportunityId, inputContext, output, Date.now() - t0);
    return output;
  }

  private buildReactivationStrategyStub(request: ReactivationStrategyRequest): ReactivationRecommendation {
    const pred = request.reactivationPrediction as { reactivationProbability?: number; recommendedApproach?: { channel?: string; tone?: string; emphasis?: string[] } } | undefined;
    const prob = pred?.reactivationProbability ?? 0.5;
    const priority: ReactivationRecommendation['priority'] = prob >= 0.6 ? 'high' : prob >= 0.35 ? 'medium' : 'low';
    const priorityReason = prob >= 0.6
      ? 'Reactivation probability is favorable; prioritize outreach.'
      : prob >= 0.35
        ? 'Moderate reactivation potential; follow structured approach.'
        : 'Lower probability; focus on high-value touch and clear value.';
    const channel = pred?.recommendedApproach?.channel ?? 'email';
    const tone = pred?.recommendedApproach?.tone ?? 'consultative';
    const emphasis = pred?.recommendedApproach?.emphasis ?? ['value', 'timing'];
    const now = new Date();

    return {
      priority,
      priorityReason,
      immediateActions: [
        { action: 'Send initial outreach', priority: 1, expectedOutcome: 'Re-engagement or meeting request', effort: 'low' as const },
        { action: 'Prepare value proposition aligned to stage', priority: 2, expectedOutcome: 'Clear next step', effort: 'medium' as const },
        { action: 'Schedule follow-up if no response in 3 days', priority: 3, expectedOutcome: 'Multi-touch sequence', effort: 'low' as const },
      ],
      outreachPlan: {
        initialContact: {
          channel,
          subject: `Reconnecting – ${request.opportunityId}`,
          keyTalkingPoints: emphasis.map((e) => `Emphasize ${e}`),
          callToAction: 'Schedule a brief call',
          timing: now.toISOString(),
        },
        followUps: [
          { delay: 3, channel: 'email', purpose: 'Follow-up', message: 'Stub: gentle follow-up if no response.' },
          { delay: 7, channel: 'phone', purpose: 'Direct outreach', message: 'Stub: phone follow-up.' },
        ],
        valueProposition: {
          primary: 'Relevant value based on opportunity context.',
          secondary: ['Supporting point 1', 'Supporting point 2'],
          newDevelopments: ['Stub: new features or case studies when LLM configured.'],
        },
        anticipatedObjections: [
          { objection: 'Timing not right', response: 'Propose a brief check-in in 2–4 weeks.' },
          { objection: 'Budget constrained', response: 'Focus on ROI and phased approach.' },
        ],
      },
      resources: {
        contentAssets: ['Case study', 'Product overview'],
        stakeholders: ['Account owner', 'Champion'],
        tools: ['Email template', 'Proposal template'],
      },
      successCriteria: {
        shortTerm: ['Re-engagement response', 'Meeting scheduled'],
        mediumTerm: ['Proposal submitted', 'Demo completed'],
        longTerm: ['Deal closed won'],
      },
      alternativeStrategies: [
        { scenario: 'If no response after 2 touches', alternativeAction: 'Try different channel (phone or meeting).', contingencyPlan: 'Escalate to manager for warm intro.' },
        { scenario: 'If timing is wrong', alternativeAction: 'Set reminder for optimal window.', contingencyPlan: 'Add to nurture sequence.' },
      ],
    };
  }

  async saveOutput(
    tenantId: string,
    outputType: LLMOutputType,
    opportunityId: string,
    inputContext: LLMInputContext,
    output: LLMOutputData,
    latency: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = `llm_output_${outputType}_${opportunityId}_${now.replace(/[:.]/g, '-')}`;
    const llm = this.config.llm ?? { provider: 'mock', model: 'stub', timeout_ms: 10000 };
    const doc: LLMOutput = {
      id,
      tenantId,
      outputType,
      opportunityId,
      inputContext,
      output,
      llmProvider: llm.provider,
      model: llm.model,
      promptTemplate: '',
      latency,
      tokenCount: 0,
      generatedAt: now,
      createdAt: now,
    };
    try {
      const container = getContainer(this.containerName);
      await container.items.upsert(doc);
    } catch (error) {
      log.error('Failed to persist LLMOutput', error, { service: 'llm-service', id, tenantId });
      throw error;
    }
  }
}
