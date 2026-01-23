# Activity Bar & Views Module

**Category:** Editor & UI  
**Location:** `src/renderer/components/ActivityBar/`, `src/renderer/components/views/`  
**Last Updated:** 2025-01-27

---

## Overview

The Activity Bar & Views Module provides the sidebar navigation structure and view management for the Coder IDE. It includes the activity bar, view containers, panel management, and view switching functionality.

## Purpose

- Sidebar navigation structure
- View lifecycle management
- Panel management
- View state persistence
- Customizable activity bar
- Keyboard navigation

---

## Key Components

### 1. Activity Bar (`ActivityBar.tsx`)

**Location:** `src/renderer/components/ActivityBar.tsx`

**Purpose:** Primary sidebar navigation

**Features:**
- Icon-based navigation
- Badge counts
- Tooltips
- Keyboard navigation
- Customizable order
- Hide/show items
- Context menus

**Activity Views:**
- `explorer` - File explorer
- `search` - Search view
- `source-control` - Git source control
- `debug` - Debug panel
- `extensions` - Extensions view
- `chat` - AI chat
- `plans` - Planning view
- `project` - Project management
- `productivity` - Productivity modules
- `settings` - Settings view

**Keyboard Shortcuts:**
- `Ctrl/Cmd + Shift + E` - Explorer
- `Ctrl/Cmd + Shift + F` - Search
- `Ctrl/Cmd + Shift + G` - Source Control
- `Ctrl/Cmd + Shift + D` - Debug
- `Ctrl/Cmd + Shift + X` - Extensions
- `Ctrl/Cmd + ,` - Settings

### 2. Activity Bar Item (`ActivityBarItem.tsx`)

**Location:** `src/renderer/components/ActivityBarItem.tsx`

**Purpose:** Individual activity bar item

**Features:**
- Icon display
- Badge count
- Active state
- Tooltip
- Click handler
- Keyboard focus

### 3. View Containers

**Components:**
- `SecondarySidebar.tsx` - Secondary sidebar for views
- View panels for each activity

**Features:**
- View switching
- Panel layout
- View state management

---

## Activity Bar Features

### Customizable Order

Users can reorder activity bar items:

```typescript
const { moveActivityBarItem } = useLayoutService();

// Move item to new position
moveActivityBarItem('chat', 0); // Move to top
```

### Hide/Show Items

Users can hide activity bar items:

```typescript
const { toggleActivityBarItemVisibility } = useLayoutService();

// Toggle item visibility
toggleActivityBarItemVisibility('extensions', false); // Hide
```

### Badge Counts

Display notification counts:

```typescript
<ActivityBar
  activeView={activeView}
  onViewChange={setActiveView}
  badgeCounts={{
    'source-control': 3, // 3 uncommitted changes
    'debug': 1, // 1 breakpoint
  }}
/>
```

### Context Menu

Right-click on activity bar items:

**Options:**
- Move Up
- Move Down
- Hide
- Reset Order

---

## View Management

### View Lifecycle

**States:**
1. **Inactive** - View not loaded
2. **Loading** - View is loading
3. **Active** - View is displayed
4. **Hidden** - View is hidden but loaded

### View Switching

```typescript
const [activeView, setActiveView] = useState<ActivityView>('explorer');

const handleViewChange = (view: ActivityView) => {
  setActiveView(view);
  // Load view if needed
  loadView(view);
};
```

### View Persistence

View state is persisted:
- Active view
- View settings
- Panel sizes
- View preferences

---

## Panel Management

### Panel Layout

**Structure:**
```
┌─────────────────┐
│   Activity Bar  │
├─────────────────┤
│                 │
│   View Panel    │
│                 │
│                 │
└─────────────────┘
```

### Panel Resizing

Panels can be resized:
- Drag to resize
- Minimum/maximum sizes
- Persist sizes

### Secondary Sidebar

Secondary sidebar for additional panels:
- Output panel
- Problems panel
- Terminal panel
- Debug console

