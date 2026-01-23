# IPC Communication Module

**Category:** Platform & Infrastructure  
**Location:** `src/main/ipc/`  
**Last Updated:** 2025-01-27

---

## Overview

The IPC Communication Module provides secure, type-safe inter-process communication between the Electron main process and renderer processes. It handles all communication channels, error handling, and event forwarding for the Coder IDE application.

## Purpose

- Secure IPC channel setup between main and renderer processes
- Type-safe request/response handling
- Standardized error handling and propagation
- Event forwarding from main to renderer
- Backend API integration with fallback to local services
- Request/response validation

---

## Key Components

### 1. IPC Handlers Setup (`handlers.ts`)

**Location:** `src/main/ipc/handlers.ts`

**Responsibilities:**
- Central registration point for all IPC handlers
- Coordinates setup of 68+ handler modules
- Ensures all handlers are initialized on app startup

**Handler Categories:**
- **Core Features:** Context, Planning, Execution, Escalation, Explanation
- **Editor Features:** File, Search, Terminal, Git, Problems, Symbols, Output, Breakpoints
- **Project Management:** Projects, Tasks, Teams, Roadmaps, Modules, Environments
- **Collaboration:** Auth, Users, Organizations, Roles, Memberships, Invitations, Permissions
- **AI & Intelligence:** Models, Embeddings, Completions, Agents, Chat, MCP
- **Productivity:** Calendar, Messaging, Knowledge, Reviews, Incidents, Releases, Dependencies, Debt, Capacity, Pairing, Architecture, Learning, Patterns, Experiments, Compliance, Innovation
- **System:** Config, API Keys, Errors, Backup, Logs, Feedback, Metrics, Prompts, Dashboard, Observability, System, Menu

### 2. Error Handling (`ipcErrorHandler.ts`)

**Location:** `src/main/ipc/ipcErrorHandler.ts`

**Responsibilities:**
- Standardized error formatting
- Error categorization
- User-friendly error messages
- Retry logic indication
- Error details extraction

**Error Categories:**
```typescript
type ErrorCategory =
  | 'validation'
  | 'not-found'
  | 'permission'
  | 'network'
  | 'configuration'
  | 'execution'
  | 'planning'
  | 'model'
  | 'file-system'
  | 'unknown';
```

**Response Format:**
```typescript
interface IPCErrorResponse {
  success: false;
  error: string;
  userMessage: string;
  category: ErrorCategory;
  code?: string;
  details?: any;
  retryable?: boolean;
}

interface IPCSuccessResponse<T> {
  success: true;
  data: T;
}

type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;
```

**Key Functions:**
```typescript
formatIPCError(error: any, context?: string): IPCErrorResponse
createIPCSuccess<T>(data: T): IPCSuccessResponse<T>
withIPCErrorHandling<T>(handler: () => Promise<T>, context?: string): Promise<IPCResponse<T>>
```

### 3. Handler Modules (68+ modules)

Each handler module follows a consistent pattern:

**Structure:**
```typescript
// Initialize service (singleton pattern)
function initializeService(): Service {
  if (!service) {
    service = new Service();
  }
  return service;
}

// Setup IPC handlers
export function setupXxxHandlers(): void {
  ipcMain.handle('xxx:action', async (event, ...args) => {
    try {
      const service = initializeService();
      const result = await service.action(...args);
      return createIPCSuccess(result);
    } catch (error) {
      return formatIPCError(error, 'xxx:action');
    }
  });
}
```

**Handler Pattern:**
1. Validate input parameters
2. Initialize service (lazy initialization)
3. Call service method
4. Handle errors with standardized format
5. Return success or error response

---

## IPC Channel Architecture

### Channel Naming Convention

```
{module}:{action}
```

**Examples:**
- `planning:generate` - Generate a plan
- `execution:execute` - Execute a plan
- `file:read` - Read a file
- `project:list` - List projects
- `auth:login` - Login user

### Request/Response Flow

```
Renderer Process
    ↓ (IPC call)
Preload Script (bridge)
    ↓ (secure channel)
Main Process Handler
    ↓ (service call)
Core Service / Backend API
    ↓ (response)
Main Process Handler
    ↓ (IPC response)
Preload Script
    ↓ (to renderer)
Renderer Process
```

### Event Forwarding

Some handlers forward events from services to renderer:

```typescript
service.on('event', (data) => {
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('service:event', data);
    }
  });
});
```

---

## Handler Categories

### Core Feature Handlers

#### Context Handlers (`contextHandlers.ts`)
- Context aggregation
- Codebase analysis
- File indexing

