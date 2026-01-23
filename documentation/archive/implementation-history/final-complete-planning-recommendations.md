# Complete Planning Recommendations - Final Specification

**All 25+ Recommendations with Implementation Details**

---

## PART 1: DATABASE SCHEMAS FOR CORE FEATURES

### 1. CODE GENERATION TEMPLATES LIBRARY

```sql
-- ============================================================================
-- CODE TEMPLATES SYSTEM
-- ============================================================================

-- Template Categories
CREATE TABLE template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Code Templates
CREATE TABLE code_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES template_categories(id),
  
  -- Template identity
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  
  -- Template metadata
  framework VARCHAR(100),  -- React, Node.js, Express, etc.
  language VARCHAR(50) NOT NULL,  -- TypeScript, JavaScript, etc.
  file_extension VARCHAR(10),  -- .tsx, .ts, .js
  
  -- Template content
  template_content TEXT NOT NULL,  -- The actual template with {{placeholders}}
  
  -- Configuration
  configurable_fields JSONB NOT NULL,  -- Array of TemplateField
  default_values JSONB,  -- Default values for fields
  
  -- Usage guidelines
  usage_guidelines TEXT,
  when_to_use TEXT,
  when_not_to_use TEXT,
  
  -- Examples
  example_completed TEXT,  -- Completed example
  example_variations JSONB,  -- Array of variations
  
  -- Validation
  validation_rules JSONB,  -- Array of validation rules
  required_dependencies JSONB,  -- Array of npm packages needed
  
  -- Quality standards
  eslint_rules JSONB,
  prettier_config JSONB,
  typescript_config JSONB,
  
  -- Related templates
  related_template_ids JSONB,  -- Array of related template IDs
  supersedes_template_id UUID REFERENCES code_templates(id),  -- Template this replaces
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
  is_default BOOLEAN DEFAULT FALSE,  -- Default template for category
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  success_rate DECIMAL(5,2),  -- % of successful generations
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMP,
  
  UNIQUE(project_id, name, version)
);

-- Template Fields (for configuration)
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES code_templates(id) ON DELETE CASCADE,
  
  -- Field definition
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('string', 'number', 'boolean', 'array', 'object', 'enum')),
  description TEXT,
  
  -- Validation
  required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  validation_regex VARCHAR(500),
  min_length INTEGER,
  max_length INTEGER,
  min_value DECIMAL,
  max_value DECIMAL,
  
  -- For enum type
  enum_options JSONB,  -- Array of possible values
  
  -- For array type
  array_item_type VARCHAR(50),
  min_items INTEGER,
  max_items INTEGER,
  
  -- Dependencies
  depends_on_field VARCHAR(100),  -- Shows only if another field has certain value
  depends_on_value TEXT,
  
  -- UI hints
  placeholder VARCHAR(255),
  help_text TEXT,
  ui_widget VARCHAR(50),  -- text, textarea, select, checkbox, etc.
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Usage History
CREATE TABLE template_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES code_templates(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  
  -- What was generated
  generated_file_path TEXT,
  field_values JSONB,  -- Values used for template fields
  
  -- Outcome
  success BOOLEAN NOT NULL,
  error_message TEXT,
  validation_issues JSONB,
  
  -- Quality metrics
  lines_of_code INTEGER,
  cyclomatic_complexity DECIMAL(5,2),
  code_smells_count INTEGER,
  
  -- Timing
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  executed_by VARCHAR(10) CHECK (executed_by IN ('human', 'ai'))
);

-- Template Ratings & Feedback
CREATE TABLE template_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES code_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Rating
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  
  -- Feedback
  feedback_text TEXT,
  improvement_suggestions TEXT,
  
  -- What was good/bad
  pros JSONB,  -- Array of strings
  cons JSONB,  -- Array of strings
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR TEMPLATES
-- ============================================================================

CREATE INDEX idx_templates_project ON code_templates(project_id);
CREATE INDEX idx_templates_category ON code_templates(category_id);
CREATE INDEX idx_templates_framework ON code_templates(framework);
CREATE INDEX idx_templates_language ON code_templates(language);
CREATE INDEX idx_templates_status ON code_templates(status);
CREATE INDEX idx_template_fields_template ON template_fields(template_id);
CREATE INDEX idx_template_usage_template ON template_usage_history(template_id);
CREATE INDEX idx_template_usage_task ON template_usage_history(task_id);
CREATE INDEX idx_template_feedback_template ON template_feedback(template_id);
```

