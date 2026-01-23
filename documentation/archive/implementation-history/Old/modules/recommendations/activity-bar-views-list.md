# Activity Bar & Views Module
## Sidebar Navigation and View Management

---

## OVERVIEW

**Location:** `src/renderer/components/ActivityBar/`, `src/renderer/components/views/`  
**Purpose:** Primary sidebar navigation structure and view management for the IDE

---

## UI COMPONENTS

### Main Components

#### 1. Activity Bar
**File:** `ActivityBar.tsx`  
**Location:** `src/renderer/components/ActivityBar.tsx`

**Purpose:** Primary sidebar navigation with icon-based navigation

**Features:**
- Icon-based navigation buttons
- Badge counts for notifications
- Tooltips on hover
- Active state indication
- Customizable order
- Hide/show items
- Context menus
- Keyboard navigation

**Activity Views:**
```typescript
type ActivityView = 
  | 'explorer'        // File explorer
  | 'search'          // Search panel
  | 'source-control'  // Git source control
  | 'debug'           // Debug panel
  | 'extensions'      // Extensions marketplace
  | 'chat'            // AI chat
  | 'plans'           // Planning view
  | 'project'         // Project management
  | 'productivity'    // Productivity modules
  | 'settings';       // Settings panel
```

---

#### 2. Activity Bar Item
**File:** `ActivityBarItem.tsx`  
**Location:** `src/renderer/components/ActivityBarItem.tsx`

**Purpose:** Individual activity bar navigation item

**Features:**
- Icon display
- Badge count display
- Active/inactive states
- Tooltip with label
- Click handler
- Keyboard focus
- Context menu support

**Props:**
```typescript
interface ActivityBarItemProps {
  id: string;
  icon: React.ComponentType;
  label: string;
  active: boolean;
  badgeCount?: number;
  onClick: () => void;
  onContextMenu?: () => void;
}
```

---

#### 3. Secondary Sidebar
**File:** `SecondarySidebar.tsx`  
**Location:** `src/renderer/components/SecondarySidebar.tsx`

**Purpose:** Secondary sidebar for additional panels

**Features:**
- Output panel
- Problems panel
- Terminal panel
- Debug console
- Panel switching
- Resizable panels
- Collapse/expand

---

### View Panels

#### 4. Explorer View
**Component:** File Explorer (from File Management module)

**Features:**
- File tree navigation
- File operations
- Folder operations
- Context menus
- Search in files

---

#### 5. Search View
**Component:** Search Panel

**Features:**
- Text search across files
- File name search
- Replace in files
- Search history
- Include/exclude patterns
- Case sensitivity toggle
- Whole word toggle
- Regex support

**Search Options:**
```typescript
interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includePatterns: string[];
  excludePatterns: string[];
}
```

---

#### 6. Source Control View
**Component:** Source Control Panel

**Features:**
- Git status display
- Staged/unstaged changes
- Commit interface
- Branch management
- Merge/rebase operations
- Conflict resolution
- Git history

**Git Operations:**
- Stage/unstage files
- Commit changes
- Push/pull
- Create/switch branches
- Merge branches
- View diffs
- Resolve conflicts

---

#### 7. Debug View
**Component:** Debug Panel

**Features:**
- Breakpoint management
- Variable inspection
- Call stack view
- Watch expressions
- Debug console
- Step controls (step over, step into, step out)
- Continue/pause/stop

**Debug Controls:**
- Start debugging
- Stop debugging
- Restart debugging
- Step over
- Step into
- Step out
- Continue

---

#### 8. Extensions View
**Component:** Extensions Panel

**Features:**
- Installed extensions list
- Extension marketplace
- Extension search
- Install/uninstall extensions
- Enable/disable extensions
- Extension settings
- Extension recommendations

---

#### 9. Chat View
**Component:** AI Chat Panel

**Features:**
- AI chat interface
- Message history
- Context management
- Code snippets in chat
- File references
- Clear chat
- Export chat

---

#### 10. Plans View
**Component:** Plans Panel

**Features:**
- Plan list
- Plan creation
- Plan execution
- Plan history
- Plan status
- Plan validation
- Plan refinement

---

#### 11. Project View
**Component:** Project Management Panel

**Features:**
- Project list
- Project selection
- Project settings
- Project context
- Project members
- Project tasks
- Project roadmap

---

#### 12. Productivity View
**Component:** Productivity Modules Panel

**Features:**
- Calendar integration
- Task management
- Team messaging
- Knowledge base
- Code reviews
- Incidents
- Releases