#### Planning Handlers (`planningHandlers.ts`)
- Plan generation
- Plan validation
- Plan execution coordination
- Plan storage and retrieval

#### Execution Handlers (`executionHandlers.ts`)
- Plan execution
- Step execution
- Code generation
- Execution monitoring
- Event forwarding (started, step-started, step-completed, step-failed, completed, error)

#### Model Handlers (`modelHandlers.ts`)
- Model router access
- Provider switching
- Model configuration

### Editor Feature Handlers

#### File Handlers (`fileHandlers.ts`)
- File read/write operations
- File indexing
- Path validation

#### Terminal Handlers (`terminalHandlers.ts`)
- Terminal session management
- Command execution
- Output streaming
- Backend API integration with local fallback

#### Search Handlers (`searchHandlers.ts`)
- Code search
- File search
- Symbol search

#### Symbol Handlers (`symbolHandlers.ts`)
- Symbol extraction
- Symbol navigation
- Symbol references

#### Output Handlers (`outputHandlers.ts`)
- Output channel management
- Message appending
- Channel clearing
- Real-time output updates

### Project Management Handlers

#### Project Handlers (`projectHandlers.ts`)
- Project CRUD operations
- Project selection
- Application context management

#### Task Handlers (`taskHandlers.ts`)
- Task CRUD operations
- Task assignments
- Task dependencies

#### Roadmap Handlers (`roadmapHandlers.ts`)
- Roadmap management
- Milestone/Epic/Story operations

#### Module Handlers (`moduleHandlers.ts`)
- Module detection
- Module analysis
- Module management

### Collaboration Handlers

#### Auth Handlers (`authHandlers.ts`)
- User authentication
- Token management
- Session management
- Organization switching

#### User Handlers (`userHandlers.ts`)
- User profile management
- User CRUD operations

#### Organization Handlers (`organizationHandlers.ts`)
- Organization management
- Organization settings
- Organization switching

#### Team Handlers (`teamHandlers.ts`)
- Team management
- Team member operations

### AI & Intelligence Handlers

#### Chat Handlers (`chatHandlers.ts`)
- AI chat interface
- Message handling
- Context management

#### Agent Handlers (`agentHandlers.ts`)
- Agent management
- Agent execution
- Agent coordination

#### Embedding Handlers (`embeddingHandlers.ts`)
- Embedding generation
- Embedding storage

#### Completion Handlers (`completionHandlers.ts`)
- Code completion
- IntelliSense integration

### Productivity Handlers

#### Calendar Handlers (`calendarHandlers.ts`)
- Calendar event management
- Scheduling
- Conflict detection

#### Messaging Handlers (`messagingHandlers.ts`)
- Team messaging
- Channel management
- Notifications

#### Knowledge Handlers (`knowledgeHandlers.ts`)
- Knowledge base management
- Documentation operations

#### Review Handlers (`reviewHandlers.ts`)
- Code review workflow
- Review comments
- Review approval

---

## Backend API Integration

Many handlers integrate with the backend API server:

**Pattern:**
```typescript
const apiClient = getSharedApiClient();

// Try backend API first
try {
  const result = await apiClient.get(`/api/resource/${id}`);
  return createIPCSuccess(result);
} catch (apiError) {
  // Fallback to local service
  const service = initializeLocalService();
  const result = await service.getLocal(id);
  return createIPCSuccess(result);
}
```

**Benefits:**
- Seamless online/offline operation
- Local fallback for better UX
- Centralized data when online
- Local caching when offline

---

## Error Handling

### Error Categorization

Errors are automatically categorized based on:
1. HTTP status codes (if API error)
2. Error message content
3. Error codes
4. Error types

### User-Friendly Messages

Technical errors are converted to user-friendly messages:

```typescript
// Technical: "ENOENT: no such file or directory"
// User-friendly: "File or directory not found"

// Technical: "401 Unauthorized"
// User-friendly: "Authentication required. Please log in again."
```

### Retry Logic

Errors are marked as retryable when appropriate:
- Network errors → retryable
- Server errors (5xx) → retryable
- Validation errors → not retryable
- Permission errors → not retryable

---

## Type Safety

### IPC Types (`IPCTypes.ts`)

All IPC channels have TypeScript type definitions:

```typescript
export interface PlanningGenerateRequest {
  intent: string;
  projectId?: string;
  context?: string;
}

export interface PlanningGenerateResponse {
  plan: Plan;
  confidence: number;
}
```

### Preload Script Types

Types are exposed to renderer via preload script:

```typescript
// In preload.ts
window.electronAPI = {
  planning: {
    generate: (request: PlanningGenerateRequest) => 
      Promise<IPCResponse<PlanningGenerateResponse>>
  }
};
```

---

## Security

### Context Isolation

- All IPC communication goes through preload script
- No direct Node.js access from renderer
- Secure channel validation

### Input Validation

- All handler inputs are validated
- Type checking on parameters
- Sanitization where needed

### Error Information

- Sensitive details excluded from user messages
- Stack traces only in development
- Error codes for debugging

---

## Event Broadcasting

Some handlers broadcast events to all renderer windows:

```typescript
// Broadcast to all windows
BrowserWindow.getAllWindows().forEach(window => {
  if (!window.isDestroyed()) {
    window.webContents.send('event:name', data);
  }
});
```

**Common Events:**
- `execution:started` - Execution started
- `execution:step-started` - Step started
- `execution:step-completed` - Step completed
- `execution:error` - Execution error
- `output:message` - Output message
- `terminal:output` - Terminal output

---

## Usage Examples

### Simple Handler

```typescript
export function setupSimpleHandlers(): void {
  ipcMain.handle('simple:action', async (_event, param: string) => {
    try {
      if (!param || typeof param !== 'string') {
        return formatIPCError(
          new Error('Parameter is required and must be a string'),
          'simple:action'
        );
      }

      const result = await performAction(param);
      return createIPCSuccess(result);
    } catch (error) {
      return formatIPCError(error, 'simple:action');
    }
  });
}
```

### Handler with Backend API

```typescript
export function setupApiHandlers(): void {
  const apiClient = getSharedApiClient();

  ipcMain.handle('api:get', async (_event, id: string) => {
    try {
      const result = await apiClient.get(`/api/resource/${id}`);
      return createIPCSuccess(result);
    } catch (error) {
      return formatIPCError(error, 'api:get');
    }
  });
}
```

### Handler with Event Forwarding

```typescript
export function setupEventHandlers(): void {
  let service: Service | null = null;

  function initializeService(): Service {
    if (!service) {
      service = new Service();
      
      // Forward events to renderer
      service.on('event', (data) => {
        BrowserWindow.getAllWindows().forEach(window => {
          if (!window.isDestroyed()) {
            window.webContents.send('service:event', data);
          }
        });
      });
    }
    return service;
  }

  ipcMain.handle('service:action', async (_event, param: string) => {
    try {
      const service = initializeService();
      const result = await service.action(param);
      return createIPCSuccess(result);
    } catch (error) {
      return formatIPCError(error, 'service:action');
    }
  });
}
```

---

## Testing

### Mock IPC Handlers

For testing, handlers can be mocked:

```typescript
// In test
ipcMain.handle('test:action', async () => {
  return createIPCSuccess({ test: 'data' });
});
```

### Error Testing

Test error handling:

```typescript
// Test error response
const response = await formatIPCError(new Error('Test error'), 'test');
expect(response.success).toBe(false);
expect(response.category).toBe('unknown');
```

---

## Best Practices

1. ✅ **Always validate inputs** - Check parameters before processing
2. ✅ **Use standardized error handling** - Use `formatIPCError` and `createIPCSuccess`
3. ✅ **Lazy service initialization** - Initialize services only when needed
4. ✅ **Type safety** - Define types for all requests/responses
5. ✅ **Error context** - Provide context string for better error messages
6. ✅ **Event broadcasting** - Broadcast events to all windows when appropriate
7. ✅ **Backend fallback** - Provide local fallback when backend unavailable
8. ✅ **Input sanitization** - Sanitize inputs where needed

---

## Performance Considerations

### Lazy Initialization

Services are initialized only when first used:

```typescript
let service: Service | null = null;

function initializeService(): Service {
  if (!service) {
    service = new Service();
  }
  return service;
}
```

### Event Debouncing

Some events are debounced to prevent excessive updates:

```typescript
let eventTimeout: NodeJS.Timeout | null = null;

const debouncedEmit = (data: any) => {
  if (eventTimeout) clearTimeout(eventTimeout);
  eventTimeout = setTimeout(() => {
    emitEvent(data);
  }, 100);
};
```

---

## Related Modules

- **Electron Main Process Module** - Sets up IPC handlers
- **Preload Script** - Provides secure bridge to renderer
- **Core Services** - Business logic services
- **Backend API** - Server-side API integration

---

## Summary

The IPC Communication Module provides a comprehensive, type-safe, and secure communication layer between the Electron main and renderer processes. With 68+ handler modules covering all application features, standardized error handling, and backend API integration, it ensures reliable and user-friendly communication throughout the Coder IDE application.
