# Platform Services Module
## Services, Components, and OS Integration

---

## OVERVIEW

**Location:** `src/main/services/`  
**Purpose:** OS-level services and system integration for the Electron application

---

## SERVICE COMPONENTS

### 1. Resource Cleanup Manager

**File:** `ResourceCleanupManager.ts`  
**Location:** `src/main/services/ResourceCleanupManager.ts`

**Purpose:** Centralized resource cleanup on application shutdown

**Features:**
- Track resources requiring cleanup
- Execute cleanup on app shutdown
- Handle cleanup errors gracefully
- Prevent resource leaks
- Support async cleanup

**Interface:**
```typescript
interface Cleanupable {
  cleanup(): void | Promise<void>;
}
```

**Methods:**
```typescript
register(id: string, resource: Cleanupable): void
unregister(id: string): void
cleanupAll(): Promise<void>
isCleaningUp(): boolean
```

**Usage Examples:**
```typescript
// Register file watcher
resourceCleanupManager.register('fileWatcher', {
  cleanup: async () => {
    await fileWatcher.close();
  }
});

// Register database connection
resourceCleanupManager.register('database', {
  cleanup: async () => {
    await db.disconnect();
  }
});

// On app shutdown
app.on('before-quit', async () => {
  await resourceCleanupManager.cleanupAll();
});
```

**Resource Types Managed:**
- File watchers
- Database connections
- Network connections
- File streams
- Child processes
- Timer intervals
- Event listeners
- Temporary files

---

### 2. Power Management Service

**File:** `PowerManagement.ts`  
**Location:** `src/main/services/PowerManagement.ts`

**Purpose:** Prevent system sleep during critical operations

**Features:**
- Prevent system sleep
- Allow system sleep
- Track sleep prevention state
- Handle multiple sleep prevention requests
- Cross-platform support

**Methods:**
```typescript
preventSleep(): number | null
allowSleep(): void
isPreventingSleep(): boolean
```

**Usage Examples:**
```typescript
// Prevent sleep during build
const blockerId = powerManagement.preventSleep();
try {
  await runBuild();
} finally {
  powerManagement.allowSleep();
}

// Prevent sleep during test execution
const blockerId = powerManagement.preventSleep();
try {
  await runTests();
} finally {
  powerManagement.allowSleep();
}

// Check if sleep is prevented
if (powerManagement.isPreventingSleep()) {
  console.log('System sleep is currently prevented');
}
```

**Use Cases:**
- Long-running builds
- Test execution
- Code generation
- Large file operations
- Network uploads/downloads
- Database migrations
- Backup operations
- AI model processing

**Platform Support:**
- **macOS:** Full support via `powerSaveBlocker`
- **Windows:** Full support via `powerSaveBlocker`
- **Linux:** Full support via `powerSaveBlocker`

---

### 3. Notification Service

**File:** `NotificationService.ts`  
**Location:** `src/main/services/NotificationService.ts`

**Purpose:** Native OS notifications

**Features:**
- Show native notifications
- Check notification support
- Notification helpers (success, error, warning, info)
- Action buttons (macOS)
- Sound and urgency settings

**Methods:**
```typescript
isSupported(): boolean
show(title: string, body: string, options?: NotificationOptions): Notification | null
success(title: string, body: string): Notification | null
error(title: string, body: string): Notification | null
warning(title: string, body: string): Notification | null
info(title: string, body: string): Notification | null
```

**Notification Options:**
```typescript
interface NotificationOptions {
  icon?: string;
  sound?: boolean;
  urgency?: 'normal' | 'critical';
  actions?: Array<{
    type: 'button';
    text: string;
  }>;
}
```

**Usage Examples:**
```typescript
// Simple success notification
notificationService.success('Build Complete', 'Your build finished successfully');

// Error notification
notificationService.error('Build Failed', 'Build encountered errors');

// Warning notification
notificationService.warning('Deprecated API', 'This API will be removed in v2.0');

// Info notification
notificationService.info('Update Available', 'A new version is available');

// Custom notification with options
notificationService.show('Task Complete', 'Your task has finished', {
  icon: '/path/to/icon.png',
  sound: true,
  urgency: 'critical',
  actions: [
    { type: 'button', text: 'View Results' }
  ]
});
```

