# Technology Stack

## Overview

This document provides a comprehensive overview of the technology stack used in Coder IDE, organized by layer and purpose.

## Frontend Technologies

### Web Application Framework

**Next.js**
- **Version**: 16.x (App Router)
- **Purpose**: Web application framework
- **Usage**: Server-side rendering, API routes (BFF), static generation
- **Features**: 
  - App Router for routing
  - Server Components
  - API Routes for backend-for-frontend
  - Built-in optimizations
- **Component Reuse**: Components and pages from `old_code/apps/web/` are reused

### UI Framework

**React 19**
- **Version**: 19.x
- **Purpose**: UI framework
- **Features**: 
  - Component-based architecture
  - Hooks and context API
  - Server components support
- **Usage**: All UI components and pages

### Data Fetching & State

**TanStack Query (React Query)**
- **Version**: 5.x
- **Purpose**: Server state management and data fetching
- **Features**:
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Request deduplication

**Axios**
- **Version**: 1.x
- **Purpose**: HTTP client for API communication
- **Features**:
  - Request/response interceptors
  - Automatic token injection
  - Error handling
  - CSRF token support

### UI Component Library

**Shadcn UI**
- **Purpose**: Component library
- **Features**:
  - Accessible components
  - Customizable styling
  - Radix UI primitives
- **Components**: Buttons, dialogs, forms, tables, etc.

### Styling

**Tailwind CSS**
- **Version**: 3.x
- **Purpose**: Utility-first CSS framework
- **Features**: Responsive design, dark mode support

**PostCSS**
- **Purpose**: CSS processing
- **Plugins**: Autoprefixer, Tailwind

### State Management

**TanStack Query**
- **Purpose**: Server state management
- **Usage**: API data fetching, caching, synchronization

**React Context API**
- **Purpose**: Global client state management
- **Usage**: Authentication, organization, theme, i18n

**Zustand** (optional)
- **Purpose**: Client state management
- **Usage**: Complex client-side state when needed

**React Hooks**
- **Purpose**: State and lifecycle management
- **Usage**: Custom hooks for data fetching, state management

### Type Safety

**TypeScript**
- **Version**: 5.x
- **Purpose**: Type safety
- **Configuration**: Multiple tsconfig files for different contexts

## Backend Technologies

### Web Framework

**Fastify**
- **Version**: 5.x
- **Purpose**: High-performance web framework
- **Features**:
  - Fast HTTP server
  - Plugin system
  - Schema validation
  - TypeScript support

### Database

**Azure Cosmos DB NoSQL**
- **Purpose**: Primary database
- **Features**:
  - Container-based isolation
  - Partition key support
  - Built-in vector search
  - Multi-tenant support
  - Document-based storage

**Azure Cosmos DB SDK**
- **Library**: `@azure/cosmos`
- **Purpose**: Type-safe database access
- **Features**:
  - TypeScript support
  - Query builder
  - Connection management
  - Error handling

### Authentication

**Google OAuth 2.0**
- **Library**: `@fastify/oauth2`
- **Purpose**: OAuth authentication
- **Features**: OAuth flow, token management

**JWT (JSON Web Tokens)**
- **Library**: `@fastify/jwt`, `jsonwebtoken`
- **Purpose**: Stateless authentication
- **Features**: Token generation, validation, refresh

**bcrypt**
- **Purpose**: Password hashing
- **Features**: Salt rounds, secure hashing

### Message Queue

**RabbitMQ**
- **Version**: 3.x
- **Purpose**: Message broker
- **Features**:
  - Pub/Sub messaging
  - Message routing
  - Guaranteed delivery
  - Management UI

### Caching

**Redis**
- **Version**: 7.x
- **Purpose**: Caching and session storage
- **Features**:
  - In-memory storage
  - TTL support
  - Pub/Sub
  - Session storage

**ioredis**
- **Purpose**: Redis client
- **Features**: Connection pooling, clustering support

### Validation

**Zod**
- **Version**: 3.x / 4.x
- **Purpose**: Schema validation
- **Features**: Type-safe validation, runtime validation

### Logging

**Winston**
- **Version**: 3.x
- **Purpose**: Logging
- **Features**:
  - Multiple transports
  - Log levels
  - Formatting
  - Daily rotation

