# Enhanced Planning Module v2.0 - Part 2: Validation & Orchestration

**Continued from Part 1**

---

## 4. VALIDATION CRITERIA SYSTEM

### 4.1 Universal Validation Framework

Every single task MUST have explicit, testable validation criteria:

```typescript
interface UniversalValidationFramework {
  /**
   * EVERY task gets comprehensive validation
   */
  generateValidationCriteria(task: Task): ValidationCriteria;
}

interface ValidationCriteria {
  // Pre-execution checks (can we even start?)
  preconditions: ValidationRule[];
  
  // Post-execution checks (did it work?)
  postconditions: ValidationRule[];
  
  // Integration checks (does it work with everything else?)
  integrationValidation: ValidationRule[];
  
  // Performance checks (is it fast enough?)
  performanceValidation: ValidationRule[];
  
  // Security checks (is it safe?)
  securityValidation: ValidationRule[];
  
  // Quality checks (is it good code?)
  qualityValidation: ValidationRule[];
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'blocker' | 'critical' | 'warning' | 'info';
  category: 'correctness' | 'performance' | 'security' | 'quality' | 'integration';
  
  // The actual check
  check: ValidationCheck;
  
  // What to do if it fails
  onFailure: {
    message: string;
    suggestedFix?: string;
    autoFixAvailable: boolean;
    autoFix?: () => Promise<void>;
    escalateTo?: 'human' | 'senior_ai';
  };
  
  // Evidence collection
  collectEvidence: boolean;
  evidenceType?: 'code_snippet' | 'test_output' | 'log' | 'screenshot';
}

interface ValidationCheck {
  type: 'automated' | 'manual' | 'ai_review';
  
  // For automated checks
  script?: string;
  expectedResult?: any;
  
  // For manual checks
  checklist?: string[];
  
  // For AI review
  reviewPrompt?: string;
}

// Validation rule library for common scenarios
const VALIDATION_RULE_LIBRARY = {
  // FILE VALIDATIONS
  file_exists: (path: string): ValidationRule => ({
    id: `file_exists_${path}`,
    name: 'File Exists',
    description: `File ${path} must exist`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `test -f ${path}`,
      expectedResult: 0,
    },
    onFailure: {
      message: `Required file ${path} does not exist`,
      suggestedFix: `Create file ${path}`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
    evidenceType: 'log',
  }),
  
  file_not_exists: (path: string): ValidationRule => ({
    id: `file_not_exists_${path}`,
    name: 'File Must Not Exist',
    description: `File ${path} must not exist before creation`,
    severity: 'critical',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `! test -f ${path}`,
      expectedResult: 0,
    },
    onFailure: {
      message: `File ${path} already exists`,
      suggestedFix: `Delete or rename existing file ${path}`,
      autoFixAvailable: true,
      autoFix: async () => {
        await fs.unlink(path);
      },
    },
    collectEvidence: true,
  }),
  
  typescript_compiles: (): ValidationRule => ({
    id: 'typescript_compiles',
    name: 'TypeScript Compilation',
    description: 'All TypeScript code must compile without errors',
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: 'npm run type-check',
      expectedResult: 0,
    },
    onFailure: {
      message: 'TypeScript compilation errors detected',
      suggestedFix: 'Fix TypeScript errors shown in output',
      autoFixAvailable: false,
      escalateTo: 'human',
    },
    collectEvidence: true,
    evidenceType: 'log',
  }),
  
  // DATABASE VALIDATIONS
  table_exists: (tableName: string): ValidationRule => ({
    id: `table_exists_${tableName}`,
    name: 'Database Table Exists',
    description: `Table ${tableName} must exist in database`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `SELECT to_regclass('${tableName}')`,
      expectedResult: tableName,
    },
    onFailure: {
      message: `Table ${tableName} does not exist`,
      suggestedFix: `Run migration to create ${tableName} table`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
  }),
  
  table_has_columns: (tableName: string, columns: string[]): ValidationRule => ({
    id: `table_columns_${tableName}`,
    name: 'Table Columns',
    description: `Table ${tableName} must have columns: ${columns.join(', ')}`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = '${tableName}'
      `,
      expectedResult: columns,
    },
    onFailure: {
      message: `Table ${tableName} missing required columns`,
      suggestedFix: `Modify migration to include all columns`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
  }),
  
  // API VALIDATIONS
  endpoint_accessible: (path: string, method: string): ValidationRule => ({
    id: `endpoint_accessible_${method}_${path}`,
    name: 'API Endpoint Accessible',
    description: `${method} ${path} must be accessible`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `curl -X ${method} http://localhost:3000${path} -I`,
      expectedResult: /HTTP\/1.1 (200|201|400|401|404)/,
    },
    onFailure: {
      message: `Endpoint ${method} ${path} is not accessible`,
      suggestedFix: `Verify route is registered and server is running`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
    evidenceType: 'log',
  }),
  
  schema_validation_works: (path: string): ValidationRule => ({
    id: `schema_validation_${path}`,
    name: 'Schema Validation',
    description: `Schema validation must work for ${path}`,
    severity: 'critical',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `
        curl -X POST http://localhost:3000${path} \\
          -H "Content-Type: application/json" \\
          -d '{"invalid": "data"}' \\
          -w "%{http_code}"
      `,
      expectedResult: /^400$/,
    },
    onFailure: {
      message: `Schema validation not rejecting invalid data`,
      suggestedFix: `Check schema definition and validation middleware`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
  }),
  
  // TEST VALIDATIONS
  all_tests_pass: (testFile: string): ValidationRule => ({
    id: `tests_pass_${testFile}`,
    name: 'All Tests Pass',
    description: `All tests in ${testFile} must pass`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `npm test -- ${testFile}`,
      expectedResult: /PASS/,
    },
    onFailure: {
      message: `Tests failing in ${testFile}`,
      suggestedFix: `Fix failing tests`,
      autoFixAvailable: false,
      escalateTo: 'human',
    },
    collectEvidence: true,
    evidenceType: 'test_output',
  }),
  
  test_coverage_above: (threshold: number): ValidationRule => ({
    id: `coverage_above_${threshold}`,
    name: 'Test Coverage',
    description: `Test coverage must be above ${threshold}%`,
    severity: 'warning',
    category: 'quality',
    check: {
      type: 'automated',
      script: `npm test -- --coverage`,
      expectedResult: new RegExp(`Coverage: (\\d+)%.*[${threshold}-9]\\d|100`),
    },
    onFailure: {
      message: `Test coverage below ${threshold}%`,
      suggestedFix: `Add more tests to increase coverage`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
  }),
  
  // INTEGRATION VALIDATIONS
  imports_correctly: (sourceFile: string, targetFile: string, symbols: string[]): ValidationRule => ({
    id: `imports_${sourceFile}_from_${targetFile}`,
    name: 'Import Statement',
    description: `${sourceFile} must correctly import ${symbols.join(', ')} from ${targetFile}`,
    severity: 'blocker',
    category: 'integration',
    check: {
      type: 'automated',
      script: `grep -q "import.*{.*${symbols[0]}.*}.*from.*${targetFile}" ${sourceFile}`,
      expectedResult: 0,
    },
    onFailure: {
      message: `Import statement not found or incorrect`,
      suggestedFix: `Add: import { ${symbols.join(', ')} } from '${targetFile}'`,
      autoFixAvailable: true,
      autoFix: async () => {
        const content = await fs.readFile(sourceFile, 'utf-8');
        const importStatement = `import { ${symbols.join(', ')} } from '${targetFile}';\n`;
        await fs.writeFile(sourceFile, importStatement + content);
      },
    },
    collectEvidence: true,
    evidenceType: 'code_snippet',
  }),
  
  exports_defined: (file: string, symbols: string[]): ValidationRule => ({
    id: `exports_${file}`,
    name: 'Export Definitions',
    description: `${file} must export ${symbols.join(', ')}`,
    severity: 'blocker',
    category: 'integration',
    check: {
      type: 'automated',
      script: `grep -q "export.*${symbols[0]}" ${file}`,
      expectedResult: 0,
    },
    onFailure: {
      message: `Required exports not found in ${file}`,
      suggestedFix: `Add export statements for ${symbols.join(', ')}`,
      autoFixAvailable: false,
    },
    collectEvidence: true,
    evidenceType: 'code_snippet',
  }),
  
  // REACT VALIDATIONS
  component_renders: (componentName: string): ValidationRule => ({
    id: `component_renders_${componentName}`,
    name: 'Component Renders',
    description: `${componentName} must render without errors`,
    severity: 'blocker',
    category: 'correctness',
    check: {
      type: 'automated',
      script: `npm test -- ${componentName}.test`,
      expectedResult: /renders without crashing/,
    },
    onFailure: {
      message: `Component ${componentName} fails to render`,
      suggestedFix: `Fix component errors`,
      autoFixAvailable: false,
      escalateTo: 'human',
    },
    collectEvidence: true,
  }),
  
  // SECURITY VALIDATIONS
  no_hardcoded_secrets: (): ValidationRule => ({
    id: 'no_hardcoded_secrets',
    name: 'No Hardcoded Secrets',
    description: 'Code must not contain hardcoded secrets',
    severity: 'blocker',
    category: 'security',
    check: {
      type: 'automated',
      script: `git secrets --scan`,
      expectedResult: 0,
    },
    onFailure: {
      message: 'Hardcoded secrets detected',
      suggestedFix: 'Move secrets to environment variables',
      autoFixAvailable: false,
      escalateTo: 'human',
    },
    collectEvidence: true,
  }),
  
  sql_injection_safe: (file: string): ValidationRule => ({
    id: `sql_safe_${file}`,
    name: 'SQL Injection Prevention',
    description: `${file} must use parameterized queries`,
    severity: 'blocker',
    category: 'security',
    check: {
      type: 'automated',
      script: `! grep -q "db\\.raw.*\\$\\{" ${file}`,
      expectedResult: 0,
    },
    onFailure: {
      message: 'Potential SQL injection vulnerability',
      suggestedFix: 'Use parameterized queries instead of string interpolation',
      autoFixAvailable: false,
      escalateTo: 'human',
    },
    collectEvidence: true,
  }),
  
  // PERFORMANCE VALIDATIONS
  response_time_under: (endpoint: string, maxMs: number): ValidationRule => ({
    id: `response_time_${endpoint}`,
    name: 'Response Time',
    description: `${endpoint} must respond in under ${maxMs}ms`,
    severity: 'warning',
    category: 'performance',
    check: {
      type: 'automated',
      script: `
        time curl -X GET http://localhost:3000${endpoint} 2>&1 | \\
        grep real | awk '{print $2}' | sed 's/0m//;s/s$//'
      `,
      expectedResult: (result: string) => parseFloat(result) < maxMs / 1000,
    },
    onFailure: {
      message: `Endpoint ${endpoint} responding too slowly`,
      suggestedFix: 'Optimize queries or add caching',
      autoFixAvailable: false,
    },
    collectEvidence: true,
  }),
};
```

### 4.2 Auto-Generated Validation for Each Task Type

```typescript
class ValidationGenerator {
  /**
   * Generate ALL validation rules for a task
   */
  generateValidationForTask(task: Task): ValidationCriteria {
    const validation: ValidationCriteria = {
      preconditions: [],
      postconditions: [],
      integrationValidation: [],
      performanceValidation: [],
      securityValidation: [],
      qualityValidation: [],
    };
    
    // Generate based on task type
    switch (task.type) {
      case 'create_database_table':
        validation.preconditions = [
          VALIDATION_RULE_LIBRARY.file_not_exists(task.migration.path),
          this.customRule('database_connected', 'Database must be accessible'),
        ];
        
        validation.postconditions = [
          VALIDATION_RULE_LIBRARY.file_exists(task.migration.path),
          VALIDATION_RULE_LIBRARY.table_exists(task.tableName),
          VALIDATION_RULE_LIBRARY.table_has_columns(task.tableName, task.columns),
          this.customRule('migration_recorded', 'Migration must be recorded in migrations table'),
        ];
        
        validation.qualityValidation = [
          this.customRule('columns_have_types', 'All columns must have explicit types'),
          this.customRule('primary_key_defined', 'Table must have a primary key'),
        ];
        break;
      
      case 'create_api_endpoint':
        validation.preconditions = [
          VALIDATION_RULE_LIBRARY.typescript_compiles(),
          this.customRule('dependent_services_exist', 'Required services must exist'),
        ];
        
        validation.postconditions = [
          VALIDATION_RULE_LIBRARY.file_exists(task.routeFile),
          VALIDATION_RULE_LIBRARY.file_exists(task.controllerFile),
          VALIDATION_RULE_LIBRARY.file_exists(task.schemaFile),
          VALIDATION_RULE_LIBRARY.endpoint_accessible(task.endpoint, task.method),
          VALIDATION_RULE_LIBRARY.schema_validation_works(task.endpoint),
        ];
        
        validation.integrationValidation = [
          VALIDATION_RULE_LIBRARY.imports_correctly(
            task.routeFile,
            task.controllerFile,
            [task.handlerName]
          ),
          VALIDATION_RULE_LIBRARY.imports_correctly(
            task.controllerFile,
            task.serviceFile,
            [task.serviceName]
          ),
          this.customRule('route_registered', 'Route must be registered in server'),
        ];
        
        validation.securityValidation = [
          this.customRule('auth_middleware_applied', 'Auth middleware applied if needed'),
          this.customRule('input_sanitized', 'User input must be sanitized'),
        ];
        
        validation.performanceValidation = [
          VALIDATION_RULE_LIBRARY.response_time_under(task.endpoint, 200),
        ];
        
        validation.qualityValidation = [
          this.customRule('error_handling_present', 'Must have error handling'),
          this.customRule('logging_added', 'Must have appropriate logging'),
        ];
        break;
      
      case 'create_react_component':
        validation.preconditions = [
          VALIDATION_RULE_LIBRARY.typescript_compiles(),
        ];
        
        validation.postconditions = [
          VALIDATION_RULE_LIBRARY.file_exists(task.componentFile),
          VALIDATION_RULE_LIBRARY.component_renders(task.componentName),
          VALIDATION_RULE_LIBRARY.exports_defined(task.componentFile, [task.componentName]),
        ];
        
        validation.integrationValidation = [
          this.customRule('uses_design_system', 'Must use design system components'),
          this.customRule('context_integrated', 'Context integrated correctly if needed'),
        ];
        
        validation.qualityValidation = [
          this.customRule('props_typed', 'Props must have TypeScript types'),
          this.customRule('accessibility', 'Must follow accessibility guidelines'),
        ];
        break;
      
      // ... similar exhaustive validation for every task type
    }
    
    // Add universal validations
    validation.qualityValidation.push(
      this.customRule('follows_style_guide', 'Code must follow style guide'),
      this.customRule('no_console_logs', 'No console.log statements in production code'),
    );
    
    validation.securityValidation.push(
      VALIDATION_RULE_LIBRARY.no_hardcoded_secrets(),
    );
    
    return validation;
  }
}
```

---

## 5. BLOCKER ANTICIPATION SYSTEM

### 5.1 Comprehensive Blocker Detection

```typescript
interface BlockerAnticipationSystem {
  /**
   * Identify ALL potential blockers before they occur
   */
  anticipateBlockers(
    plan: Plan,
    context: ProjectContext,
    integrationMap: ProjectIntegrationMap
  ): Promise<BlockerReport>;
}

