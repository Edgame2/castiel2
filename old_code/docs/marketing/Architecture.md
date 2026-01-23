# Castiel Architecture

**Enterprise-grade, cloud-native architecture built for scale, security, and intelligence**

---

## Overview

Castiel is built on a modern, cloud-native architecture that combines the best of both worlds: a powerful, flexible application layer and enterprise-grade Azure infrastructure. This architecture enables Castiel to deliver AI-native business intelligence at scale while maintaining security, performance, and reliability.

**Architecture Principles**:
- **Cloud-Native**: Built on Azure from the ground up, leveraging managed services
- **API-First**: All functionality exposed via REST and GraphQL APIs
- **Event-Driven**: Real-time processing with events and message queues
- **Multi-Tenant**: Built for SaaS from day one with strict tenant isolation
- **Scalable**: Horizontal scaling without architectural changes
- **Secure**: End-to-end encryption, RBAC, and comprehensive audit logging

---

## Application Architecture

### Monorepo Structure

Castiel uses a **Turborepo monorepo** structure that enables code sharing, consistent tooling, and efficient builds across the entire platform.

```
castiel/
├── apps/                          # Application services
│   ├── api/                       # Backend API (Fastify + TypeScript)
│   └── web/                       # Frontend (Next.js 16 + React 19)
│
├── packages/                      # Shared libraries
│   ├── azure-ad-b2c/              # Azure AD B2C integration
│   ├── key-vault/                 # Azure Key Vault wrapper
│   ├── monitoring/                # Azure App Insights wrapper
│   ├── redis-utils/               # Redis utilities
│   ├── shared-types/              # Shared TypeScript types
│   └── shared-utils/              # Shared utility functions
│
├── terraform/                     # Infrastructure as Code
├── docs/                          # Documentation
└── scripts/                       # Utility scripts
```

**Benefits**:
- **Code Reuse**: Shared types and utilities across frontend and backend
- **Consistency**: Single source of truth for types and configurations
- **Efficiency**: Parallel builds and caching with Turborepo
- **Maintainability**: Easier to manage dependencies and updates

---

### Frontend Architecture

**Technology Stack**:
- **Next.js 16**: React framework with App Router for optimal performance
- **React 19**: Modern UI library with concurrent features
- **TypeScript 5**: Type-safe development
- **TailwindCSS 4**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible component library
- **TanStack Query**: Server state management with automatic caching

**Architecture Highlights**:

**App Router Structure**:
```
apps/web/src/app/
├── (auth)/                 # Authentication pages
│   ├── login/
│   ├── register/
│   └── mfa/
├── (protected)/            # Authenticated pages
│   ├── dashboard/
│   ├── shards/
│   └── admin/
└── api/                    # API routes (BFF pattern)
```

**Key Features**:
- **Server Components by Default**: Minimize client-side JavaScript for better performance
- **API Routes (BFF)**: Backend-for-Frontend pattern for secure API calls
- **Route Groups**: Organize routes without affecting URL structure
- **Middleware**: Authentication and authorization at the edge

**Component Architecture**:
- **Widget-Compatible Components**: All reusable components work as both standalone components and dashboard widgets
- **shadcn/ui Base**: Extensible component library built on Radix UI primitives
- **Type Safety**: Full TypeScript coverage with shared types from packages

**Performance Optimizations**:
- **Automatic Code Splitting**: Next.js automatically splits code by route
- **Image Optimization**: Built-in image optimization and lazy loading
- **Static Generation**: Pre-render pages where possible
- **React Query Caching**: Intelligent caching reduces API calls

**Why it's unique**: Castiel's frontend architecture prioritizes performance and developer experience. The widget-compatible component system ensures maximum reusability, while the App Router provides optimal performance out of the box.

---

### Backend Architecture

**Technology Stack**:
- **Fastify 4**: High-performance HTTP server (2x faster than Express)
- **TypeScript 5**: Type-safe backend development
- **Mercurius**: GraphQL integration for Fastify
- **Azure Cosmos DB**: NoSQL database with vector search
- **Azure Redis**: Distributed caching and session management

**Architecture Pattern**:

