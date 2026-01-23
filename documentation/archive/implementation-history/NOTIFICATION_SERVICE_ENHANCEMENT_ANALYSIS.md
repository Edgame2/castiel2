# Notification Service Enhancement Analysis

## Current State

### ToastContext Implementation
**File**: `src/renderer/contexts/ToastContext.tsx`

**Current Features**:
- ✅ Basic types: success, error, info, warning
- ✅ Simple API: showSuccess, showError, showInfo, showWarning
- ✅ Duration configuration
- ✅ Title and description support
- ✅ Uses Sonner library

**Missing VS Code Features**:
- ❌ Action buttons
- ❌ Progress notifications
- ❌ Persistent notifications (don't auto-dismiss)
- ❌ Notification center
- ❌ Promise-based notifications (auto-update on resolve/reject)

### Sonner Library Capabilities
**File**: `src/renderer/components/ui/sonner.tsx`

**Available Features**:
- ✅ Action buttons (via `action` prop)
- ✅ Promise support (loading → success/error)
- ✅ Custom content
- ✅ Rich colors
- ✅ Close button
- ✅ Position configuration

## VS Code Notification System Requirements

From `.cursor/Vscode.md`:

1. **Notification Types**:
   - Information
   - Warning
   - Error
   - Progress (with progress bar)

2. **Action Buttons**:
   - Primary action (e.g., "Retry", "Open Settings")
   - Secondary action (optional)
   - Click handlers

3. **Auto-dismiss**:
   - Default: auto-dismiss after duration
   - Persistent: don't auto-dismiss (user must close)

4. **Progress Notifications**:
   - Show progress bar
   - Update progress percentage
   - Auto-dismiss on completion

5. **Promise-based**:
   - Show loading state
   - Auto-update on resolve/reject

## Implementation Plan

### Step 1: Enhance ToastOptions Interface
- Add `actions?: Array<{ label: string; onClick: () => void }>`
- Add `persistent?: boolean`
- Add `progress?: number` (0-100)

### Step 2: Add Progress Notification Support
- New method: `showProgress(message, options)`
- Support progress updates
- Auto-dismiss on completion

### Step 3: Add Promise-based Notifications
- Support promises in show methods
- Show loading → success/error automatically

### Step 4: Integrate with Sonner
- Use Sonner's `action` prop for action buttons
- Use Sonner's promise support for async operations
- Use Sonner's `loading` state for progress

## Files to Modify

1. `src/renderer/contexts/ToastContext.tsx` - Enhance interface and implementation
2. No new files needed (reuse existing Sonner setup)

## Dependencies

- ✅ Sonner library (already installed)
- ✅ ToastContext (already exists)
- ✅ Toaster component (already set up)

## Quality Checks

- ✅ TypeScript types complete
- ✅ Backward compatible (existing code continues to work)
- ✅ Action buttons work correctly
- ✅ Progress notifications update smoothly
- ✅ Promise-based notifications handle errors
