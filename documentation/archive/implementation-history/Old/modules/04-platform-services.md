# Platform Services Module

**Category:** Platform & Infrastructure  
**Location:** `src/main/services/`  
**Last Updated:** 2025-01-27

---

## Overview

The Platform Services Module provides OS-level services and system integration for the Coder IDE application. It handles resource cleanup, power management, notifications, and scheduled task execution.

## Purpose

- Resource lifecycle management
- Power management (prevent sleep during operations)
- Native OS notifications
- Scheduled task execution
- System resource cleanup

---

## Key Components

### 1. Resource Cleanup Manager (`ResourceCleanupManager.ts`)

**Location:** `src/main/services/ResourceCleanupManager.ts`

**Purpose:** Centralized resource cleanup on app shutdown

**Responsibilities:**
- Track resources that need cleanup
- Clean up resources on app shutdown
- Handle cleanup errors gracefully
- Prevent resource leaks

**Interface:**
```typescript
interface Cleanupable {
  cleanup(): void | Promise<void>;
}
```

**Key Methods:**
```typescript
class ResourceCleanupManager {
  register(id: string, resource: Cleanupable): void
  unregister(id: string): void
  async cleanupAll(): Promise<void>
}
```

**Usage:**
```typescript
// Register a resource
resourceCleanupManager.register('fileWatcher', {
  cleanup: async () => {
    await fileWatcher.close();
  }
});

// On app shutdown, all resources are cleaned up
app.on('before-quit', async () => {
  await resourceCleanupManager.cleanupAll();
});
```

**Features:**
- Prevents registration during cleanup
- Handles both sync and async cleanup
- Collects and logs cleanup errors
- Ensures all resources are cleaned up

### 2. Power Management Service (`PowerManagement.ts`)

**Location:** `src/main/services/PowerManagement.ts`

**Purpose:** Prevent system sleep during critical operations

**Responsibilities:**
- Prevent system sleep during long operations
- Allow sleep when operations complete
- Track sleep prevention state

**Key Methods:**
```typescript
class PowerManagementService {
  preventSleep(): number | null
  allowSleep(): void
  isPreventingSleep(): boolean
}
```

**Usage:**
```typescript
// Prevent sleep during build
const blockerId = powerManagement.preventSleep();
try {
  await runBuild();
} finally {
  powerManagement.allowSleep();
}
```

**Use Cases:**
- Long-running builds
- Test execution
- Code generation
- File operations
- Network operations

**Platform Support:**
- macOS: Full support
- Windows: Full support
- Linux: Full support

### 3. Notification Service (`NotificationService.ts`)

**Location:** `src/main/services/NotificationService.ts`

**Purpose:** Native OS notifications

**Responsibilities:**
- Show native notifications
- Check notification support
- Handle notification actions (macOS)
- Provide notification helpers

**Key Methods:**
```typescript
class NotificationService {
  isSupported(): boolean
  show(title: string, body: string, options?: {...}): Notification | null
  success(title: string, body: string): Notification | null
  error(title: string, body: string): Notification | null
  warning(title: string, body: string): Notification | null
  info(title: string, body: string): Notification | null
}
```

**Notification Options:**
```typescript
{
  icon?: string;           // Notification icon
  sound?: boolean;         // Play sound (default: true)
  urgency?: 'normal' | 'critical';
  actions?: Array<{       // macOS only
    type: 'button';
    text: string;
  }>;
}
```

**Usage:**
```typescript
// Simple notification
notificationService.success('Build Complete', 'Your build finished successfully');

// Notification with options
notificationService.show('Task Complete', 'Your task has finished', {
  icon: '/path/to/icon.png',
  sound: true,
  urgency: 'normal',
});
```

**Platform Support:**
- macOS: Full support including actions
- Windows: Full support
- Linux: Full support (via libnotify)

### 4. Scheduled Prompt Executor (`ScheduledPromptExecutor.ts`)

**Location:** `src/main/services/ScheduledPromptExecutor.ts`

**Purpose:** Execute scheduled AI prompts

**Responsibilities:**
- Poll for scheduled prompts
- Execute prompts at scheduled times
- Handle execution errors
- Manage execution lifecycle

**Key Methods:**
```typescript
class ScheduledPromptExecutor {
  start(): void
  stop(): void
  async executePendingPrompts(): Promise<void>
}
```

**Features:**
- Polling interval configuration
- Error handling and retry logic
- Execution state tracking
- Integration with execution engine

---

## Service Integration

### Initialization

Services are initialized in the main process:

```typescript
// In main.ts
import { resourceCleanupManager } from './services/ResourceCleanupManager';
import { powerManagement } from './services/PowerManagement';
import { notificationService } from './services/NotificationService';
import { startScheduledPromptExecutor } from './services/ScheduledPromptExecutor';

app.whenReady().then(() => {
  // Start scheduled executor
  startScheduledPromptExecutor();
  
  // Register cleanup handlers
  app.on('before-quit', async () => {
    await resourceCleanupManager.cleanupAll();
  });
});
```

### Resource Registration

Resources register themselves for cleanup:

