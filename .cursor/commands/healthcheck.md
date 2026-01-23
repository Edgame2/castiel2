# Comprehensive Project Health Check Prompt for Cursor

You are an expert software architect and code reviewer. Please perform a thorough health check of this entire project, analyzing it across all critical dimensions. Provide a detailed report with actionable recommendations.

## Areas to Analyze

### 1. Code Quality & Best Practices
- **Code organization**: Assess folder structure, module separation, and architectural patterns
- **Naming conventions**: Check consistency in variable, function, class, and file naming
- **Code duplication**: Identify repeated code that should be abstracted
- **Complexity**: Find overly complex functions/methods that need refactoring
- **SOLID principles**: Evaluate adherence to Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion
- **Design patterns**: Identify where patterns are well-used or where they're missing/misapplied
- **Code comments**: Check if comments are meaningful, up-to-date, and not redundant
- **Dead code**: Find unused imports, functions, variables, or entire files

### 2. Performance
- **Algorithmic efficiency**: Identify O(n²) or worse operations that could be optimized
- **Memory management**: Check for memory leaks, excessive allocations, or inefficient data structures
- **Database queries**: Look for N+1 queries, missing indexes, or inefficient queries
- **Caching**: Identify opportunities for caching (in-memory, Redis, CDN, etc.)
- **Lazy loading**: Check if resources are loaded efficiently (code splitting, lazy imports)
- **Bundle size**: Analyze asset sizes and optimization opportunities (minification, compression, tree-shaking)
- **Async operations**: Ensure proper use of async/await, promises, and parallel processing
- **Resource cleanup**: Verify proper cleanup of connections, event listeners, timers, etc.

### 3. Security
- **Authentication & Authorization**: Review implementation of auth mechanisms
- **Input validation**: Check for sanitization of user inputs
- **SQL injection**: Look for vulnerable database queries
- **XSS vulnerabilities**: Check for unescaped output in templates
- **CSRF protection**: Verify CSRF tokens are implemented where needed
- **Secrets management**: Ensure no hardcoded credentials, API keys, or sensitive data
- **Dependencies**: Check for known vulnerabilities in npm/pip/gem packages
- **HTTPS enforcement**: Verify secure communication
- **Rate limiting**: Check for DoS protection mechanisms
- **Error handling**: Ensure errors don't leak sensitive information

### 4. Testing
- **Test coverage**: Analyze unit, integration, and e2e test coverage
- **Test quality**: Review test assertions, edge cases, and test data
- **Mocking strategy**: Evaluate proper use of mocks, stubs, and fixtures
- **CI/CD integration**: Check if tests run automatically
- **Performance tests**: Look for load/stress testing
- **Test organization**: Assess test file structure and naming

### 5. Error Handling & Logging
- **Exception handling**: Check for proper try-catch blocks and error boundaries
- **Error messages**: Ensure user-friendly error messages
- **Logging strategy**: Review logging levels (debug, info, warn, error)
- **Monitoring**: Check integration with monitoring tools (Sentry, DataDog, etc.)
- **Graceful degradation**: Verify fallback mechanisms
- **Stack traces**: Ensure sensitive info isn't exposed in production logs

### 6. Maintainability
- **Documentation**: Review README, API docs, inline comments, and architecture diagrams
- **Configuration management**: Check environment variables and config files
- **Dependency management**: Review package.json/requirements.txt for outdated or unnecessary dependencies
- **Versioning**: Check semantic versioning usage
- **Changelog**: Verify if changes are documented
- **Code metrics**: Analyze cyclomatic complexity, lines of code, coupling, cohesion

### 7. Scalability
- **Horizontal scalability**: Can the app scale across multiple instances?
- **Database scalability**: Review connection pooling, sharding potential, read replicas
- **State management**: Check for stateless design or proper session handling
- **Message queues**: Identify where async job processing could help
- **Microservices readiness**: Assess coupling and boundaries
- **Load balancing**: Review distribution strategies

### 8. Accessibility (if applicable)
- **ARIA labels**: Check for proper semantic HTML and ARIA attributes
- **Keyboard navigation**: Verify all interactive elements are keyboard accessible
- **Screen reader support**: Test with screen reader compatibility
- **Color contrast**: Ensure WCAG compliance
- **Focus management**: Check focus indicators and tab order

### 9. DevOps & Infrastructure
- **Containerization**: Review Dockerfile and docker-compose setup
- **CI/CD pipelines**: Analyze build, test, and deployment workflows
- **Infrastructure as Code**: Check Terraform, CloudFormation, or similar
- **Backup strategy**: Verify data backup mechanisms
- **Rollback capability**: Ensure easy rollback procedures
- **Health checks**: Review readiness and liveness probes

### 10. Frontend Specific (if applicable)
- **Responsive design**: Check mobile, tablet, desktop layouts
- **Browser compatibility**: Identify potential cross-browser issues
- **Image optimization**: Review image formats, sizes, and lazy loading
- **CSS architecture**: Assess methodology (BEM, CSS modules, styled-components)
- **JavaScript bundle**: Analyze code splitting and chunk sizes
- **SEO**: Check meta tags, sitemap, robots.txt, structured data

### 11. Backend Specific (if applicable)
- **API design**: Review RESTful principles or GraphQL schema design
- **Rate limiting**: Check API throttling mechanisms
- **Pagination**: Verify large datasets are paginated
- **Validation layers**: Review DTO/schema validation
- **Database migrations**: Check migration strategy and reversibility
- **Background jobs**: Review job queue implementation and error handling

### 12. Dependencies & Technical Debt
- **Outdated packages**: Identify packages needing updates
- **Breaking changes**: Note major version updates required
- **License compliance**: Check for license compatibility issues
- **Bundle bloat**: Identify heavy dependencies that could be replaced
- **Technical debt**: List accumulated shortcuts and workarounds

## Output Format

Please structure your report as follows:

### Executive Summary
- Overall health score (1-10)
- Top 3 critical issues
- Top 3 quick wins

### Detailed Findings

For each area above, provide:
- **Status**: 🟢 Good / 🟡 Needs Improvement / 🔴 Critical
- **Key Issues**: Bulleted list of specific problems found
- **Impact**: High/Medium/Low for each issue
- **Recommendations**: Concrete, actionable steps to fix

### Prioritized Action Plan

1. **Critical (Fix Immediately)**
   - Security vulnerabilities
   - Performance bottlenecks
   - Breaking bugs

2. **High Priority (This Sprint)**
   - Major code quality issues
   - Test coverage gaps
   - Documentation holes

3. **Medium Priority (Next Sprint)**
   - Refactoring opportunities
   - Dependency updates
   - Performance optimizations

4. **Low Priority (Backlog)**
   - Nice-to-have improvements
   - Code style inconsistencies
   - Minor optimizations

### Metrics Dashboard
- Lines of code
- Test coverage %
- Cyclomatic complexity (average/max)
- Number of dependencies
- Known vulnerabilities
- Build time
- Bundle size (if frontend)

### Files Requiring Immediate Attention
List specific files with critical issues and why.

---

**Important**: Be specific with file names, line numbers when possible, and code examples. Provide measurable metrics where available. Focus on actionable insights rather than theoretical advice.
