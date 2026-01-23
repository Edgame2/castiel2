# Menu Service UI Integration Analysis

## Current State

### 1. MenuBar Component (`src/renderer/components/MenuBar.tsx`)
- **Status**: Static hardcoded menu items
- **Structure**: Uses shadcn/ui Menubar components
- **Props**: `onCommand?: (command: string) => void`
- **Menus**: File, Edit, View, Go, Terminal, Plan, Productivity, Run, Team, Admin, Settings, Help
- **Issues**: 
  - No context-aware visibility
  - No dynamic menu updates
  - Keyboard shortcuts hardcoded

### 2. Context Menus
- **Editor Context Menu**: Handled in main process (`src/main/menu.ts`)
- **File Explorer Context Menu**: Handled in main process
- **Status**: No renderer-side context menu component
- **Issues**: 
  - Not using MenuService
  - Not context-aware
  - Cannot be extended easily

### 3. MenuService
- **Status**: ✅ Complete and ready
- **Features**: 
  - Contribution points defined
  - Default menus registered
  - Context-aware filtering
  - Group organization

## Integration Plan

### Step 1: Create Menu Rendering Helper
- Component to render menu items from MenuService
- Handles groups and separators
- Shows keyboard shortcuts
- Handles click events

### Step 2: Update MenuBar Component
- Replace hardcoded File menu with MenuService
- Replace hardcoded Edit menu with MenuService
- Replace hardcoded View menu with MenuService
- Keep other menus for now (can be migrated later)

### Step 3: Create ContextMenu Component
- Renderer-side context menu component
- Uses MenuService for menu items
- Positioned at mouse cursor
- Handles keyboard navigation

### Step 4: Integrate Context Menus
- Add context menu to Editor component
- Add context menu to FileExplorer component
- Use MenuService contributions

## Files to Create/Modify

### Create:
1. `src/renderer/components/MenuItemRenderer.tsx` - Helper to render menu items
2. `src/renderer/components/ContextMenu.tsx` - Context menu component

### Modify:
1. `src/renderer/components/MenuBar.tsx` - Use MenuService
2. `src/renderer/components/Editor.tsx` - Add context menu
3. `src/renderer/components/FileExplorer.tsx` - Add context menu

## Dependencies

- ✅ MenuService - Available
- ✅ useMenuService hook - Available
- ✅ CommandService - Available (for executing commands)
- ✅ KeybindingService - Available (for keyboard shortcuts)
- ✅ ContextKeyService - Available (for visibility)

## Implementation Details

### MenuItemRenderer Component
- Takes MenuId and renders menu items
- Groups items with separators
- Shows keyboard shortcuts
- Handles disabled state
- Executes commands on click

### ContextMenu Component
- Takes MenuId and position (x, y)
- Renders menu items in a popover
- Handles click outside to close
- Keyboard navigation (Arrow keys, Enter, Escape)
- Positioned at cursor

### MenuBar Integration
- Use `getMenuItemsGrouped()` for File, Edit, View menus
- Map groups to MenubarSeparator
- Map items to MenubarItem
- Use `getKeybinding()` for shortcuts
