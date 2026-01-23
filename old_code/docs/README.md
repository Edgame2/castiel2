# 📚 Castiel Documentation

Welcome to the Castiel documentation! This guide helps you navigate through all available resources.

---

## 🚀 Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture overview |
| [Development](./DEVELOPMENT.md) | Development setup guide |
| [Migration Guide](./MIGRATION_TURBOREPO.md) | Turborepo migration steps |

---

## 📁 Documentation Structure

```
docs/
├── README.md                # Main documentation index (this file)
├── INDEX.md                 # Comprehensive documentation index
├── ARCHITECTURE.md          # System architecture
├── DEVELOPMENT.md           # Developer setup guide
├── MIGRATION_TURBOREPO.md   # Turborepo migration
├── ROUTE_REGISTRATION_DEPENDENCIES.md # API route dependencies reference
│
├── guides/                  # How-to guides
│   ├── authentication.md    # Auth implementation
│   ├── user-groups.md       # Groups & SSO sync
│   ├── tenant-settings.md   # Tenant configuration
│   ├── component-standards.md # Widget-compatible components
│   ├── caching.md           # Redis caching
│   ├── deployment.md        # Production deployment
│   ├── deployment-bulk-operations.md # Bulk operations deployment
│   ├── session-management.md # Session handling
│   ├── web-search-quick-start.md # Web search quick start
│   ├── ai-features.md       # AI features guide (consolidated)
│   ├── audit-logging-verification.md # Audit logging guide
│   └── super-admin-catalog-guide.md # Super admin catalog
│
├── development/            # Development standards and practices
│   ├── QUICK_REFERENCE.md  # Quick lookup guide (cheat sheet)
│   ├── ERROR_HANDLING_STANDARD.md # Error handling patterns
│   ├── INPUT_VALIDATION_STANDARD.md # Input validation patterns
│   ├── ENVIRONMENT_VARIABLES.md # Environment configuration
│   ├── BUILD_VERIFICATION.md # Build verification
│   └── HYBRID_LOCAL_AZURE_SETUP.md # Hybrid setup guide
│
├── setup/                   # Infrastructure setup
│   ├── azure-ad-b2c.md      # Azure AD B2C setup
│   ├── azure-key-vault.md   # Key Vault setup
│   └── redirect-uris.md     # OAuth redirect URIs
│
├── api/                     # API documentation
│   ├── README.md            # API overview
│   ├── bulk-operations-api.md # Bulk operations API
│   ├── bulk-operations-quick-reference.md # Quick reference
│   └── role-management-api-reference.md # Role management API
│
├── backend/                 # Backend documentation
│   ├── README.md            # Backend overview
│   └── API.md               # Backend API reference
│
├── shards/                  # Shards system
│   ├── README.md            # Overview
│   ├── base-schema.md       # Base schema spec
│   ├── relationships.md     # Graph relationships
│   ├── roadmap.md           # Feature roadmap
│   ├── field-types.md       # Field types reference
│   └── core-types/          # ShardType definitions
│
├── features/                # Feature specifications
│   ├── dashboard/           # Customizable dashboards
│   ├── content-generation/  # AI content generation
│   ├── embedding-processor/ # Vector embeddings
│   ├── integrations/        # Third-party integrations
│   └── ai-insights/         # AI insights features
│
├── frontend/                # Frontend documentation
│   └── README.md
│
├── document-management/     # Document management
│   ├── document-management.md
│   └── UI-COMPONENTS-AND-PAGES.md
│
├── user-guide/              # End-user documentation
│   └── shard-types.md
│
└── archive/                 # Historical documents
    ├── completed-tasks/     # Completed work
    ├── legacy-todos/        # Old TODO lists
    ├── progress-reports/    # Old progress reports
    ├── session-summaries/   # Session completion reports
    └── task-completions/    # Task completion records
```

---

## 📖 Documentation by Topic

### Getting Started

1. **[Development Guide](./DEVELOPMENT.md)** - Set up your local environment
2. **[Architecture](./ARCHITECTURE.md)** - Understand the system design
3. **[Gap Analysis](./GAP_ANALYSIS.md)** - Current gaps and implementation status

### Development Standards

| Standard | Description |
|---------|-------------|
| [Error Handling Standard](./development/ERROR_HANDLING_STANDARD.md) | **Standardized error handling patterns for all controllers** |
| [Input Validation Standard](./development/INPUT_VALIDATION_STANDARD.md) | **Standardized input validation patterns and security guidelines** |
| [Route Registration Dependencies](./ROUTE_REGISTRATION_DEPENDENCIES.md) | **Complete reference for API route dependencies** |
| [Quick Reference](./development/QUICK_REFERENCE.md) | **Quick lookup guide for error handling and validation patterns** |
| [Environment Variables](./development/ENVIRONMENT_VARIABLES.md) | Environment variable configuration |
| [Build Verification](./development/BUILD_VERIFICATION.md) | Build verification procedures |

### Guides

