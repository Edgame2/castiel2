# Coder IDE - High-Level Project Description

**Last Updated:** 2025-01-27

---

## Overview

**Coder IDE** is an intelligent, AI-powered Integrated Development Environment (IDE) designed for modern software development teams. Built as an Electron desktop application, it combines the power of a full-featured code editor with advanced AI capabilities, comprehensive project management, and enterprise-grade collaboration features.

The platform enables teams to plan, build, and manage software projects with AI assistance, while maintaining strict access control, security, and organizational structure across multiple teams and organizations.

---

## Core Value Proposition

Coder IDE transforms traditional IDEs by integrating:

1. **AI-Powered Development**: Intelligent planning, automated code generation, and proactive issue detection
2. **Enterprise Collaboration**: Multi-organization support with role-based access control and team management
3. **Comprehensive Project Management**: Integrated task tracking, roadmaps, and project organization
4. **Productivity Workflows**: Specialized tools for code review, incident management, knowledge sharing, and more

---

## Architecture Overview

### Technology Stack

**Frontend:**
- **Electron** - Desktop application framework
- **React 19** - Modern UI framework
- **Monaco Editor** - VS Code's editor engine
- **Shadcn UI** - Component library
- **TypeScript** - Type-safe development

**Backend:**
- **Fastify** - High-performance web framework
- **PostgreSQL** - Relational database
- **Prisma ORM** - Type-safe database access
- **Redis** - Caching and session management

**AI & Intelligence:**
- **OpenAI Integration** - GPT models for planning and code generation
- **Ollama Support** - Local model integration
- **Context Aggregation** - Advanced codebase analysis
- **Agent System** - Specialized AI agents for different tasks

### System Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Electron Desktop Application               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   Renderer   â”‚  â”‚     Main     â”‚  â”‚    Preload   â”‚ â”‚
â”‚  â”‚   Process    â”‚â—„â”€â”¤   Process    â”‚â”€â–ºâ”‚    Script    â”‚ â”‚
â”‚  â”‚  (React UI)  â”‚  â”‚  (Window Mgmt)â”‚  â”‚   (IPC)      â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â”‚ IPC / HTTP
          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Fastify API Server                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Routes  â”‚â†’ â”‚Middlewareâ”‚â†’ â”‚ Services â”‚â†’ â”‚Database â”‚ â”‚
â”‚  â”‚  (50+)   â”‚  â”‚ (Auth,   â”‚  â”‚ (40+)    â”‚  â”‚ (Prisma)â”‚ â”‚
â”‚  â”‚          â”‚  â”‚  RBAC)   â”‚  â”‚          â”‚  â”‚         â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â”‚
          â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              PostgreSQL Database                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”             â”‚
â”‚  â”‚  Users   â”‚  â”‚ Projects â”‚  â”‚  Tasks   â”‚  ...        â”‚
â”‚  â”‚  Orgs    â”‚  â”‚  Teams   â”‚  â”‚ Roadmaps â”‚             â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Module Organization

The project is organized into **8 major module categories** with **39+ logical modules**:

### 1. Platform & Infrastructure (4 modules)
Foundation layer providing Electron application lifecycle, IPC communication, build configuration, and platform services.

**Key Modules:**
- Electron Main Process - Application entry point and window management
- IPC Communication - Secure inter-process communication
- Build & Configuration - Webpack, TypeScript, and Electron Forge setup
- Platform Services - OS integration and file system operations

### 2. Editor & UI (5 modules)
User interface layer with code editing capabilities and navigation.

**Key Modules:**
- Monaco Editor - Full-featured code editor with IntelliSense
- File Management - File explorer, tabs, and file operations
- UI Components - Reusable Shadcn-based component library
- Activity Bar & Views - Sidebar navigation and view management
- Command & Palette - Command execution and keyboard shortcuts

### 3. AI & Intelligence (6 modules)
AI-powered features for planning, execution, and code intelligence.

**Key Modules:**
- Planning - AI-assisted plan generation and validation
- Execution - Automated code generation and execution engine
- Context Aggregation - Codebase indexing and semantic analysis
- Model Integration - OpenAI and Ollama provider abstraction
- Agents - 20+ specialized AI agents for different tasks
- Intent & Anticipation - User intent understanding and proactive issue detection

### 4. Project Management (5 modules)
Project organization, task tracking, and roadmap management.

