# Castiel Documentation Index

**Last Updated**: December 12, 2025  
**Status**: Active Documentation

This is a comprehensive index of all active documentation in the Castiel project. For historical documentation, see the [`archive/`](./archive/) directory.

---

## 📋 Quick Navigation

### 🚀 Getting Started

1. **[README.md](./README.md)** - Main documentation index and navigation
2. **[Architecture](./ARCHITECTURE.md)** - System architecture overview
3. **[Development Guide](./DEVELOPMENT.md)** - Developer setup guide
4. **[Migration Guide](./MIGRATION_TURBOREPO.md)** - Turborepo migration steps

---

## 📖 Documentation by Category

### 🏗️ Architecture & Design

| Document | Description |
|----------|-------------|
| [Architecture Overview](./ARCHITECTURE.md) | System design and architecture |
| [Shards System](./shards/README.md) | Schema-driven data architecture |
| [Base Schema](./shards/base-schema.md) | Core schema definition |
| [Field Types](./shards/field-types.md) | Field types, validation, UI configuration |
| [Relationships](./shards/relationships.md) | Knowledge graph relationships |
| [Roadmap](./shards/roadmap.md) | Feature roadmap |

### 📚 API Documentation

| Document | Description |
|----------|-------------|
| [API Overview](./api/README.md) | REST & GraphQL API overview |
| [Backend API](./backend/API.md) | Backend API reference |
| [Bulk Operations API](./api/bulk-operations-api.md) | Bulk document operations endpoints |
| [Bulk Operations Quick Reference](./api/bulk-operations-quick-reference.md) | Quick reference for bulk operations |
| [Role Management API](./api/role-management-api-reference.md) | Role management API reference |

### 🔐 Security & Authentication

| Document | Description |
|----------|-------------|
| [Authentication Guide](./guides/authentication.md) | Auth flows, OAuth, MFA, Magic Links |
| [User Groups](./guides/user-groups.md) | Groups, SSO sync, permissions |
| [Session Management](./guides/session-management.md) | Session handling |

### 🗄️ Database & Data Management

| Document | Description |
|----------|-------------|
| [Shards System](./shards/README.md) | Schema-driven data system |
| [Core Types](./shards/core-types/) | Built-in ShardType definitions |
| [Document Management](./document-management/document-management.md) | Document management system |
| [Document Management UI](./document-management/UI-COMPONENTS-AND-PAGES.md) | Document management UI components |

### 🔄 Caching & Performance

| Document | Description |
|----------|-------------|
| [Caching Strategy](./guides/caching.md) | Redis caching strategy |

### 📋 Feature Guides

| Document | Description |
|----------|-------------|
| [Dashboard System](./features/dashboard/README.md) | Customizable dashboards with widgets |
| [Content Generation](./features/content-generation/README.md) | AI-powered content generation |
| [Embedding Processor](./features/embedding-processor/README.md) | Vector embeddings |
| [Integrations](./features/integrations/SPECIFICATION.md) | Third-party integrations, sync tasks, conversion schemas |
| [AI Insights](./features/ai-insights/README.md) | Intelligent insights with grounding, citations |
| [Web Search Quick Start](./guides/web-search-quick-start.md) | Web search integration guide |

### 🤖 AI Features

| Document | Description |
|----------|-------------|
| [AI Features Guide](./guides/ai-features.md) | AI model catalog, connections, and Key Vault integration |
| [AI Insights Features](./features/ai-insights/README.md) | AI insights and grounding features |
| [AI Insights API](./features/ai-insights/API.md) | AI insights API reference |
| [Context Assembly](./features/ai-insights/CONTEXT-ASSEMBLY.md) | Context assembly for AI insights |
| [Grounding](./features/ai-insights/GROUNDING.md) | Grounding and citation system |
| [Embedding Templates](./features/ai-insights/embeddings/README.md) | Template-driven vector embeddings system |

### 🎛️ Admin & Operations

| Document | Description |
|----------|-------------|
| [Tenant Settings](./guides/tenant-settings.md) | Fiscal year, dashboard config |
| [Super Admin Catalog](./guides/super-admin-catalog-guide.md) | Super admin integration catalog |
| [Audit Logging Verification](./guides/audit-logging-verification.md) | Audit logging setup and verification |

### 🚀 Deployment & Operations

| Document | Description |
|----------|-------------|
| [Deployment Guide](./guides/deployment.md) | Production deployment |
| [Deployment - Bulk Operations](./guides/deployment-bulk-operations.md) | Bulk operations deployment guide |

