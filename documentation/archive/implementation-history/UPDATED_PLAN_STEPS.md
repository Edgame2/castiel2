# Updated Plan Steps (86-180) Based on User Decisions

This document contains the new steps to be added to the plan, ensuring ambiguity and problems are anticipated at the planning phase.

## UI Requirement (MANDATORY)

**UI must always use default Shadcn Default Components** - All UI components must use Shadcn UI default components, not custom implementations. This applies to all renderer components in `src/renderer/components/`.

## Critical Flow: Intent → Ambiguity → Planning (with Change Graph) → Execution

The key principle: **All ambiguity and problems must be resolved BEFORE execution begins, and anticipated DURING planning.**

## New Steps (86-155)

### Phase: Intent & Specification (BEFORE Planning)

**Step 86**: Implement `IntentInterpreter` - Convert natural language to structured intent spec (JSON Schema format)
- **Location**: `src/core/intent/IntentInterpreter.ts`
- **Dependencies**: step-6 (shared types), step-15 (ModelRouter)
- **Key Requirements**:
  - JSON Schema as canonical format
  - Auto-generate TypeScript types from schema
  - Machine-validated JSON objects at runtime
  - Output: StructuredIntentSpec (goal, non-goals, scope, constraints, language/framework/versions)

**Step 87**: Implement `RequirementDisambiguationAgent` - Detect ambiguities and ask clarifying questions
- **Location**: `src/core/intent/RequirementDisambiguationAgent.ts`
- **Dependencies**: step-86, step-15 (ModelRouter), step-28 (ContextAggregator)
- **Key Requirements**:
  - Hybrid system: rule-based first, LLM second
  - Rule-based: detect missing required fields, multi-valued interpretations
  - LLM-based: detect semantic ambiguity, intent underspecification, multiple valid architectures
  - Only critical ambiguity triggers clarification (architecture, security, persistence, public APIs, backward compatibility, data loss risk)
  - Non-critical ambiguity (naming, logging, internal structure) → resolved automatically using conventions
  - Learn project-specific defaults conservatively (never generalize across projects, never override explicit user intent)
  - Store learning as preference rules, not model weights

**Step 88**: Implement `IntentSpecValidator` - Validate structured intent and detect conflicts
- **Location**: `src/core/intent/IntentSpecValidator.ts`
- **Dependencies**: step-86, step-28 (ContextAggregator)
- **Key Requirements**:
  - Refuse by default if constraints conflict
  - Resolution order: explicit user constraints win → project constraints override inferred intent → automatic resolution only if safe/reversible/low-risk
  - Otherwise → ask or refuse
  - Always persist intent specs (audit trail, reproducibility, debugging, regression analysis, legal/compliance)
  - If user refuses to clarify → refuse generation (autonomous system must prefer no code over wrong code)

**Step 88a**: Implement `IntentSpecStorage` - Persist intent specs for audit and learning
- **Location**: `src/core/intent/IntentSpecStorage.ts`
- **Dependencies**: step-88
- **Key Requirements**:
  - Store all intent specs permanently (with retention policy)
  - Support querying by date, project, user, outcome
  - Enable replay and debugging

### Phase: Planning with Change Graph (DURING Planning)

**Step 89**: Implement `ChangeGraphBuilder` - Create change graph from plan DURING planning
- **Location**: `src/core/planning/ChangeGraphBuilder.ts`
- **Dependencies**: step-36 (PlanGenerator), step-111 (CompilerBackedIndex), step-106-110 (SymbolTable, TypeGraph, CallGraph, ImportGraph)
- **Key Requirements**:
  - Generate change graph TWICE: initial graph during planning (expected changes), final graph after execution (actual changes), then diff them
  - Explicit list of files to modify
  - Explicit list of symbols: Added, Modified, Deleted
  - Dependency impact analysis
  - Backward compatibility analysis (multi-layer: public API surface diff, type compatibility, symbol visibility changes, contract tests, snapshot tests)
  - Risk classification per change (rule-based core + user overrides: public API changes, security boundaries, data schema changes, test coverage delta, novel patterns)
  - Change size limiter (LOC/AST nodes) - hierarchical config: global project limit, per-file limit, per-change-type limit
  - If change exceeds limit: automatically split → if split not possible → ask user → if user refuses → refuse execution
  - Always persist change graphs (rollback, audit, diff validation, future regression detection)
  - Mandatory post-execution validation: if actual changes ≠ planned changes → block finalization, investigate drift, regenerate or refuse
  - **Parallel execution support**: Require explicit declaration for parallel steps:
    - Read set (what files/symbols are read)
    - Write set (what files/symbols are written)
    - Symbol ownership (which symbols are owned by this step)
  - **Rule**: No declaration → no parallelization
  - **Conflict resolution**: If parallel steps conflict, abort all, rollback, ask user (never auto-merge)

**Step 90**: Implement `SymbolTracker` - Track all symbols (added/modified/deleted) per change
- **Location**: `src/core/planning/SymbolTracker.ts`
- **Dependencies**: step-106 (SymbolTable), step-89
- **Key Requirements**:
  - Track symbols at AST level
  - Support queries: what symbols are added/modified/deleted in this change?
  - Integrate with change graph

**Step 91**: Implement `ImpactAnalyzer` - Analyze dependency impact and backward compatibility
- **Location**: `src/core/planning/ImpactAnalyzer.ts`
- **Dependencies**: step-107-109 (TypeGraph, CallGraph, ImportGraph), step-89
- **Key Requirements**:
  - Multi-layer backward compatibility analysis
  - Dependency impact analysis
  - Risk classification

**Step 92**: Implement `ChangeSizeLimiter` - Enforce maximum change size (LOC/AST nodes)
- **Location**: `src/core/planning/ChangeSizeLimiter.ts`
- **Dependencies**: step-89
- **Key Requirements**:
  - Hierarchical configuration (global, per-file, per-change-type)
  - Automatic splitting if exceeds limit
  - Refuse if splitting not possible and user refuses

**Step 92a**: Enhance `PlanGenerator` - Integrate change graph generation DURING planning
- **Location**: `src/core/planning/PlanGenerator.ts`
- **Dependencies**: step-89, step-36
- **Key Requirements**:
  - Generate change graph as part of plan generation
  - Include change graph in plan metadata
  - Validate change graph before returning plan

### Phase: AST Patch Generation

**Step 93**: Implement `ASTPatchGenerator` - Convert model output to AST patches
- **Location**: `src/core/execution/ASTPatchGenerator.ts`
- **Dependencies**: step-18 (TypeScriptParser), step-15 (ModelRouter)
- **Key Requirements**:
  - Use language-specific, compiler-grade ASTs only (TypeScript: TypeScript Compiler API)
  - Structured JSON patch format referencing AST nodes
  - Never raw text diffs
  - Patch format: `{ "op": "insert", "target": "FunctionDeclaration:UserService.reset", "payload": {...} }`