### 2. DEPENDENCY RESOLUTION SYSTEM

```sql
-- ============================================================================
-- DEPENDENCY RESOLUTION SYSTEM
-- ============================================================================

-- Package Registry Cache (npm, yarn, pnpm)
CREATE TABLE package_registry_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package identity
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  registry VARCHAR(50) NOT NULL DEFAULT 'npm',  -- npm, yarn, pnpm, custom
  
  -- Package metadata
  description TEXT,
  homepage TEXT,
  repository TEXT,
  license VARCHAR(100),
  
  -- Dependencies
  dependencies JSONB,  -- { "packageName": "version" }
  peer_dependencies JSONB,
  dev_dependencies JSONB,
  optional_dependencies JSONB,
  
  -- Compatibility
  engines JSONB,  -- { "node": ">=14.0.0", "npm": ">=6.0.0" }
  
  -- Security
  known_vulnerabilities JSONB,  -- Array of CVEs
  security_score INTEGER,
  
  -- Popularity & Quality
  npm_weekly_downloads BIGINT,
  github_stars INTEGER,
  last_publish_date TIMESTAMP,
  
  -- Cache metadata
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cache_expires_at TIMESTAMP NOT NULL,
  
  UNIQUE(package_name, version, registry)
);

-- Project Dependencies (current state)
CREATE TABLE project_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Package identity
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  
  -- Type
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('dependency', 'devDependency', 'peerDependency', 'optionalDependency')),
  
  -- Installation info
  installed_version VARCHAR(50),
  installation_path TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'removed')),
  
  -- Metadata
  installed_at TIMESTAMP,
  installed_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, package_name, dependency_type)
);

-- Planned Dependencies (for future tasks)
CREATE TABLE planned_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  
  -- Package identity
  package_name VARCHAR(255) NOT NULL,
  version_requirement VARCHAR(100) NOT NULL,  -- ^1.0.0, ~1.2.0, >=1.0.0, etc.
  
  -- Type
  dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('dependency', 'devDependency', 'peerDependency', 'optionalDependency')),
  
  -- Resolution
  resolved_version VARCHAR(50),  -- Actual version that will be installed
  resolution_status VARCHAR(20) CHECK (resolution_status IN ('pending', 'resolved', 'conflict', 'failed')),
  
  -- Why needed
  reason TEXT,
  required_by_task_id UUID REFERENCES tasks(id),
  
  -- Validation
  validation_status VARCHAR(20) CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_errors JSONB,
  
  -- Installation planning
  install_order INTEGER,  -- Order to install dependencies
  install_command TEXT,  -- Exact command to install
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Dependency Conflicts
CREATE TABLE dependency_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Conflict details
  package_name VARCHAR(255) NOT NULL,
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('version_conflict', 'peer_dependency_conflict', 'circular_dependency', 'missing_peer')),
  
  -- Conflicting requirements
  requirement_1 TEXT NOT NULL,
  required_by_1 TEXT NOT NULL,
  requirement_2 TEXT NOT NULL,
  required_by_2 TEXT NOT NULL,
  
  -- Resolution
  resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN ('use_highest', 'use_lowest', 'manual', 'upgrade', 'downgrade')),
  resolved_version VARCHAR(50),
  resolution_notes TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'accepted')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Import Path Mappings
CREATE TABLE import_path_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Source and target
  source_file_path TEXT NOT NULL,
  target_file_path TEXT NOT NULL,
  
  -- Import details
  import_type VARCHAR(20) NOT NULL CHECK (import_type IN ('default', 'named', 'namespace', 'side_effect')),
  imported_symbols JSONB,  -- Array of symbol names for named imports
  
  -- Calculated import path
  import_statement TEXT NOT NULL,  -- The actual import statement
  relative_path TEXT NOT NULL,  -- ../../../target
  
  -- Validation
  is_valid BOOLEAN DEFAULT TRUE,
  validation_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(source_file_path, target_file_path, import_type)
);

-- Dependency Installation History
CREATE TABLE dependency_installation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  
  -- Installation details
  package_name VARCHAR(255) NOT NULL,
  version_requested VARCHAR(100),
  version_installed VARCHAR(50),
  dependency_type VARCHAR(20) NOT NULL,
  
  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  installation_time_ms INTEGER,
  
  -- Command executed
  command_executed TEXT,
  
  -- What was affected
  files_modified JSONB,  -- package.json, package-lock.json, etc.
  
  installed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  installed_by UUID REFERENCES users(id)
);

-- ============================================================================
-- INDEXES FOR DEPENDENCIES
-- ============================================================================

CREATE INDEX idx_package_cache_name ON package_registry_cache(package_name);
CREATE INDEX idx_package_cache_name_version ON package_registry_cache(package_name, version);
CREATE INDEX idx_project_deps_project ON project_dependencies(project_id);
CREATE INDEX idx_project_deps_package ON project_dependencies(package_name);
CREATE INDEX idx_planned_deps_plan ON planned_dependencies(plan_id);
CREATE INDEX idx_planned_deps_task ON planned_dependencies(task_id);
CREATE INDEX idx_planned_deps_package ON planned_dependencies(package_name);
CREATE INDEX idx_conflicts_plan ON dependency_conflicts(plan_id);
CREATE INDEX idx_conflicts_status ON dependency_conflicts(status);
CREATE INDEX idx_import_mappings_source ON import_path_mappings(source_file_path);
CREATE INDEX idx_import_mappings_target ON import_path_mappings(target_file_path);
CREATE INDEX idx_install_history_project ON dependency_installation_history(project_id);
```