interface BlockerReport {
  totalBlockers: number;
  blockersByType: Record<BlockerType, Blocker[]>;
  blockersBySeverity: Record<'critical' | 'high' | 'medium' | 'low', Blocker[]>;
  resolutionStrategies: ResolutionStrategy[];
  questionsToResolve: Question[];
}

interface Blocker {
  id: string;
  type: BlockerType;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // What's affected
  affectedTasks: string[];
  affectedModules: string[];
  
  // When will this block us
  willBlockAt: 'now' | 'during_execution' | 'during_deployment';
  
  // How to detect if it's resolved
  resolutionCriteria: ResolutionCriteria;
  
  // Possible solutions
  possibleSolutions: Solution[];
  
  // Questions to ask to resolve
  clarifyingQuestions: Question[];
}

type BlockerType = 
  | 'missing_dependency'
  | 'missing_knowledge'
  | 'technical_uncertainty'
  | 'resource_unavailable'
  | 'integration_complexity'
  | 'performance_risk'
  | 'security_concern'
  | 'ambiguous_requirement'
  | 'circular_dependency'
  | 'version_conflict'
  | 'infrastructure_missing'
  | 'third_party_dependency'
  | 'data_migration_needed'
  | 'breaking_change';

interface ResolutionCriteria {
  checks: ResolutionCheck[];
  allMustPass: boolean;
}

