# Agent Pipeline Integration - Pre-Implementation Analysis

**Date**: 2025-01-27  
**Objective**: Integrate AgentOrchestrator and AgentPipeline into planning/execution system  
**Status**: Pre-Implementation Analysis Complete

---

## 1. Current State Analysis

### 1.1 Existing Components

**✅ AgentOrchestrator** (`src/core/agents/AgentOrchestrator.ts`)
- Full implementation (470 lines)
- Coordinates agent execution through pipeline
- Supports checkpoint creation
- Handles stage execution with timeout
- Event emission for debugging
- ⚠️ Resume from checkpoint not fully implemented

**✅ AgentPipeline** (`src/core/agents/AgentPipeline.ts`)
- Full implementation (539 lines)
- 11 default pipeline stages defined
- Stage dependency validation
- Cycle detection
- Checkpoint creation
- Parallel execution support

**✅ AgentRegistry** (`src/core/agents/AgentRegistry.ts`)
- Full implementation (348 lines)
- Agent registration and storage
- Version management
- Scope-based organization

### 1.2 Current Usage Patterns

**StepExecutor** (`src/core/execution/StepExecutor.ts`)
- **Current**: Gets agents directly from AgentRegistry
- **Current**: Calls `agent.execute()` directly (line 132)
- **Missing**: Does NOT use AgentOrchestrator
- **Missing**: Does NOT use AgentPipeline

**PlanGenerator** (`src/core/planning/PlanGenerator.ts`)
- **Current**: Uses planning agents directly (DesignQualityAgent, etc.)
- **Current**: No agent orchestration
- **Missing**: Does NOT use AgentOrchestrator
- **Missing**: Does NOT use AgentPipeline

**ExecutionEngine** (`src/core/execution/ExecutionEngine.ts`)
- **Current**: Uses StepExecutor
- **Missing**: Does NOT use AgentOrchestrator
- **Missing**: Does NOT use AgentPipeline

### 1.3 Integration Points

**Where Agents Are Called**:
1. `StepExecutor.executeStepWithAgent()` - Line 72-182
   - Gets agent from registry (line 82)
   - Calls `agent.execute()` directly (line 132)
   - **Integration Point**: Replace direct call with orchestrator

2. `PlanGenerator.generatePlan()` - Various locations
   - Uses planning agents directly
   - **Integration Point**: Use orchestrator for planning agents

---

## 2. Architecture Analysis

### 2.1 Agent Pipeline Stages

**Default Pipeline Stages** (from AgentPipeline.ts):
1. `intent-interpreter` - Order 1, Required, Critical
2. `requirement-disambiguation` - Order 2, Required, Critical
3. `planning` - Order 3, Required, Critical
4. `context-selection` - Order 4, Required, Critical
5. `code-generation` - Order 5, Required, Critical
6. `static-analysis` - Order 6, Required, Critical
7. `test-generation` - Order 7, Optional, Not Critical
8. `execution` - Order 8, Required, Critical
9. `repair` - Order 9, Optional, Not Critical
10. `risk-assessment` - Order 10, Optional, Not Critical
11. `policy-enforcement` - Order 11, Required, Critical

### 2.2 Current Agent Execution Flow

**StepExecutor Flow**:
```
StepExecutor.executeStep()
  → executeStepWithAgent()
    → agentRegistry.get(agentId)
    → agent.execute(input, context)
    → Convert result to StepResult
```

**Desired Flow with Orchestrator**:
```
StepExecutor.executeStep()
  → agentOrchestrator.execute(input, context)
    → AgentPipeline.getNextStage()
    → Execute stage with agent
    → Store checkpoint
    → Continue to next stage
    → Return final result
```

### 2.3 Integration Strategy

**Option 1: Full Pipeline Integration**
- Replace all direct agent calls with orchestrator
- Enforce pipeline stages for all agent executions
- **Pros**: Full pipeline enforcement
- **Cons**: May break existing functionality if pipeline stages don't match

**Option 2: Hybrid Approach**
- Use orchestrator for multi-stage agent workflows
- Keep direct calls for simple single-agent operations
- **Pros**: Gradual migration, less risk
- **Cons**: Partial enforcement, complexity

**Option 3: Configuration-Based**
- Add flag to enable/disable pipeline enforcement
- Default to direct calls, opt-in to pipeline
- **Pros**: Backward compatible, safe rollout
- **Cons**: Pipeline not enforced by default

**Recommended**: **Option 2 (Hybrid Approach)**
- Use orchestrator for step execution (multi-stage)
- Keep direct calls for simple planning agents
- Add configuration to enable full pipeline mode

---

## 3. Dependencies & Integration Points