```
Request Flow:
Client Request
    │
    ▼
┌─────────────────┐
│  Rate Limiter   │ ── Exceeds limit? → 429 Too Many Requests
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Auth Middleware│ ── Invalid token? → 401 Unauthorized
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Tenant Context │ ── Set tenantId from token
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Controller     │ ── Validate input, call service
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Service        │ ── Business logic
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Repository     │ ── Data access (Cosmos DB)
└─────────────────┘
    │
    ▼
Response
```

**Layered Architecture**:

1. **Controllers**: HTTP request handlers, input validation
2. **Services**: Business logic, orchestration
3. **Repositories**: Data access layer, Cosmos DB queries
4. **Middleware**: Authentication, rate limiting, tenant context

**API Capabilities**:
- **REST API**: Comprehensive REST endpoints for all operations
- **GraphQL API**: Flexible querying with DataLoaders for efficient batching
- **WebSocket Support**: Real-time updates for dashboards and notifications
- **Webhook System**: Event notifications for external systems

**Key Features**:
- **Multi-Tenant Isolation**: Every request scoped by tenantId
- **Repository Pattern**: Clean separation of data access logic
- **Service Layer**: Reusable business logic across controllers
- **Type Safety**: End-to-end TypeScript with shared types

**Why it's unique**: Castiel's backend architecture balances performance (Fastify) with developer experience (TypeScript, clean architecture). The multi-tenant design ensures strict data isolation while maintaining code simplicity.

---

## Azure Infrastructure Architecture

Castiel is built entirely on **Microsoft Azure**, leveraging managed services for reliability, security, and scalability.

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AZURE CLOUD                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  App Services    │         │  Azure Functions   │            │
│  │                  │         │                  │            │
│  │  • Main API      │         │  • Sync Workers   │            │
│  │  • Frontend      │         │  • Embedding      │            │
│  │  • Auto-scaling  │         │    Processor      │            │
│  └────────┬─────────┘         └────────┬──────────┘            │
│           │                            │                        │
│           │                            │                        │
│  ┌────────▼────────────────────────────▼──────────┐            │
│  │         Virtual Network (VNet)                 │            │
│  │  ┌────────────┐  ┌────────────┐               │            │
│  │  │ App Subnet │  │ Redis      │               │            │
│  │  │            │  │ Subnet     │               │            │
│  │  └────────────┘  └────────────┘               │            │
│  └────────────────────────────────────────────────┘            │
│           │                            │                        │
│           │                            │                        │
│  ┌────────▼──────────┐      ┌─────────▼──────────┐            │
│  │  Azure Cosmos DB  │      │  Azure Redis Cache │            │
│  │                   │      │                    │            │
│  │  • Multi-region   │      │  • Standard C2     │            │
│  │  • Serverless     │      │  • Replication     │            │
│  │  • Vector Search  │      │  • Backups         │            │
│  └───────────────────┘      └────────────────────┘            │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Azure Key Vault │         │  App Insights    │            │
│  │                  │         │                  │            │
│  │  • Secrets       │         │  • Monitoring    │            │
│  │  • Certificates  │         │  • Logging       │            │
│  │  • Managed       │         │  • Alerts        │            │
│  │    Identity      │         │                  │            │
│  └──────────────────┘         └──────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Core Azure Services

#### 1. Azure App Service

**Purpose**: Hosts the main API and frontend applications

**Configuration**:
- **Plan**: Premium P1v3 (production) or Basic B2 (development)
- **Runtime**: Node.js 20 LTS
- **OS**: Linux
- **Auto-scaling**: Enabled based on CPU and memory metrics
- **Deployment Slots**: Staging and production slots for zero-downtime deployments

**Features**:
- **Managed Identity**: No credentials needed for Azure services
- **Health Checks**: Automatic health monitoring and restart
- **HTTPS Only**: All traffic encrypted
- **Custom Domains**: Support for custom domains with SSL
- **Always On**: Prevents cold starts (production)

**Benefits**:
- **Zero Infrastructure Management**: Azure handles patching, scaling, and monitoring
- **High Availability**: Built-in redundancy and failover
- **Cost-Effective**: Pay only for what you use with auto-scaling
- **Easy Deployment**: Git-based or CI/CD deployment