interface ResolutionCheck {
  name: string;
  check: () => Promise<boolean>;
  description: string;
}

interface Solution {
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  steps: string[];
  requiredResources: string[];
  estimatedHours: number;
  
  // Can this be automated?
  automatable: boolean;
  automationScript?: string;
}

class ComprehensiveBlockerAnticipator {
  /**
   * Scan entire plan for ALL possible blockers
   */
  async anticipateAllBlockers(
    plan: Plan,
    context: ProjectContext,
    integrationMap: ProjectIntegrationMap
  ): Promise<BlockerReport> {
    const blockers: Blocker[] = [];
    
    // 1. Dependency blockers
    blockers.push(...await this.findDependencyBlockers(plan, integrationMap));
    
    // 2. Knowledge gaps
    blockers.push(...await this.findKnowledgeGaps(plan, context));
    
    // 3. Technical uncertainties
    blockers.push(...await this.findTechnicalUncertainties(plan, context));
    
    // 4. Resource issues
    blockers.push(...await this.findResourceIssues(plan, context));
    
    // 5. Integration complexities
    blockers.push(...await this.findIntegrationComplexities(plan, integrationMap));
    
    // 6. Performance risks
    blockers.push(...await this.findPerformanceRisks(plan, context));
    
    // 7. Security concerns
    blockers.push(...await this.findSecurityConcerns(plan, context));
    
    // 8. Ambiguous requirements
    blockers.push(...await this.findAmbiguousRequirements(plan, context));
    
    // 9. Infrastructure gaps
    blockers.push(...await this.findInfrastructureGaps(plan, context));
    
    // 10. Third-party dependencies
    blockers.push(...await this.findThirdPartyDependencies(plan, context));
    
    // Generate resolution strategies
    const strategies = await this.generateResolutionStrategies(blockers, context);
    
    // Generate questions to resolve blockers
    const questions = await this.generateClarifyingQuestions(blockers);
    
    return {
      totalBlockers: blockers.length,
      blockersByType: this.groupByType(blockers),
      blockersBySeverity: this.groupBySeverity(blockers),
      resolutionStrategies: strategies,
      questionsToResolve: questions,
    };
  }
  
