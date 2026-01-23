# Module Detection Module

**Category:** Project Management  
**Location:** `src/core/context/` (module-related)  
**Last Updated:** 2025-01-27

---

## Overview

The Module Detection Module provides automatic detection and organization of codebase modules. It analyzes project structure, dependencies, and code relationships to identify logical modules and submodules.

## Purpose

- Automatic module detection
- Module organization
- Module metadata extraction
- Module visualization
- Module dependency mapping
- Module quality analysis

---

## Key Components

### 1. Module Detector (`ModuleDetector.ts`)

**Location:** `src/core/context/ModuleDetector.ts`

**Purpose:** Detect modules from project structure

**Key Methods:**
```typescript
async detect(projectId: string): Promise<ModuleDetectionResult>
detectModulesFromStructure(files: FileInfo[], projectId: string): Module[]
detectSubmodules(modules: Module[], files: FileInfo[], ast: ASTInfo): Submodule[]
mapModuleDependencies(modules: Module[], dependencies: DependencyInfo[]): ModuleDependency[]
calculateConfidence(modules: Module[], submodules: Submodule[], dependencies: ModuleDependency[]): number
```

### 2. Module Analyzer (`ModuleAnalyzer.ts`)

**Location:** `src/core/context/ModuleAnalyzer.ts`

**Purpose:** Analyze module quality and structure

**Key Methods:**
```typescript
async analyze(module: Module, submodules: Submodule[], dependencies: ModuleDependency[]): Promise<ModuleAnalysisResult>
analyzeCohesion(moduleFiles: FileInfo[], module: Module): CohesionScore
analyzeCoupling(dependencies: ModuleDependency[], moduleId: string): CouplingScore
analyzeComplexity(moduleFiles: FileInfo[]): Promise<ComplexityScore>
analyzeDuplication(moduleFiles: FileInfo[]): Promise<DuplicationScore>
detectIssues(module: Module, cohesion: CohesionScore, coupling: CouplingScore, complexity: ComplexityScore, duplication: DuplicationScore): Issue[]
generateRecommendations(...): Recommendation[]
```

---

## Module Detection

### Detection Process

1. **File Analysis** - Analyze file structure
2. **Dependency Analysis** - Analyze dependencies
3. **AST Analysis** - Analyze code structure
4. **Module Identification** - Identify module boundaries
5. **Submodule Detection** - Detect submodules
6. **Dependency Mapping** - Map inter-module dependencies
7. **Confidence Calculation** - Calculate detection confidence

### Detection Strategies

**Directory-Based:**
- Modules organized in directories
- Clear directory boundaries
- Consistent naming patterns

**Dependency-Based:**
- Modules have internal dependencies
- Limited external dependencies
- Clear dependency boundaries

**Cohesion-Based:**
- Files in module work together
- Shared functionality
- Related features

---

## Module Structure

### Module Model

```typescript
interface Module {
  id: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
  confidence: number;
  projectId: string;
}
```

### Submodule Model

```typescript
interface Submodule {
  id: string;
  moduleId: string;
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
}
```

### Module Dependency Model

```typescript
interface ModuleDependency {
  fromModuleId: string;
  toModuleId: string;
  type: 'import' | 'reference' | 'inheritance';
  strength: 'weak' | 'medium' | 'strong';
}
```

---

## Module Detection Result

```typescript
interface ModuleDetectionResult {
  modules: Module[];
  submodules: Submodule[];
  dependencies: ModuleDependency[];
  confidence: number; // 0.0 - 1.0
}
```

---

## Module Analysis

### Analysis Metrics

**Cohesion:**
- How well files in module work together
- Shared functionality
- Internal relationships

**Coupling:**
- Dependencies on other modules
- External relationships
- Dependency strength

**Complexity:**
- Code complexity
- Cyclomatic complexity
- Cognitive complexity

**Duplication:**
- Code duplication
- Pattern duplication
- Refactoring opportunities

