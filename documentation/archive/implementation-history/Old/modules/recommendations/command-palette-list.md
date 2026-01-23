# Command & Palette Module
## Command Execution and Keyboard Shortcuts

---

## OVERVIEW

**Location:** `src/renderer/components/CommandPalette.tsx`  
**Purpose:** Unified command interface for quick access to all application functionality

---

## UI COMPONENTS

### Main Components

#### 1. Command Palette
**File:** `CommandPalette.tsx`  
**Location:** `src/renderer/components/CommandPalette.tsx`

**Purpose:** Main command palette dialog/overlay

**Features:**
- Command search with fuzzy matching
- Command execution
- Keyboard navigation
- Command grouping by category
- Recent commands section
- Command shortcuts display
- Empty/loading states
- Debounced search input

**UI Elements:**
- Search input with icon
- Command list (virtualized for performance)
- Command groups with headers
- Command items with shortcuts
- Empty state message
- Loading indicator

---

#### 2. Command Dialog
**Component:** Uses `CommandDialog` from UI components

**Features:**
- Modal overlay
- Backdrop blur
- Escape to close
- Click outside to close
- Portal rendering
- Focus trap

---

## HOOKS & STATE MANAGEMENT

### useCommandPalette Hook

**File:** `useCommandPalette.ts`  
**Location:** `src/renderer/hooks/useCommandPalette.ts`

**Purpose:** Command palette state and logic management

**API:**
```typescript
const {
  // State
  isOpen,
  query,
  commands,
  filteredCommands,
  selectedIndex,
  recentCommands,
  
  // Actions
  open,
  close,
  toggle,
  setQuery,
  selectNext,
  selectPrevious,
  selectCommand,
  executeCommand,
  executeSelected,
  registerCommand,
  unregisterCommand,
  clearHistory,
} = useCommandPalette();
```

**State:**
```typescript
interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  commands: CommandPaletteItem[];
  filteredCommands: CommandPaletteItem[];
  recentCommands: CommandPaletteItem[];
}
```

---

### Keybinding Service

**File:** `keybindingService.ts`  
**Location:** `src/renderer/platform/keybinding/keybindingService.ts`

**Purpose:** Global keyboard shortcut management

**Features:**
- Shortcut registration
- Shortcut conflict detection
- Shortcut customization
- Platform-specific shortcuts (Cmd vs Ctrl)
- Chord shortcuts (multi-key)
- Context-aware shortcuts

**API:**
```typescript
interface KeybindingService {
  registerKeybinding(binding: Keybinding): void;
  unregisterKeybinding(commandId: string): void;
  getKeybindings(): Keybinding[];
  getConflicts(): Keybinding[];
  handleKeyPress(event: KeyboardEvent): boolean;
}
```

**Keybinding:**
```typescript
interface Keybinding {
  commandId: string;
  key: string;           // e.g., 'Ctrl+S', 'Cmd+K Cmd+S'
  when?: string;         // Context condition
  platform?: 'mac' | 'win' | 'linux';
}
```

---

## COMMAND STRUCTURE

### Command Interface

```typescript
interface CommandPaletteItem {
  id: string;                           // Unique command ID
  label: string;                        // Display label
  description?: string;                 // Description
  category: string;                     // Category (File, Edit, etc.)
  icon?: React.ComponentType;           // Optional icon
  keywords?: string[];                  // Search keywords
  shortcut?: string;                    // Keyboard shortcut
  handler: () => void | Promise<void>;  // Command handler
  isRecent?: boolean;                   // Recently used flag
  lastUsed?: Date;                      // Last used timestamp
  group?: string;                       // Command group
  enabled?: boolean;                    // Enable/disable
  when?: string;                        // Context condition
}
```

---

## COMMAND CATEGORIES

### Built-in Categories

#### File Commands
- `file.new` - New File (Ctrl+N)
- `file.open` - Open File (Ctrl+O)
- `file.save` - Save (Ctrl+S)
- `file.saveAs` - Save As (Ctrl+Shift+S)
- `file.close` - Close File (Ctrl+W)
- `file.closeAll` - Close All Files
- `file.reopen` - Reopen Closed File

#### Edit Commands
- `edit.undo` - Undo (Ctrl+Z)
- `edit.redo` - Redo (Ctrl+Y / Ctrl+Shift+Z)
- `edit.cut` - Cut (Ctrl+X)
- `edit.copy` - Copy (Ctrl+C)
- `edit.paste` - Paste (Ctrl+V)
- `edit.find` - Find (Ctrl+F)
- `edit.replace` - Replace (Ctrl+H)
- `edit.selectAll` - Select All (Ctrl+A)

