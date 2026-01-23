# Remaining TypeScript Errors

Generated: 2026-01-15 12:57:20

This document lists all remaining TypeScript compilation errors in the server codebase (excluding test files).

## Summary

- **Total Errors**: 278
- **Unique Error Types**: 12
- **Files Affected**: 29

## Error Breakdown by Type

| Error Type | Count | Description |
|------------|-------|-------------|
| `TS2307` | 250 | Cannot find module |
| `TS2339` | 8 | Property does not exist on type |
| `TS2304` | 6 | Cannot find name |
| `TS6059` | 4 | File is not under rootDir |
| `TS2352` | 2 | Conversion of type may be a mistake |
| `TS2300` | 2 | Duplicate identifier |
| `TS2554` | 1 | Expected N arguments, but got M |
| `TS2741` | 1 | Property is missing in type |
| `TS2367` | 1 | Comparison appears to be unintentional |
| `TS2345` | 1 | Argument of type X is not assignable to parameter of type Y |
| `TS2448` | 1 | Block-scoped variable used before declaration |
| `TS1016` | 1 | A required parameter cannot follow an optional parameter |

## Files with Most Errors

| File | Error Count |
|------|------------|
| `src/routes/releases.ts` | 18 |
| `src/routes/learning.ts` | 17 |
| `src/routes/architecture.ts` | 16 |
| `src/routes/dependencies.ts` | 16 |
| `src/routes/innovation.ts` | 16 |
| `src/routes/capacity.ts` | 15 |
| `src/routes/debt.ts` | 15 |
| `src/routes/patterns.ts` | 14 |
| `src/routes/users.ts` | 14 |
| `src/routes/knowledge.ts` | 13 |
| `src/routes/reviews.ts` | 13 |
| `src/routes/incidents.ts` | 11 |
| `src/routes/tasks.ts` | 11 |
| `src/routes/experiments.ts` | 10 |
| `src/routes/compliance.ts` | 9 |
| `src/routes/modules.ts` | 8 |
| `src/routes/roadmaps.ts` | 8 |
| `src/routes/workflows.ts` | 8 |
| `src/routes/pairing.ts` | 7 |
| `src/routes/calendar.ts` | 6 |

## Detailed Error List by File

### ../src/core/security/SandboxManager.ts

**Total errors in this file: 5**

#### TS2300 Errors (2)

- Line 13: error TS2300: Duplicate identifier 'CapabilitySystem'.
- Line 515: error TS2300: Duplicate identifier 'CapabilitySystem'.

#### TS6059 Errors (3)

- Line 13: error TS6059: File '/home/neodyme/Documents/Coder/src/core/security/CapabilitySystem.ts' is not under 'rootDir' '/home/neodyme/Documents/Coder/server/src'. 'rootDir' is expected to contain all source files.
- Line 14: error TS6059: File '/home/neodyme/Documents/Coder/src/core/agents/types.ts' is not under 'rootDir' '/home/neodyme/Documents/Coder/server/src'. 'rootDir' is expected to contain all source files.
- Line 426: error TS6059: File '/home/neodyme/Documents/Coder/src/core/security/SandboxedCommandExecutor.ts' is not under 'rootDir' '/home/neodyme/Documents/Coder/server/src'. 'rootDir' is expected to contain all source files.

### ../src/core/security/SandboxedCommandExecutor.ts

**Total errors in this file: 3**

#### TS1016 Errors (1)

- Line 257: error TS1016: A required parameter cannot follow an optional parameter.

#### TS2345 Errors (1)

- Line 111: error TS2345: Argument of type '{ env: Record<string, string>; timeout: number; maxMemory: number; maxCpu: number; cwd?: string; allowedCommands?: string[]; blockedCommands?: string[]; capabilities?: CapabilityGrant[]; }' is not assignable to parameter of type 'Required<CommandExecutionOptions> & { timeout?: number; maxMemory?: number; maxCpu?: number; }'.

#### TS2448 Errors (1)

- Line 154: error TS2448: Block-scoped variable 'process' used before its declaration.

### src/routes/architecture.ts

**Total errors in this file: 16**

#### TS2307 Errors (16)

