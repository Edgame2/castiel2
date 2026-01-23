# Context Menu Implementation Analysis

## Current State

### 1. Editor Context Menu
- **Status**: Uses Monaco Editor's built-in context menu
- **Implementation**: `editorInstanceRef.current.addAction()` with `contextMenuGroupId`
- **Location**: `src/renderer/components/Editor.tsx` (lines 488-515)
- **Features**: 
  - Monaco's native context menu
  - Custom actions (e.g., "Run Prompt on Selection")
- **Issue**: Not using MenuService, not context-aware

### 2. File Explorer Context Menu
- **Status**: Not implemented in renderer
- **Main Process**: `src/main/menu.ts` has `createFileExplorerContextMenu()`
- **Location**: Handled in main process via IPC
- **Issue**: Should be renderer-side for better integration

### 3. Editor Tabs Context Menu
- **Status**: Has `handleContextMenu` function
- **Location**: `src/renderer/components/EditorTabs.tsx` (line 91)
- **Implementation**: Custom handler, not using MenuService

### 4. UI Components Available
- **DropdownMenu**: Radix UI component (already in codebase)
- **Popover**: Radix UI component (for positioning)
- **MenuService**: Ready to use

## Implementation Plan

### Step 1: Create ContextMenu Component
- Use Radix UI DropdownMenu
- Integrate with MenuService
- Support positioning at cursor
- Handle keyboard navigation
- Show groups and separators

### Step 2: Integrate into Editor
- Replace Monaco's context menu with ContextMenu component
- Use MenuId.EditorContext
- Position at mouse cursor

### Step 3: Integrate into FileExplorer
- Add context menu to FileTreeItem
- Use MenuId.ExplorerContext
- Position at mouse cursor

### Step 4: Integrate into EditorTabs
- Use ContextMenu for tab right-click
- Use MenuId.EditorTitleContext

## Component Design

### ContextMenu Props
```typescript
interface ContextMenuProps {
  menuId: MenuId;
  children: React.ReactNode;
  onCommand?: (command: string) => void;
}
```

### Usage Pattern
```tsx
<ContextMenu menuId={MenuId.EditorContext} onCommand={handleCommand}>
  <div onContextMenu={(e) => e.preventDefault()}>
    {/* Content */}
  </div>
</ContextMenu>
```

## Dependencies

- ✅ MenuService - Available
- ✅ useMenuService hook - Available
- ✅ Radix UI DropdownMenu - Available
- ✅ CommandService - Available
- ✅ KeybindingService - Available
