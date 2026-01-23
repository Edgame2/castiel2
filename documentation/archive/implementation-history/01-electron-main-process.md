# Electron Main Process Module

**Category:** Platform & Infrastructure  
**Location:** `src/main/`  
**Last Updated:** 2025-01-27

---

## Overview

The Electron Main Process Module is the entry point and core lifecycle manager for the Coder IDE desktop application. It handles application initialization, window management, menu configuration, and coordinates all main process services.

## Purpose

- Application entry point and initialization
- Window creation and lifecycle management
- Application menu configuration
- Preload script setup for secure IPC
- Single instance enforcement
- Crash reporting
- Security configuration

---

## Key Components

### 1. Main Entry Point (`main.ts`)

**Location:** `src/main/main.ts`

**Responsibilities:**
- Application lifecycle management
- Window creation and management
- IPC handler setup
- Menu initialization
- Security configuration
- Single instance lock
- Crash reporter initialization

**Key Functions:**
```typescript
// Application initialization
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
  createApplicationMenu(mainWindow);
  startScheduledPromptExecutor();
});

// Window creation
const createWindow = (): void => {
  // Creates BrowserWindow with security settings
  // Loads window state from disk
  // Sets up preload script
  // Configures webPreferences
}
```

**Security Features:**
- `nodeIntegration: false` - Prevents Node.js access in renderer
- `contextIsolation: true` - Isolates context for security
- `sandbox: true` (production) - Enables sandbox mode
- Content Security Policy (CSP) headers
- URL validation for external links
- Permission request handlers

### 2. Window State Management (`windowState.ts`)

**Location:** `src/main/windowState.ts`

**Responsibilities:**
- Persist window size and position
- Restore window state on startup
- Handle maximized/fullscreen states
- Validate window bounds against screen size

**Key Functions:**
```typescript
interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

loadWindowState(): WindowState | null
saveWindowState(window: BrowserWindow): void
applyWindowState(window: BrowserWindow, state: WindowState | null): void
setupWindowStatePersistence(window: BrowserWindow): void
```

**Features:**
- Automatic state persistence on window changes
- Debounced saving (500ms)
- Screen bounds validation
- Handles multi-monitor setups

### 3. Application Menu (`menu.ts`)

**Location:** `src/main/menu.ts`

**Responsibilities:**
- Native application menu creation
- Menu item updates and state management
- Context menu creation (editor, file explorer)
- Keyboard shortcut registration
- Platform-specific menu handling (macOS vs Windows/Linux)

**Key Functions:**
```typescript
createApplicationMenu(mainWindow: BrowserWindow): void
createEditorContextMenu(): Menu
createFileExplorerContextMenu(): Menu
updateMenuItem(id: string, updates: {...}): void
```

**Menu Structure:**
- File menu (New, Open, Save, etc.)
- Edit menu (Undo, Redo, Cut, Copy, Paste)
- View menu (Zoom, Theme, etc.)
- Go menu (Navigation commands)
- Run menu (Execution commands)
- Terminal menu (Terminal operations)
- Help menu (Documentation, About)

### 4. Preload Script (`preload.ts`)

**Location:** `src/main/preload.ts`

**Responsibilities:**
- Secure IPC bridge setup
- Exposes safe APIs to renderer process
- Type-safe IPC channel definitions
- Context isolation bridge

**Key Features:**
- Exposes IPC methods to renderer via `window.electronAPI`
- Type-safe interfaces for all IPC channels
- Security: No direct Node.js access from renderer
- Bridge pattern for safe communication

---

## Responsibilities

### Application Lifecycle

1. **Initialization:**
   - Configure Electron for platform (Linux, macOS, Windows)
   - Set up security settings
   - Initialize crash reporter
   - Request single instance lock

2. **Window Management:**
   - Create main application window
   - Restore window state from previous session
   - Handle window events (close, minimize, maximize)
   - Manage window state persistence

3. **Security:**
   - Configure Content Security Policy
   - Set up permission handlers
   - Validate external URLs
   - Enforce secure IPC communication

4. **Service Coordination:**
   - Initialize IPC handlers
   - Start background services (scheduled prompts, resource cleanup)
   - Set up power management
   - Coordinate menu system

---

## Dependencies

### Internal Dependencies
- `./ipc/handlers` - IPC handler setup
- `./menu` - Menu creation
- `./windowState` - Window state management
- `./services/*` - Background services
- `./utils/urlValidator` - URL validation