- Line 9: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureDesignManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureVersionManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureConstraintValidator' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureImpactSimulator' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureReviewManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/architecture/ComponentLibraryManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureDebtTracker' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureMigrationPlanner' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/architecture/ArchitecturePlanningIntegrator' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureKnowledgeIntegrator' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureCodeReviewIntegrator' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/architecture/ArchitectureRoadmapIntegrator' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- ... and 1 more TS2307 errors

### src/routes/calendar.ts

**Total errors in this file: 6**

#### TS2307 Errors (6)

- Line 9: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/calendar/ConflictDetector' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/calendar/TimelinePredictor' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/calendar/AgentScheduler' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/calendar/PlanBoundScheduler' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.

### src/routes/capacity.ts

**Total errors in this file: 15**

#### TS2307 Errors (15)

- Line 9: error TS2307: Cannot find module '../../src/core/capacity/CapacityTracker' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/capacity/AllocationVisualizer' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/capacity/OverallocationDetector' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/capacity/SkillBasedAllocator' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/capacity/VacationPTOManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/capacity/CapacityForecaster' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/capacity/BurnoutDetector' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/capacity/LoadBalancer' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/capacity/HistoricalAnalyzer' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/capacity/WhatIfSimulator' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.

### src/routes/compliance.ts

**Total errors in this file: 9**

#### TS2307 Errors (9)

- Line 9: error TS2307: Cannot find module '../../src/core/compliance/ImmutableAuditLogger' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/compliance/AccessLogger' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/compliance/ChangeTracker' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/compliance/ComplianceReporter' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/compliance/RetentionPolicyManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/compliance/ComplianceDashboardGenerator' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/compliance/PolicyEnforcer' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/compliance/CertificationTracker' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/compliance/EvidenceCollector' or its corresponding type declarations.

### src/routes/crossProjectPatterns.ts

**Total errors in this file: 1**

#### TS2307 Errors (1)

- Line 10: error TS2307: Cannot find module '../../src/core/learning/PatternRecognitionEngine' or its corresponding type declarations.

### src/routes/debt.ts

**Total errors in this file: 15**

#### TS2307 Errors (15)

- Line 9: error TS2307: Cannot find module '../../src/core/debt/DebtDetector' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/debt/DebtScorer' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/debt/DebtVisualizer' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/debt/DebtBacklogManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/debt/DebtBudgetManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/debt/DebtTrendAnalyzer' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/debt/DebtImpactAnalyzer' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/debt/DebtPaydownPlanner' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/debt/DebtReviewManager' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/debt/DebtAcceptanceManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapStorage' or its corresponding type declarations.

### src/routes/dependencies.ts

**Total errors in this file: 16**

#### TS2307 Errors (16)

- Line 9: error TS2307: Cannot find module '../../src/core/dependencies/DependencyDeclarationManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/dependencies/DependencyVisualizer' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/dependencies/BlockingDependencyAlerts' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/dependencies/DependencyHealthScorer' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/dependencies/ContractNegotiator' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/dependencies/SLATracker' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/dependencies/DependencyChangeNotifier' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/dependencies/DependencyTimelineCoordinator' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/dependencies/CrossTeamTaskDependencyTracker' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/messaging/EscalationManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- ... and 1 more TS2307 errors

### src/routes/environments.ts

**Total errors in this file: 2**

#### TS2307 Errors (2)

- Line 3: error TS2307: Cannot find module '../../src/core/environments/EnvironmentManager' or its corresponding type declarations.
- Line 4: error TS2307: Cannot find module '../../src/core/environments/EnvironmentValidator' or its corresponding type declarations.

### src/routes/experiments.ts

**Total errors in this file: 10**

#### TS2307 Errors (10)

- Line 9: error TS2307: Cannot find module '../../src/core/experiments/ExperimentManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/experiments/StatisticalAnalyzer' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/experiments/MetricTracker' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/experiments/MultiVariateTester' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/experiments/RolloutController' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/experiments/ExperimentTemplateManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/experiments/ExperimentHistoryManager' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/releases/FeatureFlagManager' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.

### src/routes/incidents.ts

**Total errors in this file: 11**

#### TS2307 Errors (11)