---

## PART 2: ADDITIONAL CRITICAL RECOMMENDATIONS

### 26. CODE STYLE GUIDE & CONVENTIONS DATABASE

**Why Critical**: Templates define structure, but style guide defines the details (spacing, naming, ordering).

**Database Schema**:

```sql
-- Style Guide Rules
CREATE TABLE style_guide_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Rule definition
  category VARCHAR(50) NOT NULL,  -- naming, formatting, structure, comments, imports
  rule_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Rule configuration
  rule_type VARCHAR(50) NOT NULL,  -- pattern, convention, metric, custom
  configuration JSONB NOT NULL,
  
  -- Examples
  good_examples JSONB,  -- Array of good examples
  bad_examples JSONB,  -- Array of bad examples
  
  -- Enforcement
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  auto_fixable BOOLEAN DEFAULT FALSE,
  auto_fix_script TEXT,
  
  -- ESLint/Prettier integration
  eslint_rule VARCHAR(255),
  prettier_rule VARCHAR(255),
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, rule_name)
);

-- Style Violations (during planning or execution)
CREATE TABLE style_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES style_guide_rules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Violation details
  file_path TEXT,
  line_number INTEGER,
  column_number INTEGER,
  violation_text TEXT,
  
  -- Context
  code_snippet TEXT,
  
  -- Resolution
  auto_fixed BOOLEAN DEFAULT FALSE,
  fix_applied TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 27. DESIGN PATTERNS CATALOG

**Why Critical**: Ensures consistent use of proven patterns (Singleton, Factory, Observer, etc.).

**Database Schema**:

```sql
-- Design Patterns
CREATE TABLE design_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identity
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,  -- creational, structural, behavioral, architectural
  
  -- Pattern description
  description TEXT NOT NULL,
  problem_solved TEXT NOT NULL,
  when_to_use TEXT NOT NULL,
  when_not_to_use TEXT NOT NULL,
  
  -- Implementation
  implementation_guide TEXT NOT NULL,
  code_examples JSONB,  -- Array of examples in different languages
  
  -- Related patterns
  related_patterns JSONB,  -- Array of pattern IDs
  alternatives JSONB,  -- Array of alternative approaches
  
  -- Usage in project
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pattern Usage (tracking where patterns are used)
CREATE TABLE pattern_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES design_patterns(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Where used
  file_path TEXT NOT NULL,
  implementation_notes TEXT,
  
  -- Quality
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 28. REFERENCE CODE EXAMPLES SYSTEM

**Why Critical**: AI learns best from examples. Maintain a library of reference implementations.

**Database Schema**:

```sql
-- Reference Code Examples
CREATE TABLE reference_code_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Example identity
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,  -- component, service, controller, utility, etc.
  
  -- Code
  file_path TEXT NOT NULL,
  code_content TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  framework VARCHAR(100),
  
  -- What makes this a good example
  exemplifies JSONB,  -- Array of patterns/practices it demonstrates
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  
  -- Usage
  similarity_threshold DECIMAL(3,2) DEFAULT 0.7,  -- How similar new code should be
  use_as_reference_for JSONB,  -- Array of task types
  
  -- Annotations
  key_features JSONB,  -- Highlighted important parts
  avoid_patterns JSONB,  -- What NOT to copy
  
  -- Status
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Example Usage Tracking
CREATE TABLE example_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id UUID NOT NULL REFERENCES reference_code_examples(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- How was it used
  similarity_achieved DECIMAL(3,2),  -- How similar the generated code was
  patterns_followed JSONB,  -- Which patterns from example were followed
  deviations JSONB,  -- Where it deviated and why
  
  -- Outcome
  success BOOLEAN NOT NULL,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 29. FILE STRUCTURE & ORGANIZATION RULES

**Why Critical**: Predictable file organization makes codebases navigable.

**Database Schema**:

```sql
-- File Organization Rules
CREATE TABLE file_organization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Rule definition
  file_type VARCHAR(100) NOT NULL,  -- component, service, model, test, etc.
  directory_pattern TEXT NOT NULL,  -- /src/{domain}/{file-type}
  file_naming_pattern TEXT NOT NULL,  -- {name}.{file-type}.ts
  
  -- Validation
  validation_regex TEXT,
  
  -- Co-location rules
  related_files JSONB,  -- Files that should be together (e.g., component + test + stories)
  
  -- Index file rules
  requires_index_file BOOLEAN DEFAULT FALSE,
  index_file_pattern TEXT,
  
  -- Examples
  examples JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- File Collision Detection
CREATE TABLE file_collision_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Collision details
  planned_file_path TEXT NOT NULL,
  existing_file_path TEXT,
  collision_type VARCHAR(50) NOT NULL,  -- exact_match, similar_name, same_purpose
  
  -- Resolution
  resolution_strategy VARCHAR(50),  -- rename, merge, overwrite, skip
  new_file_path TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'resolved', 'ignored')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### 30. ERROR TAXONOMY & HANDLING STRATEGIES