  /**
   * Find dependency blockers
   */
  private async findDependencyBlockers(
    plan: Plan,
    integrationMap: ProjectIntegrationMap
  ): Promise<Blocker[]> {
    const blockers: Blocker[] = [];
    
    for (const task of plan.tasks) {
      // Check npm dependencies
      const npmDeps = this.extractNpmDependencies(task);
      for (const dep of npmDeps) {
        const exists = await this.checkNpmPackageExists(dep.name, dep.version);
        if (!exists) {
          blockers.push({
            id: generateId(),
            type: 'missing_dependency',
            title: `NPM package ${dep.name} not installed`,
            description: `Task "${task.title}" requires ${dep.name}@${dep.version} but it's not installed`,
            severity: 'high',
            affectedTasks: [task.id],
            affectedModules: [task.moduleId],
            willBlockAt: 'during_execution',
            resolutionCriteria: {
              checks: [{
                name: 'package_installed',
                check: async () => this.checkNpmPackageExists(dep.name, dep.version),
                description: `${dep.name}@${dep.version} must be installed`,
              }],
              allMustPass: true,
            },
            possibleSolutions: [{
              title: `Install ${dep.name}`,
              description: `Run npm install ${dep.name}@${dep.version}`,
              effort: 'low',
              confidence: 0.99,
              steps: [`npm install ${dep.name}@${dep.version}`],
              requiredResources: ['npm', 'internet connection'],
              estimatedHours: 0.1,
              automatable: true,
              automationScript: `npm install ${dep.name}@${dep.version}`,
            }],
            clarifyingQuestions: [],
          });
        }
      }
      
      // Check file dependencies
      const fileDeps = this.extractFileDependencies(task);
      for (const fileDep of fileDeps) {
        const exists = integrationMap.fileExports.has(fileDep.path);
        if (!exists) {
          blockers.push({
            id: generateId(),
            type: 'missing_dependency',
            title: `Required file ${fileDep.path} doesn't exist`,
            description: `Task "${task.title}" imports from ${fileDep.path} which doesn't exist yet`,
            severity: 'critical',
            affectedTasks: [task.id],
            affectedModules: [task.moduleId],
            willBlockAt: 'during_execution',
            resolutionCriteria: {
              checks: [{
                name: 'file_exists',
                check: async () => fs.existsSync(fileDep.path),
                description: `File ${fileDep.path} must exist`,
              }],
              allMustPass: true,
            },
            possibleSolutions: [{
              title: `Create ${fileDep.path} first`,
              description: `Reorder tasks so ${fileDep.path} is created before this task`,
              effort: 'low',
              confidence: 0.95,
              steps: [
                `Identify task that creates ${fileDep.path}`,
                `Add dependency from current task to that task`,
                `Reorder task execution`,
              ],
              requiredResources: [],
              estimatedHours: 0.5,
              automatable: true,
            }],
            clarifyingQuestions: [],
          });
        }
      }
      
      // Check database dependencies
      const dbDeps = this.extractDatabaseDependencies(task);
      for (const dbDep of dbDeps) {
        const exists = integrationMap.databaseTables.has(dbDep.table);
        if (!exists) {
          blockers.push({
            id: generateId(),
            type: 'missing_dependency',
            title: `Database table ${dbDep.table} doesn't exist`,
            description: `Task "${task.title}" queries ${dbDep.table} but table doesn't exist`,
            severity: 'critical',
            affectedTasks: [task.id],
            affectedModules: [task.moduleId],
            willBlockAt: 'during_execution',
            resolutionCriteria: {
              checks: [{
                name: 'table_exists',
                check: async () => {
                  const result = await db.raw(`SELECT to_regclass('${dbDep.table}')`);
                  return result.rows[0].to_regclass === dbDep.table;
                },
                description: `Table ${dbDep.table} must exist`,
              }],
              allMustPass: true,
            },
            possibleSolutions: [{
              title: `Create ${dbDep.table} table first`,
              description: `Add migration to create ${dbDep.table} before this task runs`,
              effort: 'medium',
              confidence: 0.90,
              steps: [
                `Create migration for ${dbDep.table}`,
                `Run migration`,
                `Verify table exists`,
              ],
              requiredResources: ['database access'],
              estimatedHours: 1,
              automatable: true,
            }],
            clarifyingQuestions: [
              {
                id: generateId(),
                text: `What columns should ${dbDep.table} have?`,
                type: 'list',
                category: 'technical',
                priority: 90,
              }
            ],
          });
        }
      }
      
      // Check circular dependencies
      const circular = await this.detectCircularDependencies(task, plan.tasks);
      if (circular.length > 0) {
        blockers.push({
          id: generateId(),
          type: 'circular_dependency',
          title: `Circular dependency detected`,
          description: `Tasks have circular dependency: ${circular.map(t => t.title).join(' → ')}`,
          severity: 'critical',
          affectedTasks: circular.map(t => t.id),
          affectedModules: [...new Set(circular.map(t => t.moduleId))],
          willBlockAt: 'now',
          resolutionCriteria: {
            checks: [{
              name: 'no_circular_deps',
              check: async () => {
                const deps = await this.detectCircularDependencies(task, plan.tasks);
                return deps.length === 0;
              },
              description: 'No circular dependencies must exist',
            }],
            allMustPass: true,
          },
          possibleSolutions: [{
            title: 'Restructure dependencies',
            description: 'Break circular dependency by refactoring',
            effort: 'high',
            confidence: 0.80,
            steps: [
              'Identify common functionality',
              'Extract to shared module',
              'Update imports',
            ],
            requiredResources: ['human architect'],
            estimatedHours: 4,
            automatable: false,
          }],
          clarifyingQuestions: [
            {
              id: generateId(),
              text: 'How should we break this circular dependency?',
              type: 'open',
              category: 'technical',
              priority: 100,
            }
          ],
        });
      }
    }
    
    return blockers;
  }
  
