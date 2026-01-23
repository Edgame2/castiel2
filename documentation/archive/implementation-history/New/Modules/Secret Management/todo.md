# Secret Management Module

## Specification Documents

- [Part 1: Core Specification](./secret-management-specification-part1.md) - Overview, Architecture, Data Models, Secret Types, Storage Backends, Scoping & Ownership, Access Control
- [Part 2: Lifecycle, Integration & UI](./secret-management-specification-part2.md) - Lifecycle Management, Integration Pattern, Audit & Compliance, Import/Export, API Endpoints, UI Views, Encryption & Security, Implementation Guidelines

---

## Architecture

> **Container**: Secret Management runs as an independent container with REST API only
> 
> **Database**: Shared PostgreSQL database - tables prefixed with `secret_`
> 
> **Foundation**: All other containers depend on Secret Management for credential storage
> 
> See: [Architecture Document](../architecture.md)

---

## Core Requirements

- ✅ Centralized secret storage for all modules (MCP Servers, LLM Models, Cloud Integrations, Git Providers, etc.)
- ✅ Multiple storage backends (Local Encrypted, Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager)
- ✅ Hierarchical scoping (Global, Organization, Team, Project, User)
- ✅ Role-based access control for secret management
- ✅ Lifecycle management (expiration, rotation, versioning, soft delete)
- ✅ Comprehensive audit logging for compliance
- ✅ Import/Export capabilities (.env files, JSON, migration between backends)

---

## Consumer Modules

| Module | Usage |
|--------|-------|
| MCP Servers | API keys, OAuth tokens for MCP server authentication |
| LLM Models | OpenAI, Anthropic, Azure OpenAI API keys |
| Cloud Integrations | Azure, AWS, GCP service credentials |
| Git Providers | GitHub, GitLab, Bitbucket tokens |
| Database Connections | Connection strings, credentials |
| CI/CD Integrations | Pipeline tokens, deployment credentials |
| Environment Management | Environment-specific secrets |

---

## Implementation Status

- [ ] Phase 1: Core Infrastructure (Database, Local Backend, Encryption)
- [ ] Phase 2: Access Control & Scoping
- [ ] Phase 3: Lifecycle Management (Expiration, Rotation, Versioning)
- [ ] Phase 4: External Vault Integration (Azure, AWS, HashiCorp, GCP)
- [ ] Phase 5: Import/Export & Migration
- [ ] Phase 6: Audit & Compliance
- [ ] Phase 7: UI & Polish