#### View Commands
- `view.toggleExplorer` - Toggle Explorer (Ctrl+Shift+E)
- `view.toggleSearch` - Toggle Search (Ctrl+Shift+F)
- `view.toggleSourceControl` - Toggle Source Control (Ctrl+Shift+G)
- `view.toggleDebug` - Toggle Debug (Ctrl+Shift+D)
- `view.toggleTerminal` - Toggle Terminal (Ctrl+`)
- `view.toggleOutput` - Toggle Output
- `view.zoomIn` - Zoom In (Ctrl+=)
- `view.zoomOut` - Zoom Out (Ctrl+-)
- `view.zoomReset` - Reset Zoom (Ctrl+0)

#### Go Commands
- `go.toFile` - Go to File (Ctrl+P)
- `go.toSymbol` - Go to Symbol (Ctrl+Shift+O)
- `go.toLine` - Go to Line (Ctrl+G)
- `go.toDefinition` - Go to Definition (F12)
- `go.toReferences` - Go to References (Shift+F12)
- `go.back` - Go Back (Alt+Left)
- `go.forward` - Go Forward (Alt+Right)

#### Run Commands
- `run.run` - Run (F5)
- `run.debug` - Debug (F5)
- `run.stop` - Stop (Shift+F5)
- `run.restart` - Restart (Ctrl+Shift+F5)
- `run.continue` - Continue (F5)
- `run.stepOver` - Step Over (F10)
- `run.stepInto` - Step Into (F11)
- `run.stepOut` - Step Out (Shift+F11)

#### Terminal Commands
- `terminal.new` - New Terminal (Ctrl+Shift+`)
- `terminal.split` - Split Terminal
- `terminal.clear` - Clear Terminal
- `terminal.kill` - Kill Terminal
- `terminal.selectAll` - Select All

#### Git Commands
- `git.commit` - Commit
- `git.push` - Push
- `git.pull` - Pull
- `git.sync` - Sync
- `git.branch` - Branch
- `git.checkout` - Checkout
- `git.merge` - Merge
- `git.stash` - Stash
- `git.status` - Status

#### AI Commands
- `ai.generateCode` - Generate Code
- `ai.explainCode` - Explain Code
- `ai.refactorCode` - Refactor Code
- `ai.reviewCode` - Review Code
- `ai.fixCode` - Fix Code
- `ai.optimizeCode` - Optimize Code
- `ai.chat` - Open AI Chat

#### Project Commands
- `project.create` - Create Project
- `project.open` - Open Project
- `project.close` - Close Project
- `project.settings` - Project Settings
- `project.tasks` - View Tasks
- `project.roadmap` - View Roadmap

#### Settings Commands
- `settings.open` - Open Settings (Ctrl+,)
- `settings.keyboard` - Keyboard Shortcuts (Ctrl+K Ctrl+S)
- `settings.theme` - Change Theme
- `settings.extensions` - Manage Extensions

---

## COMMAND REGISTRATION

### Register Command

**Static Registration:**
```typescript
import { useCommandPalette } from '../hooks/useCommandPalette';

function MyComponent() {
  const { registerCommand } = useCommandPalette();
  
  useEffect(() => {
    registerCommand({
      id: 'custom.action',
      label: 'Custom Action',
      description: 'Perform custom action',
      category: 'Custom',
      keywords: ['custom', 'action', 'do'],
      shortcut: 'Ctrl+Alt+C',
      handler: async () => {
        await performCustomAction();
      },
    });
    
    return () => {
      unregisterCommand('custom.action');
    };
  }, []);
}
```

**Dynamic Registration:**
```typescript
// Register commands based on project state
useEffect(() => {
  if (project) {
    registerCommand({
      id: 'project.build',
      label: `Build ${project.name}`,
      category: 'Project',
      handler: () => buildProject(project.id),
    });
  }
}, [project]);
```

---

## SEARCH & FILTERING

### Fuzzy Search

**Algorithm:**
- Fuzzy string matching
- Match highlighting
- Score-based ranking
- Multi-field search (label, description, keywords)

**Search Fields:**
- Command label
- Command description
- Keywords
- Category name

**Examples:**
- `nw file` → matches "New File"
- `git com` → matches "Git: Commit"
- `tog exp` → matches "Toggle Explorer"

---

### Category Filtering

**Prefix Filters:**
- `>` - Commands (default)
- `@` - Go to Symbol
- `#` - Go to Symbol in Workspace
- `:` - Go to Line
- `?` - Help

**Examples:**
- `>file new` - Search file commands
- `@function` - Search symbols named "function"
- `:42` - Go to line 42
- `?keyboard` - Search help for "keyboard"

---

### Recent Commands

**Features:**
- Track command usage
- Display recent commands first
- Limit to last 10 commands
- Persist to localStorage
- Clear history option

**Display:**
```
Recent
  New File                Ctrl+N
  Save                    Ctrl+S
  Git: Commit
─────────────────────────────────
File
  New File                Ctrl+N
  Open File               Ctrl+O
```

---

## KEYBOARD NAVIGATION

### Command Palette Shortcuts

**Open Palette:**
- `Ctrl/Cmd + K` - Primary shortcut
- `Ctrl/Cmd + Shift + P` - Alternative shortcut
- `F1` - Alternative shortcut