---

#### 13. Settings View
**Component:** Settings Panel

**Features:**
- Settings categories
- Setting search
- User settings
- Workspace settings
- Extension settings
- Keyboard shortcuts
- Theme selection

---

## ACTIVITY BAR FEATURES

### 1. Customizable Order

**API:**
```typescript
const { moveActivityBarItem } = useLayoutService();

// Move item to position
moveActivityBarItem('chat', 0); // Move to top
moveActivityBarItem('extensions', 5); // Move to position 5
```

**Features:**
- Drag and drop reordering
- Context menu "Move Up/Down"
- Persist custom order
- Reset to default order

---

### 2. Hide/Show Items

**API:**
```typescript
const { toggleActivityBarItemVisibility } = useLayoutService();

// Hide item
toggleActivityBarItemVisibility('extensions', false);

// Show item
toggleActivityBarItemVisibility('extensions', true);
```

**Features:**
- Toggle visibility
- Hidden items menu
- Show all option
- Persist visibility state

---

### 3. Badge Counts

**Usage:**
```typescript
<ActivityBar
  activeView={activeView}
  onViewChange={setActiveView}
  badgeCounts={{
    'source-control': 5,    // 5 uncommitted changes
    'debug': 2,             // 2 active breakpoints
    'productivity': 10,     // 10 unread messages
  }}
/>
```

**Badge Types:**
- Numeric count
- Dot indicator (for presence)
- Color coding (info, warning, error)

---

### 4. Context Menu

**Right-click Menu Options:**
- Move Up
- Move Down
- Hide Item
- Reset Order
- Customize...

---

### 5. Keyboard Shortcuts

**Navigation Shortcuts:**
- `Ctrl/Cmd + Shift + E` - Explorer
- `Ctrl/Cmd + Shift + F` - Search
- `Ctrl/Cmd + Shift + G` - Source Control
- `Ctrl/Cmd + Shift + D` - Debug
- `Ctrl/Cmd + Shift + X` - Extensions
- `Ctrl/Cmd + Shift + Y` - Chat
- `Ctrl/Cmd + Shift + P` - Plans
- `Ctrl/Cmd + ,` - Settings

**Activity Bar Navigation:**
- `Arrow Up` - Previous item
- `Arrow Down` - Next item
- `Home` - First item
- `End` - Last item
- `Enter` - Activate item
- `Escape` - Close view

---

## VIEW MANAGEMENT

### 1. View Lifecycle

**States:**
```typescript
type ViewState = 
  | 'inactive'  // Not loaded
  | 'loading'   // Loading
  | 'active'    // Displayed and active
  | 'hidden';   // Hidden but loaded
```

**Lifecycle:**
1. Inactive → Loading (on first activation)
2. Loading → Active (when loaded)
3. Active ↔ Hidden (on view switch)
4. Active/Hidden → Inactive (on app close)

---

### 2. View Switching

**API:**
```typescript
const [activeView, setActiveView] = useState<ActivityView>('explorer');

const handleViewChange = (view: ActivityView) => {
  setActiveView(view);
  
  // Load view if needed
  if (!viewsLoaded.includes(view)) {
    loadView(view);
  }
};
```

**Features:**
- Lazy loading of views
- View state persistence
- Smooth transitions
- Keep previous view in memory

---

### 3. View Persistence

**Persisted State:**
- Active view
- View scroll position
- View filters/settings
- Panel sizes
- Expanded/collapsed sections

**Storage:**
```typescript
interface ViewState {
  activeView: ActivityView;
  scrollPosition: Record<ActivityView, number>;
  viewSettings: Record<ActivityView, any>;
  panelSizes: Record<string, number>;
}
```

---

## PANEL MANAGEMENT

### 1. Panel Layout

**Structure:**
```
┌─────────────────┐
│  Activity Bar   │
├─────────────────┤
│                 │
│   View Panel    │
│                 │
│   (Resizable)   │
│                 │
└─────────────────┘
```

**Features:**
- Vertical layout
- Resizable panels
- Minimum/maximum sizes
- Collapse/expand
- Persist sizes

---

### 2. Panel Resizing

**Resize Handle:**
- Drag border to resize
- Double-click to reset
- Keyboard resize (Alt + Arrow keys)
- Snap to min/max

**Size Constraints:**
```typescript
interface PanelConstraints {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
}

const constraints = {
  minWidth: 200,
  maxWidth: 600,
  defaultWidth: 300,
};
```