  /**
   * Find knowledge gaps
   */
  private async findKnowledgeGaps(
    plan: Plan,
    context: ProjectContext
  ): Promise<Blocker[]> {
    const blockers: Blocker[] = [];
    
    for (const task of plan.tasks) {
      // Check if task description is vague
      if (this.isVague(task.description)) {
        blockers.push({
          id: generateId(),
          type: 'ambiguous_requirement',
          title: `Task "${task.title}" has vague requirements`,
          description: `Task description lacks specific details needed for implementation`,
          severity: 'high',
          affectedTasks: [task.id],
          affectedModules: [task.moduleId],
          willBlockAt: 'during_execution',
          resolutionCriteria: {
            checks: [{
              name: 'requirements_clear',
              check: async () => !this.isVague(task.description),
              description: 'Requirements must be specific and detailed',
            }],
            allMustPass: true,
          },
          possibleSolutions: [{
            title: 'Get clarification',
            description: 'Ask user for more specific requirements',
            effort: 'low',
            confidence: 0.90,
            steps: ['Ask clarifying questions', 'Update task description'],
            requiredResources: ['user input'],
            estimatedHours: 0.5,
            automatable: false,
          }],
          clarifyingQuestions: await this.generateClarifyingQuestionsForTask(task),
        });
      }
      
      // Check for unknown technologies
      const unknownTech = this.findUnknownTechnologies(task, context);
      for (const tech of unknownTech) {
        blockers.push({
          id: generateId(),
          type: 'missing_knowledge',
          title: `Unknown technology: ${tech}`,
          description: `Task requires ${tech} but there's no documentation or examples in the project`,
          severity: 'medium',
          affectedTasks: [task.id],
          affectedModules: [task.moduleId],
          willBlockAt: 'during_execution',
          resolutionCriteria: {
            checks: [{
              name: 'tech_documented',
              check: async () => this.hasTechnologyDocumentation(tech, context),
              description: `Documentation for ${tech} must be available`,
            }],
            allMustPass: true,
          },
          possibleSolutions: [
            {
              title: `Research ${tech}`,
              description: `Study ${tech} documentation and create implementation guide`,
              effort: 'medium',
              confidence: 0.75,
              steps: [
                `Read ${tech} documentation`,
                `Find examples`,
                `Create implementation guide`,
              ],
              requiredResources: ['documentation access', 'time'],
              estimatedHours: 4,
              automatable: false,
            },
            {
              title: `Use alternative technology`,
              description: `Replace ${tech} with a known alternative`,
              effort: 'low',
              confidence: 0.60,
              steps: [
                `Identify alternative`,
                `Update task requirements`,
              ],
              requiredResources: [],
              estimatedHours: 1,
              automatable: false,
            }
          ],
          clarifyingQuestions: [
            {
              id: generateId(),
              text: `Do you have experience with ${tech}? If yes, can you provide implementation examples?`,
              type: 'open',
              category: 'technical',
              priority: 85,
            },
            {
              id: generateId(),
              text: `Is ${tech} required or can we use an alternative?`,
              type: 'yes_no',
              category: 'technical',
              priority: 80,
            }
          ],
        });
      }
    }
    
    return blockers;
  }
  
