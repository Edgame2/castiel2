/**
 * Phase 5.3: Risk Analysis Tool for AI Chat
 * 
 * Provides AI Chat with tools to:
 * - Query risk evaluations for opportunities
 * - Explain risk detections
 * - Compare risks across opportunities
 * - Suggest risk mitigation strategies
 * - Trigger risk analysis
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import type {
  RiskEvaluationService,
  RiskCatalogService,
  ShardRepository,
} from '@castiel/api-core';
import type { ToolHandler, ToolExecutionContext } from './ai/ai-tool-executor.service.js';
import type { RiskEvaluation, DetectedRisk } from '../types/risk-analysis.types.js';

export interface RiskAnalysisToolConfig {
  riskEvaluationService: RiskEvaluationService;
  riskCatalogService?: RiskCatalogService;
  shardRepository?: ShardRepository;
  monitoring: IMonitoringProvider;
}

/**
 * Risk Analysis Tool Handlers
 * Provides tools for AI to interact with risk analysis
 */
export class RiskAnalysisToolService {
  constructor(private config: RiskAnalysisToolConfig) {}

  /**
   * Get all risk analysis tools
   */
  getTools(): ToolHandler[] {
    return [
      this.getQueryRiskEvaluationTool(),
      this.getExplainRiskTool(),
      this.getCompareRisksTool(),
      this.getSuggestMitigationTool(),
      this.getTriggerRiskAnalysisTool(),
    ];
  }

