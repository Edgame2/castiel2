# Global Architecture Documentation

## Overview

This directory contains comprehensive global documentation for the Coder IDE system, covering the overall architecture, system purpose, module overviews, data flows, technology stack, and deployment architecture.

## Documentation Files

### [Architecture.md](./Architecture.md)
Comprehensive architecture documentation covering:
- Three-tier architecture overview
- Microservices architecture
- Layer interactions and component relationships
- Infrastructure components
- Communication patterns
- Database architecture
- Security architecture
- Scalability considerations

### [SystemPurpose.md](./SystemPurpose.md)
System purpose and goals:
- What is Coder IDE?
- Core mission and vision
- Key capabilities
- Target users and use cases
- Value proposition
- Design principles

### [ModuleOverview.md](./ModuleOverview.md)
High-level purpose of each module:
- Frontend modules (16 modules)
- Core modules (36 modules)
- Backend modules (9 modules)
- Microservices (21 modules)
- Main process modules (3 modules)
- Module relationships and dependencies

### [DataFlow.md](./DataFlow.md)
Data flows and communication patterns:
- Request/response flows
- Event-driven communication (RabbitMQ)
- IPC communication (Electron)
- Database access patterns
- Cache usage
- Inter-service communication
- Data synchronization

### [TechnologyStack.md](./TechnologyStack.md)
Technology stack and dependencies:
- Frontend technologies
- Backend technologies
- Database and storage
- Message queues
- Development tools
- Deployment technologies

### [Deployment.md](./Deployment.md)
Deployment architecture:
- Docker Compose setup
- Service dependencies
- Port assignments
- Environment variables
- Scaling considerations
- Production deployment

## System at a Glance

Coder IDE is an **AI-powered Integrated Development Environment** with:

- **Architecture**: Three-tier (Client, API Gateway, Microservices)
- **Microservices**: 20+ independent services
- **Communication**: REST APIs + RabbitMQ event bus
- **Database**: Shared PostgreSQL with prefixed tables
- **Frontend**: Electron + React 19 + Monaco Editor
- **Backend**: Fastify API Server + Microservices
- **Authentication**: Google OAuth 2.0 + JWT
- **Access Control**: Role-Based Access Control (RBAC)

## Quick Navigation

- **Module-Specific Documentation**: [../modules/](../modules/)
- **Main Documentation Index**: [../README.md](../README.md)
- **Documentation Status**: [../DOCUMENTATION_STATUS.md](../DOCUMENTATION_STATUS.md)

## Architecture Highlights

### Three-Tier Architecture

1. **Client Layer** - Electron desktop application
2. **API Gateway** - Main application (Port 3000)
3. **Microservices** - 20+ independent services (Ports 3001-3020)

### Key Principles

1. **Shared Database**: Single PostgreSQL database with prefixed tables
2. **Event-Driven**: RabbitMQ for async communication
3. **REST API**: Synchronous requests for CRUD operations
4. **Secret Management**: Centralized secret storage
5. **API Gateway**: Single entry point for all requests
6. **Single Responsibility**: Each service handles one domain
7. **Loose Coupling**: Services communicate via well-defined APIs
8. **Data Integrity**: Foreign keys across modules

## Related Documentation

- [Module Documentation](../modules/) - Detailed module documentation
- [Setup Guide](../../SETUP_GUIDE.md) - Setup instructions
- [Docker Setup](../../DOCKER_SETUP.md) - Docker deployment