  /**
   * Find integration complexities
   */
  private async findIntegrationComplexities(
    plan: Plan,
    integrationMap: ProjectIntegrationMap
  ): Promise<Blocker[]> {
    const blockers: Blocker[] = [];
    
    // Find tasks with many integration points
    for (const task of plan.tasks) {
      const integrationPoints = task.integrationPoints || [];
      
      if (integrationPoints.length > 5) {
        blockers.push({
          id: generateId(),
          type: 'integration_complexity',
          title: `Task "${task.title}" has complex integrations`,
          description: `Task has ${integrationPoints.length} integration points which increases complexity and error risk`,
          severity: 'medium',
          affectedTasks: [task.id],
          affectedModules: [task.moduleId],
          willBlockAt: 'during_execution',
          resolutionCriteria: {
            checks: integrationPoints.map(ip => ({
              name: `integration_${ip.targetModule}_works`,
              check: async () => this.validateIntegrationPoint(ip),
              description: `Integration with ${ip.targetModule} must work`,
            })),
            allMustPass: true,
          },
          possibleSolutions: [{
            title: 'Break down task',
            description: 'Split task into smaller tasks with fewer integrations each',
            effort: 'medium',
            confidence: 0.85,
            steps: [
              'Identify logical breakdown points',
              'Create sub-tasks',
              'Redistribute integrations',
            ],
            requiredResources: [],
            estimatedHours: 2,
            automatable: true,
          }],
          clarifyingQuestions: [],
        });
      }
    }
    
    return blockers;
  }
}
```

---

## 6. QUESTION-DRIVEN PLANNING ORCHESTRATOR

### 6.1 Master Planning Orchestrator

```typescript
class MasterPlanningOrchestrator {
  constructor(
    private questionGenerator: QuestionGenerator,
    private taskGenerator: ExhaustiveTaskGenerator,
    private validationGenerator: ValidationGenerator,
    private blockerAnticipator: ComprehensiveBlockerAnticipator,
    private integrationChecker: ComprehensiveIntegrationChecker,
    private integrationMapBuilder: IntegrationMapBuilder
  ) {}
  