---

#### 2. Azure Cosmos DB

**Purpose**: Primary database for all application data

**Configuration**:
- **API**: SQL API (DocumentDB)
- **Consistency**: Session consistency (optimal for multi-tenant)
- **Multi-Region**: Primary (East US) and Secondary (West US 2) for production
- **Serverless Mode**: Automatic scaling based on demand
- **Backup**: Continuous backup with 30-day retention

**Containers**:
- `users`: User accounts (partitioned by tenantId)
- `tenants`: Tenant configuration
- `shards`: Core data entities (partitioned by tenantId)
- `shard-types`: ShardType definitions
- `shard-relationships`: Graph relationships
- `audit-logs`: Audit trail

**Key Features**:
- **Hierarchical Partition Keys (HPK)**: Optimized for multi-tenant queries
- **Vector Search**: Built-in vector indexing for semantic search
- **Global Distribution**: <10ms latency with multi-region deployment
- **Automatic Scaling**: Serverless mode scales automatically
- **Point-in-Time Recovery**: Restore to any point in the last 30 days

**Benefits**:
- **Unlimited Scale**: Handles billions of documents
- **Low Latency**: Single-digit millisecond reads and writes
- **High Availability**: 99.999% SLA with multi-region
- **No Schema Management**: Flexible document model
- **Cost-Effective**: Pay per operation with serverless mode

**Why it's unique**: Cosmos DB's combination of global distribution, vector search, and serverless scaling makes it ideal for Castiel's multi-tenant, AI-powered architecture. The HPK pattern ensures optimal performance for tenant-scoped queries.

---

#### 3. Azure Cache for Redis

**Purpose**: Distributed caching, session management, and pub/sub

**Configuration**:
- **Tier**: Standard C2 (2.5GB memory)
- **Replication**: Built-in replication for high availability
- **Persistence**: Disabled (cache-only, can rebuild from DB)
- **Network**: VNet integration for security
- **Backup**: Automated backups (production)

**Use Cases**:
- **Session Storage**: User sessions and refresh tokens
- **Data Caching**: Shard data, query results
- **Rate Limiting**: API rate limit tracking
- **Pub/Sub**: Real-time notifications and updates

**Key Features**:
- **High Performance**: Sub-millisecond latency
- **Replication**: Automatic replication for availability
- **VNet Integration**: Network isolation for security
- **LRU Eviction**: Automatic eviction when memory full

**Benefits**:
- **Performance**: Reduces database load with intelligent caching
- **Scalability**: Handles high read traffic
- **Reliability**: Replication ensures availability
- **Cost-Effective**: Reduces Cosmos DB RU consumption

---

#### 4. Azure Key Vault

**Purpose**: Centralized secrets management

**Stored Secrets**:
- Cosmos DB connection strings
- Redis connection strings
- JWT signing secrets
- OAuth provider secrets (Google, GitHub, Microsoft)
- Email service API keys
- Azure AD B2C client secrets
- SAML certificates for enterprise SSO

**Key Features**:
- **Managed Identity**: No credentials in code or configuration
- **Automatic Rotation**: Support for secret rotation
- **Access Policies**: Fine-grained access control
- **Audit Logging**: Complete audit trail of secret access
- **Soft Delete**: Protection against accidental deletion

**Benefits**:
- **Security**: No secrets in code or environment variables
- **Compliance**: Meets security and compliance requirements
- **Centralized Management**: Single source of truth for secrets
- **Audit Trail**: Complete visibility into secret access

---

#### 5. Azure Application Insights

**Purpose**: Application performance monitoring and logging

**Features**:
- **Performance Monitoring**: Request duration, dependency tracking
- **Error Tracking**: Exception logging and alerting
- **Custom Metrics**: Business metrics and KPIs
- **Distributed Tracing**: End-to-end request tracing
- **Log Analytics**: Centralized logging with query capabilities

**Key Metrics Tracked**:
- Request duration (P50, P95, P99)
- Error rate by endpoint
- Active sessions count
- Database RU consumption
- Cache hit/miss ratio
- API response times

