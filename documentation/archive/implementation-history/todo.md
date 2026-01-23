# MCP Server Module

## Specification Documents

- [Part 1: Core Specification](./mcp-server-specification-part1.md) - Overview, Architecture, Data Models, Capability Taxonomy, Catalog, Transport & Protocol, Secret Integration, Module Integration
- [Part 2: Security, UI & Implementation](./mcp-server-specification-part2.md) - Security & Sandboxing, Health & Monitoring, API Endpoints, UI Views, Configuration Reference, Implementation Guidelines

---

## Architecture

> **Container**: MCP Server runs as an independent container with REST API + RabbitMQ (publisher)
> 
> **Database**: Shared Cosmos DB NoSQL database - `mcp` container
> 
> See: [Architecture Document](../architecture.md)

---

## Dependencies

| Module | Purpose |
|--------|---------|
| **[Secret Management Module](../Secret%20Management/todo.md)** | Centralized secret storage for MCP server authentication (API keys, OAuth tokens, etc.) |
| **AI Service** | LLM integration for AI-powered tool operations |

---

## Core Requirements

- ✅ Super Admin must be able to fully manage the default MCP server catalog (CRUD)
- ✅ Organization Admin must be able to add custom MCP servers
- ✅ Organization Admin must be able to toggle the use of MCP Servers and toggle individual MCP servers
- ✅ The MCP Server module must be the central point for other modules to leverage MCP servers (Planning Module, Code Generation Module, Knowledge Base Module, Agent System, etc.)

---

## Implementation Status

- [ ] Phase 1: Core Infrastructure (Database, Registry, Transports)
- [ ] Phase 2: Catalog & Management (APIs, UI)
- [ ] Phase 3: Security & Access Control (Sandbox, Rate Limiting, Audit)
- [ ] Phase 4: Module Integration (MCPClient, Routing)
- [ ] Phase 5: Health & Analytics
- [ ] Phase 6: UI Completion
- [ ] Phase 7: Polish & Testing