| Guide | Description |
|-------|-------------|
| [Authentication](./guides/authentication.md) | Auth flows, OAuth, MFA, Magic Links |
| [User Groups](./guides/user-groups.md) | Groups, SSO sync, permissions |
| [Tenant Settings](./guides/tenant-settings.md) | Fiscal year, dashboard config |
| [Component Standards](./guides/component-standards.md) | **Widget-compatible components, DataTable** |
| [Caching](./guides/caching.md) | Redis caching strategy |
| [Deployment](./guides/deployment.md) | Production deployment |
| [Deployment - Bulk Operations](./guides/deployment-bulk-operations.md) | Bulk operations deployment guide |
| [Session Management](./guides/session-management.md) | Session handling |
| [Web Search Quick Start](./guides/web-search-quick-start.md) | Web search integration guide |
| [AI Features](./guides/ai-features.md) | AI model catalog, connections, and Key Vault integration |
| [Audit Logging Verification](./guides/audit-logging-verification.md) | Audit logging setup and verification |
| [Super Admin Catalog](./guides/super-admin-catalog-guide.md) | Super admin integration catalog |

### Infrastructure Setup

| Guide | Description |
|-------|-------------|
| [Azure AD B2C](./setup/azure-ad-b2c.md) | Identity provider setup |
| [Azure Key Vault](./setup/azure-key-vault.md) | Secrets management |
| [Redirect URIs](./setup/redirect-uris.md) | OAuth callback URLs |

### API Reference

| Document | Description |
|----------|-------------|
| [API Overview](./api/README.md) | REST & GraphQL API docs |
| [Backend API](./backend/API.md) | Backend API reference |
| [Bulk Operations API](./api/bulk-operations-api.md) | Bulk document operations endpoints |
| [Bulk Operations Quick Reference](./api/bulk-operations-quick-reference.md) | Quick reference for bulk operations |
| [Role Management API](./api/role-management-api-reference.md) | Role management API reference |

### Shards System

| Document | Description |
|----------|-------------|
| [Overview](./shards/README.md) | Shards architecture |
| [Base Schema](./shards/base-schema.md) | Core schema definition |
| [Field Types](./shards/field-types.md) | **Field types, validation, UI, design config** |
| [Relationships](./shards/relationships.md) | Knowledge graph edges |
| [Roadmap](./shards/roadmap.md) | Feature roadmap |
| [Core Types](./shards/core-types/) | Built-in ShardTypes |

### Features

| Feature | Description |
|---------|-------------|
| [Dashboard System](./features/dashboard/) | Customizable dashboards with widgets |
| [Content Generation](./features/content-generation/) | AI-powered content |
| [Embedding Processor](./features/embedding-processor/) | Vector embeddings |
| [Integrations](./features/integrations/SPECIFICATION.md) | **Third-party integrations, sync tasks, conversion schemas** |
| [AI Insights](./features/ai-insights/) | **Intelligent insights with grounding, citations, multi-trigger** |

### Document Management

| Document | Description |
|----------|-------------|
| [Document Management](./document-management/document-management.md) | Document management system |
| [UI Components and Pages](./document-management/UI-COMPONENTS-AND-PAGES.md) | Document management UI |

---

## 🔗 External Resources

- **API Docs**: http://localhost:3001/api/docs (Swagger UI)
- **GraphQL Playground**: http://localhost:3001/graphql
- **Web App**: http://localhost:3000

---

## 📝 Contributing to Docs

When adding documentation:

1. **Place files in the appropriate folder**
2. **Use lowercase-kebab-case** for filenames (e.g., `my-feature.md`)
3. **Update this README** if adding new sections
4. **Include a table of contents** for long documents

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Guides | `topic.md` | `authentication.md` |
| Setup | `service-name.md` | `azure-ad-b2c.md` |
| Features | `README.md` in folder | `features/integrations/README.md` |
| ShardTypes | `c_typename.md` | `c_contact.md` |

---

---

## 📦 Archived Documentation

Historical documentation, progress reports, and session summaries have been moved to the [`archive/`](./archive/) directory:

- **Progress Reports** - Old project status and progress updates
- **Session Summaries** - Session completion reports
- **Task Completions** - Task completion records
- **Legacy TODOs** - Old TODO lists and feature requests

For current, active documentation, refer to the sections above.

---

**Last Updated**: January 2025

> **Note:** All documentation has been updated to reflect current implementation status. See [Documentation Update Summary](./DOCUMENTATION_UPDATE_SUMMARY.md) for details.

---

## 🔍 Gap Analysis

For a comprehensive analysis of current implementation gaps, missing features, and technical debt, see:

- **[Gap Analysis](./GAP_ANALYSIS.md)** - Complete gap analysis document
- **[Architecture](./ARCHITECTURE.md)** - Architecture documentation with gap sections
- **[Backend Documentation](./backend/README.md)** - Backend implementation with gap analysis
- **[Frontend Documentation](./frontend/README.md)** - Frontend implementation with gap analysis

