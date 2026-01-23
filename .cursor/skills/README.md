# Cursor Skills for Container Development

This directory contains Cursor Skills that guide developers through container module development, migration, and compliance following ModuleImplementationGuide.md and SERVICE_MIGRATION_GUIDE.md standards.

## Available Skills

### 1. create-container-module
Scaffolds new container modules following ModuleImplementationGuide.md Section 3.1 standard structure. Creates directory layout, required files, config files with schema validation, server.ts entry point, and OpenAPI spec.

**Use when**: Creating a new microservice container, scaffolding module structure, or setting up a new service.

### 2. migrate-service-to-container
Guides migration from old_code/ to containers/ following SERVICE_MIGRATION_GUIDE.md. Transforms imports, adds tenantId to queries, replaces hardcoded URLs, updates routes with auth/tenant enforcement.

**Use when**: Migrating existing services, transforming old code patterns, or refactoring legacy code.

### 3. validate-container-compliance
Ensures containers comply with .cursorrules and ModuleImplementationGuide.md standards. Checks for hardcoded values, verifies tenant isolation, validates configuration structure, and checks event naming conventions.

**Use when**: Reviewing code, validating container structure, ensuring standards compliance, or before deployment.

### 4. setup-container-config
Creates and validates YAML configuration files with schema validation following ModuleImplementationGuide.md Section 4. Generates config/default.yaml, creates config/schema.json, sets up environment variable overrides.

**Use when**: Setting up new services, adding configuration options, or updating service configs.

### 5. create-event-handlers
Sets up RabbitMQ event publishers and consumers following ModuleImplementationGuide.md Section 9 event-driven patterns. Creates event publishers with proper DomainEvent structure, follows event naming conventions.

**Use when**: Adding event-driven communication, implementing async workflows, or integrating services via events.

### 6. write-tenant-isolated-queries
Transforms database queries to include tenantId in partition keys following ModuleImplementationGuide.md Section 8. Adds tenantId to all Cosmos DB queries, uses parameterized queries, uses prefixed container names.

**Use when**: Writing database queries, migrating queries, or ensuring tenant isolation.

### 7. create-container-documentation
Generates README.md, CHANGELOG.md, and event documentation following ModuleImplementationGuide.md Section 13 standards. Creates README with required sections, generates CHANGELOG entries, documents events.

**Use when**: Documenting new services, updating API docs, or creating event documentation.

### 8. setup-container-tests
Creates test structure and boilerplate following ModuleImplementationGuide.md Section 12 testing requirements (80% coverage, Vitest). Generates unit test structure, creates integration test templates, sets up test fixtures.

**Use when**: Setting up tests for new services, adding test coverage, or creating integration tests.

### 9. transform-service-communication
Transforms direct service calls to use ServiceClient with config-driven URLs following ModuleImplementationGuide.md Section 5.3. Replaces hardcoded URLs, adds circuit breakers and retry logic, implements service-to-service JWT auth.

**Use when**: Refactoring service calls, removing hardcoded URLs, or implementing service-to-service auth.

### 10. validate-tenant-isolation
Verifies tenant isolation is enforced at all layers (gateway, service, database) following .cursorrules Security Requirements. Checks X-Tenant-ID header validation, verifies tenantId in queries, validates tenant enforcement middleware.

**Use when**: Performing security audits, pre-deployment checks, or ensuring multi-tenancy compliance.

## Skill Usage

Skills are automatically discovered by Cursor based on their descriptions. When you ask Cursor to help with container development tasks, it will automatically use the relevant skills.

You can also explicitly reference skills in your requests:
- "Use the create-container-module skill to scaffold a new service"
- "Validate this container using the validate-container-compliance skill"
- "Help me migrate this service using the migrate-service-to-container skill"

## References

All skills reference:
- **ModuleImplementationGuide.md** - Complete module implementation standards
- **SERVICE_MIGRATION_GUIDE.md** - Service migration patterns and transformations
- **.cursorrules** - Project coding standards and rules
- **containers/auth/** - Reference implementation

## Skill Development

Skills follow the standard Cursor Skill format:
- YAML frontmatter with `name` and `description`
- Description includes trigger terms for agent discovery
- Content under 500 lines with progressive disclosure
- Code examples and patterns from project standards
- Checklists and validation steps

For more information on creating skills, see the create-skill skill documentation.