**Benefits**:
- **Visibility**: Complete visibility into application health
- **Proactive Alerts**: Get notified before users are affected
- **Performance Optimization**: Identify bottlenecks quickly
- **Compliance**: Complete audit trail for compliance

---

#### 6. Azure Functions

**Purpose**: Serverless compute for background tasks and integrations

**Use Cases**:
- **Sync Workers**: Integration synchronization
- **Embedding Processor**: Vector embedding generation
- **Content Generation**: Document generation workers
- **Scheduled Tasks**: Cron-based background jobs

**Benefits**:
- **Cost-Effective**: Pay only for execution time
- **Automatic Scaling**: Scales automatically with demand
- **Event-Driven**: Triggered by events or schedules
- **No Infrastructure**: Fully managed serverless compute

---

### Networking Architecture

**Virtual Network (VNet)**:
- **Address Space**: 10.0.0.0/16
- **Subnets**:
  - **App Services Subnet**: Application services
  - **Redis Subnet**: Redis cache
  - **Private Endpoints Subnet**: Private endpoints for Azure services

**Network Security**:
- **VNet Integration**: App Services connected to VNet
- **Private Endpoints**: Cosmos DB and Key Vault accessible via private endpoints
- **Network Isolation**: Services isolated in separate subnets
- **No Public IPs**: Internal services not exposed to internet

**Benefits**:
- **Security**: Network-level isolation
- **Performance**: Lower latency with private endpoints
- **Compliance**: Meets enterprise security requirements

---

### Security Architecture

**Multi-Layer Security**:

1. **Network Security**:
   - VNet isolation
   - Private endpoints
   - Network security groups

2. **Identity & Access**:
   - Azure AD B2C for user authentication
   - Managed Identity for service-to-service auth
   - RBAC for authorization
   - JWT tokens for API authentication

3. **Data Security**:
   - Encryption at rest (Cosmos DB, Key Vault)
   - Encryption in transit (TLS 1.2+)
   - Tenant isolation at database level
   - Field-level encryption support

4. **Secrets Management**:
   - Azure Key Vault for all secrets
   - No secrets in code or configuration
   - Automatic rotation support

5. **Audit & Compliance**:
   - Complete audit trail in Application Insights
   - Audit logs stored in Cosmos DB
   - Compliance-ready (GDPR, SOC 2)

**Why it's unique**: Castiel's security architecture follows defense-in-depth principles with multiple layers of security. The use of Managed Identity eliminates credential management, while tenant isolation ensures data separation at every level.

---

### Scalability & Performance

**Horizontal Scaling**:
- **App Services**: Auto-scaling based on CPU, memory, and request metrics
- **Cosmos DB**: Serverless mode automatically scales based on demand
- **Redis**: Can scale up to larger tiers as needed
- **Azure Functions**: Automatically scales with demand

**Performance Optimizations**:
- **Caching**: Redis caching reduces database load
- **CDN**: Static assets served via CDN (future)
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized Cosmos DB queries with proper indexing

**Multi-Region Deployment**:
- **Primary Region**: East US
- **Secondary Region**: West US 2 (production)
- **Automatic Failover**: Cosmos DB automatic failover
- **Low Latency**: <10ms latency with global distribution

**Benefits**:
- **Elastic Scale**: Handles traffic spikes automatically
- **Global Performance**: Low latency worldwide
- **High Availability**: Multi-region redundancy
- **Cost Optimization**: Pay only for what you use

---

## Data Architecture

### Cosmos DB Data Model

**Partition Strategy**:
- **Partition Key**: `/tenantId` for multi-tenant isolation
- **Hierarchical Partition Keys (HPK)**: Optimized for tenant-scoped queries
- **Query Performance**: All queries include tenantId for optimal performance

**Container Structure**:
```
Cosmos DB Account
└── Database: castiel
    ├── Container: users (partition: /tenantId)
    ├── Container: tenants (partition: /id)
    ├── Container: shards (partition: /tenantId)
    ├── Container: shard-types (partition: /tenantId)
    ├── Container: shard-relationships (partition: /tenantId)
    └── Container: audit-logs (partition: /tenantId)
```