  /**
   * COMPLETE planning flow that leaves NOTHING to chance
   */
  async executeMasterPlanning(
    projectId: string,
    initialIntent: string
  ): Promise<CompletePlan> {
    // PHASE 1: Build integration map of existing code
    console.log('Phase 1: Scanning existing codebase...');
    const integrationMap = await this.integrationMapBuilder.buildIntegrationMap(
      await this.getProjectPath(projectId)
    );
    
    // PHASE 2: Question session - get ALL needed information
    console.log('Phase 2: Starting question session...');
    const questionSession = await this.conductExhaustiveQuestionSession(
      projectId,
      initialIntent,
      integrationMap
    );
    
    // PHASE 3: Generate exhaustive task list
    console.log('Phase 3: Generating exhaustive task list...');
    const tasks = await this.taskGenerator.generateCompleteTasks(
      questionSession.feature,
      questionSession.context
    );
    
    // PHASE 4: Generate validation for each task
    console.log('Phase 4: Generating validation criteria...');
    for (const task of tasks.steps) {
      task.validation = this.validationGenerator.generateValidationForTask(task);
    }
    
    // PHASE 5: Anticipate ALL blockers
    console.log('Phase 5: Anticipating blockers...');
    const blockerReport = await this.blockerAnticipator.anticipateAllBlockers(
      { tasks: tasks.steps },
      questionSession.context,
      integrationMap
    );
    
    // PHASE 6: Resolve blockers through questions
    console.log('Phase 6: Resolving blockers...');
    if (blockerReport.questionsToResolve.length > 0) {
      await this.askBlockerResolutionQuestions(
        questionSession.id,
        blockerReport.questionsToResolve
      );
      
      // Re-anticipate blockers after resolution
      blockerReport = await this.blockerAnticipator.anticipateAllBlockers(
        { tasks: tasks.steps },
        questionSession.context,
        integrationMap
      );
    }
    
    // PHASE 7: Verify ALL integrations
    console.log('Phase 7: Verifying integrations...');
    for (const task of tasks.steps) {
      const integrationResult = await this.integrationChecker.checkAllIntegrations(task);
      if (!integrationResult.allPassed) {
        throw new Error(`Integration validation failed for task: ${task.title}`);
      }
    }
    
    // PHASE 8: Order tasks logically
    console.log('Phase 8: Ordering tasks...');
    const orderedTasks = await this.orderTasksForExecution(tasks.steps, integrationMap);
    
    // PHASE 9: Allocate tasks to human/AI
    console.log('Phase 9: Allocating tasks...');
    for (const task of orderedTasks) {
      task.allocation = await this.determineTaskAllocation(task);
    }
    
    // PHASE 10: Create final plan
    console.log('Phase 10: Creating final plan...');
    const plan = await this.createFinalPlan(
      projectId,
      questionSession,
      orderedTasks,
      blockerReport,
      integrationMap
    );
    
    // PHASE 11: Save everything to database
    console.log('Phase 11: Saving to database...');
    await this.savePlanToDatabase(plan);
    
    console.log(`✓ Planning complete: ${orderedTasks.length} tasks generated`);
    console.log(`✓ ${blockerReport.totalBlockers} blockers identified and resolved`);
    console.log(`✓ All integration points validated`);
    console.log(`✓ Ready for execution`);
    
    return plan;
  }
  