**Notification Types:**
- Success notifications (green, checkmark icon)
- Error notifications (red, error icon)
- Warning notifications (yellow, warning icon)
- Info notifications (blue, info icon)
- Custom notifications

**Platform Support:**
- **macOS:** Full support with actions
- **Windows:** Full support (Windows 10+)
- **Linux:** Full support (requires libnotify)

---

### 4. Scheduled Prompt Executor

**File:** `ScheduledPromptExecutor.ts`  
**Location:** `src/main/services/ScheduledPromptExecutor.ts`

**Purpose:** Execute scheduled AI prompts at specified times

**Features:**
- Poll for scheduled prompts
- Execute prompts at scheduled times
- Handle execution errors
- Manage execution lifecycle
- Configurable polling interval

**Methods:**
```typescript
start(): void
stop(): void
executePendingPrompts(): Promise<void>
```

**Configuration:**
```typescript
interface ScheduledPromptConfig {
  pollingInterval: number;  // milliseconds
  retryAttempts: number;
  retryDelay: number;
}
```

**Usage Example:**
```typescript
// Start scheduled executor on app ready
app.whenReady().then(() => {
  startScheduledPromptExecutor();
});

// Stop on app quit
app.on('before-quit', () => {
  scheduledPromptExecutor.stop();
});
```

**Features:**
- Automatic polling
- Retry on failure
- Error logging
- Integration with execution engine

---

## FILE SYSTEM INTEGRATION

### File Operations via IPC

**Available through:** `window.electronAPI.file.*`

**Operations:**
```typescript
// Read file
read(path: string): Promise<string>

// Write file
write(path: string, content: string): Promise<void>

// Create directory
createDirectory(path: string): Promise<void>

// Delete file/directory
delete(path: string): Promise<void>

// Rename/Move
rename(oldPath: string, newPath: string): Promise<void>

// Copy
copy(sourcePath: string, destPath: string): Promise<void>

// Check existence
exists(path: string): Promise<boolean>

// Get file stats
stat(path: string): Promise<FileStats>

// Watch file/directory
watch(path: string, callback: (event: FileEvent) => void): void

// List directory
readDirectory(path: string): Promise<FileEntry[]>
```

**File Event Types:**
- `change` - File content changed
- `rename` - File renamed/moved
- `delete` - File deleted
- `create` - File created

---

## SYSTEM INTEGRATION

### OS-Specific Features

#### macOS Integration
- Menu bar integration
- Dock icon management
- Native notifications with actions
- Power management
- File system events (FSEvents)
- Keychain access (via keytar)

#### Windows Integration
- System tray
- Taskbar integration
- Native notifications
- Power management
- File system events
- Credential manager (via keytar)

#### Linux Integration
- System tray
- Desktop notifications (libnotify)
- Power management
- File system events (inotify)
- Secret storage (via keytar)

---

## NATIVE MODULES

### 1. keytar (Credential Storage)

**Purpose:** Secure credential storage

**Platform:**
- macOS: Keychain
- Windows: Credential Manager
- Linux: Secret Service API

**Usage:**
```typescript
import * as keytar from 'keytar';

// Store credential
await keytar.setPassword('coder-ide', 'user-token', token);

// Retrieve credential
const token = await keytar.getPassword('coder-ide', 'user-token');

// Delete credential
await keytar.deletePassword('coder-ide', 'user-token');
```

---

## SERVICE INITIALIZATION

### Startup Sequence

**In main.ts:**
```typescript
app.whenReady().then(() => {
  // 1. Initialize services
  const resourceCleanupManager = new ResourceCleanupManager();
  const powerManagement = new PowerManagementService();
  const notificationService = new NotificationService();
  
  // 2. Start scheduled executor
  startScheduledPromptExecutor();
  
  // 3. Register cleanup handlers
  app.on('before-quit', async (event) => {
    event.preventDefault();
    await resourceCleanupManager.cleanupAll();
    app.quit();
  });
  
  // 4. Create window
  createWindow();
});
```