**Why Critical**: Systematic error handling prevents chaos.

**Database Schema**:

```sql
-- Error Types Taxonomy
CREATE TABLE error_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Error definition
  error_name VARCHAR(255) NOT NULL,
  error_code VARCHAR(50) UNIQUE,
  category VARCHAR(50) NOT NULL,  -- validation, authentication, authorization, database, external_service, etc.
  
  -- Description
  description TEXT NOT NULL,
  user_facing_message TEXT,
  
  -- Severity
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  
  -- Handling strategy
  retry_strategy JSONB,  -- { maxRetries, delay, backoff }
  fallback_behavior TEXT,
  escalation_policy TEXT,
  
  -- Logging
  log_level VARCHAR(20) NOT NULL,  -- error, warn, info
  log_details JSONB,  -- What to include in logs
  
  -- Monitoring
  triggers_alert BOOLEAN DEFAULT FALSE,
  alert_threshold INTEGER,  -- Trigger alert after N occurrences
  
  -- User communication
  show_to_user BOOLEAN DEFAULT TRUE,
  include_error_code BOOLEAN DEFAULT TRUE,
  include_support_link BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Error Handling Strategies (per module/task)
CREATE TABLE error_handling_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Which errors are handled
  handled_error_types JSONB,  -- Array of error_type IDs
  
  -- How they're handled
  strategy_description TEXT,
  recovery_steps JSONB,
  
  -- Code to generate
  error_handling_code TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 31. DATA FLOW & STATE MANAGEMENT PLANNING

**Why Critical**: Prevents state inconsistencies and race conditions.

**Database Schema**:

```sql
-- State Definitions
CREATE TABLE state_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  -- State identity
  state_name VARCHAR(255) NOT NULL,
  state_type VARCHAR(50) NOT NULL,  -- component, context, global, server
  
  -- State shape
  typescript_type TEXT NOT NULL,
  initial_value TEXT,
  
  -- Location
  storage_location VARCHAR(100) NOT NULL,  -- component_state, context, redux, zustand, server, localStorage
  
  -- Mutation rules
  is_immutable BOOLEAN DEFAULT TRUE,
  mutation_method VARCHAR(50),  -- setState, reducer, mutation, etc.
  
  -- Synchronization
  sync_with_server BOOLEAN DEFAULT FALSE,
  sync_strategy VARCHAR(50),  -- polling, websocket, optimistic
  
  -- Persistence
  persist BOOLEAN DEFAULT FALSE,
  persistence_location VARCHAR(50),  -- localStorage, sessionStorage, indexedDB
  persistence_key VARCHAR(255),
  
  -- Validation
  validation_schema TEXT,  -- Zod, Yup, etc.
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- State Flow Mappings
CREATE TABLE state_flow_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flow definition
  from_state_id UUID NOT NULL REFERENCES state_definitions(id) ON DELETE CASCADE,
  to_state_id UUID NOT NULL REFERENCES state_definitions(id) ON DELETE CASCADE,
  
  -- Flow details
  flow_type VARCHAR(50) NOT NULL,  -- sync, async, computed, derived
  trigger VARCHAR(100),  -- user_action, api_response, timer, etc.
  
  -- Transformation
  transformation_logic TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 32. PERFORMANCE BUDGETS & OPTIMIZATION PLANS