**Step 94**: Implement `ASTPatchApplier` - Apply AST patches to files safely
- **Location**: `src/core/execution/ASTPatchApplier.ts`
- **Dependencies**: step-93, step-18 (TypeScriptParser)
- **Key Requirements**:
  - If patch application fails: rollback immediately → diagnose failure → regenerate patch → retry (limited attempts) → if still failing → refuse
  - Never leave partial state
  - Always preview patches (even in autonomous mode, user may opt out of viewing, not of generation)
  - Handle conflicts: hard stop + rebase logic (detect file changed externally → rebase patch on new AST → if rebase ambiguous → ask user → never auto-merge conflicting semantics)
  - Support undo/redo (mandatory, trivial if patches are atomic and persisted)

**Step 95**: Implement `PatchValidator` - Validate patches before application
- **Location**: `src/core/execution/PatchValidator.ts`
- **Dependencies**: step-93, step-18
- **Key Requirements**:
  - Validate patch structure
  - Validate AST node references
  - Check for conflicts

**Step 96**: Enhance `CodeGenerationService` - Use AST patches instead of raw text
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-93, step-94, step-95
- **Key Requirements**:
  - Replace raw text generation with AST patch generation
  - Enforce formatting: apply patch → run formatter (Prettier, gofmt, rustfmt) → run linter --fix → re-parse AST to confirm validity
  - Store patches permanently (with retention policy) for replay, debug, forensics, regression prevention

### Phase: Contract-First Generation

**Step 97**: Implement `ContractGenerator` - Generate interfaces, types, signatures first
- **Location**: `src/core/execution/ContractGenerator.ts`
- **Dependencies**: step-15 (ModelRouter), step-18 (TypeScriptParser)
- **Key Requirements**:
  - Language-native contracts, declared explicitly, not inline
  - TypeScript: exported interface / type
  - Stored in contracts/ or types/ or alongside implementation but separately declared
  - Never anonymous inline types for public or cross-layer boundaries

**Step 98**: Implement `ContractValidator` - Validate contracts compile before implementation
- **Location**: `src/core/execution/ContractValidator.ts`
- **Dependencies**: step-97, step-18
- **Key Requirements**:
  - Both compiler + custom validator
  - Compiler: type correctness, structural soundness
  - Custom validator: naming conventions, error types, nullability rules, async guarantees
  - If contract generation fails: fail fast → retry once → refuse (never proceed to implementation without valid contracts)

**Step 99**: Enhance `CodeGenerationService` - Two-phase generation (contracts → implementation)
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-97, step-98
- **Key Requirements**:
  - Phase 1: Generate contracts, validate they compile
  - Phase 2: Generate implementation only after contracts are valid
  - Contracts persisted separately from implementation (mandatory for any non-trivial system)
  - Contracts must exist independently, be analyzable without implementation, survive refactors

**Step 100**: Implement `ContractEnforcer` - Ensure all generated code follows contract-first pattern
- **Location**: `src/core/execution/ContractEnforcer.ts`
- **Dependencies**: step-97, step-98, step-99
- **Key Requirements**:
  - Enforce contract-first pattern
  - Version contracts independently (internal-only: implicit via git, public/shared: explicit semantic version)
  - Handle contract changes: strict breaking-change discipline (breaking change detected → block execution → require new version, migration path, compatibility analysis → automatic migration only if provably safe)
  - Automatically generate documentation from contracts (source of truth = contract, not prose)

### Phase: Semantic Rules Engine

**Step 101**: Implement `SemanticRulesEngine` - Framework-agnostic rule engine
- **Location**: `src/core/validation/SemanticRulesEngine.ts`
- **Dependencies**: step-42 (ValidationService), step-18 (TypeScriptParser)
- **Key Requirements**:
  - All of the above for rule definition: core rules (TypeScript/code), configurable rules (JSON/YAML), advanced rules (DSL optional)
  - Rule logic must be executable, not descriptive only
  - Both project-configurable and global (priority: project rules → framework rules → global safety rules non-overridable)
  - Default = blocking (blocking: correctness, safety, architecture; auto-fix: mechanical issues; warnings: cosmetic only)
  - Rules must be composable (mandatory: allow rule sets - framework, organization, project - deterministic composition order)
  - Custom project rules: config file + code extension (config for declarative, code for semantic, UI optional never required)
  - Rules versioned with framework versions (each framework adapter ships its own rule version, rule changes treated like breaking changes)
  - Performance optimization: incremental checking, rule result caching, AST-node scoped execution, parallel execution where safe, never skip rules for speed
  - Support learning from project patterns (yes, but only as suggestions: observed patterns → propose new rules → human/config approval required → never auto-enforce learned rules)

**Step 102**: Implement `ReactRules` - React-specific semantic rules
- **Location**: `src/core/validation/rules/ReactRules.ts`
- **Dependencies**: step-101
- **Key Requirements**:
  - React hooks only at top level
  - No async calls in constructors
  - Framework-specific best practices

**Step 103**: Implement `NodeRules` - Node.js-specific semantic rules
- **Location**: `src/core/validation/rules/NodeRules.ts`
- **Dependencies**: step-101
- **Key Requirements**:
  - All external calls must have timeouts
  - All async functions must be awaited or returned
  - Framework-specific best practices

**Step 104**: Implement `FrameworkAdapterRegistry` - Register rules per framework
- **Location**: `src/core/validation/FrameworkAdapterRegistry.ts`
- **Dependencies**: step-101, step-102, step-103
- **Key Requirements**:
  - Register framework-specific rules
  - Support multiple frameworks
  - Version rules with framework versions

**Step 105**: Integrate semantic rules into `ValidationService`
- **Location**: `src/core/execution/ValidationService.ts`
- **Dependencies**: step-101, step-104
- **Key Requirements**:
  - Run semantic rules as part of validation
  - Block execution on rule violations (based on rule configuration)

### Phase: Compiler-Backed Index

**Step 106**: Implement `SymbolTable` - Build and maintain symbol table from AST
- **Location**: `src/core/context/SymbolTable.ts`
- **Dependencies**: step-18 (TypeScriptParser), step-19 (ASTAnalyzer)
- **Key Requirements**:
  - Build symbol table from AST
  - Support queries: what symbols exist? where are they defined? where are they used?

**Step 107**: Implement `TypeGraph` - Build type dependency graph
- **Location**: `src/core/context/TypeGraph.ts`
- **Dependencies**: step-18, step-106
- **Key Requirements**:
  - Build type dependency graph
  - Support queries: what types depend on this type? what breaks if I change this type?

