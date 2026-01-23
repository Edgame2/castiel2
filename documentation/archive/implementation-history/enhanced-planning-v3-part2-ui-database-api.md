# Enhanced Planning Module v3.0 - Part 2

**UI, Database, APIs & Quality Recommendations**

[CONTENT FROM PREVIOUS ATTEMPT - UI COMPONENTS, DATABASE SCHEMA]

## 9. API ENDPOINTS

### 9.1 Planning Endpoints

```typescript
/**
 * POST /api/planning/start
 * Start a new planning session
 */
POST /api/planning/start
Body: {
  projectId: string;
  initialIntent: string;
  qualityThreshold?: number;  // Default: 90
  confidenceThreshold?: number;  // Default: 85
}
Response: {
  planId: string;
  sessionId: string;
  status: 'started';
}

/**
 * GET /api/planning/:planId
 * Get plan details
 */
GET /api/planning/:planId
Response: {
  plan: Plan;
  modules: Module[];
  tasks: Task[];
  scores: {
    quality: PlanQualityScore;
    confidence: PlanConfidenceScore;
  };
  violations: RuleViolation[];
  recommendations: Recommendation[];
}

/**
 * POST /api/planning/:planId/add-context
 * Add context to plan/module/task
 */
POST /api/planning/:planId/add-context
Body: {
  level: 'plan' | 'module' | 'task';
  entityId?: string;
  context: string;
}
Response: {
  updated: boolean;
  questionsGenerated: Question[];
  planUpdated: boolean;
}

/**
 * POST /api/planning/:planId/request-recommendations
 * Request AI recommendations
 */
POST /api/planning/:planId/request-recommendations
Response: {
  recommendations: Recommendation[];
}

/**
 * POST /api/planning/:planId/accept-recommendations
 * Accept recommendations
 */
POST /api/planning/:planId/accept-recommendations
Body: {
  recommendationIds: string[];  // Empty array = accept all
}
Response: {
  applied: number;
  planUpdated: boolean;
}

/**
 * POST /api/planning/:planId/finalize
 * Finalize plan
 */
POST /api/planning/:planId/finalize
Response: {
  success: boolean;
  finalQuality: number;
  finalConfidence: number;
}
```

### 9.2 Module Endpoints

```typescript
/**
 * GET /api/planning/:planId/modules
 * Get all modules in plan
 */
GET /api/planning/:planId/modules
Query: {
  status?: string;
  type?: string;
  needsInfo?: boolean;
}
Response: {
  modules: Module[];
  total: number;
}

/**
 * GET /api/planning/:planId/modules/:moduleId
 * Get module details
 */
GET /api/planning/:planId/modules/:moduleId
Response: {
  module: Module;
  subModules: Module[];
  tasks: Task[];
  violations: RuleViolation[];
}

/**
 * PUT /api/planning/:planId/modules/:moduleId
 * Update module
 */
PUT /api/planning/:planId/modules/:moduleId
Body: Partial<Module>
Response: {
  module: Module;
  recalculatedScores: boolean;
}

/**
 * POST /api/planning/:planId/modules/:moduleId/validate
 * Validate module
 */
POST /api/planning/:planId/modules/:moduleId/validate
Response: {
  validation: ModuleValidation;
  violations: RuleViolation[];
}
```

### 9.3 Task Endpoints

```typescript
/**
 * GET /api/planning/:planId/tasks
 * Get all tasks in plan
 */
GET /api/planning/:planId/tasks
Query: {
  moduleId?: string;
  type?: string;
  status?: string;
  allocatedTo?: string;
}
Response: {
  tasks: Task[];
  total: number;
}

/**
 * GET /api/planning/:planId/tasks/:taskId
 * Get task details
 */
GET /api/planning/:planId/tasks/:taskId
Response: {
  task: Task;
  blockers: TaskBlocker[];
  violations: RuleViolation[];
}

/**
 * PUT /api/planning/:planId/tasks/:taskId
 * Update task
 */
PUT /api/planning/:planId/tasks/:taskId
Body: Partial<Task>
Response: {
  task: Task;
}
```