**Key Modules:**
- Project Management - Project CRUD and application context
- Task Management - Global task repository with dependencies
- Roadmap Management - Multi-level hierarchy (Milestones â†’ Epics â†’ Stories)
- Module Detection - Automatic module detection and organization
- Environment Management - Multi-environment configuration

### 5. Collaboration & Organization (4 modules)
Team collaboration, user management, and access control.

**Key Modules:**
- Authentication & Authorization - Google OAuth 2.0 and JWT management
- User & Team Management - User profiles and hierarchical team structure
- RBAC - Role-based access control with fine-grained permissions
- Organization Context - Multi-organization support and switching

### 6. Productivity & Workflow (8+ modules)
Specialized productivity features and workflows.

**Key Modules:**
- Calendar & Planning - Calendar integration and scheduling
- Messaging - Team messaging and communication
- Knowledge Base - Documentation and knowledge management
- Code Review - Code review workflow and management
- Incident Management - Incident tracking and resolution
- Learning & Development - Learning resources and skill tracking
- Architecture & Design - Architecture analysis and design patterns
- Release Management - Release planning and version management

**Additional Modules:**
- Dependency Management, Technical Debt, Experiments, Innovation, Pairing, Capacity Planning, Pattern Library, Standards, Compliance

### 7. Backend Services (4 modules)
Server-side API and database functionality.

**Key Modules:**
- API Server - RESTful API endpoints (50+ routes)
- Database - Prisma schema, migrations, and data access
- Services - Business logic layer (40+ services)
- Middleware - Authentication, RBAC, validation, and error handling

### 8. Shared & Common (3 modules)
Shared utilities, types, and common functionality.

**Key Modules:**
- Shared Types - TypeScript types and interfaces
- Validation - Data validation and sanitization (Zod)
- Utilities - Common helper functions

---

## Key Features

### AI-Powered Development

- **Intelligent Planning**: AI generates detailed implementation plans from user intents
- **Automated Execution**: Code generation and execution with validation and rollback
- **Context Awareness**: Advanced codebase analysis and semantic understanding
- **Proactive Assistance**: Issue anticipation and personalized recommendations
- **Multi-Model Support**: Integration with OpenAI and local Ollama models

### Project Management

- **Project Organization**: Team-based projects with access control
- **Task Management**: Global task repository with assignments, dependencies, and linking
- **Roadmap Hierarchy**: Multi-level planning (Milestones â†’ Epics â†’ Stories)
- **Module Detection**: Automatic codebase module detection and organization
- **Environment Management**: Multi-environment configuration and validation

### Collaboration & Security

- **Multi-Organization**: Support for multiple organizations with context switching
- **Team Management**: Hierarchical team structure with member management
- **RBAC**: Fine-grained permissions with wildcard support and resource-level access
- **Authentication**: Google OAuth 2.0 with secure JWT token storage
- **Session Management**: Multiple sessions per user with device tracking

### Developer Experience

- **Monaco Editor**: Full-featured editor with syntax highlighting and IntelliSense
- **Command Palette**: Quick command execution with keyboard shortcuts
- **File Management**: Advanced file explorer with tabs and search
- **Activity Bar**: Customizable sidebar with multiple views
- **Theming**: Support for multiple themes and customization

### Productivity Tools

- **Code Review**: Integrated code review workflow
- **Knowledge Base**: Team documentation and knowledge sharing
- **Messaging**: Team communication and notifications
- **Calendar Integration**: Planning and scheduling
- **Incident Management**: Issue tracking and resolution
- **Learning Resources**: Skill development and recommendations

---

## Security & Access Control

### Authentication
- Google OAuth 2.0 integration
- JWT token-based authentication with secure storage (keytar)
- Session management with device tracking
- Password management with strength validation

### Authorization
- Role-Based Access Control (RBAC) with fine-grained permissions
- Permission scoping: `own`, `team`, `organization`, `all`
- Wildcard permission support (`projects.*`, `*.read`)
- Resource-level permissions for granular access
- Super Admin role with bypass capabilities

### Data Security
- Input validation and sanitization on all endpoints
- SQL injection prevention via Prisma ORM
- XSS prevention with output encoding
- Secure token storage in OS credential store
- Environment variable validation

---

## Database Schema

The system uses PostgreSQL with Prisma ORM, featuring:

- **Users & Authentication**: User profiles, sessions, OAuth providers
- **Organizations**: Multi-organization support with settings
- **Teams**: Hierarchical team structure
- **Projects**: Project management with access control
- **Tasks**: Global task repository with dependencies
- **Roadmaps**: Multi-level roadmap hierarchy
- **RBAC**: Roles, permissions, and role-permission mappings
- **Productivity Modules**: Calendar, messaging, knowledge base, reviews, incidents, etc.

---

## API Architecture

### RESTful API (50+ endpoints)

**Authentication:**
- `/api/auth/google` - OAuth initiation
- `/api/auth/me` - Current user
- `/api/auth/switch-organization` - Organization switching

**Users & Teams:**
- `/api/users/*` - User management
- `/api/teams/*` - Team CRUD and member management

**Projects & Tasks:**
- `/api/projects/*` - Project management
- `/api/tasks/*` - Task management
- `/api/roadmaps/*` - Roadmap management

**Productivity:**
- `/api/calendar/*` - Calendar events
- `/api/messaging/*` - Team messaging
- `/api/knowledge/*` - Knowledge base
- `/api/reviews/*` - Code reviews
- `/api/incidents/*` - Incident management

All endpoints protected with authentication middleware and RBAC permission checks.

---

## Frontend Architecture

### React Context System

- **AuthContext**: User authentication, organization context, permissions
- **OrganizationContext**: Organization management and switching
- **ProjectContext**: Current project and application context
- **CalendarContext**: Calendar events and planning
- **MessagingContext**: Team messaging
- **KnowledgeContext**: Knowledge base management
- **ReviewContext**: Code review workflow
- **IncidentContext**: Incident tracking

### IPC Communication

Secure Electron IPC for:
- Authentication token storage (keytar)
- API communication
- File system operations
- Window management

---

## Development Workflow

### Setup Options

1. **Docker (Recommended)**: Containerized setup with `docker-compose`
2. **Local Installation**: Manual setup with PostgreSQL

### Development Scripts

- `npm start` - Start Electron application
- `cd server && npm run dev` - Start API server
- `cd server && npm run db:migrate` - Run migrations
- `cd server && npm run db:seed` - Seed database

---

## Module Dependencies

```
Platform & Infrastructure
    â†“
Editor & UI â† Shared & Common
    â†“
AI & Intelligence â† Shared & Common
    â†“
Project Management â† Collaboration & Organization
    â†“
Productivity & Workflow â† Project Management
    â†“
Backend Services â† Shared & Common
```

All modules depend on **Shared & Common** for types and utilities. Clear dependency hierarchy prevents circular dependencies.

---

## Design Principles

1. **Clear Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Explicit Interfaces**: Modules communicate through well-defined TypeScript interfaces
3. **Type Safety**: TypeScript ensures type safety across module boundaries
4. **Dependency Management**: Clear dependency hierarchy prevents circular dependencies
5. **Testability**: Each module can be tested independently
6. **Security First**: Authentication, authorization, and validation at every layer
7. **Scalability**: Modular architecture supports growth and feature additions

---

## Use Cases

### Individual Developer
- Code editing with AI assistance
- Task management and planning
- Personal project organization
- Learning resource access

### Development Team
- Collaborative project management
- Team-based task assignment
- Code review workflows
- Knowledge sharing
- Incident tracking

### Organization
- Multi-team coordination
- Organization-wide settings
- Role-based access control
- Resource capacity planning
- Compliance management

---

## Future Considerations

The modular architecture supports:
- Additional AI model providers
- New productivity modules
- Enhanced collaboration features
- Integration with external tools
- Mobile companion applications
- Cloud deployment options

---

## Summary

Coder IDE is a comprehensive, AI-powered development environment that combines:

- **Powerful Code Editor** (Monaco) with modern IDE features
- **AI Intelligence** for planning, execution, and proactive assistance
- **Enterprise Collaboration** with multi-organization support and RBAC
- **Project Management** with tasks, roadmaps, and module organization
- **Productivity Tools** for code review, knowledge sharing, and team communication

Built with modern technologies (Electron, React, Fastify, PostgreSQL) and organized into 39+ logical modules across 8 categories, the platform provides a scalable, secure, and maintainable foundation for software development teams.

---

**For detailed module information, see:**
- [Module List](./module-list.md) - Quick reference
- [Module Breakdown](./module-breakdown.md) - Detailed descriptions
- [Collaboration & Organization](./collaboration-organization.md) - Collaboration modules