- Line 9: error TS2307: Cannot find module '../../src/core/incidents/IncidentManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/incidents/TimelineReconstructor' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/incidents/RCAGenerator' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/incidents/PostmortemManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/incidents/ActionItemTracker' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/incidents/IncidentPatternDetector' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.

### src/routes/innovation.ts

**Total errors in this file: 16**

#### TS2307 Errors (16)

- Line 9: error TS2307: Cannot find module '../../src/core/innovation/IdeaSubmissionManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/innovation/IdeaVotingManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/innovation/IdeaEvaluator' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/innovation/IdeaBacklogManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/innovation/SpikeTaskCreator' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/innovation/InnovationTimeTracker' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/innovation/IdeaToRoadmapConverter' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/innovation/IdeaExperimentLinker' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/innovation/InnovationMetricsTracker' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/experiments/ExperimentManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/releases/FeatureFlagManager' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapStorage' or its corresponding type declarations.
- ... and 1 more TS2307 errors

### src/routes/issues.ts

**Total errors in this file: 6**

#### TS2307 Errors (6)

- Line 3: error TS2307: Cannot find module '../../src/core/anticipation/IssueAnticipationEngine' or its corresponding type declarations.
- Line 4: error TS2307: Cannot find module '../../src/core/anticipation/IssuePrioritizer' or its corresponding type declarations.
- Line 5: error TS2307: Cannot find module '../../src/core/anticipation/IssueStorage' or its corresponding type declarations.
- Line 6: error TS2307: Cannot find module '../../src/core/context/FileIndexer' or its corresponding type declarations.
- Line 7: error TS2307: Cannot find module '../../src/core/context/DependencyGraph' or its corresponding type declarations.
- Line 8: error TS2307: Cannot find module '../../src/core/context/ApplicationProfileManager' or its corresponding type declarations.

### src/routes/knowledge.ts

**Total errors in this file: 13**

#### TS2307 Errors (13)

- Line 9: error TS2307: Cannot find module '../../src/core/knowledge/DocumentationExtractor' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/knowledge/CodeToKnowledgeMapper' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/knowledge/SemanticSearch' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/knowledge/RunbookManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/knowledge/FAQGenerator' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/knowledge/KnowledgeGraph' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/knowledge/StaleContentDetector' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/knowledge/OnboardingPathGenerator' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/context/GitAnalyzer' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.

### src/routes/learning.ts

**Total errors in this file: 17**

#### TS2307 Errors (17)

- Line 9: error TS2307: Cannot find module '../../src/core/learning/SkillGapAnalyzer' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/learning/LearningPathGenerator' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/learning/ProgressTracker' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/learning/CertificationTracker' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/learning/TechTalkManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/learning/CodeChallengeManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/learning/CodeKataManager' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/learning/MicroLearningManager' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/learning/PairProgrammingMatcher' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/learning/LearningTaskRecommender' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/users/ExpertiseMapper' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/context/ApplicationProfileManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- ... and 2 more TS2307 errors

### src/routes/logs.ts

**Total errors in this file: 1**

#### TS2307 Errors (1)

- Line 13: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.

### src/routes/messaging.ts

**Total errors in this file: 4**

#### TS2307 Errors (4)

- Line 9: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/messaging/DecisionCapture' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/messaging/EscalationManager' or its corresponding type declarations.

### src/routes/modules.ts

**Total errors in this file: 8**

#### TS2307 Errors (8)

- Line 3: error TS2307: Cannot find module '../../src/core/context/ModuleDetector' or its corresponding type declarations.
- Line 4: error TS2307: Cannot find module '../../src/core/context/ModuleAnalyzer' or its corresponding type declarations.
- Line 5: error TS2307: Cannot find module '../../src/core/context/ModuleStorage' or its corresponding type declarations.
- Line 6: error TS2307: Cannot find module '../../src/core/context/FileIndexer' or its corresponding type declarations.
- Line 7: error TS2307: Cannot find module '../../src/core/context/DependencyGraph' or its corresponding type declarations.
- Line 8: error TS2307: Cannot find module '../../src/core/context/ASTAnalyzer' or its corresponding type declarations.
- Line 9: error TS2307: Cannot find module '../../src/core/context/CodeDuplicationDetector' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/context/ComplexityAnalyzer' or its corresponding type declarations.

### src/routes/pairing.ts

**Total errors in this file: 7**

