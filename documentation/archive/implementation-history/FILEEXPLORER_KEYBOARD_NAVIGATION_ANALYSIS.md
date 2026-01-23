# FileExplorer Keyboard Navigation - Pre-Implementation Analysis

## Current State Analysis

### Existing Implementation
**Files**: 
- `src/renderer/components/FileExplorer.tsx`
- `src/renderer/components/FileTree.tsx`
- `src/renderer/components/FileTreeItem.tsx`

**Current Features**:
- ✅ File tree rendering with virtual rendering support
- ✅ Click to expand/collapse folders
- ✅ Click to select files
- ✅ ARIA region on FileExplorer
- ✅ Loading and error states
- ✅ Hidden files toggle

**Missing Features**:
- ❌ No keyboard navigation (ArrowUp/Down, Left/Right, Enter, Space)
- ❌ No focus management for tree items
- ❌ No ARIA tree roles (tree, treeitem, group)
- ❌ Tree items are divs, not proper tree elements
- ❌ No tabIndex management

### VS Code Best Practices
From `.cursor/Vscode.md`:
- Tree views should support keyboard navigation
- ArrowUp/ArrowDown to navigate between items
- ArrowRight to expand, ArrowLeft to collapse
- Enter/Space to activate/open
- Home/End to jump to first/last
- Proper ARIA tree roles
- Focus management

### Similar Implementations
**ActivityBar** (`src/renderer/components/ActivityBar.tsx`):
- ✅ ArrowUp/ArrowDown navigation
- ✅ Home/End support
- ✅ Focus management with refs
- ✅ ARIA attributes

**EditorTabs** (`src/renderer/components/EditorTabs.tsx`):
- ✅ ArrowLeft/ArrowRight navigation
- ✅ Home/End support
- ✅ Focus management with refs
- ✅ ARIA tab roles

**Pattern to Follow**:
- Container handles keyboard events
- Item refs for focus management
- ARIA tree roles for accessibility
- Focus auto-update on selection change
- Handle expand/collapse with arrow keys

## Implementation Plan

### Step 1: Add ARIA Tree Roles
- Add `role="tree"` to FileTree container
- Add `role="treeitem"` to each tree item
- Add `aria-expanded` for folders
- Add `aria-selected` for selected items
- Add `aria-level` for nesting depth
- Add `aria-label` to tree

### Step 2: Add Keyboard Navigation
- ArrowUp/ArrowDown to navigate items
- ArrowRight to expand folder (or activate if already expanded)
- ArrowLeft to collapse folder (or move to parent)
- Enter/Space to activate/open
- Home/End to jump to first/last
- Tab key to move focus out

### Step 3: Add Focus Management
- Track tree item refs
- Auto-focus selected item
- Handle focus on keyboard navigation
- Ensure focus visible styles

### Step 4: Convert Tree Items to Button Elements
- Change div to button for better semantics
- Maintain existing styling
- Ensure keyboard accessibility

## Files to Modify

1. **`src/renderer/components/FileTree.tsx`**
   - Add useRef, useCallback, useEffect imports
   - Add container ref and item refs map
   - Add keyboard handler
   - Add ARIA tree roles
   - Add focus management

2. **`src/renderer/components/FileTreeItem.tsx`**
   - Convert to forwardRef for focus management
   - Add ARIA attributes
   - Convert div to button
   - Add keyboard handlers

## Dependencies

- ✅ React hooks (useRef, useCallback, useEffect, forwardRef)
- ✅ Existing FileTree structure (no changes needed)
- ✅ Existing components (no new dependencies)
- ✅ No new external dependencies

## Integration Points

- **FileExplorer**: Uses FileTree, no changes needed
- **Virtual Tree**: Already integrated, keyboard navigation should work with it
- **File selection**: Uses onFileClick callback, no changes needed

## Quality Checks

- ✅ Keyboard navigation works correctly
- ✅ Focus management works correctly
- ✅ ARIA tree roles properly set
- ✅ Screen reader support
- ✅ No regressions in existing functionality
- ✅ Works with virtual tree rendering

## Expected Behavior

1. **ArrowUp**: Move to previous item
2. **ArrowDown**: Move to next item
3. **ArrowRight**: Expand folder or move to first child
4. **ArrowLeft**: Collapse folder or move to parent
5. **Enter/Space**: Activate/open item
6. **Home**: Jump to first item
7. **End**: Jump to last item
8. **Tab**: Move focus to next element
9. **Focus**: Selected item receives focus when changed
