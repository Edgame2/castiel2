# Menu Service Implementation Analysis

## Current State

### Existing Menu Implementations

1. **Native Electron Menu** (`src/main/menu.ts`)
   - Application menu (File, Edit, View, etc.)
   - Context menus (editor, file explorer)
   - Dynamic updates via IDs
   - IPC handlers for menu updates
   - **Status**: ✅ Working, but not context-aware

2. **React MenuBar** (`src/renderer/components/MenuBar.tsx`)
   - Uses shadcn/ui Menubar component
   - Static menu items
   - No context-aware visibility
   - **Status**: ⚠️ Needs integration with Menu Service

3. **Context Menus**
   - Editor context menu (handled in main process)
   - File explorer context menu (needs renderer integration)
   - **Status**: ⚠️ Partially implemented

### Integration Points

- **ContextKeyService**: ✅ Available - Can evaluate "when" clauses
- **CommandService**: ✅ Available - Can execute commands from menus
- **KeybindingService**: ✅ Available - Can show keyboard shortcuts

## VS Code Menu System Requirements

### Menu Contribution Points

From `.cursor/Vscode.md`:
- `menuBar/file` - File menu
- `menuBar/edit` - Edit menu
- `menuBar/view` - View menu
- `menuBar/run` - Run menu
- `editor/context` - Right-click in editor
- `editor/title` - Editor title bar
- `editor/title/context` - Editor tab right-click
- `explorer/context` - File explorer right-click
- `scm/title` - Source control title
- `view/title` - View container title
- `view/item/context` - Tree view item right-click

### Menu Item Structure

```typescript
interface IMenuItem {
  command: string;           // Command ID to execute
  when?: string;             // Context key expression
  group?: string;            // Format: "groupId@order" (e.g., "navigation@1")
  alt?: string;              // Alternative command
  icon?: string;              // Icon identifier
}
```

### Group Organization

- Format: `"groupId@order"`
- Groups separated by visual separators
- Common groups:
  - `navigation` - Navigation items
  - `1_modification` - Modification actions
  - `9_cutcopypaste` - Cut/Copy/Paste
  - `z_commands` - Commands at end

### Context-Aware Visibility

Menu items shown/hidden based on context keys:
- `editorFocus` - Editor has focus
- `editorTextFocus` - Cursor in editor
- `editorHasSelection` - Text is selected
- `editorLangId == 'typescript'` - Specific language
- `resourceExtname == '.md'` - File extension
- `!editorReadonly` - Not read-only
- `explorerViewletVisible` - Explorer is open
- `sideBarVisible` - Side bar is visible

## Implementation Plan

### Step 1: Create Menu Service Core
- Define `MenuId` enum (contribution points)
- Define `IMenuItem` interface
- Create `MenuService` class
- Register menu contributions
- Evaluate "when" clauses using ContextKeyService

### Step 2: Menu Item Grouping
- Parse `groupId@order` format
- Sort items by group and order
- Insert separators between groups

### Step 3: Integration
- Integrate with CommandService (execute commands)
- Integrate with KeybindingService (show shortcuts)
- Update React MenuBar to use MenuService
- Update context menus to use MenuService

### Step 4: Default Menu Contributions
- Register default menu items
- File menu items
- Edit menu items
- View menu items
- Editor context menu items
- Explorer context menu items

## Files to Create

1. `src/renderer/platform/menu/menuTypes.ts` - Type definitions
2. `src/renderer/platform/menu/menuService.ts` - Core service
3. `src/renderer/hooks/useMenuService.ts` - React hook
4. `src/renderer/components/ContextMenu.tsx` - Context menu component (if needed)

## Files to Modify

1. `src/renderer/components/MenuBar.tsx` - Use MenuService
2. `src/renderer/components/Editor.tsx` - Use MenuService for context menu
3. `src/renderer/components/FileExplorer.tsx` - Use MenuService for context menu

## Dependencies

- ✅ ContextKeyService - Evaluate "when" clauses
- ✅ CommandService - Execute commands
- ✅ KeybindingService - Get keyboard shortcuts