**Why Critical**: Performance problems are expensive to fix after implementation.

**Database Schema**:

```sql
-- Performance Budgets
CREATE TABLE performance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Budget type
  metric_type VARCHAR(50) NOT NULL,  -- response_time, bundle_size, memory_usage, query_time, render_time
  
  -- Budget limits
  target_value DECIMAL(10,2) NOT NULL,
  max_value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,  -- ms, KB, MB, seconds
  
  -- Context
  applies_to TEXT,  -- API endpoint, component, page, function, query
  
  -- Enforcement
  enforce_during_planning BOOLEAN DEFAULT TRUE,
  enforce_during_execution BOOLEAN DEFAULT TRUE,
  block_if_exceeded BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optimization Strategies
CREATE TABLE optimization_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Strategy
  strategy_name VARCHAR(255) NOT NULL,
  optimization_type VARCHAR(50) NOT NULL,  -- code_splitting, lazy_loading, memoization, caching, indexing
  
  -- Implementation
  implementation_details TEXT,
  code_changes_required TEXT,
  
  -- Expected impact
  expected_improvement DECIMAL(5,2),  -- Percentage improvement
  
  -- Priority
  priority INTEGER DEFAULT 50,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance Benchmarks
CREATE TABLE performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Measurement
  metric_type VARCHAR(50) NOT NULL,
  measured_value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  
  -- Context
  environment VARCHAR(20) NOT NULL,  -- dev, staging, production
  
  -- Comparison
  budget_value DECIMAL(10,2),
  within_budget BOOLEAN,
  
  measured_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 33. ACCESSIBILITY (A11Y) REQUIREMENTS

**Why Critical**: Accessibility retrofitting is painful.

**Database Schema**:

```sql
-- Accessibility Requirements
CREATE TABLE accessibility_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Requirement type
  requirement_type VARCHAR(50) NOT NULL,  -- aria, keyboard_nav, screen_reader, color_contrast, focus, semantic_html
  
  -- Requirement details
  wcag_level VARCHAR(3) NOT NULL,  -- A, AA, AAA
  wcag_criterion VARCHAR(20),  -- 1.1.1, 1.4.3, etc.
  description TEXT NOT NULL,
  
  -- Implementation
  implementation_guide TEXT,
  code_examples JSONB,
  
  -- Testing
  test_method VARCHAR(100),  -- automated, manual, screen_reader
  test_criteria TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'implemented', 'tested', 'verified')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A11y Validation Rules
CREATE TABLE a11y_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Rule
  rule_name VARCHAR(255) NOT NULL,
  wcag_criterion VARCHAR(20),
  
  -- Validation
  validation_type VARCHAR(50) NOT NULL,  -- automated, manual
  validation_tool VARCHAR(100),  -- axe, lighthouse, pa11y, manual_checklist
  
  -- Enforcement
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  block_on_failure BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 34. TESTING STRATEGY & TEST CASE CATALOG

**Why Critical**: Comprehensive, planned testing prevents bugs.

**Database Schema**:

```sql
-- Test Strategies
CREATE TABLE test_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Test types to implement
  test_types JSONB NOT NULL,  -- ['unit', 'integration', 'e2e']
  
  -- Coverage targets
  coverage_target_overall DECIMAL(5,2) DEFAULT 80,
  coverage_target_statements DECIMAL(5,2),
  coverage_target_branches DECIMAL(5,2),
  coverage_target_functions DECIMAL(5,2),
  coverage_target_lines DECIMAL(5,2),
  
  -- Test framework
  test_framework VARCHAR(100),  -- Jest, Vitest, Mocha, etc.
  
  -- Mocking strategy
  mocking_strategy TEXT,
  what_to_mock JSONB,
  what_not_to_mock JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Test Cases (enumerated before implementation)
CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Test identity
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL,  -- unit, integration, e2e
  
  -- Test description
  description TEXT NOT NULL,
  test_category VARCHAR(50),  -- happy_path, edge_case, error_case, boundary, performance
  
  -- Test details
  given TEXT NOT NULL,  -- Preconditions
  when TEXT NOT NULL,  -- Action
  then TEXT NOT NULL,  -- Expected result
  
  -- Test data
  test_data JSONB,
  mock_data JSONB,
  
  -- Priority
  priority INTEGER DEFAULT 50,
  
  -- Implementation
  test_file_path TEXT,
  test_code TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'implemented', 'passing', 'failing')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Test Data Factories
CREATE TABLE test_data_factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Factory identity
  factory_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,  -- User, Order, Product, etc.
  
  -- Factory implementation
  factory_code TEXT NOT NULL,
  
  -- Default values
  default_values JSONB,
  
  -- Variations
  variations JSONB,  -- Named variations (validUser, invalidUser, adminUser)
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, factory_name)
);
```

### 35. DOCUMENTATION GENERATION PLANS

**Why Critical**: Documentation is part of the code, not an afterthought.

**Database Schema**:

```sql
-- Documentation Requirements
CREATE TABLE documentation_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Documentation type
  doc_type VARCHAR(50) NOT NULL,  -- api, component, readme, architecture, migration, changelog
  
  -- Documentation details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Target audience
  target_audience VARCHAR(50),  -- developers, users, architects, ops
  
  -- Content requirements
  required_sections JSONB,  -- Array of section names
  code_examples_required BOOLEAN DEFAULT FALSE,
  diagrams_required BOOLEAN DEFAULT FALSE,
  
  -- Generation
  auto_generate BOOLEAN DEFAULT TRUE,
  generation_template_id UUID REFERENCES code_templates(id),
  
  -- Output
  output_path TEXT,
  output_format VARCHAR(20),  -- markdown, html, pdf, jsdoc
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'generated', 'reviewed', 'published')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API Documentation Specs
CREATE TABLE api_documentation_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Endpoint details
  http_method VARCHAR(10) NOT NULL,
  endpoint_path TEXT NOT NULL,
  
  -- Documentation
  summary TEXT NOT NULL,
  description TEXT,
  
  -- Request
  request_body_schema JSONB,
  query_parameters JSONB,
  path_parameters JSONB,
  headers JSONB,
  
  -- Response
  response_schemas JSONB,  -- { "200": schema, "400": schema, "500": schema }
  
  -- Examples
  request_examples JSONB,
  response_examples JSONB,
  
  -- Metadata
  tags JSONB,  -- For OpenAPI grouping
  deprecated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 36. MIGRATION & ROLLBACK STRATEGIES

**Why Critical**: Safe deployment requires planning rollback.

**Database Schema**:

```sql
-- Migration Plans
CREATE TABLE migration_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Migration details
  migration_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Phases
  phases JSONB NOT NULL,  -- Array of migration phases
  
  -- Rollback
  rollback_procedure TEXT NOT NULL,
  rollback_time_estimate INTEGER,  -- Minutes
  
  -- Safety
  backward_compatible BOOLEAN DEFAULT FALSE,
  requires_downtime BOOLEAN DEFAULT FALSE,
  estimated_downtime_minutes INTEGER,
  
  -- Feature flags
  feature_flags JSONB,  -- Flags to control migration
  
  -- Monitoring
  health_checks JSONB,  -- What to monitor during migration
  rollback_triggers JSONB,  -- Conditions that trigger automatic rollback
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Deployment Steps
CREATE TABLE deployment_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_plan_id UUID NOT NULL REFERENCES migration_plans(id) ON DELETE CASCADE,
  
  -- Step details
  step_number INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Execution
  command TEXT,
  estimated_duration_minutes INTEGER,
  
  -- Dependencies
  depends_on_step INTEGER,
  
  -- Validation
  success_criteria TEXT,
  validation_command TEXT,
  
  -- Rollback
  rollback_command TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 37. COMPLIANCE & REGULATORY REQUIREMENTS