### 🛠️ Infrastructure Setup

| Document | Description |
|----------|-------------|
| [Azure AD B2C](./setup/azure-ad-b2c.md) | Identity provider setup |
| [Azure Key Vault](./setup/azure-key-vault.md) | Secrets management |
| [Redirect URIs](./setup/redirect-uris.md) | OAuth callback URLs |

### 🛠️ Development Standards

| Document | Description |
|----------|-------------|
| [Error Handling Standard](./development/ERROR_HANDLING_STANDARD.md) | **Standardized error handling patterns for all controllers** |
| [Input Validation Standard](./development/INPUT_VALIDATION_STANDARD.md) | **Standardized input validation patterns and security guidelines** |
| [Route Registration Dependencies](./ROUTE_REGISTRATION_DEPENDENCIES.md) | **Complete reference for API route dependencies** |
| [Quick Reference](./development/QUICK_REFERENCE.md) | **Quick lookup guide for error handling and validation patterns** |
| [Environment Variables](./development/ENVIRONMENT_VARIABLES.md) | Environment variable configuration |
| [Build Verification](./development/BUILD_VERIFICATION.md) | Build verification procedures |

### 🎨 Frontend Development

| Document | Description |
|----------|-------------|
| [Frontend Guide](./frontend/README.md) | Frontend development overview |
| [Component Standards](./guides/component-standards.md) | Widget-compatible components, DataTable |

### 👥 User Guides

| Document | Description |
|----------|-------------|
| [Shard Types](./user-guide/shard-types.md) | End-user shard types guide |

---

## 📁 Documentation Structure

```
docs/
├── README.md                    # Main documentation index
├── INDEX.md                     # This file - comprehensive index
├── ARCHITECTURE.md              # System architecture
├── DEVELOPMENT.md               # Development setup
├── MIGRATION_TURBOREPO.md       # Turborepo migration
├── ROUTE_REGISTRATION_DEPENDENCIES.md # API route dependencies reference
│
├── guides/                      # How-to guides
│   ├── authentication.md
│   ├── user-groups.md
│   ├── tenant-settings.md
│   ├── component-standards.md
│   ├── caching.md
│   ├── deployment.md
│   ├── deployment-bulk-operations.md
│   ├── session-management.md
│   ├── web-search-quick-start.md
│   ├── ai-features.md
│   ├── audit-logging-verification.md
│   └── super-admin-catalog-guide.md
│
├── development/                  # Development standards
│   ├── QUICK_REFERENCE.md        # Quick lookup guide
│   ├── ERROR_HANDLING_STANDARD.md
│   ├── INPUT_VALIDATION_STANDARD.md
│   ├── ENVIRONMENT_VARIABLES.md
│   ├── BUILD_VERIFICATION.md
│   └── HYBRID_LOCAL_AZURE_SETUP.md
│
├── setup/                       # Infrastructure setup
│   ├── azure-ad-b2c.md
│   ├── azure-key-vault.md
│   └── redirect-uris.md
│
├── api/                         # API documentation
│   ├── README.md
│   ├── bulk-operations-api.md
│   ├── bulk-operations-quick-reference.md
│   └── role-management-api-reference.md
│
├── backend/                     # Backend documentation
│   ├── README.md
│   └── API.md
│
├── shards/                      # Shards system
│   ├── README.md
│   ├── base-schema.md
│   ├── relationships.md
│   ├── roadmap.md
│   ├── field-types.md
│   └── core-types/
│
├── features/                    # Feature specifications
│   ├── dashboard/
│   ├── content-generation/
│   ├── embedding-processor/
│   ├── integrations/
│   └── ai-insights/
│
├── frontend/                     # Frontend documentation
│   └── README.md
│
├── document-management/         # Document management
│   ├── document-management.md
│   └── UI-COMPONENTS-AND-PAGES.md
│
├── user-guide/                  # End-user documentation
│   └── shard-types.md
│
└── archive/                     # Historical documents
    ├── completed-tasks/
    ├── legacy-todos/
    ├── progress-reports/
    ├── session-summaries/
    └── task-completions/
```

---

## 🔍 Documentation by Audience

### For Developers

