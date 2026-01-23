# Command & Palette Module

**Category:** Editor & UI  
**Location:** `src/renderer/components/CommandPalette.tsx`  
**Last Updated:** 2025-01-27

---

## Overview

The Command & Palette Module provides a command palette interface for quick command execution, file navigation, and action discovery in the Coder IDE. It enables fast access to all application commands through a unified search interface.

## Purpose

- Command discovery and execution
- Quick file navigation
- Keyboard shortcut management
- Command history
- Fuzzy search
- Command categorization

---

## Key Components

### 1. Command Palette (`CommandPalette.tsx`)

**Location:** `src/renderer/components/CommandPalette.tsx`

**Purpose:** Main command palette component

**Features:**
- Command search
- Command execution
- Keyboard navigation
- Command grouping
- Recent commands
- Command shortcuts

### 2. Command Hook (`useCommandPalette`)

**Location:** `src/renderer/hooks/useCommandPalette.ts`

**Purpose:** Command palette state management

**Features:**
- Command registration
- Command search
- Command execution
- Command history
- Recent commands

**API:**
```typescript
const {
  isOpen,
  open,
  close,
  query,
  setQuery,
  commands,
  selectedIndex,
  selectNext,
  selectPrevious,
  selectCurrent,
  executeCommand,
} = useCommandPalette();
```

### 3. Keybinding Service

**Location:** `src/renderer/platform/keybinding/keybindingService.ts`

**Purpose:** Keyboard shortcut management

**Features:**
- Shortcut registration
- Shortcut conflicts
- Shortcut display
- Custom shortcuts

---

## Command Structure

### Command Interface

```typescript
interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: React.ComponentType;
  keywords?: string[];
  shortcut?: string;
  handler: () => void | Promise<void>;
  isRecent?: boolean;
  group?: string;
}
```

### Command Categories

**Common Categories:**
- `File` - File operations
- `Edit` - Editing commands
- `View` - View commands
- `Go` - Navigation commands
- `Run` - Execution commands
- `Terminal` - Terminal commands
- `Git` - Git commands
- `AI` - AI commands
- `Project` - Project commands
- `Settings` - Settings commands

---

## Command Registration

### Register Commands

```typescript
import { useCommandPalette } from '../hooks/useCommandPalette';

const { registerCommand } = useCommandPalette();

// Register a command
registerCommand({
  id: 'file.new',
  label: 'New File',
  description: 'Create a new file',
  category: 'File',
  keywords: ['new', 'file', 'create'],
  shortcut: 'Ctrl+N',
  handler: async () => {
    await createNewFile();
  },
});
```

### Command Groups

Commands can be grouped:

```typescript
registerCommand({
  id: 'file.new',
  label: 'New File',
  category: 'File',
  group: 'file-operations',
  handler: createNewFile,
});
```

---

## Command Search

### Fuzzy Search

Commands are searchable by:
- Label
- Description
- Keywords
- Category

**Search Algorithm:**
- Fuzzy matching
- Keyword matching
- Category filtering
- Recent commands prioritized

### Search Examples

- `new file` - Finds "New File" command
- `git commit` - Finds Git commit command
- `> settings` - Filters to Settings category
- `@file` - Filters to File category

---

## Command Execution

### Execute Command

```typescript
const { executeCommand } = useCommandPalette();

// Execute by ID
await executeCommand('file.new');

// Execute selected command
await executeCommand(selectedCommandId);
```

### Command Handlers

Commands can have:
- Synchronous handlers
- Asynchronous handlers
- Promise-based handlers
- Error handling

---

## Keyboard Navigation

### Navigation Keys

- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + Shift + P` - Open command palette (alternative)
- `Arrow Down` - Next command
- `Arrow Up` - Previous command
- `Enter` - Execute command
- `Escape` - Close palette
- `Tab` - Accept suggestion

### Focus Management

- Focus moves to input on open
- Focus returns to previous element on close
- Focus trap in palette

---

## Command History

### Recent Commands

Recently used commands appear first:

```typescript
interface CommandPaletteItem {
  // ...
  isRecent?: boolean;
  lastUsed?: Date;
}
```

### History Tracking

- Track command usage
- Sort by recency
- Limit history size
- Persist history

---

## Command Shortcuts

### Display Shortcuts

Commands show keyboard shortcuts:

```typescript
registerCommand({
  id: 'file.save',
  label: 'Save',
  shortcut: 'Ctrl+S',
  handler: saveFile,
});
```

### Shortcut Conflicts

Keybinding service detects conflicts:
- Warn on conflict
- Allow override
- Show conflicts in UI

---

## Command Palette UI

### Layout

```
┌─────────────────────────────────┐
│ > Search commands...            │
├─────────────────────────────────┤
│ Recent                          │
│   New File          Ctrl+N     │
│   Save              Ctrl+S      │
├─────────────────────────────────┤
│ File                            │
│   New File          Ctrl+N     │
│   Open File         Ctrl+O     │
│   Save              Ctrl+S     │
├─────────────────────────────────┤
│ Edit                            │
│   Undo              Ctrl+Z     │
│   Redo              Ctrl+Y     │
└─────────────────────────────────┘
```

### Empty State

When no commands match:

```typescript
<CommandEmpty>No commands found.</CommandEmpty>
```

### Loading State

While searching:

```typescript
<CommandList>
  <CommandLoading />
</CommandList>
```

---

## Command Categories

### File Commands

- New File
- Open File
- Save
- Save As
- Close File
- Close All Files

### Edit Commands

- Undo
- Redo
- Cut
- Copy
- Paste
- Find
- Replace

### View Commands

- Toggle Explorer
- Toggle Search
- Toggle Terminal
- Toggle Output
- Zoom In
- Zoom Out

### Go Commands

- Go to File
- Go to Symbol
- Go to Line
- Go to Definition
- Go to References

### Run Commands

- Run
- Debug
- Stop
- Restart

### Terminal Commands

- New Terminal
- Split Terminal
- Clear Terminal

### Git Commands

- Commit
- Push
- Pull
- Branch
- Status

### AI Commands

- Generate Code
- Explain Code
- Refactor Code
- Review Code

---

## Integration Points

### Editor Integration

Commands can interact with editor:
- Editor actions
- Editor state
- Editor selection

### File System Integration

Commands can access file system:
- File operations
- Directory navigation
- File search

### Project Integration

Commands can access project:
- Project context
- Project settings
- Project operations

---

## Customization

### Custom Commands

Users can add custom commands:
- Custom handlers
- Custom shortcuts
- Custom categories

### Command Filtering

Filter commands by:
- Category
- Keywords
- Tags
- Enabled/disabled

---

## Usage Examples

### Open Command Palette

```typescript
const { open } = useCommandPalette();

// Open programmatically
open();

// Or use keyboard shortcut
// Ctrl/Cmd + K
```

### Register Command

```typescript
useEffect(() => {
  registerCommand({
    id: 'custom.action',
    label: 'Custom Action',
    category: 'Custom',
    handler: async () => {
      console.log('Custom action executed');
    },
  });
}, []);
```

### Execute Command

```typescript
const handleExecute = async (commandId: string) => {
  try {
    await executeCommand(commandId);
  } catch (error) {
    console.error('Command execution failed:', error);
  }
};
```

---

## Performance

### Command Loading

- Lazy load commands
- Cache command list
- Optimize search

### Search Performance

- Debounce search input
- Limit results
- Virtual scrolling

---

## Accessibility

### ARIA Support

- `aria-label` on input
- `aria-expanded` on palette
- `aria-selected` on items
- `aria-describedby` for descriptions

### Keyboard Support

- Full keyboard navigation
- Screen reader support
- Focus management

---

## Related Modules

- **UI Components Module** - Command component
- **Activity Bar & Views Module** - View commands
- **Monaco Editor Module** - Editor commands

---

## Summary

The Command & Palette Module provides a powerful, unified command interface for the Coder IDE. With fuzzy search, keyboard navigation, command history, and extensive customization, it enables fast access to all application functionality through a single, discoverable interface.
