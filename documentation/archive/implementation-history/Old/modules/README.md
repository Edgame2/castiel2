# Modules Documentation

This directory contains documentation about the logical module structure of the Coder IDE project.

## Documents

- **[module-list.md](./module-list.md)** - Quick reference list of all modules
- **[module-breakdown.md](./module-breakdown.md)** - Detailed module descriptions and architecture
- **[PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md)** - High-level project description
- **[MODULE_INDEX.md](./MODULE_INDEX.md)** - Complete index of all modules and documentation status
- **[collaboration-organization.md](./collaboration-organization.md)** - Comprehensive collaboration modules documentation

## Individual Module Documentation

Each module has its own detailed documentation file:

### Platform & Infrastructure
- [01-electron-main-process.md](./01-electron-main-process.md) - Electron main process
- [02-ipc-communication.md](./02-ipc-communication.md) - IPC communication
- [03-build-configuration.md](./03-build-configuration.md) - Build system
- [04-platform-services.md](./04-platform-services.md) - Platform services

### Editor & UI
- [05-monaco-editor.md](./05-monaco-editor.md) - Monaco editor integration
- [06-file-management.md](./06-file-management.md) - File management

### AI & Intelligence
- [10-planning.md](./10-planning.md) - AI planning system
- [11-execution.md](./11-execution.md) - Code execution engine

See **[MODULE_INDEX.md](./MODULE_INDEX.md)** for complete list and status.

## Overview

The Coder IDE project is organized into **8 major module categories** with **39+ logical modules**:

1. **Platform & Infrastructure** (4 modules) - Foundation layer
2. **Editor & UI** (5 modules) - User interface layer
3. **AI & Intelligence** (6 modules) - AI capabilities layer
4. **Project Management** (5 modules) - Project organization layer
5. **Collaboration & Organization** (4 modules) - Team features layer
6. **Productivity & Workflow** (8+ modules) - Specialized features layer
7. **Backend Services** (4 modules) - Server layer
8. **Shared & Common** (3 modules) - Common utilities layer

## Quick Start

1. Start with **[PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md)** for high-level overview
2. Check **[MODULE_INDEX.md](./MODULE_INDEX.md)** for documentation status
3. Read **[module-list.md](./module-list.md)** for quick reference
4. Explore individual module documentation files for detailed information
5. Use **[module-breakdown.md](./module-breakdown.md)** for architecture overview

## Module Principles

- **Clear Separation of Concerns**: Each module has a single, well-defined responsibility
- **Explicit Interfaces**: Modules communicate through well-defined interfaces
- **Type Safety**: TypeScript ensures type safety across module boundaries
- **Dependency Management**: Clear dependency hierarchy prevents circular dependencies
- **Testability**: Each module can be tested independently

## Contributing

When adding new features:
1. Identify the appropriate module category
2. Check if a similar module already exists
3. Follow the module structure and naming conventions
4. Update this documentation if creating a new module