```typescript
// Example: FileWatcher registration
class FileWatcher implements Cleanupable {
  constructor() {
    resourceCleanupManager.register('fileWatcher', this);
  }
  
  async cleanup(): Promise<void> {
    await this.close();
    resourceCleanupManager.unregister('fileWatcher');
  }
}
```

---

## Power Management

### Use Cases

**Long-Running Operations:**
```typescript
// Prevent sleep during build
const blockerId = powerManagement.preventSleep();
try {
  await executeBuild();
} finally {
  powerManagement.allowSleep();
}
```

**Multiple Operations:**
```typescript
// Power management handles multiple prevent calls
// Only stops when all operations complete
powerManagement.preventSleep(); // Operation 1
powerManagement.preventSleep(); // Operation 2
// ... operations run ...
powerManagement.allowSleep(); // Operation 1 completes
powerManagement.allowSleep(); // Operation 2 completes
// System can sleep now
```

### Best Practices

1. Always use try/finally to ensure `allowSleep()` is called
2. Track blocker IDs if managing multiple operations
3. Check `isPreventingSleep()` before preventing again
4. Allow sleep as soon as operation completes

---

## Notifications

### Notification Types

**Success:**
```typescript
notificationService.success('Operation Complete', 'Your operation finished successfully');
```

**Error:**
```typescript
notificationService.error('Operation Failed', 'An error occurred during the operation');
```

**Warning:**
```typescript
notificationService.warning('Warning', 'This operation may take a while');
```

**Info:**
```typescript
notificationService.info('Information', 'Your build is starting');
```

### Notification Actions (macOS)

```typescript
notificationService.show('Task Complete', 'Your task has finished', {
  actions: [
    { type: 'button', text: 'View' },
    { type: 'button', text: 'Dismiss' },
  ],
});

// Handle action in notification event
notification.on('action', (event, index) => {
  if (index === 0) {
    // Handle "View" action
  }
});
```

---

## Resource Cleanup

### Cleanupable Interface

Any resource that needs cleanup should implement:

```typescript
interface Cleanupable {
  cleanup(): void | Promise<void>;
}
```

### Registration Pattern

```typescript
class MyService implements Cleanupable {
  private cleanupId = 'myService';
  
  constructor() {
    resourceCleanupManager.register(this.cleanupId, this);
  }
  
  async cleanup(): Promise<void> {
    // Cleanup logic
    await this.close();
    resourceCleanupManager.unregister(this.cleanupId);
  }
}
```

### Cleanup Order

Resources are cleaned up in registration order. For dependencies, ensure dependent resources are registered after their dependencies.

---

## Error Handling

### Resource Cleanup Errors

```typescript
async cleanupAll(): Promise<void> {
  const errors: Array<{ id: string; error: any }> = [];
  
  for (const [id, resource] of this.resources) {
    try {
      await resource.cleanup();
    } catch (error) {
      errors.push({ id, error });
      console.error(`Failed to cleanup resource ${id}:`, error);
    }
  }
  
  if (errors.length > 0) {
    console.error('Some resources failed to cleanup:', errors);
  }
}
```

### Notification Errors

Notifications gracefully handle unsupported platforms:

```typescript
if (!this.isSupported()) {
  console.warn('Notifications are not supported on this system');
  return null;
}
```

---

## Platform-Specific Behavior

### macOS

- **Notifications:** Full support including actions
- **Power Management:** Full support
- **Resource Cleanup:** Full support

### Windows

- **Notifications:** Full support (Windows 10+)
- **Power Management:** Full support
- **Resource Cleanup:** Full support

### Linux

- **Notifications:** Requires libnotify
- **Power Management:** Full support
- **Resource Cleanup:** Full support

---

## Testing

### Mock Services

For testing, services can be mocked:

```typescript
// Mock notification service
const mockNotificationService = {
  show: jest.fn(),
  isSupported: () => true,
};

// Mock power management
const mockPowerManagement = {
  preventSleep: jest.fn(),
  allowSleep: jest.fn(),
  isPreventingSleep: () => false,
};
```

### Resource Cleanup Testing

```typescript
// Test resource cleanup
const resource = {
  cleanup: jest.fn(),
};

resourceCleanupManager.register('test', resource);
await resourceCleanupManager.cleanupAll();

expect(resource.cleanup).toHaveBeenCalled();
```

---

## Best Practices

1. ✅ **Always Cleanup** - Register resources for cleanup
2. ✅ **Power Management** - Use try/finally for power management
3. ✅ **Notifications** - Check support before showing
4. ✅ **Error Handling** - Handle cleanup errors gracefully
5. ✅ **Resource Tracking** - Track all resources that need cleanup
6. ✅ **Platform Awareness** - Handle platform-specific behavior
7. ✅ **Async Cleanup** - Support both sync and async cleanup

---

## Related Modules

- **Electron Main Process Module** - Initializes services
- **IPC Communication Module** - May use notifications
- **Execution Module** - Uses power management

---

## Summary

The Platform Services Module provides essential OS-level services for the Coder IDE application. With resource cleanup management, power management, native notifications, and scheduled task execution, it ensures proper resource lifecycle management and system integration across all platforms.