**Step 108**: Implement `CallGraph` - Build function/method call graph
- **Location**: `src/core/context/CallGraph.ts`
- **Dependencies**: step-18, step-106
- **Key Requirements**:
  - Build call graph
  - Support queries: who calls this function? what does this function call?

**Step 109**: Implement `ImportGraph` - Build module import dependency graph
- **Location**: `src/core/context/ImportGraph.ts`
- **Dependencies**: step-18, step-106
- **Key Requirements**:
  - Build import graph
  - Support queries: what imports this module? what does this module import?

**Step 110**: Implement `TestCoverageMap` - Map test files to source files
- **Location**: `src/core/context/TestCoverageMap.ts`
- **Dependencies**: step-16 (FileIndexer), step-28c (TestCoverageAnalyzer)
- **Key Requirements**:
  - Map test files to source files
  - Track test coverage

**Step 111**: Implement `CompilerBackedIndex` - Unified compiler-backed index aggregating all graphs
- **Location**: `src/core/context/CompilerBackedIndex.ts`
- **Dependencies**: step-106, step-107, step-108, step-109, step-110
- **Key Requirements**:
  - Incremental by default, full rebuild for validation (incremental: speed; full rebuild: CI, after dependency changes, after tool upgrades)
  - Hybrid persistence (memory: hot queries; disk cache: restart resilience; optional DB for very large repos)
  - Multiple signals for staleness detection (file watchers, timestamps, content checksums, dependency graph invalidation)
  - Support multiple languages sequentially (one language = one adapter, shared query interface, never mix ASTs across languages)
  - Update triggers: file change → incremental update; dependency change → rebuild affected subgraph; on demand → explicit rebuild
  - Mandatory query support (who calls this? what depends on this? is this public? what breaks if I change this?)
  - Performance optimization: lazy AST loading, query result caching, parallel parsing, priority scheduling (accuracy > speed)

### Phase: Compile Gate & Auto-Fix

**Step 112**: Implement `CompileGate` - Hard stop on compilation errors
- **Location**: `src/core/execution/CompileGate.ts`
- **Dependencies**: step-42 (ValidationService), step-18 (TypeScriptParser)
- **Key Requirements**:
  - Zero type errors (hard stop)
  - Zero warnings (configurable)
  - Strict mode enforced
  - No human sees broken code

**Step 113**: Implement `AutoFixLoop` - Automatic fix loop until compilation passes
- **Location**: `src/core/execution/AutoFixLoop.ts`
- **Dependencies**: step-112, step-114, step-115
- **Key Requirements**:
  - Configurable hard limit (default 3-5 iterations, infinite loops forbidden)
  - If auto-fix fails after N iterations: refuse and explain (optionally present partial diff, ask for guidance, never silently accept broken code)
  - Categorize compiler errors: syntax errors, type errors, semantic/logic errors, toolchain errors (each category has different repair strategies)
  - Always conservative (minimal diff, local scope, no speculative refactors)
  - Structured logs (error, root cause, patch, outcome - used for audit and learning)
  - Configurable per error type (mandatory: some errors auto-fix allowed, others require user input)
  - Ambiguous errors: ask or refuse (never guess between multiple valid fixes)

**Step 114**: Implement `ErrorParser` - Parse compiler errors and map to AST nodes
- **Location**: `src/core/execution/ErrorParser.ts`
- **Dependencies**: step-18, step-112
- **Key Requirements**:
  - Parse compiler error messages
  - Map errors to AST nodes
  - Categorize errors

**Step 115**: Implement `ErrorRepairer` - Repair errors based on compiler feedback
- **Location**: `src/core/execution/ErrorRepairer.ts`
- **Dependencies**: step-114, step-93 (ASTPatchGenerator)
- **Key Requirements**:
  - Generate repair patches based on error analysis
  - Conservative repairs only
  - Log all repair decisions

**Step 116**: Enhance `CodeGenerationService` - Integrate compile gate and auto-fix loop
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-112, step-113
- **Key Requirements**:
  - Generate → Compile → Fix → Repeat loop
  - No broken code visible to user

### Phase: Deterministic Generation

**Step 117**: Implement `DeterministicGenerator` - Wrapper enforcing deterministic generation
- **Location**: `src/core/execution/DeterministicGenerator.ts`
- **Dependencies**: step-15 (ModelRouter)
- **Key Requirements**:
  - Fixed temperature (≤ 0.2, no user override in autonomous mode)
  - Fixed system prompts
  - No creativity mode
  - Stable naming
  - Idempotent outputs
  - Retry = deterministic delta, not re-roll

**Step 118**: Implement `PromptTemplateManager` - Fixed, versioned prompt templates
- **Location**: `src/core/execution/PromptTemplateManager.ts`
- **Dependencies**: step-6 (shared types)
- **Key Requirements**:
  - Git + semantic versioning (prompt changes treated as code changes)
  - Layered templates: global base templates → framework templates → project overrides
  - Version control for templates

**Step 119**: Implement `IdempotencyEnforcer` - Ensure idempotent outputs
- **Location**: `src/core/execution/IdempotencyEnforcer.ts`
- **Dependencies**: step-117
- **Key Requirements**:
  - Test idempotency: run same intent twice, compare change graph, AST diff, output hashes
  - Non-idempotent behavior is a bug
  - Pin model per project (model changes require re-validation, re-certification)

**Step 120**: Update `CodeGenerationService` - Use deterministic settings (temp ≤ 0.2)
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-117, step-118, step-119
- **Key Requirements**:
  - Mandatory deterministic mode for autonomous execution (optional only for manual/exploratory mode)
  - Use fixed temperature ≤ 0.2
  - Use versioned prompt templates

### Phase: Refusal System

**Step 121**: Implement `RefusalSystem` - Detect conditions requiring refusal
- **Location**: `src/core/planning/RefusalSystem.ts`
- **Dependencies**: step-88 (IntentSpecValidator), step-36 (PlanGenerator)
- **Key Requirements**:
  - Refuse if incomplete requirements
  - Refuse if conflicting constraints
  - Refuse if unknown runtime environment
  - Refuse if multiple valid architectures exist
  - Configurable confidence threshold (or fixed, or context-dependent)
  - Present refusals: error message, dialog with explanation, inline explanation in UI

**Step 122**: Implement `UncertaintyDetector` - Detect low-confidence situations
- **Location**: `src/core/planning/UncertaintyDetector.ts`
- **Dependencies**: step-121, step-36
- **Key Requirements**:
  - Detect low confidence
  - Trigger refusal if below threshold

**Step 123**: Implement `RefusalExplainer` - Explain refusals and offer solutions
- **Location**: `src/core/planning/RefusalExplainer.ts`
- **Dependencies**: step-121, step-15 (ModelRouter)
- **Key Requirements**:
  - Explain refusal precisely
  - Offer resolution paths (LLM-generated, rule-based, template-based, or hybrid)
  - Users can override refusals (yes, but with warnings, or force proceed option, or strict refusal)
  - Log refusal reasons (for learning, audit, debugging)
  - System learns from user overrides (yes, if user overrides, adjust refusal criteria, but user must confirm learning, or no, treat overrides as exceptions)