**Indexing Strategy**:
- **Automatic Indexing**: All paths indexed by default
- **Composite Indexes**: For complex queries
- **Vector Indexes**: For semantic search
- **Excluded Paths**: Large fields excluded from indexing

**Why it's unique**: Cosmos DB's flexible document model combined with HPK enables Castiel's unique Shard architecture. The ability to store relationships, vectors, and structured data in a single container simplifies the data model while maintaining performance.

---

### Caching Strategy

**Redis Cache Layers**:

1. **Session Cache**:
   - User sessions
   - Refresh tokens
   - MFA challenges
   - TTL: 7 days (sessions), 5 minutes (MFA)

2. **Data Cache**:
   - Shard data
   - Query results
   - User data
   - TTL: 1 hour (configurable)

3. **Rate Limiting**:
   - API rate limit counters
   - TTL: 1 minute

4. **OAuth State**:
   - OAuth CSRF protection
   - TTL: 10 minutes

**Cache Invalidation**:
- **Automatic**: TTL-based expiration
- **Manual**: Invalidate on updates
- **Pattern-Based**: Invalidate by key pattern

**Benefits**:
- **Performance**: Reduces database load by 60-80%
- **Cost**: Reduces Cosmos DB RU consumption
- **Scalability**: Handles high read traffic
- **User Experience**: Faster response times

---

## Integration Architecture

### Event-Driven Architecture

**Event Flow**:
```
Data Change (Cosmos DB)
    │
    ▼
┌─────────────────┐
│  Change Feed    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Event Grid     │ ── Route events
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Service │ │Azure   │
│Bus     │ │Function│
└────────┘ └────────┘
```

**Event Types**:
- **Shard Created/Updated**: Triggers embedding generation
- **Integration Sync**: Triggers sync workers
- **Notification Events**: Triggers notification delivery
- **Webhook Events**: Triggers external webhooks

**Benefits**:
- **Decoupling**: Services communicate via events
- **Scalability**: Process events asynchronously
- **Reliability**: Event Grid ensures delivery
- **Flexibility**: Easy to add new event handlers

---

### API Architecture

**REST API**:
- **Base URL**: `https://api.castiel.com`
- **Versioning**: `/api/v1/`
- **Authentication**: JWT Bearer tokens
- **Rate Limiting**: Per-user and per-tenant limits
- **Pagination**: Cursor-based pagination

**GraphQL API**:
- **Endpoint**: `/graphql`
- **Authentication**: JWT Bearer tokens
- **DataLoaders**: Efficient batching and caching
- **Subscriptions**: Real-time updates (future)

**WebSocket API**:
- **Endpoint**: `wss://api.castiel.com/ws`
- **Use Cases**: Real-time dashboard updates, notifications
- **Authentication**: JWT token in connection handshake

**Benefits**:
- **Flexibility**: REST for simple operations, GraphQL for complex queries
- **Performance**: GraphQL reduces over-fetching
- **Real-Time**: WebSocket for live updates
- **Developer Experience**: Type-safe APIs with TypeScript SDK

---

## Deployment Architecture

### Infrastructure as Code

**Terraform**:
- **All Infrastructure**: Defined in Terraform
- **Version Controlled**: Infrastructure changes tracked in Git
- **Environment-Specific**: Separate configs for dev, staging, production
- **Automated**: CI/CD pipeline applies changes

**Terraform Structure**:
```
terraform/
├── main.tf              # Provider, variables, locals
├── network.tf           # VNet and subnets
├── app-services.tf      # App Service Plan and Apps
├── cosmos-db.tf         # Cosmos DB account and containers
├── redis.tf             # Redis cache
├── key-vault.tf         # Key Vault
├── monitoring.tf        # Application Insights
└── outputs.tf           # Resource outputs
```

**Benefits**:
- **Reproducibility**: Same infrastructure across environments
- **Version Control**: Track infrastructure changes
- **Automation**: Deploy infrastructure automatically
- **Disaster Recovery**: Recreate infrastructure quickly

---

### CI/CD Pipeline