#### TS2307 Errors (7)

- Line 9: error TS2307: Cannot find module '../../src/core/pairing/PairingSessionManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/pairing/PresenceManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/pairing/AnnotationManager' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/pairing/AsyncCollaborationManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/pairing/PairingHistoryManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.

### src/routes/patterns.ts

**Total errors in this file: 14**

#### TS2307 Errors (14)

- Line 9: error TS2307: Cannot find module '../../src/core/patterns/PatternCatalogManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/patterns/PatternExtractor' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/patterns/PatternSearch' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/patterns/PatternInstantiator' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/patterns/PatternVersionManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/patterns/PatternRatingManager' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/patterns/PatternComposer' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/patterns/PatternUsageAnalytics' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/patterns/PatternEvolutionManager' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/models/ModelRouter' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/config/ConfigManager' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/knowledge/SemanticSearch' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/context/ASTAnalyzer' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/context/FileIndexer' or its corresponding type declarations.

### src/routes/releases.ts

**Total errors in this file: 18**

#### TS2307 Errors (18)

- Line 9: error TS2307: Cannot find module '../../src/core/releases/ReleaseManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/releases/DeploymentPipelineManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/releases/EnvironmentPromotionManager' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/releases/FeatureFlagManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/releases/RollbackManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/releases/ReleaseNotesGenerator' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/releases/CanaryDeploymentManager' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/releases/BlueGreenDeploymentManager' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/releases/RiskAssessmentManager' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/releases/ReleaseRoadmapLinker' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/releases/ReleaseBlockerTracker' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 22: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.
- Line 23: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapStorage' or its corresponding type declarations.
- ... and 3 more TS2307 errors

### src/routes/reviews.ts

**Total errors in this file: 13**

#### TS2307 Errors (13)

- Line 9: error TS2307: Cannot find module '../../src/core/reviews/InlineCommentManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/reviews/ReviewThreadManager' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/reviews/ReviewApprovalWorkflow' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/reviews/ReviewQualityScorer' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/reviews/ReviewTimeTracker' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/reviews/ReviewAnalytics' or its corresponding type declarations.
- Line 15: error TS2307: Cannot find module '../../src/core/reviews/DiffContextEnhancer' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/reviews/ImpactVisualizer' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/pairing/PairingCodeReviewIntegrator' or its corresponding type declarations.
- Line 18: error TS2307: Cannot find module '../../src/core/pairing/PairingSessionManager' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 20: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 21: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.

### src/routes/roadmaps.ts

**Total errors in this file: 8**

#### TS2307 Errors (8)

- Line 3: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapManager' or its corresponding type declarations.
- Line 4: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapStorage' or its corresponding type declarations.
- Line 5: error TS2307: Cannot find module '../../src/core/roadmap/RoadmapDependencyAnalyzer' or its corresponding type declarations.
- Line 6: error TS2307: Cannot find module '../../src/core/capacity/RoadmapCapacityIntegrator' or its corresponding type declarations.
- Line 7: error TS2307: Cannot find module '../../src/core/capacity/CapacityTracker' or its corresponding type declarations.
- Line 8: error TS2307: Cannot find module '../../src/core/capacity/CapacityForecaster' or its corresponding type declarations.
- Line 9: error TS2307: Cannot find module '../../src/core/capacity/VacationPTOManager' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.

### src/routes/tasks.ts

**Total errors in this file: 11**

#### TS2307 Errors (11)

- Line 4: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.
- Line 5: error TS2307: Cannot find module '../../src/core/tasks/TaskLifecycleManager' or its corresponding type declarations.
- Line 6: error TS2307: Cannot find module '../../src/core/dependencies/CrossTeamTaskDependencyTracker' or its corresponding type declarations.
- Line 7: error TS2307: Cannot find module '../../src/core/releases/ReleaseBlockerTracker' or its corresponding type declarations.
- Line 8: error TS2307: Cannot find module '../../src/core/capacity/TaskCapacityAllocator' or its corresponding type declarations.
- Line 9: error TS2307: Cannot find module '../../src/core/capacity/CapacityTracker' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/capacity/SkillBasedAllocator' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/capacity/OverallocationDetector' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/calendar/CalendarEventManager' or its corresponding type declarations.
- Line 13: error TS2307: Cannot find module '../../src/core/messaging/ConversationManager' or its corresponding type declarations.
- Line 14: error TS2307: Cannot find module '../../src/core/messaging/MessageManager' or its corresponding type declarations.