### HTTP Client

**Axios**
- **Version**: 1.x
- **Purpose**: HTTP client
- **Features**: Request/response interceptors, error handling

## Core Technologies

### AI/ML

**OpenAI API**
- **Purpose**: GPT models
- **Usage**: Code generation, planning

**Anthropic API**
- **Purpose**: Claude models
- **Usage**: AI completions

**Ollama**
- **Purpose**: Local LLM models
- **Usage**: Local AI inference

### Code Analysis

**TypeScript Compiler API**
- **Purpose**: AST analysis
- **Usage**: Code parsing, type checking

**Tree-sitter**
- **Purpose**: Language parsing
- **Usage**: Multi-language support

### Git Integration

**simple-git**
- **Purpose**: Git operations
- **Usage**: Repository management, history analysis

### File System

**chokidar**
- **Purpose**: File watching
- **Usage**: File change detection

## Development Tools

### Build Tools

**Next.js Build System**
- **Purpose**: Module bundling and optimization
- **Features**: 
  - Automatic code splitting
  - Image optimization
  - Font optimization
  - Static generation

**TypeScript Compiler**
- **Purpose**: TypeScript compilation
- **Configuration**: Multiple tsconfig files

### Testing

**Vitest**
- **Version**: 4.x
- **Purpose**: Unit testing
- **Features**: Fast, Vite-based, TypeScript support

**Testing Library**
- **Purpose**: Component testing
- **Libraries**: React Testing Library, Jest DOM

### Code Quality

**ESLint** (planned)
- **Purpose**: Code linting

**Prettier** (planned)
- **Purpose**: Code formatting

### Development Server

**tsx**
- **Purpose**: TypeScript execution
- **Usage**: Development server, scripts

## Infrastructure Technologies

### Containerization

**Docker**
- **Purpose**: Containerization
- **Usage**: Service deployment, development environment

**Docker Compose**
- **Purpose**: Multi-container orchestration
- **Usage**: Local development, testing

### Process Management

**PM2** (optional)
- **Purpose**: Process management
- **Usage**: Production process management

## Database Extensions

### pgvector
- **Purpose**: Vector similarity search
- **Usage**: Embeddings storage and search
- **Features**: Vector operations, similarity search

## Security Technologies

### Secret Management

**keytar**
- **Purpose**: Secure credential storage
- **Usage**: API key storage, token storage

### Password Security

**bcrypt**
- **Purpose**: Password hashing
- **Features**: Salt rounds, secure hashing

**HIBP (Have I Been Pwned)**
- **Purpose**: Password breach checking
- **Usage**: Password validation

## Monitoring & Observability

### Metrics

**Prometheus Client** (`prom-client`)
- **Purpose**: Metrics collection
- **Usage**: Service metrics, performance monitoring

### Logging

**Winston Daily Rotate File**
- **Purpose**: Log file rotation
- **Usage**: Log file management

## Communication Libraries

### WebSocket

**Fastify WebSocket**
- **Purpose**: WebSocket support
- **Usage**: Real-time communication

### Real-time Communication

**WebSocket**
- **Library**: Native WebSocket API or custom client
- **Purpose**: Bidirectional real-time communication
- **Usage**: Live collaboration, real-time updates

**Server-Sent Events (SSE)**
- **Library**: Native EventSource API or custom client
- **Purpose**: Server-to-client streaming
- **Usage**: AI streaming responses, notifications

## Utility Libraries

### UUID

**uuid**
- **Purpose**: Unique ID generation
- **Usage**: Entity IDs, request IDs

### Date/Time

**date-fns** (if used)
- **Purpose**: Date manipulation
- **Usage**: Date formatting, calculations

### Validation

**Zod**
- **Purpose**: Schema validation
- **Usage**: Input validation, type checking

## Package Management

**npm**
- **Purpose**: Package management
- **Usage**: Dependency management, scripts

**Workspaces**
- **Purpose**: Monorepo management
- **Usage**: Multiple packages in one repository

## Version Control

**Git**
- **Purpose**: Version control
- **Usage**: Source code management

## Related Documentation

- [Architecture](./Architecture.md) - System architecture
- [Deployment](./Deployment.md) - Deployment technologies
- [Module Overview](./ModuleOverview.md) - Module technologies