**Navigation:**
- `Arrow Down` / `Ctrl+N` - Next command
- `Arrow Up` / `Ctrl+P` - Previous command
- `Enter` - Execute selected command
- `Escape` - Close palette
- `Tab` - Auto-complete
- `Ctrl+Home` - First command
- `Ctrl+End` - Last command

---

### Global Shortcuts

**File Operations:**
- `Ctrl+N` - New File
- `Ctrl+O` - Open File
- `Ctrl+S` - Save
- `Ctrl+Shift+S` - Save As
- `Ctrl+W` - Close File

**Editing:**
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+X` - Cut
- `Ctrl+C` - Copy
- `Ctrl+V` - Paste
- `Ctrl+F` - Find
- `Ctrl+H` - Replace

**Navigation:**
- `Ctrl+P` - Quick Open File
- `Ctrl+G` - Go to Line
- `Ctrl+Shift+O` - Go to Symbol
- `F12` - Go to Definition

**View:**
- `Ctrl+Shift+E` - Explorer
- `Ctrl+Shift+F` - Search
- `Ctrl+Shift+G` - Source Control
- `Ctrl+`` - Terminal

---

## COMMAND EXECUTION

### Execute Command

```typescript
const { executeCommand } = useCommandPalette();

// Execute by ID
await executeCommand('file.save');

// Execute with arguments
await executeCommand('go.toLine', { line: 42 });

// Execute selected command
await executeSelected();
```

---

### Command Handlers

**Synchronous:**
```typescript
{
  id: 'view.toggleExplorer',
  handler: () => {
    setExplorerVisible(!explorerVisible);
  }
}
```

**Asynchronous:**
```typescript
{
  id: 'file.save',
  handler: async () => {
    await saveFile();
    showNotification('File saved');
  }
}
```

**With Arguments:**
```typescript
{
  id: 'go.toLine',
  handler: async (args?: { line: number }) => {
    if (args?.line) {
      editor.revealLine(args.line);
    }
  }
}
```

---

## COMMAND HISTORY

### History Tracking

**Features:**
- Track execution time
- Track execution count
- Sort by recency
- Limit history size (100 commands)
- Persist to localStorage

**Storage:**
```typescript
interface CommandHistory {
  commandId: string;
  executedAt: Date;
  executionCount: number;
}
```

---

### Clear History

```typescript
const { clearHistory } = useCommandPalette();

clearHistory();
```

---

## PERFORMANCE OPTIMIZATIONS

### 1. Virtual Scrolling

**Implementation:**
- Render only visible commands
- Improves performance with large command lists
- Smooth scrolling

---

### 2. Debounced Search

**Implementation:**
```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    filterCommands(query);
  }, 150),
  []
);
```

---

### 3. Command Caching

**Features:**
- Cache filtered results
- Invalidate on query change
- Memoize expensive operations

---

## ACCESSIBILITY

### ARIA Support

```typescript
<div
  role="dialog"
  aria-label="Command Palette"
  aria-modal="true"
>
  <input
    role="combobox"
    aria-expanded={isOpen}
    aria-autocomplete="list"
    aria-controls="command-list"
  />
  <ul
    id="command-list"
    role="listbox"
  >
    <li
      role="option"
      aria-selected={selected}
    >
      Command
    </li>
  </ul>
</div>
```

---

### Keyboard Support

- Full keyboard navigation
- Screen reader announcements
- Focus management
- Keyboard shortcuts display

---

### Screen Reader

**Announcements:**
- "Command Palette opened"
- "5 commands found"
- "New File selected, Ctrl+N"
- "Command executed successfully"

---

## INTEGRATION POINTS

### Used By:

1. **All Modules**
   - Register commands
   - Execute commands

2. **Activity Bar**
   - View switching commands

3. **Monaco Editor**
   - Editor commands
   - Code actions

4. **File Management**
   - File operations
   - Navigation

### Uses:

1. **UI Components Module**
   - Command component
   - Dialog
   - Input

2. **Keybinding Service**
   - Shortcut handling
   - Conflict detection

---

## NO API ENDPOINTS

The Command & Palette module has **no HTTP API endpoints** - it's a pure frontend UI module.

---

## SUMMARY

### UI Components: 2
1. Command Palette (dialog)
2. Command List (virtualized)

### Hooks: 1
- `useCommandPalette` - State and command management

### Services: 1
- Keybinding Service - Global keyboard shortcuts

### Command Categories: 10+
- File, Edit, View, Go, Run
- Terminal, Git, AI
- Project, Settings, Custom

### Features:
- **Search:** Fuzzy matching, category filtering, keywords
- **Navigation:** Full keyboard support, arrow keys, shortcuts
- **History:** Recent commands, execution tracking
- **Performance:** Virtual scrolling, debounced search, caching
- **Accessibility:** ARIA support, screen reader, keyboard-only

### Global Shortcuts: 50+
- File operations (10+)
- Editing (10+)
- Navigation (10+)
- View switching (10+)
- Custom shortcuts

### Command Registration: Dynamic
- Register/unregister at runtime
- Context-aware commands
- Conditional commands

### No API Endpoints (pure frontend)