### 9.4 Maintainability Rules Endpoints

```typescript
/**
 * GET /api/maintainability-rules
 * Get all rules for project
 */
GET /api/maintainability-rules
Query: {
  projectId: string;
  category?: string;
  enabled?: boolean;
}
Response: {
  rules: MaintainabilityRule[];
  total: number;
}

/**
 * GET /api/maintainability-rules/:ruleId
 * Get rule details
 */
GET /api/maintainability-rules/:ruleId
Response: {
  rule: MaintainabilityRule;
  violations: RuleViolation[];  // Current violations
}

/**
 * POST /api/maintainability-rules
 * Create new rule
 */
POST /api/maintainability-rules
Body: Omit<MaintainabilityRule, 'id' | 'createdAt' | 'updatedAt'>
Response: {
  rule: MaintainabilityRule;
}

/**
 * PUT /api/maintainability-rules/:ruleId
 * Update rule
 */
PUT /api/maintainability-rules/:ruleId
Body: Partial<MaintainabilityRule>
Response: {
  rule: MaintainabilityRule;
}

/**
 * DELETE /api/maintainability-rules/:ruleId
 * Delete rule
 */
DELETE /api/maintainability-rules/:ruleId
Response: {
  deleted: boolean;
}

/**
 * POST /api/maintainability-rules/:ruleId/toggle
 * Enable/disable rule
 */
POST /api/maintainability-rules/:ruleId/toggle
Response: {
  rule: MaintainabilityRule;
}

/**
 * POST /api/maintainability-rules/request-recommendations
 * Get AI recommendations for new rules
 */
POST /api/maintainability-rules/request-recommendations
Body: {
  projectId: string;
}
Response: {
  recommendations: RuleRecommendation[];
}
```

### 9.5 Question Session Endpoints

```typescript
/**
 * GET /api/questions/:sessionId/next
 * Get next question
 */
GET /api/questions/:sessionId/next
Response: {
  question: Question | null;  // null if no more questions
  progress: {
    answered: number;
    total: number;
    confidence: number;
  };
}

/**
 * POST /api/questions/:sessionId/answer
 * Answer question
 */
POST /api/questions/:sessionId/answer
Body: {
  questionId: string;
  answer: any;
  confidence?: number;
  notes?: string;
}
Response: {
  accepted: boolean;
  followUpQuestions: Question[];
  updatedConfidence: number;
}
```

---

## 10. ADDITIONAL QUALITY RECOMMENDATIONS

### 10.1 Code Quality Best Practices