**Why Critical**: Regulatory violations are catastrophic.

**Database Schema**:

```sql
-- Compliance Frameworks
CREATE TABLE compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Framework details
  name VARCHAR(100) NOT NULL UNIQUE,  -- GDPR, HIPAA, SOC2, PCI-DSS, etc.
  description TEXT,
  jurisdiction VARCHAR(100),
  
  -- Requirements
  requirements JSONB,  -- Array of requirements
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Compliance Requirements (per task/module)
CREATE TABLE compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Requirement details
  requirement_id VARCHAR(50),  -- Framework-specific ID
  requirement_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Implementation
  implementation_guide TEXT,
  validation_method TEXT,
  
  -- Evidence
  evidence_required JSONB,  -- What evidence to collect
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'implemented', 'validated', 'compliant')),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data Privacy Requirements
CREATE TABLE data_privacy_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Data handling
  data_type VARCHAR(100) NOT NULL,  -- PII, PHI, payment_data, etc.
  sensitivity_level VARCHAR(20) NOT NULL,  -- public, internal, confidential, restricted
  
  -- Requirements
  encryption_required BOOLEAN DEFAULT FALSE,
  encryption_method VARCHAR(100),
  
  anonymization_required BOOLEAN DEFAULT FALSE,
  anonymization_method VARCHAR(100),
  
  consent_required BOOLEAN DEFAULT FALSE,
  consent_type VARCHAR(50),  -- explicit, implicit, opt-in, opt-out
  
  retention_period INTEGER,  -- Days
  deletion_method VARCHAR(100),
  
  -- Access control
  who_can_access JSONB,  -- Array of roles
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 38. ENVIRONMENT CONFIGURATION PLANNING

**Why Critical**: Different environments require different configurations.

**Database Schema**:

```sql
-- Environment Configurations
CREATE TABLE environment_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Environment
  environment_name VARCHAR(50) NOT NULL,  -- development, staging, production
  
  -- Configuration
  config_variables JSONB NOT NULL,
  
  -- Feature flags
  feature_flags JSONB,
  
  -- Service endpoints
  api_endpoints JSONB,
  database_config JSONB,
  
  -- Secrets
  required_secrets JSONB,  -- List of secret names (not values!)
  
  -- Monitoring
  monitoring_config JSONB,
  log_level VARCHAR(20),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, environment_name)
);

-- Environment Variables (planned)
CREATE TABLE planned_environment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Variable details
  variable_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Type
  is_secret BOOLEAN DEFAULT FALSE,
  
  -- Values per environment
  development_value TEXT,
  staging_value TEXT,
  production_value TEXT,
  
  -- Validation
  required BOOLEAN DEFAULT TRUE,
  validation_regex VARCHAR(500),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 39. KNOWLEDGE CAPTURE & DECISION RECORDS

**Why Critical**: Capture WHY decisions were made.

**Database Schema**:

```sql
-- Architecture Decision Records (ADRs)
CREATE TABLE architecture_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  
  -- Decision
  decision_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('proposed', 'accepted', 'rejected', 'deprecated', 'superseded')),
  
  -- Context
  context TEXT NOT NULL,  -- What led to this decision
  
  -- Decision
  decision TEXT NOT NULL,  -- What was decided
  
  -- Rationale
  rationale TEXT NOT NULL,  -- Why this decision
  
  -- Consequences
  consequences TEXT,  -- Expected outcomes
  
  -- Alternatives considered
  alternatives JSONB,  -- Array of alternatives
  
  -- Related
  supersedes INTEGER,  -- Decision number this supersedes
  superseded_by INTEGER,  -- Decision number that superseded this
  
  -- Metadata
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, decision_number)
);

-- Lessons Learned
CREATE TABLE lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  
  -- Lesson
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- planning, implementation, testing, deployment
  
  -- Details
  situation TEXT NOT NULL,  -- What happened
  lesson TEXT NOT NULL,  -- What was learned
  recommendation TEXT NOT NULL,  -- What to do differently
  
  -- Impact
  impact_level VARCHAR(20) CHECK (impact_level IN ('high', 'medium', 'low')),
  
  -- Tags for searchability
  tags JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Pattern Discovery (automatically discovered patterns)
CREATE TABLE discovered_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Pattern
  pattern_name VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL,  -- code, architecture, process
  
  -- Discovery
  discovered_in_files JSONB,  -- Array of file paths
  occurrence_count INTEGER DEFAULT 1,
  
  -- Pattern details
  description TEXT,
  code_example TEXT,
  
  -- Evaluation
  is_good_pattern BOOLEAN,
  recommendation TEXT,
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('discovered', 'evaluated', 'adopted', 'rejected')),
  
  discovered_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 40. PLAN SIMULATION & VALIDATION ENGINE

**Why Critical**: Test the plan before executing it.

**Database Schema**:

```sql
-- Plan Simulations
CREATE TABLE plan_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Simulation config
  simulation_type VARCHAR(50) NOT NULL,  -- dry_run, what_if, risk_analysis
  simulation_params JSONB,
  
  -- Results
  success BOOLEAN,
  issues_found JSONB,  -- Array of issues
  warnings JSONB,
  
  -- Metrics
  estimated_execution_time INTEGER,  -- Minutes
  estimated_files_created INTEGER,
  estimated_lines_of_code INTEGER,
  
  -- Risk assessment
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  high_risk_items JSONB,
  
  -- Resource estimates
  estimated_cpu_time INTEGER,
  estimated_memory_mb INTEGER,
  estimated_disk_mb INTEGER,
  
  -- Recommendations
  recommendations JSONB,
  
  simulated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Simulation Issues
CREATE TABLE simulation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES plan_simulations(id) ON DELETE CASCADE,
  
  -- Issue
  issue_type VARCHAR(50) NOT NULL,  -- conflict, missing_dependency, circular_dependency, etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('blocker', 'critical', 'warning', 'info')),
  
  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Location
  affected_module_id UUID REFERENCES modules(id),
  affected_task_id UUID REFERENCES tasks(id),
  
  -- Resolution
  suggested_fix TEXT,
  can_auto_fix BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## PART 3: IMPLEMENTATION PRIORITY

### PHASE 1: CRITICAL FOUNDATION (Implement First)
1. ✅ Code Templates Library (with database)
2. ✅ Dependency Resolution System (with database)
3. ✅ Style Guide Rules
4. ✅ Reference Code Examples
5. ✅ File Organization Rules

### PHASE 2: QUALITY & TESTING (Implement Second)
6. ✅ Testing Strategy & Test Cases
7. ✅ Error Taxonomy & Handling
8. ✅ Performance Budgets
9. ✅ Documentation Requirements
10. ✅ Design Patterns Catalog

### PHASE 3: ADVANCED FEATURES (Implement Third)
11. ✅ State Management Planning
12. ✅ Accessibility Requirements
13. ✅ Migration & Rollback
14. ✅ Environment Configuration
15. ✅ Compliance Requirements

### PHASE 4: LEARNING & OPTIMIZATION (Implement Fourth)
16. ✅ Architecture Decision Records
17. ✅ Lessons Learned
18. ✅ Pattern Discovery
19. ✅ Plan Simulation
20. ✅ Knowledge Capture

---

## SUMMARY OF ALL FEATURES

Your planning module will now have:

### **Core Planning (Already Specified)**
1. Hierarchical module-first planning
2. Quality & confidence scoring with thresholds
3. Maintainability rules catalog
4. User interaction & recommendations
5. Complete database schema
6. RESTful APIs

### **New Critical Features (This Document)**
7. **Code Templates Library** - Ensures consistency
8. **Dependency Resolution** - Prevents "module not found"
9. **Style Guide Enforcer** - Consistent code style
10. **Design Patterns Catalog** - Proven solutions
11. **Reference Examples** - Learn from existing code
12. **File Organization** - Predictable structure
13. **Error Handling** - Systematic error management
14. **State Management** - No race conditions
15. **Performance Budgets** - Fast by default
16. **Accessibility** - WCAG compliant from start
17. **Testing Strategy** - Comprehensive tests
18. **Documentation Plans** - Always up-to-date docs
19. **Migration Planning** - Safe deployments
20. **Compliance** - Regulatory compliance
21. **Environment Config** - Multi-environment ready
22. **Knowledge Capture** - Learn from every plan
23. **Plan Simulation** - Test before execute

**TOTAL: 23 major features + original 5 = 28 features**

This will create the most comprehensive, production-ready autonomous code generation planning system possible.