### External Dependencies
- `electron` - Electron framework
- `path`, `fs` - Node.js built-in modules

---

## Security Configuration

### Production Security Settings

```typescript
webPreferences: {
  nodeIntegration: false,        // Never enable
  contextIsolation: true,        // Always enable
  sandbox: true,                 // Production only
  webSecurity: true,            // Production only
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
}
```

### Content Security Policy

```typescript
// Production CSP
"default-src 'self' http://localhost:8080 data:; " +
"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
"style-src 'self' 'unsafe-inline'; " +
"connect-src 'self' http://localhost:8080 ws://localhost:3000; " +
"img-src 'self' data: https:; " +
"font-src 'self' data:;"
```

### Permission Handling

- **Allowed:** notifications, media
- **Denied:** All other permissions
- Custom handlers for permission requests

---

## Platform-Specific Configuration

### Linux Configuration

```typescript
// Sandbox configuration
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');

// GPU acceleration
app.commandLine.appendSwitch('--use-gl=egl');
app.commandLine.appendSwitch('--disable-features=VaapiVideoDecoder');

// Shared memory
app.commandLine.appendSwitch('--disable-dev-shm-usage');
```

### macOS Configuration

- Menu bar integration
- Dock icon management
- Native menu appearance

### Windows Configuration

- Single instance lock
- Window state persistence
- Taskbar integration

---

## Single Instance Lock

Prevents multiple instances of the application:

```typescript
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

---

## Crash Reporting

```typescript
if (process.env.NODE_ENV === 'production') {
  crashReporter.start({
    productName: app.getName(),
    companyName: 'Coder',
    submitURL: '', // Configure if available
    uploadToServer: false,
    compress: true,
  });
}
```

---

## Window State Persistence

**Storage Location:** `{userData}/window-state.json`

**Persistence Events:**
- Window move
- Window resize
- Maximize/unmaximize
- Enter/leave fullscreen
- Window close

**Debouncing:** 500ms delay to prevent excessive writes

---

## Error Handling

- URL validation for external links
- Window state load/save error handling
- Graceful degradation on service failures
- Error logging to console

---

## Integration Points

### IPC Communication
- Sets up all IPC handlers via `setupIpcHandlers()`
- Provides secure bridge via preload script

### Background Services
- `ScheduledPromptExecutor` - Scheduled AI prompt execution
- `ResourceCleanupManager` - Resource cleanup
- `PowerManagement` - Power state management

### Menu System
- Creates native application menu
- Updates menu items dynamically
- Handles keyboard shortcuts

---

## Best Practices Implemented

1. ✅ **Security First:** Never enable `nodeIntegration`, always use `contextIsolation`
2. ✅ **Single Instance:** Prevents multiple app instances
3. ✅ **State Persistence:** Saves window state for better UX
4. ✅ **Crash Reporting:** Initialized early for production
5. ✅ **Platform Awareness:** Handles platform-specific configurations
6. ✅ **Error Handling:** Graceful error handling throughout
7. ✅ **CSP Headers:** Content Security Policy for security
8. ✅ **Permission Management:** Controlled permission requests

---

## Usage Examples

### Creating a Window

```typescript
const createWindow = (): void => {
  const savedState = loadWindowState();
  
  mainWindow = new BrowserWindow({
    width: savedState?.width || 1200,
    height: savedState?.height || 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  applyWindowState(mainWindow, savedState);
  setupWindowStatePersistence(mainWindow);
}
```

### Handling External URLs

```typescript
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (validateExternalUrl(url)) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

---

## Testing Considerations

- Mock Electron APIs for unit tests
- Test window state persistence
- Test single instance lock behavior
- Test security configurations
- Test platform-specific code paths

---

## Future Enhancements

- Deep link support (custom URL schemes)
- Multi-window support
- Window groups/tabs
- Enhanced crash reporting integration
- Performance monitoring

---

## Related Modules

- **IPC Communication Module** - Handles all IPC channels
- **Platform Services Module** - OS-level services
- **Build & Configuration Module** - Build system setup

---

## Summary

The Electron Main Process Module is the foundation of the Coder IDE desktop application. It provides secure, platform-aware window management, application lifecycle control, and coordinates all main process services. The module follows Electron best practices for security, state management, and user experience.