**Deployment Flow**:
```
Code Commit
    │
    ▼
┌─────────────────┐
│  GitHub Actions │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Build  │ │ Test   │
└────────┘ └────────┘
    │
    ▼
┌─────────────────┐
│  Deploy to      │
│  Staging Slot   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Test   │ │ Approve│
└────────┘ └────────┘
    │
    ▼
┌─────────────────┐
│  Swap to        │
│  Production     │
└─────────────────┘
```

**Features**:
- **Zero-Downtime**: Deployment slots enable zero-downtime deployments
- **Automated Testing**: Run tests before deployment
- **Rollback**: Quick rollback to previous version
- **Blue-Green**: Staging slot for testing before production

---

## Disaster Recovery & High Availability

### High Availability

**Multi-Region Deployment**:
- **Primary Region**: East US
- **Secondary Region**: West US 2
- **Automatic Failover**: Cosmos DB automatic failover
- **Traffic Manager**: Route traffic to healthy region (future)

**Redundancy**:
- **App Services**: Multiple instances per region
- **Cosmos DB**: Multi-region replication
- **Redis**: Built-in replication
- **Key Vault**: Geo-redundant storage

**SLA Targets**:
- **App Services**: 99.95% uptime
- **Cosmos DB**: 99.999% availability (multi-region)
- **Overall Platform**: 99.9% uptime target

---

### Disaster Recovery

**Backup Strategy**:
- **Cosmos DB**: Continuous backup with 30-day retention
- **Redis**: Automated backups (production)
- **Key Vault**: Geo-redundant storage
- **Application Code**: Version controlled in Git

**Recovery Procedures**:
- **Point-in-Time Recovery**: Restore Cosmos DB to any point in last 30 days
- **Infrastructure Recovery**: Recreate infrastructure from Terraform
- **Data Recovery**: Restore from backups
- **RTO Target**: <4 hours
- **RPO Target**: <1 hour

---

## Cost Optimization

### Cost Management Strategies

1. **Serverless Services**:
   - Cosmos DB serverless mode (pay per operation)
   - Azure Functions (pay per execution)
   - Automatic scaling reduces idle costs

2. **Caching**:
   - Redis caching reduces Cosmos DB RU consumption
   - 60-80% reduction in database costs

3. **Reserved Capacity**:
   - Reserved instances for predictable workloads
   - Significant cost savings for production

4. **Environment-Specific**:
   - Development: Basic tier services
   - Production: Premium tier with redundancy
   - Cost: ~$150/month (dev) vs ~$800/month (production)

**Cost Breakdown (Production)**:
- App Services: ~$200/month
- Cosmos DB: ~$300/month (serverless)
- Redis: ~$150/month
- Key Vault: ~$10/month
- Application Insights: ~$50/month
- Networking: ~$50/month
- **Total**: ~$800/month

---

## Monitoring & Observability

### Application Insights Integration

**Metrics Tracked**:
- Request duration (P50, P95, P99)
- Error rate by endpoint
- Active sessions count
- Database RU consumption
- Cache hit/miss ratio
- API response times

**Alerts Configured**:
- High error rate (>5%)
- Slow response times (>2s P95)
- High CPU usage (>80%)
- High memory usage (>80%)
- Database RU consumption spikes
- Cache hit rate drops

**Benefits**:
- **Proactive Monitoring**: Get alerted before users are affected
- **Performance Insights**: Identify bottlenecks quickly
- **Cost Tracking**: Monitor resource consumption
- **Compliance**: Complete audit trail

---

## Summary

Castiel's architecture is designed for:

✅ **Scale**: Horizontal scaling without architectural changes  
✅ **Security**: Multi-layer security with defense-in-depth  
✅ **Reliability**: 99.9%+ uptime with multi-region redundancy  
✅ **Performance**: Sub-10ms latency with global distribution  
✅ **Cost-Effectiveness**: Serverless services and intelligent caching  
✅ **Developer Experience**: Type-safe, well-documented, easy to extend  

**The result**: An enterprise-grade platform that scales with your business while maintaining security, performance, and reliability.

---

**Want to learn more?** [Contact us](#) to discuss architecture details or schedule a technical deep-dive.