**Step 124**: Integrate refusal system into `PlanGenerator` and `CodeGenerationService`
- **Location**: `src/core/planning/PlanGenerator.ts`, `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-121, step-122, step-123
- **Key Requirements**:
  - Check for refusal conditions before planning
  - Check for refusal conditions before code generation
  - Refuse if conditions not met

### Phase: Diff-Aware Repair

**Step 125**: Implement `DiffTracker` - Track what code was generated/changed
- **Location**: `src/core/execution/DiffTracker.ts`
- **Dependencies**: step-93 (ASTPatchGenerator), step-18
- **Key Requirements**:
  - Track generated code: AST node IDs (primary), git diff, file + line ranges (all of the above)
  - Persist tracking information

**Step 126**: Implement `DiffAwareRepairer` - Repair only generated code, not unrelated code
- **Location**: `src/core/execution/DiffAwareRepairer.ts`
- **Dependencies**: step-125, step-115 (ErrorRepairer)
- **Key Requirements**:
  - Repair only generated code
  - Never rewrite unrelated code
  - Use diff tracking to limit scope

**Step 127**: Implement `RepairScopeLimiter` - Limit repairs to direct dependencies only
- **Location**: `src/core/execution/RepairScopeLimiter.ts`
- **Dependencies**: step-126, step-108 (CallGraph), step-109 (ImportGraph)
- **Key Requirements**:
  - Direct dependencies = union of: imports, function calls, type usage, inheritance/implementation
  - Strict by default (strict: generated code only; lenient: + direct dependencies; user-defined only with warning)
  - Static analysis for scope violation detection (runtime checks are too late)

**Step 128**: Enhance `RootCauseAnalyzer` - Use symbol graph for root cause analysis
- **Location**: `src/core/execution/RootCauseAnalyzer.ts`
- **Dependencies**: step-111 (CompilerBackedIndex), step-127
- **Key Requirements**:
  - Use symbol graph for root cause analysis
  - Structured, persistent logs (required for debugging, trust, learning)

### Phase: Bug Memory

**Step 129**: Implement `BugMemory` - Store bug patterns and fixes
- **Location**: `src/core/learning/BugMemory.ts`
- **Dependencies**: step-6 (shared types)
- **Key Requirements**:
  - Bug patterns: code patterns (text matching), AST patterns (structural matching), semantic patterns (meaning-based) - all of the above
  - Persistence: database (queryable, structured), files (JSON, YAML), or in-memory with disk backup
  - Project-specific or global (per project, shared across projects, or both - global + project-specific)
  - Pattern matching: exact match (identical code), fuzzy match (similar code), semantic match (same meaning) - all of the above in order

**Step 130**: Implement `BugPatternLearner` - Learn from bug fixes
- **Location**: `src/core/learning/BugPatternLearner.ts`
- **Dependencies**: step-129, step-45f (ExecutionAuditLog)
- **Key Requirements**:
  - Learn from bug fixes
  - Extract patterns
  - Store in bug memory

**Step 131**: Implement `RegressionPreventer` - Prevent known bug patterns
- **Location**: `src/core/learning/RegressionPreventer.ts`
- **Dependencies**: step-129, step-42 (ValidationService)
- **Key Requirements**:
  - Check generated code against known bug patterns
  - Block or warn if pattern detected
  - Users can add/remove bug patterns manually (yes, full CRUD operations, or yes but read-only system learns only, or no automatic learning only)
  - Version bug memory (with code versions tied to git, or independent versioning, or timestamp-based)

**Step 132**: Integrate bug memory into `CodeGenerationService` and `ValidationService`
- **Location**: `src/core/execution/CodeGenerationService.ts`, `src/core/execution/ValidationService.ts`
- **Dependencies**: step-129, step-131
- **Key Requirements**:
  - Check bug patterns during code generation
  - Check bug patterns during validation
  - Prevent known bugs

### Phase: Structured Outputs

**Step 137**: Implement `StructuredOutputEnforcer` - Ensure all model outputs are structured
- **Location**: `src/core/models/StructuredOutputEnforcer.ts`
- **Dependencies**: step-12 (IModelProvider), step-15 (ModelRouter)
- **Key Requirements**:
  - No text-only generation → structured outputs only
  - All LLM outputs must be structured (JSON Schema, JSON, XML, Protobuf, or all of the above user choice)
  - Handle structured output failures: retry with same model, fallback to text with warning, try different model, or refuse generation

**Step 138**: Implement `OutputSchemaValidator` - Validate outputs against schemas
- **Location**: `src/core/models/OutputSchemaValidator.ts`
- **Dependencies**: step-137
- **Key Requirements**:
  - Validate outputs against JSON Schema
  - Version schemas (with code tied to IDE version, or independent versioning, or semantic versioning)
  - Present schema validation errors (to user show error, to repair agent auto-fix, or both)
  - Schemas: global only, project-configurable, or both (global defaults, project overrides)

**Step 139**: Update all model calls to require structured output
- **Location**: `src/core/models/ModelRouter.ts`, `src/core/planning/PlanGenerator.ts`, `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-137, step-138
- **Key Requirements**:
  - All model calls must specify output schema
  - Validate all outputs

**Step 140**: Implement `OutputParser` - Parse and validate structured outputs
- **Location**: `src/core/models/OutputParser.ts`
- **Dependencies**: step-137, step-138
- **Key Requirements**:
  - Parse structured outputs
  - Validate against schemas
  - Handle parsing errors

### Phase: Code Explanations

**Step 145**: Implement `CodeExplainer` - Generate explanations for generated code
- **Location**: `src/core/execution/CodeExplainer.ts`
- **Dependencies**: step-15 (ModelRouter), step-89 (ChangeGraphBuilder)
- **Key Requirements**:
  - Both structured + natural language (structured: what changed, why, assumptions, edge cases; natural language: human readability)
  - Force model to explain why code is correct, what assumptions it makes, edge cases handled

**Step 146**: Implement `ExplanationValidator` - Validate explanation quality
- **Location**: `src/core/execution/ExplanationValidator.ts`
- **Dependencies**: step-145
- **Key Requirements**:
  - Quality measurement: coverage (matches change graph), specificity, consistency with code, absence of vague claims
  - If explanation is weak: regenerate code + explanation (weak explanation implies weak reasoning)

**Step 147**: Integrate explanation into `CodeGenerationService` - Require explanations
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-145, step-146
- **Key Requirements**:
  - Require explanations for all generated code
  - Validate explanation quality
  - Persist explanations (yes, for audit, learning, documentation - they are part of audit trail)