---

## RESOURCE TRACKING

### Registered Resources

**Common Resources:**
1. File watchers
2. Database connections
3. WebSocket connections
4. Child processes
5. File streams
6. Network sockets
7. Timer intervals
8. Event listeners
9. Temporary files
10. Cache directories

**Registration Pattern:**
```typescript
class MyResource implements Cleanupable {
  constructor() {
    resourceCleanupManager.register('my-resource', this);
  }
  
  async cleanup(): Promise<void> {
    // Cleanup logic
    await this.close();
    resourceCleanupManager.unregister('my-resource');
  }
}
```

---

## ERROR HANDLING

### Cleanup Errors

**Strategy:**
- Continue cleanup even if one fails
- Collect all errors
- Log errors to console
- Report errors to user (if critical)

**Example:**
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
    // Optionally show notification to user
    notificationService.warning(
      'Cleanup Incomplete',
      `${errors.length} resource(s) failed to cleanup properly`
    );
  }
}
```

### Notification Errors

**Strategy:**
- Check support before showing
- Log warning if unsupported
- Degrade gracefully

---

## PERFORMANCE CONSIDERATIONS

### Resource Cleanup

**Best Practices:**
- Register resources early
- Unregister when no longer needed
- Use unique IDs for resources
- Handle async cleanup properly
- Don't block during cleanup

### Power Management

**Best Practices:**
- Always use try/finally
- Track blocker IDs
- Don't forget to allow sleep
- Check state before preventing

### Notifications

**Best Practices:**
- Don't spam notifications
- Use appropriate urgency
- Provide meaningful messages
- Check support before showing

---

## TESTING

### Mock Services

**Resource Cleanup Manager:**
```typescript
const mockCleanupManager = {
  register: jest.fn(),
  unregister: jest.fn(),
  cleanupAll: jest.fn().mockResolvedValue(undefined),
  isCleaningUp: jest.fn().mockReturnValue(false)
};
```

**Power Management:**
```typescript
const mockPowerManagement = {
  preventSleep: jest.fn().mockReturnValue(1),
  allowSleep: jest.fn(),
  isPreventingSleep: jest.fn().mockReturnValue(false)
};
```

**Notification Service:**
```typescript
const mockNotificationService = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  isSupported: jest.fn().mockReturnValue(true)
};
```

---

## NO UI COMPONENTS

The Platform Services module has **no UI components** - it operates entirely in the Electron main process.

---

## NO API ENDPOINTS

The Platform Services module has **no API endpoints** - it provides OS-level services to the main process only.

**However, it integrates with IPC for:**
- File operations (via IPC handlers)
- Notification requests (via IPC)
- Power management requests (via IPC)

---

## INTEGRATION WITH OTHER MODULES

### Used By:

1. **Electron Main Process Module**
   - Initializes all services
   - Registers cleanup handlers

2. **IPC Communication Module**
   - File operation handlers
   - Notification handlers

3. **Execution Module**
   - Uses power management during execution
   - Uses notifications for completion

4. **File Management Module**
   - Uses file operations via IPC
   - Uses file watching

5. **Build & Configuration Module**
   - Uses power management during builds

---

## SUMMARY

### Service Components: 4

1. **Resource Cleanup Manager**
   - Centralized resource cleanup
   - Prevents resource leaks

2. **Power Management Service**
   - Prevent system sleep
   - Support long operations

3. **Notification Service**
   - Native OS notifications
   - Multiple notification types

4. **Scheduled Prompt Executor**
   - Execute scheduled AI prompts
   - Automatic polling

### Features:

- **Resource Management:** Automatic cleanup
- **Power Management:** Sleep prevention
- **Notifications:** Native OS integration
- **File System:** Full file operations
- **Cross-Platform:** macOS, Windows, Linux

### Platform Support:

- **macOS:** Full support (all features)
- **Windows:** Full support (all features)
- **Linux:** Full support (all features)

### No UI Components
### No API Endpoints

The Platform Services module is a main process service layer with no direct user interface or HTTP endpoints.