```typescript
/**
 * RECOMMENDATION: Enforce Function Purity
 */
const PURE_FUNCTIONS_RULE: MaintainabilityRule = {
  name: 'Prefer Pure Functions',
  description: 'Functions should be pure (no side effects) when possible',
  category: 'code_quality',
  severity: 'medium',
  rationale: 'Pure functions are easier to test, reason about, and maintain',
  recommendation: 'Extract side effects to separate functions or use dependency injection',
};

/**
 * RECOMMENDATION: Limit Function Parameters
 */
const MAX_PARAMETERS_RULE: MaintainabilityRule = {
  name: 'Maximum Function Parameters',
  description: 'Functions should have no more than 4 parameters',
  category: 'code_quality',
  severity: 'medium',
  ruleType: 'metric_threshold',
  metric: {
    type: 'parameter_count',
    threshold: 4,
    operator: '<=',
  },
  rationale: 'Too many parameters make functions hard to understand and use',
  recommendation: 'Use object parameters or split into multiple functions',
};

/**
 * RECOMMENDATION: Consistent Error Handling Strategy
 */
const ERROR_HANDLING_STRATEGY: QualityRecommendation = {
  title: 'Establish Consistent Error Handling Strategy',
  description: `
    Define project-wide error handling approach:
    1. What errors are logged vs thrown?
    2. How are errors reported to users?
    3. What error information is included?
    4. How are errors tracked/monitored?
  `,
  priority: 90,
  implementation: [
    'Create error handling documentation',
    'Implement error base classes/types',
    'Add error logging infrastructure',
    'Add error monitoring/tracking',
  ],
};

/**
 * RECOMMENDATION: Type Safety
 */
const TYPE_SAFETY: QualityRecommendation = {
  title: 'Maximize Type Safety',
  description: 'Use strict TypeScript settings and avoid "any" type',
  priority: 85,
  rules: [
    'Enable strict mode in tsconfig.json',
    'Ban "any" type except in specific cases',
    'Use branded types for IDs',
    'Use discriminated unions for variants',
  ],
};

/**
 * RECOMMENDATION: Code Organization
 */
const CODE_ORGANIZATION: QualityRecommendation = {
  title: 'Consistent Code Organization',
  description: 'Organize code by feature, not by type',
  priority: 80,
  structure: `
    ✓ Good (by feature):
    /features
      /auth
        - AuthService.ts
        - AuthController.ts
        - AuthRoutes.ts
        - AuthTypes.ts
        - auth.test.ts
      /users
        - UserService.ts
        - UserController.ts
        - etc...
    
    ✗ Bad (by type):
    /services
      - AuthService.ts
      - UserService.ts
    /controllers
      - AuthController.ts
      - UserController.ts
  `,
};
```

### 10.2 Testing Quality Recommendations

```typescript
/**
 * RECOMMENDATION: Test Pyramid
 */
const TEST_PYRAMID: QualityRecommendation = {
  title: 'Follow Test Pyramid',
  description: 'More unit tests, fewer integration tests, minimal E2E tests',
  priority: 85,
  rationale: 'Test pyramid balances coverage, speed, and maintainability',
  targetDistribution: {
    unitTests: '70%',
    integrationTests: '20%',
    e2eTests: '10%',
  },
  implementation: [
    'Unit test: Every function, every edge case',
    'Integration test: Module interactions',
    'E2E test: Critical user journeys only',
  ],
};

/**
 * RECOMMENDATION: Test Quality Standards
 */
const TEST_QUALITY: QualityRecommendation = {
  title: 'Test Quality Standards',
  description: 'Tests should be FIRST: Fast, Independent, Repeatable, Self-validating, Timely',
  priority: 90,
  rules: [
    'Tests run in under 10 seconds (unit tests)',
    'Tests can run in any order',
    'Tests produce same result every time',
    'Tests have clear pass/fail (no manual verification)',
    'Tests written alongside code, not after',
  ],
  badPractices: [
    'Tests that depend on external services',
    'Tests that depend on specific data in database',
    'Tests that depend on other tests',
    'Tests that use setTimeout/sleep',
    'Tests that don't clean up after themselves',
  ],
};

/**
 * RECOMMENDATION: Mutation Testing
 */
const MUTATION_TESTING: QualityRecommendation = {
  title: 'Add Mutation Testing',
  description: 'Verify test quality by introducing mutations',
  priority: 70,
  rationale: 'High coverage doesn't mean good tests. Mutation testing verifies tests actually catch bugs.',
  implementation: [
    'Add Stryker or similar tool',
    'Target 80%+ mutation score',
    'Fix surviving mutants',
  ],
};
```

### 10.3 Architecture Quality Recommendations

