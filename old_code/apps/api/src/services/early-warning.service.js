/**
 * Early Warning Service
 * Detects early-warning signals for opportunities
 */
import { ChangeType, RevisionStorageStrategy } from '../types/revision.types.js';
import { v4 as uuidv4 } from 'uuid';
export class EarlyWarningService {
    monitoring;
    shardRepository;
    revisionRepository;
    relationshipService;
    riskEvaluationService;
    // Thresholds for signal detection
    STAGE_STAGNATION_DAYS = 30; // Alert if in same stage for 30+ days
    ACTIVITY_DROP_THRESHOLD = 0.5; // 50% drop in activity
    RISK_ACCELERATION_THRESHOLD = 0.2; // 20% increase in risk score
    constructor(monitoring, shardRepository, revisionRepository, relationshipService, riskEvaluationService) {
        this.monitoring = monitoring;
        this.shardRepository = shardRepository;
        this.revisionRepository = revisionRepository;
        this.relationshipService = relationshipService;
        this.riskEvaluationService = riskEvaluationService;
    }
    /**
     * Detect all early-warning signals for an opportunity
     */
    async detectSignals(opportunityId, tenantId, userId) {
        const startTime = Date.now();
        try {
            // Get opportunity
            const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
            if (!opportunity) {
                throw new Error(`Opportunity not found: ${opportunityId}`);
            }
            const signals = [];
            // Check for stage stagnation
            const stagnationSignal = await this.checkStageStagnation(opportunity, tenantId);
            if (stagnationSignal) {
                signals.push(stagnationSignal);
            }
            // Check for activity drop
            const activitySignal = await this.checkActivityDrop(opportunity, tenantId);
            if (activitySignal) {
                signals.push(activitySignal);
            }
            // Check for stakeholder churn
            const churnSignal = await this.checkStakeholderChurn(opportunity, tenantId);
            if (churnSignal) {
                signals.push(churnSignal);
            }
            // Check for risk acceleration
            const riskSignal = await this.checkRiskAcceleration(opportunityId, tenantId, userId);
            if (riskSignal) {
                signals.push(riskSignal);
            }
            // Update opportunity with early warnings (embedded)
            const opportunityData = opportunity.structuredData;
            await this.shardRepository.update(opportunityId, tenantId, {
                structuredData: {
                    ...opportunityData,
                    earlyWarnings: signals,
                },
            });
            this.monitoring.trackEvent('early-warning.signals-detected', {
                tenantId,
                opportunityId,
                signalCount: signals.length,
                durationMs: Date.now() - startTime,
            });
            return signals;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'early-warning.detectSignals',
                tenantId,
                opportunityId,
            });
            throw error;
        }
    }
    /**
     * Check for stage stagnation
     */
    async checkStageStagnation(opportunity, tenantId) {
        try {
            const opportunityData = opportunity.structuredData;
            const currentStage = opportunityData.stage;
            if (!currentStage || currentStage === 'closed_won' || currentStage === 'closed_lost') {
                return null; // No stagnation check for closed opportunities
            }
            // Get revisions to find when stage was last changed
            const revisions = await this.revisionRepository.list({
                filter: {
                    shardId: opportunity.id,
                    tenantId,
                    changeType: ChangeType.UPDATED,
                },
                limit: 100,
            });
            // Find the most recent stage change
            // Process revisions in chronological order (oldest first) to track stage changes
            let lastStageChangeDate = opportunity.createdAt;
            let previousStage = undefined;
            // Sort revisions by timestamp ascending to process chronologically
            const sortedRevisions = [...revisions.revisions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            for (const revision of sortedRevisions) {
                let stageInRevision = undefined;
                if (revision.data.strategy === RevisionStorageStrategy.FULL_SNAPSHOT) {
                    const snapshot = revision.data.snapshot;
                    stageInRevision = snapshot?.structuredData?.stage;
                }
                else if (revision.data.strategy === RevisionStorageStrategy.DELTA) {
                    // For delta, check if stage field was changed
                    const delta = revision.data.delta;
                    const stageChange = delta?.changes?.find((c) => c.field === 'structuredData.stage' || c.field === 'stage');
                    if (stageChange) {
                        stageInRevision = stageChange.newValue;
                        // If stage changed, update the last change date
                        if (stageChange.oldValue !== stageChange.newValue) {
                            lastStageChangeDate = revision.timestamp;
                            previousStage = stageChange.oldValue;
                        }
                    }
                    else {
                        // No stage change in this revision, keep previous stage
                        stageInRevision = previousStage;
                    }
                }
                if (stageInRevision) {
                    previousStage = stageInRevision;
                }
            }
            // If we found a stage change, lastStageChangeDate is already updated
            // Otherwise, use creation date
            // Calculate days in current stage
            const daysInStage = Math.floor((Date.now() - lastStageChangeDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysInStage >= this.STAGE_STAGNATION_DAYS) {
                // Determine severity
                let severity = 'medium';
                if (daysInStage >= 60) {
                    severity = 'high';
                }
                else if (daysInStage >= 90) {
                    severity = 'critical';
                }
                const signal = {
                    id: uuidv4(),
                    signalType: 'stage_stagnation',
                    severity,
                    description: `Opportunity has been in "${currentStage}" stage for ${daysInStage} days without progress`,
                    evidence: [
                        {
                            type: 'stage',
                            label: 'Current Stage',
                            value: currentStage,
                        },
                        {
                            type: 'duration',
                            label: 'Days in Stage',
                            value: daysInStage,
                        },
                        {
                            type: 'date',
                            label: 'Last Stage Change',
                            value: lastStageChangeDate.toISOString(),
                        },
                    ],
                    detectedAt: new Date(),
                };
                return signal;
            }
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'early-warning.checkStageStagnation',
                tenantId,
                opportunityId: opportunity.id,
            });
            return null;
        }
    }
    /**
     * Check for activity drop
     */
    async checkActivityDrop(opportunity, tenantId) {
        try {
            const opportunityData = opportunity.structuredData;
            const lastActivityAt = opportunity.lastActivityAt || opportunity.updatedAt;
            // Calculate days since last activity
            const daysSinceActivity = Math.floor((Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
            // Get revisions to analyze activity pattern
            const revisions = await this.revisionRepository.list({
                filter: {
                    shardId: opportunity.id,
                    tenantId,
                    changeType: ChangeType.UPDATED,
                },
                limit: 50,
            });
            // Calculate average activity frequency (revisions per week)
            const now = Date.now();
            const fourWeeksAgo = now - (28 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            const recentRevisions = revisions.revisions.filter(r => r.timestamp.getTime() >= twoWeeksAgo);
            const olderRevisions = revisions.revisions.filter(r => r.timestamp.getTime() >= fourWeeksAgo && r.timestamp.getTime() < twoWeeksAgo);
            const recentActivityRate = recentRevisions.length / 2; // per week
            const olderActivityRate = olderRevisions.length / 2; // per week
            // Check for significant drop
            if (olderActivityRate > 0 && recentActivityRate < olderActivityRate * (1 - this.ACTIVITY_DROP_THRESHOLD)) {
                const dropPercentage = ((olderActivityRate - recentActivityRate) / olderActivityRate) * 100;
                let severity = 'low';
                if (dropPercentage >= 70) {
                    severity = 'critical';
                }
                else if (dropPercentage >= 50) {
                    severity = 'high';
                }
                else if (dropPercentage >= 30) {
                    severity = 'medium';
                }
                const signal = {
                    id: uuidv4(),
                    signalType: 'activity_drop',
                    severity,
                    description: `Activity has dropped by ${dropPercentage.toFixed(1)}% compared to previous period`,
                    evidence: [
                        {
                            type: 'metric',
                            label: 'Recent Activity Rate',
                            value: `${recentActivityRate.toFixed(1)} updates/week`,
                        },
                        {
                            type: 'metric',
                            label: 'Previous Activity Rate',
                            value: `${olderActivityRate.toFixed(1)} updates/week`,
                        },
                        {
                            type: 'duration',
                            label: 'Days Since Last Activity',
                            value: daysSinceActivity,
                        },
                    ],
                    detectedAt: new Date(),
                };
                return signal;
            }
            // Also check if no activity for extended period
            if (daysSinceActivity >= 14) {
                const signal = {
                    id: uuidv4(),
                    signalType: 'activity_drop',
                    severity: daysSinceActivity >= 30 ? 'high' : 'medium',
                    description: `No activity detected for ${daysSinceActivity} days`,
                    evidence: [
                        {
                            type: 'duration',
                            label: 'Days Since Last Activity',
                            value: daysSinceActivity,
                        },
                        {
                            type: 'date',
                            label: 'Last Activity',
                            value: lastActivityAt.toISOString(),
                        },
                    ],
                    detectedAt: new Date(),
                };
                return signal;
            }
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'early-warning.checkActivityDrop',
                tenantId,
                opportunityId: opportunity.id,
            });
            return null;
        }
    }
    /**
     * Check for stakeholder churn
     */
    async checkStakeholderChurn(opportunity, tenantId) {
        try {
            // Get current stakeholder relationships
            const currentStakeholderEdges = await this.relationshipService.getRelationships(tenantId, opportunity.id, 'both', {
                relationshipType: 'has_stakeholder',
                limit: 100,
            });
            const currentChampionEdges = await this.relationshipService.getRelationships(tenantId, opportunity.id, 'both', {
                relationshipType: 'has_champion',
                limit: 100,
            });
            const currentStakeholderIds = new Set([
                ...currentStakeholderEdges.map(e => e.targetShardId || e.sourceShardId),
                ...currentChampionEdges.map(e => e.targetShardId || e.sourceShardId),
            ]);
            // Get revisions to check for removed relationships
            const revisions = await this.revisionRepository.list({
                filter: {
                    shardId: opportunity.id,
                    tenantId,
                    changeType: ChangeType.UPDATED,
                },
                limit: 50,
            });
            // Check recent revisions for relationship removals
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const removedStakeholderIds = new Set();
            for (const revision of revisions.revisions) {
                if (revision.timestamp.getTime() < thirtyDaysAgo) {
                    continue; // Only check recent revisions
                }
                // Check for relationship changes in delta revisions
                if (revision.data.strategy === RevisionStorageStrategy.DELTA) {
                    const delta = revision.data.delta;
                    const relationshipChanges = delta?.changes?.filter((c) => c.field?.includes('internal_relationships') ||
                        c.field?.includes('relationships'));
                    if (relationshipChanges && relationshipChanges.length > 0) {
                        // Check for removals (operation === 'remove')
                        for (const change of relationshipChanges) {
                            if (change.operation === 'remove' && change.oldValue) {
                                const removedRel = change.oldValue;
                                if (removedRel.relationshipType === 'has_stakeholder' ||
                                    removedRel.relationshipType === 'has_champion') {
                                    removedStakeholderIds.add(removedRel.targetShardId || removedRel.id);
                                }
                            }
                        }
                    }
                }
                else if (revision.data.strategy === RevisionStorageStrategy.FULL_SNAPSHOT) {
                    // For snapshots, we'd need to compare with previous snapshot
                    // This is more complex, so we'll skip snapshot-based detection for now
                    // and rely on delta-based detection
                }
            }
            if (removedStakeholderIds.size > 0) {
                const removedCount = removedStakeholderIds.size;
                const severity = removedCount >= 3 ? 'high' :
                    removedCount >= 2 ? 'medium' : 'low';
                const signal = {
                    id: uuidv4(),
                    signalType: 'stakeholder_churn',
                    severity,
                    description: `${removedCount} stakeholder(s) removed from opportunity in the last 30 days`,
                    evidence: [
                        {
                            type: 'count',
                            label: 'Stakeholders Removed',
                            value: removedCount,
                        },
                        {
                            type: 'count',
                            label: 'Current Stakeholders',
                            value: currentStakeholderIds.size,
                        },
                    ],
                    detectedAt: new Date(),
                };
                return signal;
            }
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'early-warning.checkStakeholderChurn',
                tenantId,
                opportunityId: opportunity.id,
            });
            return null;
        }
    }
    /**
     * Check for risk acceleration
     */
    async checkRiskAcceleration(opportunityId, tenantId, userId) {
        try {
            // Get current risk evaluation
            const currentEvaluation = await this.riskEvaluationService.evaluateOpportunity(opportunityId, tenantId, userId, { includeHistorical: false, includeAI: false });
            // Get opportunity to check for previous risk evaluation
            const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
            if (!opportunity) {
                return null;
            }
            const opportunityData = opportunity.structuredData;
            const previousEvaluation = opportunityData.riskEvaluation;
            if (!previousEvaluation || !previousEvaluation.riskScore) {
                return null; // No previous evaluation to compare
            }
            // Calculate risk increase
            const riskIncrease = currentEvaluation.riskScore - previousEvaluation.riskScore;
            if (riskIncrease >= this.RISK_ACCELERATION_THRESHOLD) {
                const increasePercentage = (riskIncrease / previousEvaluation.riskScore) * 100;
                let severity = 'low';
                if (riskIncrease >= 0.4) {
                    severity = 'critical';
                }
                else if (riskIncrease >= 0.3) {
                    severity = 'high';
                }
                else if (riskIncrease >= 0.2) {
                    severity = 'medium';
                }
                const signal = {
                    id: uuidv4(),
                    signalType: 'risk_acceleration',
                    severity,
                    description: `Risk score has increased by ${(increasePercentage).toFixed(1)}% (${(riskIncrease * 100).toFixed(1)} points)`,
                    evidence: [
                        {
                            type: 'score',
                            label: 'Current Risk Score',
                            value: `${(currentEvaluation.riskScore * 100).toFixed(1)}%`,
                        },
                        {
                            type: 'score',
                            label: 'Previous Risk Score',
                            value: `${(previousEvaluation.riskScore * 100).toFixed(1)}%`,
                        },
                        {
                            type: 'metric',
                            label: 'Risk Increase',
                            value: `${(riskIncrease * 100).toFixed(1)} points`,
                        },
                        {
                            type: 'count',
                            label: 'New Risks Detected',
                            value: currentEvaluation.risks.length - (previousEvaluation.risks?.length || 0),
                        },
                    ],
                    detectedAt: new Date(),
                };
                return signal;
            }
            return null;
        }
        catch (error) {
            this.monitoring.trackException(error, {
                operation: 'early-warning.checkRiskAcceleration',
                tenantId,
                opportunityId,
            });
            return null;
        }
    }
}
//# sourceMappingURL=early-warning.service.js.map