**Step 148**: Implement `ExplanationUI` - Display explanations to users
- **Location**: `src/renderer/components/ExplanationUI.tsx`
- **Dependencies**: step-147
- **Key Requirements**:
  - Display explanations in UI
  - View-only by default (editable only as annotations, never overwriting system explanation)
  - Final rule: if the system cannot explain why the code is correct, it must not generate it

### Phase: Additional Quality Features

**Step 149**: Implement `CodeGenerationRulesEnforcer` - Enforce all rules from todo.md VI
- **Location**: `src/core/execution/CodeGenerationRulesEnforcer.ts`
- **Dependencies**: step-42 (ValidationService), step-101 (SemanticRulesEngine)
- **Key Requirements**:
  - No inline magic values
  - No duplicated logic
  - No re-implementation of existing utilities
  - No dead code
  - No unused exports
  - No silent error swallowing
  - Explicit error types only

**Step 150**: Implement `ContextRanker` - Rank files by relevance
- **Location**: `src/core/context/ContextRanker.ts`
- **Dependencies**: step-28 (ContextAggregator)
- **Key Requirements**:
  - Rank files by relevance to current task
  - Limit context size deterministically
  - Drop irrelevant files aggressively

**Step 151**: Implement `ContextLimiter` - Limit context size deterministically
- **Location**: `src/core/context/ContextLimiter.ts`
- **Dependencies**: step-150
- **Key Requirements**:
  - Limit context size
  - Deterministic ranking

**Step 152**: Implement `ContextProvenance` - Track context source and freshness
- **Location**: `src/core/context/ContextProvenance.ts`
- **Dependencies**: step-28
- **Key Requirements**:
  - Track where context comes from
  - Track freshness
  - Explicit context provenance

**Step 153**: Implement `ConfidenceScorer` - Score confidence per change
- **Location**: `src/core/planning/ConfidenceScorer.ts`
- **Dependencies**: step-89 (ChangeGraphBuilder), step-42 (ValidationService)
- **Key Requirements**:
  - Score confidence per change
  - Factors: tests passed, type safety, rule violations, novelty of change
  - Low confidence → ask user or refuse

**Step 154**: Implement `RiskClassifier` - Classify risk per change
- **Location**: `src/core/planning/RiskClassifier.ts`
- **Dependencies**: step-89, step-91 (ImpactAnalyzer)
- **Key Requirements**:
  - Classify risk per change
  - Rule-based core + user overrides
  - Risk factors: public API changes, security boundaries, data schema changes, test coverage delta, novel patterns

**Step 155**: Integrate confidence/risk into UI and decision-making
- **Location**: `src/renderer/components/PlanView.tsx`, `src/core/planning/PlanGenerator.ts`
- **Dependencies**: step-153, step-154
- **Key Requirements**:
  - Display confidence scores in UI
  - Display risk classifications in UI
  - Use in decision-making (refusal, warnings, etc.)

## Updated Planning Flow

The new flow ensures ambiguity and problems are anticipated at planning:

1. **User Request** (raw string)
2. **IntentInterpreter** (Step 86) → Structured Intent Spec (JSON Schema)
3. **RequirementDisambiguationAgent** (Step 87) → Detect & resolve ambiguities
4. **IntentSpecValidator** (Step 88) → Validate intent, detect conflicts
5. **PlanGenerator** (Step 36) + **ChangeGraphBuilder** (Step 89) → Generate plan WITH change graph DURING planning
6. **ImpactAnalyzer** (Step 91) → Analyze impact DURING planning
7. **RiskClassifier** (Step 154) → Classify risk DURING planning
8. **ConfidenceScorer** (Step 153) → Score confidence DURING planning
9. **RefusalSystem** (Step 121) → Check if should refuse BEFORE execution
10. **Execution** (only if all checks pass)

## Key Principle

**All ambiguity, problems, risks, and impacts must be identified and resolved DURING the planning phase, BEFORE execution begins.**

---

## Additional Steps (156-175): Quality-First Enhancements

### Phase: Specification Completeness & Non-Goals

**Step 156**: Enhance `IntentInterpreter` - Add Non-Goals section (MANDATORY)
- **Location**: `src/core/intent/IntentInterpreter.ts`
- **Dependencies**: step-86
- **Key Requirements**:
  - Every plan MUST include a Non-Goals section
  - Non-Goals specify: what this change does NOT do, what it does NOT refactor, what it does NOT optimize, what it does NOT modify
  - Prevents hallucinated scope creep
  - Validated during planning and enforced during execution
  - **Artifact-level enforcement** (not intent-only): Check at artifact level during execution, not just intent during planning
  - **Example**: "Do not modify auth" blocks even formatting changes to auth files
  - **Validation**: Every non-goal must be checked against actual artifacts, not just declared intent

**Step 157**: Implement `SpecificationCompletenessGate` - Validate 100% spec completeness for public surfaces
- **Location**: `src/core/planning/SpecificationCompletenessGate.ts`
- **Dependencies**: step-88 (IntentSpecValidator), step-36 (PlanGenerator)
- **Key Requirements**:
  - Check BEFORE planning approval
  - Every public function must have: inputs, outputs, error semantics, side-effects
  - Every state mutation must be explicit
  - Persistence boundaries must be declared
  - Sync/async behavior must be declared
  - Rule: If spec completeness < 100% for public surfaces → refuse
  - Prevents implicit behavior from leaking into generated code

**Step 158**: Implement `SpecificationValidator` - Validate specification completeness
- **Location**: `src/core/planning/SpecificationValidator.ts`
- **Dependencies**: step-157
- **Key Requirements**:
  - Static analysis for structure (check code for spec annotations)
  - LLM-based validation for semantic completeness
  - Internal functions: configurable per project (recommended but not mandatory)
  - Public functions: mandatory 100% completeness

### Phase: Design Quality Gate (MANDATORY)

**Step 159**: Implement `DesignQualityAgent` - Evaluate design quality (Level 2 - Critical)
- **Location**: `src/core/planning/DesignQualityAgent.ts`
- **Dependencies**: step-36 (PlanGenerator), step-89 (ChangeGraphBuilder), step-15 (ModelRouter)
- **Key Requirements**:
  - Agent Level: Level 2 (Critical) - blocks planning approval
  - Evaluates: cohesion (single responsibility), coupling (dependency direction), layer violations, architectural drift, over-engineering vs under-engineering, alignment with existing patterns
  - Mandatory gate: Between planning and execution
  - Output: Pass/Fail, structured critique, suggested refactors (non-executed, for user review), design quality score (0-100)
  - Rule: Code generation refused if design quality score < threshold, even if types/tests pass
  - Code quality ≠ correctness - design quality is separate from technical correctness