```typescript
/**
 * RECOMMENDATION: Dependency Injection
 */
const DEPENDENCY_INJECTION: QualityRecommendation = {
  title: 'Use Dependency Injection',
  description: 'Inject dependencies rather than hard-coding them',
  priority: 85,
  benefits: [
    'Easier testing (mock dependencies)',
    'Better modularity',
    'Follows Dependency Inversion Principle',
  ],
  example: `
    ✓ Good:
    class UserService {
      constructor(private db: Database) {}
    }
    
    ✗ Bad:
    class UserService {
      private db = new Database();
    }
  `,
};

/**
 * RECOMMENDATION: Interface Segregation
 */
const INTERFACE_SEGREGATION: QualityRecommendation = {
  title: 'Apply Interface Segregation Principle',
  description: 'Create focused, specific interfaces rather than large, general ones',
  priority: 75,
  example: `
    ✓ Good:
    interface Readable { read(): string; }
    interface Writable { write(data: string): void; }
    
    ✗ Bad:
    interface FileOperations {
      read(): string;
      write(data: string): void;
      delete(): void;
      copy(): void;
      move(): void;
      // ... 20 more methods
    }
  `,
};

/**
 * RECOMMENDATION: Event-Driven Architecture
 */
const EVENT_DRIVEN: QualityRecommendation = {
  title: 'Consider Event-Driven Architecture for Decoupling',
  description: 'Use events to decouple modules',
  priority: 70,
  when: 'Multiple modules need to react to the same action',
  benefits: [
    'Loose coupling',
    'Easy to add new features',
    'Better scalability',
  ],
  example: `
    // Instead of:
    function createUser(data) {
      const user = db.create(data);
      emailService.sendWelcome(user);
      analyticsService.trackSignup(user);
      auditService.log('user_created', user);
    }
    
    // Use events:
    function createUser(data) {
      const user = db.create(data);
      eventBus.emit('user.created', user);
    }
    
    // Separate handlers:
    eventBus.on('user.created', emailService.sendWelcome);
    eventBus.on('user.created', analyticsService.trackSignup);
    eventBus.on('user.created', auditService.logCreation);
  `,
};
```

### 10.4 Performance Quality Recommendations

```typescript
/**
 * RECOMMENDATION: Database Query Optimization
 */
const DATABASE_OPTIMIZATION: QualityRecommendation = {
  title: 'Optimize Database Queries',
  description: 'Prevent N+1 queries and ensure proper indexing',
  priority: 85,
  checks: [
    'Use eager loading where appropriate',
    'Add indexes on foreign keys',
    'Add indexes on frequently queried columns',
    'Use query explain to verify performance',
    'Monitor slow query log',
  ],
  badPractices: [
    'Querying in loops',
    'Missing indexes on foreign keys',
    'SELECT * when only few columns needed',
    'No pagination on large result sets',
  ],
};

/**
 * RECOMMENDATION: Caching Strategy
 */
const CACHING_STRATEGY: QualityRecommendation = {
  title: 'Implement Caching Strategy',
  description: 'Cache expensive operations and frequently accessed data',
  priority: 75,
  layers: [
    'Application cache (in-memory)',
    'Distributed cache (Redis)',
    'CDN cache (static assets)',
    'Database query cache',
  ],
  considerations: [
    'Cache invalidation strategy',
    'TTL settings',
    'Cache size limits',
    'Cache warming',
  ],
};

/**
 * RECOMMENDATION: Bundle Size Optimization
 */
const BUNDLE_OPTIMIZATION: QualityRecommendation = {
  title: 'Optimize Frontend Bundle Size',
  description: 'Keep bundle sizes small for fast loading',
  priority: 80,
  targets: {
    initialBundle: '< 200KB gzipped',
    asyncChunks: '< 100KB gzipped each',
  },
  techniques: [
    'Code splitting',
    'Tree shaking',
    'Dynamic imports',
    'Lazy loading',
    'Remove unused dependencies',
    'Use lighter alternatives',
  ],
};
```

### 10.5 Security Quality Recommendations