---

### 3. Secondary Sidebar

**Panels:**
- Output panel
- Problems panel
- Terminal panel
- Debug console

**Position:** Bottom or side of editor area

**Features:**
- Panel switching
- Multiple panels open
- Resizable
- Drag to reorder tabs

---

## LAYOUT SERVICE

### Layout Service Hook

**File:** `useLayoutService.ts`  
**Location:** `src/renderer/hooks/useLayoutService.ts`

**API:**
```typescript
const {
  layoutInfo,
  moveActivityBarItem,
  toggleActivityBarItemVisibility,
  setPanelSize,
  getPanelSize,
  getLayoutPreferences,
  resetLayout,
} = useLayoutService();
```

**Layout Info:**
```typescript
interface LayoutInfo {
  activityBarOrder: string[];
  hiddenItems: string[];
  panelSizes: Record<string, number>;
  activeView: ActivityView;
  sidebarVisible: boolean;
}
```

---

## KEYBOARD NAVIGATION

### Activity Bar Navigation

**Keys:**
- `Arrow Up/Down` - Navigate items
- `Home` - First item
- `End` - Last item
- `Enter` - Activate item
- `Space` - Toggle item
- `Escape` - Close context menu

---

### Focus Management

**Focus Flow:**
1. Focus moves to activity bar on activation
2. Focus moves to view content after selection
3. Focus returns to previous element on close
4. Focus trap in modal dialogs

**Focus Indicators:**
- Visible focus outline
- High contrast mode support
- Keyboard-only navigation

---

## ACCESSIBILITY

### ARIA Support

**Activity Bar:**
```typescript
<nav 
  role="navigation" 
  aria-label="Activity Bar"
>
  <button
    role="tab"
    aria-label="Explorer"
    aria-selected={active}
    aria-badge={badgeCount}
  >
    {/* Icon */}
  </button>
</nav>
```

**Features:**
- ARIA labels on all items
- ARIA selected state
- ARIA badge counts
- Screen reader announcements
- Keyboard navigation support

---

### Screen Reader Support

**Announcements:**
- "Explorer view activated"
- "5 uncommitted changes in source control"
- "Search completed, 42 results found"
- "Debug session started"

---

## CUSTOMIZATION

### 1. Custom Activities

**Add Custom Activity:**
```typescript
registerActivity({
  id: 'custom-tool',
  icon: CustomIcon,
  label: 'Custom Tool',
  view: CustomToolPanel,
  position: 5,
  shortcut: 'Ctrl+Shift+T',
});
```

---

### 2. Theme Support

**Themes:**
- Light theme
- Dark theme
- High contrast light
- High contrast dark
- Custom themes

**Theme Variables:**
```css
--activity-bar-background
--activity-bar-foreground
--activity-bar-active-background
--activity-bar-active-foreground
--activity-bar-badge-background
--activity-bar-badge-foreground
```

---

## INTEGRATION POINTS

### Used By:

1. **File Management Module**
   - Explorer view
   - File tree display

2. **Monaco Editor Module**
   - Editor workspace area

3. **Command Palette Module**
   - View switching commands

4. **All View Panels**
   - Display in sidebar

### Uses:

1. **UI Components Module**
   - Icons, buttons, tooltips
   - Resizable panels

2. **Layout Service**
   - State management
   - Persistence

3. **Keyboard Service**
   - Shortcut handling

---

## NO API ENDPOINTS

The Activity Bar & Views module has **no HTTP API endpoints** - it's a pure frontend UI module.

**State Persistence:**
- Local storage for client-side state
- Optional backend sync via settings API

---

## SUMMARY

### UI Components: 13+
1. Activity Bar
2. Activity Bar Item
3. Secondary Sidebar
4. Explorer View
5. Search View
6. Source Control View
7. Debug View
8. Extensions View
9. Chat View
10. Plans View
11. Project View
12. Productivity View
13. Settings View

### Activity Views: 10
- Explorer
- Search
- Source Control
- Debug
- Extensions
- Chat
- Plans
- Project
- Productivity
- Settings

### Features:
- **Customization:** Reorder, hide/show, badges
- **Navigation:** Keyboard shortcuts, focus management
- **Panels:** Resizable, collapsible, persistent
- **Views:** Lazy loading, state persistence
- **Accessibility:** ARIA support, screen readers

### Keyboard Shortcuts: 10+
- View activation shortcuts
- Navigation keys
- Panel resize keys

### No API Endpoints (pure frontend)