  /**
   * Tool: Query risk evaluation for an opportunity
   */
  private getQueryRiskEvaluationTool(): ToolHandler {
    return {
      name: 'query_risk_evaluation',
      description: 'Query risk evaluation for a specific opportunity. Use this when the user asks about risks for an opportunity, wants to know the risk score, or asks "What are the main risks for this opportunity?".',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'The ID of the opportunity to evaluate',
          },
          includeHistorical: {
            type: 'boolean',
            description: 'Whether to include historical risk patterns',
            default: false,
          },
          includeAI: {
            type: 'boolean',
            description: 'Whether to include AI-powered risk detection',
            default: true,
          },
        },
        required: ['opportunityId'],
      },
      enabledByDefault: true,
      requiresPermission: 'risk:read',
      execute: async (args, context) => {
        const opportunityId = args.opportunityId as string;
        const includeHistorical = (args.includeHistorical as boolean) || false;
        const includeAI = (args.includeAI as boolean) !== false;

        this.config.monitoring.trackEvent('risk-analysis-tool.query_risk_evaluation', {
          tenantId: context.tenantId,
          userId: context.userId,
          opportunityId,
        });

        try {
          const evaluation = await this.config.riskEvaluationService.evaluateOpportunity(
            opportunityId,
            context.tenantId,
            context.userId,
            {
              includeHistorical,
              includeAI,
            }
          );

          return {
            success: true,
            opportunityId,
            evaluationDate: evaluation.evaluationDate,
            globalScore: evaluation.riskScore, // Use riskScore from RiskEvaluation type
            categoryScores: evaluation.categoryScores,
            riskCount: evaluation.risks.length,
            topRisks: evaluation.risks
              .sort((a, b) => (b.ponderation || 0) - (a.ponderation || 0))
              .slice(0, 5)
              .map(risk => ({
                riskId: risk.riskId,
                name: risk.riskName,
                category: risk.category,
                ponderation: risk.ponderation,
                confidence: risk.confidence,
                explainability: typeof risk.explainability === 'string' ? risk.explainability : risk.explainability?.reasoning?.summary || 'No explanation available',
              })),
            revenueAtRisk: evaluation.revenueAtRisk,
            trustLevel: evaluation.trustLevel,
            assumptions: {
              dataCompleteness: evaluation.assumptions?.dataCompleteness,
              dataQualityScore: evaluation.assumptions?.dataQualityScore,
              serviceAvailability: evaluation.assumptions?.serviceAvailability,
            },
          };
        } catch (error: any) {
          this.config.monitoring.trackException(error, {
            operation: 'risk-analysis-tool.query_risk_evaluation',
            tenantId: context.tenantId,
            opportunityId,
          });
          return {
            success: false,
            error: error.message || 'Failed to evaluate risk',
          };
        }
      },
    };
  }

  /**
   * Tool: Explain a specific risk detection
   */
  private getExplainRiskTool(): ToolHandler {
    return {
      name: 'explain_risk',
      description: 'Explain why a specific risk was detected for an opportunity. Use this when the user asks "Why is this opportunity marked high risk?" or "Why was this risk detected?".',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'The ID of the opportunity',
          },
          riskId: {
            type: 'string',
            description: 'The ID of the risk to explain (optional - if not provided, explains all risks)',
          },
        },
        required: ['opportunityId'],
      },
      enabledByDefault: true,
      requiresPermission: 'risk:read',
      execute: async (args, context) => {
        const opportunityId = args.opportunityId as string;
        const riskId = args.riskId as string | undefined;

        this.config.monitoring.trackEvent('risk-analysis-tool.explain_risk', {
          tenantId: context.tenantId,
          userId: context.userId,
          opportunityId,
          riskId,
        });

        try {
          const evaluation = await this.config.riskEvaluationService.evaluateOpportunity(
            opportunityId,
            context.tenantId,
            context.userId,
            {
              includeAI: true,
              includeHistorical: true,
            }
          );

          let risksToExplain = evaluation.risks;
          if (riskId) {
            risksToExplain = risksToExplain.filter(r => r.riskId === riskId);
          }

          if (risksToExplain.length === 0) {
            return {
              success: false,
              error: riskId ? `Risk ${riskId} not found` : 'No risks detected',
            };
          }

          const explanations = risksToExplain.map(risk => ({
            riskId: risk.riskId,
            name: risk.riskName,
            category: risk.category,
            explainability: {
              detectionMethod: typeof risk.explainability === 'string' ? undefined : risk.explainability?.detectionMethod,
              confidence: typeof risk.explainability === 'string' ? undefined : risk.explainability?.confidence,
              summary: typeof risk.explainability === 'string' ? risk.explainability : risk.explainability?.reasoning?.summary || '',
              evidence: typeof risk.explainability === 'string' ? undefined : risk.explainability?.evidence,
            },
          }));

          return {
            success: true,
            opportunityId,
            explanations,
          };
        } catch (error: any) {
          this.config.monitoring.trackException(error, {
            operation: 'risk-analysis-tool.explain_risk',
            tenantId: context.tenantId,
            opportunityId,
          });
          return {
            success: false,
            error: error.message || 'Failed to explain risk',
          };
        }
      },
    };
  }

  /**
   * Tool: Compare risks across opportunities
   */
  private getCompareRisksTool(): ToolHandler {
    return {
      name: 'compare_risks',
      description: 'Compare risks across multiple opportunities. Use this when the user asks "How does this risk compare to similar opportunities?" or wants to compare risk profiles.',
      parameters: {
        type: 'object',
        properties: {
          opportunityIds: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of opportunity IDs to compare',
            minItems: 2,
            maxItems: 10,
          },
        },
        required: ['opportunityIds'],
      },
      enabledByDefault: true,
      requiresPermission: 'risk:read',
      execute: async (args, context) => {
        const opportunityIds = args.opportunityIds as string[];

        this.config.monitoring.trackEvent('risk-analysis-tool.compare_risks', {
          tenantId: context.tenantId,
          userId: context.userId,
          opportunityCount: opportunityIds.length,
        });

        try {
          // Evaluate all opportunities in parallel
          const evaluations = await Promise.all(
            opportunityIds.map(id =>
              this.config.riskEvaluationService.evaluateOpportunity(
                id,
                context.tenantId,
                context.userId,
                {
                  includeAI: true,
                  includeHistorical: true,
                }
              ).catch(error => {
                this.config.monitoring.trackException(error, {
                  operation: 'risk-analysis-tool.compare_risks.evaluate',
                  tenantId: context.tenantId,
                  opportunityId: id,
                });
                return null;
              })
            )
          );

          const validEvaluations = evaluations.filter((e): e is RiskEvaluation => e !== null);

          if (validEvaluations.length === 0) {
            return {
              success: false,
              error: 'Failed to evaluate any opportunities',
            };
          }

          // Compare risk scores
          const comparison = {
            opportunities: validEvaluations.map((evaluation, idx) => ({
              opportunityId: opportunityIds[idx] || '',
              globalScore: evaluation.riskScore, // Use riskScore from RiskEvaluation type
              categoryScores: evaluation.categoryScores,
              riskCount: evaluation.risks.length,
              topRisks: evaluation.risks
                .sort((a, b) => (b.ponderation || 0) - (a.ponderation || 0))
                .slice(0, 3)
                .map(r => ({
                  riskId: r.riskId,
                  name: r.riskName,
                  category: r.category,
                  ponderation: r.ponderation,
                })),
              revenueAtRisk: evaluation.revenueAtRisk,
            })),
            summary: {
              highestRisk: validEvaluations.reduce((max, evaluation) =>
                evaluation.riskScore > max.riskScore ? evaluation : max
              ),
              lowestRisk: validEvaluations.reduce((min, evaluation) =>
                evaluation.riskScore < min.riskScore ? evaluation : min
              ),
              averageScore: validEvaluations.reduce((sum, evaluation) => sum + evaluation.riskScore, 0) / validEvaluations.length,
            },
          };

          return {
            success: true,
            comparison,
          };
        } catch (error: any) {
          this.config.monitoring.trackException(error, {
            operation: 'risk-analysis-tool.compare_risks',
            tenantId: context.tenantId,
          });
          return {
            success: false,
            error: error.message || 'Failed to compare risks',
          };
        }
      },
    };
  }

  /**
   * Tool: Suggest risk mitigation strategies
   */
  private getSuggestMitigationTool(): ToolHandler {
    return {
      name: 'suggest_risk_mitigation',
      description: 'Suggest risk mitigation strategies for an opportunity. Use this when the user asks "What can I do to mitigate these risks?" or "How can I reduce the risk?".',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'The ID of the opportunity',
          },
          riskId: {
            type: 'string',
            description: 'The ID of the specific risk to mitigate (optional - if not provided, suggests for all risks)',
          },
        },
        required: ['opportunityId'],
      },
      enabledByDefault: true,
      requiresPermission: 'risk:read',
      execute: async (args, context) => {
        const opportunityId = args.opportunityId as string;
        const riskId = args.riskId as string | undefined;

        this.config.monitoring.trackEvent('risk-analysis-tool.suggest_mitigation', {
          tenantId: context.tenantId,
          userId: context.userId,
          opportunityId,
          riskId,
        });

        try {
          const evaluation = await this.config.riskEvaluationService.evaluateOpportunity(
            opportunityId,
            context.tenantId,
            context.userId,
            {
              includeAI: true,
              includeHistorical: true,
            }
          );

          let risksToMitigate = evaluation.risks;
          if (riskId) {
            risksToMitigate = risksToMitigate.filter(r => r.riskId === riskId);
          }

          if (risksToMitigate.length === 0) {
            return {
              success: false,
              error: riskId ? `Risk ${riskId} not found` : 'No risks detected',
            };
          }

          // Get risk catalog for mitigation suggestions
          let riskCatalog: any[] = [];
          if (this.config.riskCatalogService) {
            try {
              const catalog = await this.config.riskCatalogService.getCatalog(context.tenantId);
              riskCatalog = catalog || [];
            } catch (error) {
              // Continue without catalog
            }
          }

          // Generate mitigation suggestions based on risk category and evidence
          const suggestions = risksToMitigate.map(risk => {
            const catalogRisk = riskCatalog.find(r => r.riskId === risk.riskId);
            
            // Base suggestions on risk category
            const categorySuggestions: Record<string, string[]> = {
              Commercial: [
                'Review pricing strategy and competitive positioning',
                'Strengthen value proposition and differentiation',
                'Engage with key stakeholders to understand requirements',
                'Address competitive threats proactively',
              ],
              Technical: [
                'Conduct technical feasibility assessment',
                'Engage technical experts early in the process',
                'Identify and address technical gaps',
                'Plan for technical resource allocation',
              ],
              Legal: [
                'Review legal and compliance requirements',
                'Engage legal counsel for contract review',
                'Address any regulatory concerns',
                'Ensure proper documentation and approvals',
              ],
              Financial: [
                'Review financial terms and payment structure',
                'Assess creditworthiness and payment history',
                'Consider payment guarantees or escrow',
                'Plan for financial contingencies',
              ],
              Competitive: [
                'Monitor competitive landscape',
                'Strengthen competitive advantages',
                'Address competitive threats',
                'Differentiate value proposition',
              ],
              Operational: [
                'Assess operational capacity and resources',
                'Plan for resource allocation',
                'Address operational bottlenecks',
                'Ensure proper project management',
              ],
            };

            const baseSuggestions = categorySuggestions[risk.category] || [
              'Review risk factors and develop mitigation plan',
              'Engage relevant stakeholders',
              'Monitor risk indicators',
            ];

            // Add evidence-based suggestions
            const evidenceSuggestions: string[] = [];
            if (typeof risk.explainability !== 'string' && risk.explainability?.evidence?.sourceShards) {
              evidenceSuggestions.push(
                `Review related documents: ${risk.explainability.evidence.sourceShards.slice(0, 3).join(', ')}`
              );
            }
            if (typeof risk.explainability !== 'string' && risk.explainability?.evidence?.historicalPatterns) {
              evidenceSuggestions.push(
                `Learn from similar past opportunities: ${risk.explainability.evidence.historicalPatterns.length} similar cases found`
              );
            }

            return {
              riskId: risk.riskId,
              name: risk.riskName,
              category: risk.category,
              suggestions: [...baseSuggestions, ...evidenceSuggestions],
              priority: risk.ponderation || 0.5,
            };
          });

          return {
            success: true,
            opportunityId,
            suggestions,
          };
        } catch (error: any) {
          this.config.monitoring.trackException(error, {
            operation: 'risk-analysis-tool.suggest_mitigation',
            tenantId: context.tenantId,
            opportunityId,
          });
          return {
            success: false,
            error: error.message || 'Failed to suggest mitigation strategies',
          };
        }
      },
    };
  }

  /**
   * Tool: Trigger risk analysis
   */
  private getTriggerRiskAnalysisTool(): ToolHandler {
    return {
      name: 'trigger_risk_analysis',
      description: 'Trigger a new risk analysis for an opportunity. Use this when the user asks to re-evaluate risks, update risk analysis, or trigger risk analysis based on new information.',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'The ID of the opportunity to analyze',
          },
          forceRefresh: {
            type: 'boolean',
            description: 'Whether to force a fresh analysis (ignore cache)',
            default: true,
          },
          includeHistorical: {
            type: 'boolean',
            description: 'Whether to include historical risk patterns',
            default: true,
          },
          includeAI: {
            type: 'boolean',
            description: 'Whether to include AI-powered risk detection',
            default: true,
          },
        },
        required: ['opportunityId'],
      },
      enabledByDefault: true,
      requiresPermission: 'risk:write',
      execute: async (args, context) => {
        const opportunityId = args.opportunityId as string;
        const forceRefresh = (args.forceRefresh as boolean) !== false;
        const includeHistorical = (args.includeHistorical as boolean) !== false;
        const includeAI = (args.includeAI as boolean) !== false;

        this.config.monitoring.trackEvent('risk-analysis-tool.trigger_analysis', {
          tenantId: context.tenantId,
          userId: context.userId,
          opportunityId,
          forceRefresh,
        });

        try {
          const evaluation = await this.config.riskEvaluationService.evaluateOpportunity(
            opportunityId,
            context.tenantId,
            context.userId,
            {
              forceRefresh,
              includeHistorical,
              includeAI,
            }
          );

          return {
            success: true,
            opportunityId,
            evaluationDate: evaluation.evaluationDate,
            globalScore: evaluation.riskScore, // Use riskScore from RiskEvaluation type
            riskCount: evaluation.risks.length,
            message: 'Risk analysis completed successfully',
          };
        } catch (error: any) {
          this.config.monitoring.trackException(error, {
            operation: 'risk-analysis-tool.trigger_analysis',
            tenantId: context.tenantId,
            opportunityId,
          });
          return {
            success: false,
            error: error.message || 'Failed to trigger risk analysis',
          };
        }
      },
    };
  }
}