### src/routes/teamKnowledge.ts

**Total errors in this file: 6**

#### TS2304 Errors (6)

- Line 32: error TS2304: Cannot find name 'getDatabaseClient'.
- Line 83: error TS2304: Cannot find name 'getDatabaseClient'.
- Line 199: error TS2304: Cannot find name 'getDatabaseClient'.
- Line 252: error TS2304: Cannot find name 'getDatabaseClient'.
- Line 295: error TS2304: Cannot find name 'getDatabaseClient'.
- Line 342: error TS2304: Cannot find name 'getDatabaseClient'.

### src/routes/terminal.ts

**Total errors in this file: 5**

#### TS2352 Errors (2)

- Line 359: error TS2352: Conversion of type 'number' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
- Line 360: error TS2352: Conversion of type 'number' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.

#### TS2554 Errors (1)

- Line 65: error TS2554: Expected 1 arguments, but got 2.

#### TS2741 Errors (1)

- Line 290: error TS2741: Property 'type' is missing in type '{}' but required in type 'AgentOutputSchema'.

#### TS6059 Errors (1)

- Line 14: error TS6059: File '/home/neodyme/Documents/Coder/src/core/security/SandboxManager.ts' is not under 'rootDir' '/home/neodyme/Documents/Coder/server/src'. 'rootDir' is expected to contain all source files.

### src/routes/users.ts

**Total errors in this file: 14**

#### TS2307 Errors (6)

- Line 3: error TS2307: Cannot find module '../../src/core/users/UserProfileManager' or its corresponding type declarations.
- Line 4: error TS2307: Cannot find module '../../src/core/recommendations/PersonalizedRecommendationEngine' or its corresponding type declarations.
- Line 5: error TS2307: Cannot find module '../../src/core/users/UserAnalytics' or its corresponding type declarations.
- Line 6: error TS2307: Cannot find module '../../src/core/tasks/TaskRepository' or its corresponding type declarations.
- Line 7: error TS2307: Cannot find module '../../src/core/pairing/PairingProfileIntegrator' or its corresponding type declarations.
- Line 8: error TS2307: Cannot find module '../../src/core/pairing/PairingHistoryManager' or its corresponding type declarations.

#### TS2339 Errors (8)

- Line 96: error TS2339: Property 'name' does not exist on type 'unknown'.
- Line 97: error TS2339: Property 'name' does not exist on type 'unknown'.
- Line 107: error TS2339: Property 'bio' does not exist on type 'unknown'.
- Line 108: error TS2339: Property 'bio' does not exist on type 'unknown'.
- Line 118: error TS2339: Property 'preferences' does not exist on type 'unknown'.
- Line 120: error TS2339: Property 'preferences' does not exist on type 'unknown'.
- Line 120: error TS2339: Property 'preferences' does not exist on type 'unknown'.
- Line 124: error TS2339: Property 'preferences' does not exist on type 'unknown'.

### src/routes/workflows.ts

**Total errors in this file: 8**

#### TS2307 Errors (7)

- Line 9: error TS2307: Cannot find module '../../src/core/agents/AgentRegistry' or its corresponding type declarations.
- Line 10: error TS2307: Cannot find module '../../src/core/workflows/WorkflowExecutionEngine' or its corresponding type declarations.
- Line 11: error TS2307: Cannot find module '../../src/core/execution/ExecutionCheckpointSystem' or its corresponding type declarations.
- Line 12: error TS2307: Cannot find module '../../src/core/agents/AgentMemoryManager' or its corresponding type declarations.
- Line 16: error TS2307: Cannot find module '../../src/core/workflows/types' or its corresponding type declarations.
- Line 17: error TS2307: Cannot find module '../../src/core/agents/types' or its corresponding type declarations.
- Line 19: error TS2307: Cannot find module '../../src/core/workflows/WorkflowTriggerService' or its corresponding type declarations.

#### TS2367 Errors (1)

- Line 90: error TS2367: This comparison appears to be unintentional because the types 'boolean' and 'string' have no overlap.

