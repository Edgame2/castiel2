# Quality Assurance Checklist

Use this checklist before marking any module implementation as complete.

## Pre-Implementation

- [ ] Reviewed ModuleImplementationGuide.md relevant sections
- [ ] Checked existing containers (auth, logging) as reference
- [ ] Verified cursor rules are understood

## Code Quality

- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code formatted with Prettier (`npm run format:check`)
- [ ] No `any` types (use `unknown` and type guards)
- [ ] All functions have JSDoc comments
- [ ] Cyclomatic complexity ≤ 10

## Module Structure

- [ ] Dockerfile present
- [ ] package.json configured correctly
- [ ] tsconfig.json extends root config
- [ ] README.md complete (overview, setup, API, config)
- [ ] CHANGELOG.md present
- [ ] config/default.yaml with schema validation
- [ ] config/schema.json present
- [ ] openapi.yaml in module root
- [ ] src/server.ts as entry point

## Security

- [ ] No hardcoded ports, URLs, or secrets
- [ ] All secrets in environment variables
- [ ] Tenant enforcement middleware on all routes
- [ ] All database queries include tenantId in partition key
- [ ] Service-to-service calls use JWT tokens
- [ ] X-Tenant-ID header validated
- [ ] Audit logging for sensitive operations

## Configuration

- [ ] All settings in YAML config files
- [ ] Environment variable support
- [ ] Config schema validation working
- [ ] Service URLs from config (not hardcoded)
- [ ] TypeScript interfaces for config

## Error Handling

- [ ] Using AppError from @coder/shared
- [ ] Proper HTTP status codes
- [ ] Errors logged with context (tenantId, userId, correlationId)
- [ ] No internal errors exposed to clients

## Testing

- [ ] Test coverage ≥ 80%
- [ ] Unit tests for all services and utilities
- [ ] Integration tests for all API routes
- [ ] Tests use Vitest
- [ ] All external dependencies mocked
- [ ] Tenant isolation tested explicitly

## Event-Driven Communication

- [ ] Events include: id, type, version, timestamp, tenantId, source, data
- [ ] Event types follow pattern: {module}.{resource}.{action}
- [ ] All published events documented
- [ ] All consumed events documented
- [ ] Event schemas validated

## Performance

- [ ] Multi-layer caching implemented (if applicable)
- [ ] Connection pooling configured
- [ ] Partition keys used in all database queries
- [ ] Circuit breakers for service calls

## Documentation

- [ ] README.md includes: overview, setup, API endpoints, configuration
- [ ] CHANGELOG.md tracks version changes
- [ ] All public functions have JSDoc
- [ ] Architecture decisions in architecture.md
- [ ] logs-events.md (if module publishes logged events)
- [ ] notifications-events.md (if module publishes notification events)

## Service Communication

- [ ] Using ServiceClient from @coder/shared (when available)
- [ ] Circuit breakers implemented
- [ ] Retry logic with exponential backoff
- [ ] Service calls logged with correlation IDs
- [ ] Graceful handling of service failures

## Database

- [ ] All queries use partition key (tenantId)
- [ ] Parameterized queries (no string concatenation)
- [ ] Query result caching (if applicable)
- [ ] Connection pooling configured
- [ ] All queries typed

## Final Checks

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code formatted
- [ ] Documentation complete
- [ ] Ready for code review

