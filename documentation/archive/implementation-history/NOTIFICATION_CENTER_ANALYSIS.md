# Notification Center Implementation Analysis

## Current State

### ToastContext Implementation
**File**: `src/renderer/contexts/ToastContext.tsx`

**Current Features**:
- ✅ Action buttons (up to 2 via Sonner)
- ✅ Progress notifications
- ✅ Persistent notifications
- ✅ Promise-based notifications
- ✅ Types: success, error, info, warning, loading

**Missing**:
- ❌ Notification history tracking
- ❌ Notification center UI (bell icon + panel)
- ❌ Clear all notifications
- ❌ Individual notification dismissal from center

### StatusBar Implementation
**File**: `src/renderer/components/StatusBar.tsx`

**Current Features**:
- ✅ Status bar items with keyboard navigation
- ✅ Clickable items
- ✅ Items passed as props from MainLayout

**Missing**:
- ❌ Bell icon for notification center
- ❌ Badge showing notification count

### MainLayout Integration
**File**: `src/renderer/components/MainLayout.tsx`

**Current Features**:
- ✅ Status bar items defined in `statusBarItems` array
- ✅ Items passed to StatusBar component

**Missing**:
- ❌ Notification center state management
- ❌ Notification center panel/dialog

## VS Code Notification Center Requirements

From `.cursor/Vscode.md`:
1. **Bell icon** in status bar
2. **Badge** showing notification count
3. **Click bell** to open notification center
4. **Notification history** - all past notifications
5. **Clear all** option
6. **Individual dismissal** from center
7. **Notification types** displayed (info, warning, error, progress)

## Implementation Plan

### Step 1: Enhance ToastContext to Track History
- Add notification history state
- Store notifications with metadata (id, type, message, timestamp, actions)
- Provide methods to clear history
- Emit events when notifications are added/removed

### Step 2: Create NotificationCenter Component
- Panel/dialog showing notification history
- List of notifications with type indicators
- Clear all button
- Individual dismiss buttons
- Empty state when no notifications
- Keyboard navigation (Arrow keys, Enter, Escape)

### Step 3: Add Bell Icon to StatusBar
- Add bell icon item to status bar
- Show badge with notification count
- Click handler to open notification center
- Position on right side of status bar

### Step 4: Integrate into MainLayout
- Add notification center state
- Pass notification count to status bar
- Handle bell icon click
- Render NotificationCenter component

## Files to Create/Modify

### New Files
1. `src/renderer/components/NotificationCenter.tsx` - Notification center panel component

### Modified Files
1. `src/renderer/contexts/ToastContext.tsx` - Add history tracking
2. `src/renderer/components/MainLayout.tsx` - Add bell icon and notification center state
3. `src/renderer/components/StatusBar.tsx` - Support badge prop for items

## Dependencies

### Existing
- `ToastContext` - Already enhanced with action buttons, progress, etc.
- `StatusBar` - Already supports clickable items
- `shadcn/ui` - Dialog/Sheet components for notification center panel
- React hooks - useState, useCallback, useEffect

### New
- None - all dependencies already available

## Integration Points

1. **ToastContext** → **NotificationCenter**: Read notification history
2. **ToastContext** → **StatusBar**: Get notification count for badge
3. **MainLayout** → **StatusBar**: Pass bell icon item with count
4. **MainLayout** → **NotificationCenter**: Control visibility

## Accessibility Considerations

- Bell icon: `aria-label="Notifications"`, `aria-describedby` for count
- Badge: `aria-label` with count
- Notification center: ARIA dialog/region, keyboard navigation
- Clear all button: `aria-label`
- Individual dismiss: `aria-label` per notification

## Testing Considerations

- Notification history persists across toast dismissals
- Badge count updates correctly
- Clear all removes all notifications
- Individual dismiss works
- Keyboard navigation works
- Empty state displays correctly