- [README.md](./README.md) - Getting started
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Development Guide](./DEVELOPMENT.md) - Setup instructions
- [API Reference](./backend/API.md) - Backend API
- [Frontend Guide](./frontend/README.md) - React development
- [Component Standards](./guides/component-standards.md) - UI components
- [Error Handling Standard](./development/ERROR_HANDLING_STANDARD.md) - **Error handling patterns**
- [Input Validation Standard](./development/INPUT_VALIDATION_STANDARD.md) - **Validation patterns**
- [Route Dependencies](./ROUTE_REGISTRATION_DEPENDENCIES.md) - **API route dependencies**

### For API Consumers

- [Bulk Operations API](./api/bulk-operations-api.md) - Complete API spec
- [Bulk Operations Quick Reference](./api/bulk-operations-quick-reference.md) - Quick start
- [Backend API](./backend/API.md) - All endpoints
- [Role Management API](./api/role-management-api-reference.md) - Role management

### For DevOps/Operations

- [Deployment Guide](./guides/deployment.md) - Production setup
- [Deployment - Bulk Operations](./guides/deployment-bulk-operations.md) - Bulk ops deployment
- [Azure Key Vault Setup](./setup/azure-key-vault.md) - Secrets management
- [Azure AD B2C Setup](./setup/azure-ad-b2c.md) - Identity provider

### For Architects

- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Shards System](./shards/README.md) - Data architecture
- [Base Schema](./shards/base-schema.md) - Schema definition
- [Relationships](./shards/relationships.md) - Knowledge graph

### For Product Managers

- [Features Overview](./features/) - All feature specifications
- [Shards Roadmap](./shards/roadmap.md) - Feature roadmap
- [Dashboard System](./features/dashboard/README.md) - Dashboard features
- [AI Insights](./features/ai-insights/README.md) - AI features

---

## 🔗 Cross-References

### Bulk Operations Documentation Chain

1. Start → [Bulk Operations Quick Reference](./api/bulk-operations-quick-reference.md)
2. Details → [Bulk Operations API](./api/bulk-operations-api.md)
3. Deployment → [Deployment - Bulk Operations](./guides/deployment-bulk-operations.md)

### AI Features Documentation Chain

1. Overview → [AI Features Guide](./guides/ai-features.md)
2. Insights → [AI Insights Features](./features/ai-insights/README.md)
3. API → [AI Insights API](./features/ai-insights/API.md)
4. Setup → [Azure Key Vault Setup](./setup/azure-key-vault.md)

### Authentication Documentation Chain

1. Overview → [Authentication Guide](./guides/authentication.md)
2. User Groups → [User Groups Guide](./guides/user-groups.md)
3. Session Management → [Session Management](./guides/session-management.md)
4. Setup → [Azure AD B2C Setup](./setup/azure-ad-b2c.md)

---

## 📦 Archived Documentation

Historical documentation has been moved to the [`archive/`](./archive/) directory:

- **Progress Reports** (`archive/progress-reports/`) - Old project status and progress updates
- **Session Summaries** (`archive/session-summaries/`) - Session completion reports
- **Task Completions** (`archive/task-completions/`) - Task completion records
- **Legacy TODOs** (`archive/legacy-todos/`) - Old TODO lists and feature requests
- **Completed Tasks** (`archive/completed-tasks/`) - Completed work documentation

For current, active documentation, refer to the sections above.

---

## 📝 Contributing to Documentation

When adding documentation:

1. **Place files in the appropriate folder** (see structure above)
2. **Use lowercase-kebab-case** for filenames (e.g., `my-feature.md`)
3. **Update this INDEX.md** if adding new major sections
4. **Update README.md** if adding new guides or features
5. **Include a table of contents** for long documents

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Guides | `topic.md` | `authentication.md` |
| Setup | `service-name.md` | `azure-ad-b2c.md` |
| Features | `README.md` in folder | `features/integrations/README.md` |
| ShardTypes | `c_typename.md` | `c_contact.md` |

---

**Last Updated**: January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Documentation index fully maintained

#### Implemented Features (✅)

- ✅ Comprehensive documentation index
- ✅ Categorized documentation
- ✅ Quick navigation
- ✅ File naming conventions

#### Known Limitations

- ⚠️ **Index Maintenance** - Index may need regular updates
  - **Recommendation:**
    1. Update index when adding new documentation
    2. Verify all links are valid
    3. Keep index current

- ⚠️ **Link Verification** - Some links may be broken
  - **Recommendation:**
    1. Verify all documentation links
    2. Fix broken links
    3. Add link validation

### Related Documentation

- [Gap Analysis](./GAP_ANALYSIS.md) - Comprehensive gap analysis
- [README](./README.md) - Main documentation index