**Step 160**: Implement `DesignPatternAnalyzer` - Detect and align with existing patterns
- **Location**: `src/core/planning/DesignPatternAnalyzer.ts`
- **Dependencies**: step-159, step-28 (ContextAggregator), step-111 (CompilerBackedIndex)
- **Key Requirements**:
  - Detect existing patterns: AST analysis (structural), code analysis (behavioral), project convention extraction
  - Measure pattern alignment: similarity score (how similar to existing patterns)
  - If generated code doesn't align: suggest pattern-aligned alternative first, refuse if no good alternative exists

**Step 161**: Integrate Design Quality Gate into planning flow
- **Location**: `src/core/planning/PlanGenerator.ts`
- **Dependencies**: step-159, step-160
- **Key Requirements**:
  - Run Design Quality Agent after plan generation, before execution lock-in
  - Block planning approval if design quality < threshold
  - Include design quality score in plan metadata

### Phase: Invariant System (MANDATORY)

**Step 162**: Implement `InvariantSystem` - Define and validate invariants
- **Location**: `src/core/validation/InvariantSystem.ts`
- **Dependencies**: step-42 (ValidationService), step-18 (TypeScriptParser)
- **Key Requirements**:
  - Invariants: conditions that must always hold true
  - Types: state invariants, behavioral invariants, architectural invariants
  - Declaration: code annotations (TypeScript decorators, JSDoc) + separate specification file
  - Mandatory for public APIs, optional for internal code (with inferred invariants)
  - Examples: "This function must not mutate global state", "This operation must be idempotent", "This service must be side-effect free"

**Step 163**: Implement `InvariantValidator` - Validate invariants at all stages
- **Location**: `src/core/validation/InvariantValidator.ts`
- **Dependencies**: step-162
- **Key Requirements**:
  - Checked at: plan validation (before execution), during execution, in tests, runtime (critical paths only)
  - **Invariants must be**: Deterministic, cheap, side-effect free
  - **If invariant is expensive**: It does not belong in runtime enforcement
  - Runtime checks: only critical paths (balance safety and performance)
  - Violations: fail fast for critical invariants, log and continue for non-critical (with user notification)
  - Generated code must prove (or test) invariants, not just satisfy types
  - **Violation tracking must include**:
    - Which invariant
    - Which step caused it
    - When introduced
  - Essential for autonomous debugging

**Step 164**: Implement `InvariantProver` - Generate proofs/tests for invariants
- **Location**: `src/core/validation/InvariantProver.ts`
- **Dependencies**: step-162, step-163, step-10 (TestGenerator)
- **Key Requirements**:
  - Proof methods: test-based proofs (property tests) for most cases, formal proofs for critical systems
  - Generate property tests for invariants
  - Validate that generated code maintains invariants

**Step 165**: Integrate invariants into code generation
- **Location**: `src/core/execution/CodeGenerationService.ts`
- **Dependencies**: step-162, step-163, step-164
- **Key Requirements**:
  - Require invariant declarations for public APIs
  - Generate invariant tests
  - Validate invariants before code is considered complete

### Phase: Semantic Change Classification (MANDATORY)

**Step 166**: Enhance `ChangeGraphBuilder` - Add semantic change classification
- **Location**: `src/core/planning/ChangeGraphBuilder.ts`
- **Dependencies**: step-89
- **Key Requirements**:
  - Classify each change as: behavior-preserving, behavior-extending, behavior-modifying, or behavior-breaking
  - Classification methods: static analysis (code diff), type analysis, test analysis, LLM-based analysis
  - Happens during planning (as part of change graph generation)
  - Essential for autonomy in large codebases
  - **If reclassification occurs**:
    - Full re-validation
    - Risk re-evaluation
    - User re-approval if risk increases
  - **Hard rule**: Never silently downgrade severity (e.g., "non-breaking" → "breaking")
  - **Validation**: Compare actual behavior vs planned behavior after execution
  - **If actual change doesn't match classification**: Block finalization

**Step 167**: Implement `SemanticChangeValidator` - Validate semantic classification
- **Location**: `src/core/planning/SemanticChangeValidator.ts`
- **Dependencies**: step-166
- **Key Requirements**:
  - Behavior-modifying changes require: explicit user approval, migration plan, version bump
  - Behavior-breaking changes require: explicit user approval, migration plan, version bump (major), backward compatibility analysis
  - Behavior-preserving changes: can proceed autonomously if confidence is high
  - After execution: compare actual behavior vs planned behavior, validate classification accuracy
  - If actual change doesn't match classification → block finalization

### Phase: Test Intent Verification

**Step 168**: Implement `TestIntentAgent` - Verify test intent (Level 2 - Critical)
- **Location**: `src/core/testing/TestIntentAgent.ts`
- **Dependencies**: step-10 (TestGenerator), step-15 (ModelRouter)
- **Key Requirements**:
  - **Agent Level: Level 2 (Critical)** - blocks planning approval (corrected from Level 1)
  - **Invalid tests invalidate the entire plan** (not just advisory)
  - Verifies: tests fail before fix, tests pass after fix, tests assert intended behavior (not implementation details), no tautological tests
  - Detection methods: static analysis (check test logic), runtime analysis (check if test always passes), LLM-based analysis (semantic understanding)
  - Rule: Tests that don't fail before fix invalidate the plan
  - Handle implementation detail tests: convert to behavior tests (preserve test intent while fixing test focus)
  - **Tests must explicitly declare**:
    - Intended behavior
    - Invariant being tested
    - Meaning of failure
  - Otherwise tests become noise

**Step 169**: Integrate Test Intent Verification into test generation
- **Location**: `src/core/execution/TestGenerator.ts`
- **Dependencies**: step-168
- **Key Requirements**:
  - Run Test Intent Agent during test generation and before execution
  - Invalidate plan if tests are invalid
  - Ensure tests actually test intended behavior

### Phase: Learning Quarantine System