---

## Keyboard Navigation

### Activity Bar Navigation

**Keys:**
- `Arrow Up` - Previous item
- `Arrow Down` - Next item
- `Home` - First item
- `End` - Last item
- `Enter` - Activate item
- `Escape` - Close context menu

### Focus Management

- Focus moves to activity bar on activation
- Focus returns to previous element on close
- Focus trap in dialogs

---

## View Components

### Explorer View

**Component:** File Explorer

**Features:**
- File tree
- File operations
- Search in files
- Context menus

### Search View

**Component:** Search Panel

**Features:**
- Text search
- File search
- Replace
- Search history

### Source Control View

**Component:** Source Control Panel

**Features:**
- Git status
- Changes list
- Commit interface
- Branch management

### Debug View

**Component:** Debug Panel

**Features:**
- Breakpoints
- Variables
- Call stack
- Debug console

### Extensions View

**Component:** Extensions Panel

**Features:**
- Installed extensions
- Extension marketplace
- Extension settings

### Chat View

**Component:** AI Chat Panel

**Features:**
- AI chat interface
- Chat history
- Context management

### Plans View

**Component:** Plans Panel

**Features:**
- Plan list
- Plan execution
- Plan history

### Project View

**Component:** Project Management Panel

**Features:**
- Project list
- Project settings
- Project context

### Productivity View

**Component:** Productivity Modules Panel

**Features:**
- Calendar
- Tasks
- Messaging
- Knowledge base

### Settings View

**Component:** Settings Panel

**Features:**
- Settings categories
- Setting search
- Setting editor

---

## Layout Service Integration

### Layout Service (`useLayoutService`)

**Purpose:** Manage layout state

**Features:**
- Activity bar order
- Hidden items
- Panel sizes
- View preferences
- Layout persistence

**API:**
```typescript
const {
  layoutInfo,
  moveActivityBarItem,
  toggleActivityBarItemVisibility,
  setPanelSize,
  getLayoutPreferences,
} = useLayoutService();
```

---

## View State Persistence

### Persisted State

- Active view
- Activity bar order
- Hidden items
- Panel sizes
- View preferences

### Storage

State persisted to:
- LocalStorage (client-side)
- Backend API (optional, for sync)

---

## Accessibility

### ARIA Labels

All activity bar items have:
- `aria-label` - Item label
- `aria-selected` - Active state
- `aria-badge` - Badge count

### Keyboard Navigation

- Full keyboard support
- Focus indicators
- Screen reader support

### Focus Management

- Focus trap in views
- Focus restoration
- Focus indicators

---

## Customization

### Custom Activities

Users can add custom activities:
- Custom icons
- Custom views
- Custom handlers

### Theme Support

Activity bar supports themes:
- Light theme
- Dark theme
- High contrast

---

## Usage Examples

### Basic Activity Bar

```typescript
const [activeView, setActiveView] = useState<ActivityView>('explorer');

<ActivityBar
  activeView={activeView}
  onViewChange={setActiveView}
  badgeCounts={{
    'source-control': gitChanges.length,
  }}
/>
```

### Custom Order

```typescript
const { layoutInfo } = useLayoutService();

// Get custom order
const customOrder = layoutInfo.activityBarOrder;

// Apply custom order
<ActivityBar
  activeView={activeView}
  onViewChange={setActiveView}
  customOrder={customOrder}
/>
```

### View Rendering

```typescript
{activeView === 'explorer' && <FileExplorer />}
{activeView === 'search' && <SearchPanel />}
{activeView === 'source-control' && <SourceControlPanel />}
{activeView === 'debug' && <DebugPanel />}
```

---

## Related Modules

- **File Management Module** - Explorer view
- **Command & Palette Module** - View commands
- **UI Components Module** - UI components

---

## Summary

The Activity Bar & Views Module provides the primary navigation structure for the Coder IDE. With customizable activity bar, view management, panel layout, and keyboard navigation, it enables efficient navigation and view switching throughout the application.