### 3.1 Required Dependencies

**AgentOrchestrator Dependencies**:
- `AgentPipeline` - Pipeline definition
- `AgentRegistry` - Agent lookup
- `ExecutionAuditLog` - Audit logging
- `ExecutionContext` - Execution context

**StepExecutor Dependencies**:
- `AgentRegistry` - Already has
- `AgentMemoryManager` - Already has
- `CodeGenerationService` - Existing
- `FileOperationService` - Existing
- `ValidationService` - Existing
- `BackupService` - Existing

**New Dependencies Needed**:
- `AgentOrchestrator` - Need to inject
- `AgentPipeline` - Need to create/configure
- `ExecutionAuditLog` - Need to inject

### 3.2 Database Models

**AgentExecution** - Already exists (used in StepExecutor line 271)
- Stores agent execution state
- Compatible with orchestrator

**No Schema Changes Required**

### 3.3 IPC Handlers

**Current IPC Handlers**:
- `agentHandlers.ts` - Agent management
- `planningHandlers.ts` - Planning
- `executionHandlers.ts` - Execution

**No Changes Required** - Integration is internal

---

## 4. Implementation Plan

### 4.1 Step 1: Create AgentPipeline Configuration

**Objective**: Create pipeline configuration for step execution

**Files to Create/Modify**:
- Create: `src/core/execution/StepExecutionPipeline.ts`
  - Define pipeline stages for step execution
  - Map step types to pipeline stages

**Details**:
- Define stages: `code-generation`, `static-analysis`, `test-generation`, `execution`
- Map step.type to appropriate stage
- Configure dependencies between stages

### 4.2 Step 2: Integrate AgentOrchestrator into StepExecutor

**Objective**: Replace direct agent calls with orchestrator

**Files to Modify**:
- `src/core/execution/StepExecutor.ts`
  - Add AgentOrchestrator dependency
  - Add AgentPipeline dependency
  - Add ExecutionAuditLog dependency
  - Modify `executeStepWithAgent()` to use orchestrator

**Details**:
- Inject AgentOrchestrator in constructor
- Create pipeline for step execution
- Replace `agent.execute()` with `orchestrator.execute()`
- Handle pipeline results

### 4.3 Step 3: Update ExecutionEngine

**Objective**: Pass orchestrator to StepExecutor

**Files to Modify**:
- `src/core/execution/ExecutionEngine.ts`
  - Create AgentOrchestrator instance
  - Pass to StepExecutor

**Details**:
- Initialize AgentOrchestrator with pipeline
- Pass to StepExecutor constructor
- Handle orchestrator events

### 4.4 Step 4: Add Configuration

**Objective**: Add configuration for pipeline enforcement

**Files to Modify**:
- `src/core/config/ConfigManager.ts` or config files
  - Add `agentPipeline.enabled` flag
  - Add `agentPipeline.strictMode` flag

**Details**:
- Default: `enabled: true`, `strictMode: false`
- Allow opt-out for backward compatibility

### 4.5 Step 5: Testing

**Objective**: Verify integration works

**Tests to Add**:
- Unit tests for StepExecutionPipeline
- Integration tests for orchestrator integration
- E2E tests for step execution with pipeline

---

## 5. Risk Analysis

### 5.1 Breaking Changes

**Risk**: Medium
- Changing StepExecutor behavior may break existing code
- **Mitigation**: Add configuration flag, default to enabled but allow opt-out

### 5.2 Performance Impact

**Risk**: Low
- Orchestrator adds overhead but minimal
- **Mitigation**: Pipeline is efficient, checkpoints only when configured

### 5.3 Compatibility

**Risk**: Low
- Agent interface unchanged
- **Mitigation**: Agents work the same, just called through pipeline

---

## 6. Success Criteria

### 6.1 Functional Requirements

- ✅ Step execution uses AgentOrchestrator
- ✅ Pipeline stages are enforced
- ✅ Checkpoints are created (when configured)
- ✅ Existing functionality continues to work
- ✅ Configuration allows opt-out

### 6.2 Quality Requirements

- ✅ No breaking changes (backward compatible)
- ✅ All tests pass
- ✅ Code compiles without errors
- ✅ Types are aligned
- ✅ Error handling is explicit

---

## 7. Next Steps

**Step 1**: Create StepExecutionPipeline configuration
**Step 2**: Integrate AgentOrchestrator into StepExecutor
**Step 3**: Update ExecutionEngine
**Step 4**: Add configuration
**Step 5**: Testing

**Estimated Steps**: 5
**Estimated Complexity**: Medium
**Risk Level**: Medium

---

**End of Pre-Implementation Analysis**