**Step 170**: Implement `LearningQuarantine` - Stage new learning before applying
- **Location**: `src/core/learning/LearningQuarantine.ts`
- **Dependencies**: step-129 (BugMemory), step-130 (BugPatternLearner)
- **Key Requirements**:
  - New learning stored as candidate (not applied)
  - Applied only in "shadow mode" (tested but not used for decisions)
  - Requires N successful confirmations before promotion (configurable per learning type)
  - Explicit promotion to active learning (auto-promote after validation, user can override)
  - Prevents slow poisoning of the system
  - **Learning promotion must be**:
    - Versioned (track learning version)
    - Reversible (can unlearn/rollback)
    - Audited (full audit trail)
  - **Hard rule**: Learning must NEVER:
    - Affect execution mid-run
    - Affect retries
    - Affect validation thresholds
  - **Queue learning**: For post-execution validation (don't interrupt execution flow)

**Step 171**: Implement `ShadowModeExecutor` - Test learning without applying
- **Location**: `src/core/learning/ShadowModeExecutor.ts`
- **Dependencies**: step-170
- **Key Requirements**:
  - Test learning patterns without using them for decisions
  - Compare results with baseline
  - Validate learning before promotion

**Step 172**: Implement `LearningPromotionValidator` - Validate learning before promotion
- **Location**: `src/core/learning/LearningPromotionValidator.ts`
- **Dependencies**: step-170, step-171
- **Key Requirements**:
  - Cross-validate with multiple successful cases
  - Require explicit user confirmation (optional, but recommended)
  - Test learned patterns before applying
  - Track learning source and confidence

### Phase: Cross-Agent Consistency (MANDATORY)

**Step 173**: Implement `CrossAgentConsistencyValidator` - Validate agent consistency (Level 2 - Critical)
- **Location**: `src/core/planning/CrossAgentConsistencyValidator.ts`
- **Dependencies**: step-36 (PlanGenerator), step-45 (ExecutionEngine), step-10 (TestGenerator), step-42 (ValidationService)
- **Key Requirements**:
  - Agent Level: Level 2 (Critical) - blocks planning approval
  - Checks: planning agent assumptions vs execution agent actions, test expectations vs contract definitions, type constraints vs runtime validation rules, design quality vs code generation
  - Runs: after all agents complete, before execution lock-in
  - Rule: Any contradiction → planning refused
  - Reporting: list all contradictions, explain why each is a contradiction, suggest resolutions

**Step 174**: Integrate consistency validation into planning flow
- **Location**: `src/core/planning/PlanGenerator.ts`
- **Dependencies**: step-173
- **Key Requirements**:
  - Run consistency validator after all agents complete
  - Block planning approval if contradictions detected
  - Include consistency report in plan metadata

### Phase: Human Escalation Protocol

**Step 175**: Implement `HumanEscalationProtocol` - Explicit escalation when blocking
- **Location**: `src/core/planning/HumanEscalationProtocol.ts`
- **Dependencies**: step-121 (RefusalSystem), step-123 (RefusalExplainer)
- **Key Requirements**:
  - When blocking, provide: what is blocked (clear description), why it's blocked (reasoning), what evidence exists (supporting data), exact decision choices (what user can choose), consequences of each choice (what happens)
  - Decision choices: structured choices with consequences (not just yes/no)
  - User acknowledgment: explicit acknowledgment required (not just clicking through)
  - Logging: log what was blocked, why, user decision, consequences
  - Support "remember this choice" with confirmation
  - Timeout handling: timeout and refuse (safety first, user can retry)
  - Prevents ambiguous user approvals

### Phase: Deterministic Execution Envelope

**Step 176**: Implement `DeterministicExecutionEnvelope` - Hash-level determinism guarantees
- **Location**: `src/core/execution/DeterministicExecutionEnvelope.ts`
- **Dependencies**: step-117 (DeterministicGenerator), step-118 (PromptTemplateManager)
- **Key Requirements**:
  - Execution envelope includes: model version hash, prompt template hash, context snapshot hash, toolchain version hash, **tool versions, rule versions, configuration hashes**
  - **Critical**: Without tool versions, rule versions, and config hashes, determinism is fictional
  - Computed: structured hash (component-wise hashing enables partial matching)
  - Logged: before execution (planned envelope), after execution (actual envelope)
  - Rule: Same envelope → same output, different envelope → different output (expected), same envelope → different output = non-determinism (flag)
  - Detection: compare output hashes, change graphs, AST diffs for same envelope
  - If non-determinism detected: flag as bug, log for investigation, refuse execution (if in deterministic mode)
  - **Envelope changes mid-execution**: Abort immediately (safety)
  - Included in audit logs: always (essential for reproducibility and debugging)

**Step 177**: Integrate execution envelope into execution flow
- **Location**: `src/core/execution/ExecutionEngine.ts`
- **Dependencies**: step-176
- **Key Requirements**:
  - Compute envelope before execution
  - Log envelope in execution logs
  - Detect and flag non-determinism
  - Support deterministic mode enforcement

### Phase: Critical Execution Primitives (MANDATORY)

**Step 178**: Implement `StepCoverageVerifier` - Verify requirement-to-step mapping (CRITICAL)
- **Location**: `src/core/planning/StepCoverageVerifier.ts`
- **Dependencies**: step-36 (PlanGenerator), step-86 (IntentInterpreter)
- **Key Requirements**:
  - **Requirement ↔ step ↔ artifact mapping**: Verify every requirement → ≥1 plan step, every plan step → ≥1 artifact or validation
  - **Detection of**:
    - Orphan requirements (requirements with no steps)
    - Orphan steps (steps with no requirements)
    - Unreachable steps
    - Circular dependencies
  - **Validation checks**:
    - All user requirements mapped to steps
    - All steps have clear purpose (artifact or validation)
    - No circular dependencies
    - No unreachable steps
  - **Critical Rule**: Fail if coverage is incomplete
  - **Why**: This is the primary defense against missing steps

**Step 179**: Implement `ExecutionCompletionValidator` - Define completion criteria (CRITICAL)
- **Location**: `src/core/execution/ExecutionCompletionValidator.ts`
- **Dependencies**: step-45 (ExecutionEngine), step-42 (ValidationService)
- **Key Requirements**:
  - **Completion requires ALL**:
    - Steps executed
    - Invariants valid
    - Tests passed
    - Artifacts match declarations
    - No unresolved warnings
    - Final state matches plan goals
    - All validation gates passed
  - **Critical Rule**: Compilation success ≠ completion
  - **After execution validation**:
    - Rebuild dependency graph
    - Re-run invariants
    - Re-run tests
    - Compare final state vs plan goals
    - Validate all artifacts
    - Check for unexpected changes
  - **If any mismatch**: Execution considered failed, even if code compiles

**Step 180**: Implement `UnexpectedChangeDetector` - Forbid silent success (CRITICAL)
- **Location**: `src/core/execution/UnexpectedChangeDetector.ts`
- **Dependencies**: step-89 (ChangeGraphBuilder), step-45 (ExecutionEngine)
- **Key Requirements**:
  - **Detect**:
    - Undeclared files (new files not in artifact ledger)
    - Extra diffs (beyond declared artifacts)
    - Unplanned symbol changes
    - Side effects outside declared artifacts
    - Unplanned behavior
  - **Hard Rule**: Stop execution immediately on detection
  - **On detection**:
    - Stop execution immediately
    - Log unexpected change
    - Rollback to last checkpoint
    - Report to user: what was unexpected, why it's a problem, what should have happened
    - Ask user for resolution
  - **Never silently accept unexpected changes**

## Updated Planning Flow (Enhanced)

The enhanced flow now includes all quality gates:

1. **User Request** (raw string)
2. **IntentInterpreter** (Step 86) → Structured Intent Spec (JSON Schema) + **Non-Goals** (Step 156)
3. **RequirementDisambiguationAgent** (Step 87) → Detect & resolve ambiguities (Class A/B/C)
4. **IntentSpecValidator** (Step 88) → Validate intent, detect conflicts
5. **SpecificationCompletenessGate** (Step 157) → Validate 100% spec completeness for public surfaces
6. **PlanGenerator** (Step 36) + **ChangeGraphBuilder** (Step 89) → Generate plan WITH change graph DURING planning
7. **SemanticChangeClassifier** (Step 166) → Classify changes semantically
8. **ImpactAnalyzer** (Step 91) → Analyze impact DURING planning
9. **RiskClassifier** (Step 154) → Classify risk DURING planning
10. **ConfidenceScorer** (Step 153) → Score confidence DURING planning
11. **DesignQualityAgent** (Step 159) → Evaluate design quality (Level 2 - Critical)
12. **CrossAgentConsistencyValidator** (Step 173) → Validate agent consistency (Level 2 - Critical)
13. **StepCoverageVerifier** (Step 178) → Verify requirement-to-step mapping (CRITICAL - before execution)
14. **RefusalSystem** (Step 121) → Check if should refuse BEFORE execution
15. **HumanEscalationProtocol** (Step 175) → Escalate if blocking
16. **Execution Lock-In** → After all Level ≥1 agents complete, all validations pass
17. **Execution** (only if all checks pass) → With deterministic execution envelope (Step 176)
18. **UnexpectedChangeDetector** (Step 180) → Monitor for unexpected changes DURING execution (CRITICAL)
19. **UnexpectedChangeDetector** (Step 180) → Monitor for unexpected changes DURING execution (CRITICAL)
20. **TestIntentAgent** (Step 168) → Verify test intent (Level 2 - Critical)
21. **InvariantValidator** (Step 163) → Validate invariants at all stages
22. **ExecutionCompletionValidator** (Step 179) → Validate completion criteria AFTER execution (CRITICAL)
23. **LearningQuarantine** (Step 170) → Stage new learning before applying

## Implementation Priority

### Phase 1: Critical Foundations (Weeks 1-2)
- Steps 86-88: Intent & Ambiguity Resolution
- Step 156: Non-Goals (MANDATORY)
- Step 157-158: Specification Completeness Gate
- Step 159-161: Design Quality Gate (Level 2 - Critical)
- Step 162-165: Invariant System
- Step 166-167: Semantic Change Classification
- Step 168-169: Test Intent Verification (Level 2 - Critical)
- Step 173-174: Cross-Agent Consistency (Level 2 - Critical)
- Step 175: Human Escalation Protocol
- **Step 178: Step Coverage Verification (CRITICAL - correctness primitive)**
- **Step 179: Execution Completion Validator (CRITICAL - correctness primitive)**
- **Step 180: Unexpected Change Detector (CRITICAL - correctness primitive)**

### Phase 2: Safety & Quality (Weeks 3-4)
- Step 170-172: Learning Quarantine System
- Step 176-177: Deterministic Execution Envelope
- Steps 112-116: Compile Gate & Auto-Fix
- Steps 125-128: Diff-Aware Repair
- **Execution Recovery & State Persistence**: WAL-style append-only persistence, hash verification on recovery
- **Agent Timeout Handling**: Timeout classification, retry rules, Level 2 agents no retry

### Phase 3: Advanced Features (Weeks 5-6)
- Steps 93-96: AST Patch Generation
- Steps 97-100: Contract-First Generation
- Steps 101-111: Semantic Rules & Compiler-Backed Index
- Steps 117-120: Deterministic Generation
- Steps 129-132: Bug Memory
- Steps 137-140: Structured Outputs
- Steps 145-148: Code Explanations

## Additional Implementation Notes

### Execution Recovery & State Persistence (Enhancement to ExecutionCheckpointSystem)

**Required enhancements**:
- **WAL-style append-only persistence**: Never overwrite, always append (WAL-style)
- **Verify on recovery**:
  - Plan hash
  - Execution envelope hash
  - Agent versions
- **Hard rule**: Hash mismatch → refuse execution
- **Recovery state must include**: Current step ID, plan hash, execution envelope, checkpoint ID, agent completion status, agent versions, validation results, invariant state, artifact ledger
- **Critical Rule**: If recovered state hash ≠ current plan hash → refuse execution

### Agent Timeout Handling (Enhancement to Agent System)

**Required enhancements**:
- **Timeout classification** (must classify reason):
  - Model stall
  - Deadlock
  - Resource exhaustion
  - External dependency failure
- **Different causes → different recovery paths**
- **Retry rules**:
  - Retry only if: Agent is stateless, no side effects, inputs unchanged
  - Timeout ≠ retry unless failure is provably non-semantic
  - Level 2 agents → no retry (fail fast)
- **Default timeouts**:
  - Level 0: No timeout (informational)
  - Level 1: Configurable per agent (30s-5min)
  - Level 2: Strict timeout (10s-1min)

### Plan Modification During Execution (Enhancement to Plan System)

**Required enhancements**:
- **Any modification**:
  - Invalidates all future steps
  - Requires full re-validation
- **Hard rule**: Any modification invalidates all future steps until re-validated
- **Modification process**: Pause execution, invalidate future steps, re-validate new/modified steps, ask user to confirm
- If confirmed: re-validate entire plan, recompute plan hash, continue from current step
- If not confirmed: abort execution

## Key Principles (Updated)

1. **All ambiguity, problems, risks, and impacts must be identified and resolved DURING the planning phase, BEFORE execution begins.**
2. **Design Quality ≠ Correctness** - Design quality is evaluated separately and is mandatory.
3. **Specification Completeness is Mandatory** - 100% completeness required for public surfaces.
4. **Invariants Must Be Proven** - Generated code must prove (or test) invariants, not just satisfy types.
5. **Semantic Changes Must Be Classified** - Behavior-modifying/breaking changes require explicit approval.
6. **Test Intent Must Be Verified** - Tests that don't fail before fix invalidate the plan (Level 2 - Critical).
7. **Learning Must Be Quarantined** - New learning staged before applying to prevent slow poisoning.
8. **Agents Must Be Consistent** - Any contradiction between agents → planning refused.
9. **Escalation Must Be Explicit** - Clear protocol when blocking, with structured choices and consequences.
10. **Determinism Must Be Hash-Level** - Same envelope → same output, or flag non-determinism.
11. **Step Coverage Must Be Verified** - Every requirement → ≥1 step, every step → ≥1 artifact (Step 178).
12. **Execution Completion is Defined** - Compilation success ≠ completion (Step 179).
13. **Silent Success is Forbidden** - Unexpected changes must stop execution immediately (Step 180).