  /**
   * Conduct exhaustive question session
   */
  private async conductExhaustiveQuestionSession(
    projectId: string,
    initialIntent: string,
    integrationMap: ProjectIntegrationMap
  ): Promise<QuestionSessionResult> {
    const session = await this.createSession(projectId, initialIntent);
    const answers: QuestionAnswer[] = [];
    let confidence = 0;
    
    // Keep asking questions until we have COMPLETE information
    while (confidence < 0.95) {
      // Generate next question
      const question = await this.questionGenerator.generateNextQuestion(
        session.id,
        answers,
        integrationMap
      );
      
      if (!question) break; // No more questions needed
      
      // Ask question (via UI)
      const answer = await this.promptUser(question);
      answers.push({ questionId: question.id, answer, timestamp: new Date() });
      
      // Generate follow-up questions
      const followUps = await this.generateFollowUps(question, answer);
      
      // Update confidence
      confidence = await this.calculatePlanningConfidence(answers);
      
      console.log(`Question ${answers.length}: ${question.text}`);
      console.log(`Answer: ${JSON.stringify(answer)}`);
      console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
    }
    
    // Build complete feature specification from answers
    const feature = await this.buildFeatureSpecification(answers);
    const context = await this.buildPlanningContext(answers, integrationMap);
    
    return {
      id: session.id,
      feature,
      context,
      answers,
      confidence,
    };
  }
}
```

---

## 7. DATABASE SCHEMA (Complete)

```sql
-- This is the COMPLETE schema needed for the enhanced planning system

-- ... (includes all schemas from Part 1, plus:)

-- Validation Rules
CREATE TABLE validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('precondition', 'postcondition', 'integration', 'performance', 'security', 'quality')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('blocker', 'critical', 'warning', 'info')),
  check_type VARCHAR(20) NOT NULL CHECK (check_type IN ('automated', 'manual', 'ai_review')),
  check_script TEXT,
  expected_result JSONB,
  auto_fix_available BOOLEAN DEFAULT FALSE,
  auto_fix_script TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Validation Results
CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  validation_rule_id UUID NOT NULL REFERENCES validation_rules(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  evidence JSONB,
  error_message TEXT
);

-- Blockers
CREATE TABLE blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  will_block_at VARCHAR(50) NOT NULL CHECK (will_block_at IN ('now', 'during_execution', 'during_deployment')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'mitigated', 'accepted')),
  resolution_strategy TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Blocker Affected Tasks
CREATE TABLE blocker_affected_tasks (
  blocker_id UUID NOT NULL REFERENCES blockers(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_id, task_id)
);

-- Integration Map (cached)
CREATE TABLE integration_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  map_type VARCHAR(50) NOT NULL,
  source_path TEXT NOT NULL,
  target_path TEXT,
  integration_details JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_validation_rules_task ON validation_rules(task_id);
CREATE INDEX idx_validation_results_task ON validation_results(task_id);
CREATE INDEX idx_blockers_plan ON blockers(plan_id);
CREATE INDEX idx_blocker_tasks_blocker ON blocker_affected_tasks(blocker_id);
CREATE INDEX idx_blocker_tasks_task ON blocker_affected_tasks(task_id);
CREATE INDEX idx_integration_map_project ON integration_map(project_id);
CREATE INDEX idx_integration_map_type ON integration_map(map_type);
```

---

## SUMMARY

This enhanced specification provides:

1. ✅ **Exhaustive Task Generation**: Every possible step is generated (DB, API, Services, UI, Tests, Docs, Deployment)
2. ✅ **Complete Validation**: Every task has explicit, testable validation criteria
3. ✅ **Total Blocker Anticipation**: All potential blockers are identified upfront with resolution strategies
4. ✅ **Perfect Integration Mapping**: All integration points are mapped and validated
5. ✅ **Question-Driven Completeness**: Iterative questioning until 95%+ confidence
6. ✅ **Automatic Allocation**: Smart allocation to human or AI based on task characteristics
7. ✅ **Complete Database Schema**: All entities persisted and tracked

The system ensures ZERO ambiguity and COMPLETE anticipation for autonomous, error-free code generation.