```typescript
/**
 * RECOMMENDATION: Input Validation
 */
const INPUT_VALIDATION: QualityRecommendation = {
  title: 'Validate All User Input',
  description: 'Never trust user input',
  priority: 95,
  rules: [
    'Validate at API boundary',
    'Use schema validation (Zod, Yup, etc.)',
    'Sanitize HTML input',
    'Validate file uploads',
    'Limit request size',
  ],
  implementation: [
    'Use validation middleware',
    'Return clear validation errors',
    'Log validation failures',
  ],
};

/**
 * RECOMMENDATION: Authentication & Authorization
 */
const AUTH_SECURITY: QualityRecommendation = {
  title: 'Secure Authentication & Authorization',
  description: 'Implement robust auth security',
  priority: 95,
  requirements: [
    'Use bcrypt/argon2 for password hashing',
    'Implement rate limiting on auth endpoints',
    'Use JWT with short expiration',
    'Implement refresh token rotation',
    'Add CSRF protection',
    'Implement account lockout after failed attempts',
    'Use secure session management',
  ],
};

/**
 * RECOMMENDATION: Secrets Management
 */
const SECRETS_MANAGEMENT: QualityRecommendation = {
  title: 'Proper Secrets Management',
  description: 'Never commit secrets to version control',
  priority: 100,
  requirements: [
    'Use environment variables',
    'Use secrets management service (AWS Secrets Manager, Vault, etc.)',
    'Rotate secrets regularly',
    'Encrypt secrets at rest',
    'Audit secret access',
  ],
  prevention: [
    'Add .env to .gitignore',
    'Use git-secrets or similar',
    'Scan commits for secrets',
  ],
};
```

### 10.6 Monitoring & Observability

```typescript
/**
 * RECOMMENDATION: Structured Logging
 */
const STRUCTURED_LOGGING: QualityRecommendation = {
  title: 'Implement Structured Logging',
  description: 'Use structured logs for better debugging',
  priority: 85,
  format: `
    {
      "timestamp": "2025-01-20T10:30:00Z",
      "level": "error",
      "message": "Failed to process payment",
      "context": {
        "userId": "user-123",
        "orderId": "order-456",
        "amount": 99.99,
        "error": "Insufficient funds"
      },
      "trace": "trace-id-789"
    }
  `,
  levels: {
    error: 'Errors that need immediate attention',
    warn: 'Warning conditions',
    info: 'Informational messages',
    debug: 'Debug messages (only in development)',
  },
};

/**
 * RECOMMENDATION: APM Integration
 */
const APM_MONITORING: QualityRecommendation = {
  title: 'Add Application Performance Monitoring',
  description: 'Monitor application performance in production',
  priority: 80,
  tools: ['New Relic', 'Datadog', 'Application Insights', 'Sentry'],
  metrics: [
    'Response times',
    'Error rates',
    'Throughput',
    'Database query performance',
    'External API calls',
    'Memory usage',
    'CPU usage',
  ],
};
```

---

## SUMMARY

This complete v3.0 specification provides:

### ✅ **Hierarchical Planning**
- Module-first approach
- Iterative questioning with quality gates
- Confidence-based iteration

### ✅ **Quality Focus**
- Configurable quality/confidence thresholds
- Comprehensive scoring system
- Quality gap identification
- AI-powered recommendations

### ✅ **Maintainability Rules Catalog**
- Fully CRUD-able rules
- AI recommendations for rules
- Rule violation detection
- Auto-fix capabilities

### ✅ **User Interaction**
- Clear UI showing validated vs needs-info items
- One-click accept recommendations
- Context addition at any level
- Review and approval workflow

### ✅ **Complete Integration**
- Database schema for all entities
- RESTful API endpoints
- UI components and visualization
- Event-driven updates

### ✅ **Quality Recommendations**
- Code quality best practices
- Testing strategies
- Architecture patterns
- Performance optimization
- Security hardening
- Monitoring & observability

This specification ensures the planning module will produce extremely high-quality plans that lead to error-free, maintainable code generation.