### Analysis Result

```typescript
interface ModuleAnalysisResult {
  moduleId: string;
  qualityScore: number; // 0.0 - 1.0
  cohesion: CohesionScore;
  coupling: CouplingScore;
  complexity: ComplexityScore;
  duplication: DuplicationScore;
  issues: Issue[];
  recommendations: Recommendation[];
}
```

---

## Module Quality

### Quality Score

Calculated from:
- Cohesion (30%)
- Coupling (25%)
- Complexity (25%)
- Duplication (20%)

### Quality Levels

- **Excellent** (0.9-1.0) - Well-structured module
- **Good** (0.7-0.9) - Acceptable structure
- **Fair** (0.5-0.7) - Needs improvement
- **Poor** (<0.5) - Significant issues

---

## Module Issues

### Common Issues

**Low Cohesion:**
- Files don't work together
- Unrelated functionality
- Poor organization

**High Coupling:**
- Too many dependencies
- Tight coupling
- Circular dependencies

**High Complexity:**
- Complex code
- Difficult to understand
- Hard to maintain

**High Duplication:**
- Code duplication
- Pattern duplication
- Refactoring needed

---

## Recommendations

### Improvement Recommendations

**Cohesion Improvements:**
- Group related files
- Extract shared functionality
- Improve organization

**Coupling Improvements:**
- Reduce dependencies
- Use interfaces
- Break circular dependencies

**Complexity Improvements:**
- Simplify code
- Extract functions
- Reduce nesting

**Duplication Improvements:**
- Extract common code
- Use shared utilities
- Refactor patterns

---

## Usage Examples

### Detect Modules

```typescript
const detector = new ModuleDetector(
  projectRoot,
  fileIndexer,
  dependencyGraph,
  astAnalyzer
);

// Detect modules
const result = await detector.detect(projectId);

console.log(`Detected ${result.modules.length} modules`);
console.log(`Confidence: ${result.confidence}`);

for (const module of result.modules) {
  console.log(`Module: ${module.name}`);
  console.log(`  Files: ${module.files.length}`);
  console.log(`  Dependencies: ${module.dependencies.length}`);
}
```

### Analyze Module

```typescript
const analyzer = new ModuleAnalyzer(
  fileIndexer,
  astAnalyzer,
  duplicationDetector,
  complexityAnalyzer
);

// Analyze module
const analysis = await analyzer.analyze(
  module,
  submodules,
  dependencies
);

console.log(`Quality Score: ${analysis.qualityScore}`);
console.log(`Cohesion: ${analysis.cohesion.score}`);
console.log(`Coupling: ${analysis.coupling.score}`);
console.log(`Complexity: ${analysis.complexity.score}`);

// Show issues
for (const issue of analysis.issues) {
  console.log(`Issue: ${issue.type} - ${issue.description}`);
}

// Show recommendations
for (const rec of analysis.recommendations) {
  console.log(`Recommendation: ${rec.description}`);
}
```

### Detect Gaps

```typescript
// Analyze gaps
const gaps = await analyzer.analyzeGaps(
  modules,
  submodules,
  dependencies
);

for (const gap of gaps) {
  console.log(`Gap: ${gap.type} - ${gap.description}`);
}
```

---

## Integration Points

### Context Aggregation

- Module information in context
- Module relationships
- Module dependencies

### Planning Integration

- Module-aware planning
- Cross-module impact
- Module boundaries

### Execution Integration

- Module-aware execution
- Module boundaries respected
- Module isolation

---

## Related Modules

- **Context Aggregation Module** - Uses module detection
- **Planning Module** - Module-aware planning
- **Execution Module** - Module-aware execution
- **Architecture & Design Module** - Architecture analysis

---

## Summary

The Module Detection Module provides automatic codebase module detection and analysis for the Coder IDE. With module detection, quality analysis, issue detection, and recommendations, it enables better code organization and module-aware development workflows.
