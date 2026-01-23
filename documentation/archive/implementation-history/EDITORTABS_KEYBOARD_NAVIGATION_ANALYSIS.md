# EditorTabs Keyboard Navigation - Pre-Implementation Analysis

## Current State Analysis

### Existing Implementation
**File**: `src/renderer/components/EditorTabs.tsx`

**Current Features**:
- ✅ Tab rendering with pinned/unpinned separation
- ✅ Click to activate tabs
- ✅ Close button with aria-label
- ✅ Context menu support (placeholder)
- ✅ Unsaved changes dialog
- ✅ ScrollArea for overflow

**Missing Features**:
- ❌ No keyboard navigation (ArrowLeft/ArrowRight, Home/End)
- ❌ No focus management
- ❌ No ARIA attributes for tab navigation
- ❌ Tabs are divs, not proper tab elements
- ❌ No tabIndex management

### VS Code Best Practices
From `.cursor/Vscode.md`:
- Tabs should support keyboard navigation
- Arrow keys to navigate between tabs
- Home/End to jump to first/last
- Enter/Space to activate
- Proper ARIA roles (tablist, tab)
- Focus management

### Similar Implementations
**ActivityBar** (`src/renderer/components/ActivityBar.tsx`):
- ✅ ArrowUp/ArrowDown navigation
- ✅ Home/End support
- ✅ Focus management with refs
- ✅ ARIA attributes (aria-posinset, aria-setsize, role="menuitem")
- ✅ Container-level keyboard handler

**Pattern to Follow**:
- Container handles keyboard events
- Item refs for focus management
- ARIA attributes for accessibility
- Focus auto-update on selection change

## Implementation Plan

### Step 1: Add ARIA Attributes
- Add `role="tablist"` to container
- Add `role="tab"` to each tab
- Add `aria-selected` based on active state
- Add `aria-controls` linking tab to editor
- Add `aria-label` to tablist

### Step 2: Add Keyboard Navigation
- ArrowLeft/ArrowRight to navigate tabs
- Home/End to jump to first/last
- Enter/Space to activate (already works via onClick)
- Tab key to move focus out

### Step 3: Add Focus Management
- Track tab refs
- Auto-focus active tab when it changes
- Handle focus on keyboard navigation
- Ensure focus visible styles

### Step 4: Convert Tabs to Button Elements
- Change div to button for better semantics
- Maintain existing styling
- Ensure keyboard accessibility

## Files to Modify

1. **`src/renderer/components/EditorTabs.tsx`**
   - Add useRef, useCallback, useEffect imports
   - Add container ref and tab refs map
   - Add keyboard handler
   - Add ARIA attributes
   - Convert tab divs to buttons
   - Add focus management

## Dependencies

- ✅ React hooks (useRef, useCallback, useEffect)
- ✅ Existing EditorContext (no changes needed)
- ✅ Existing components (Button, ScrollArea)
- ✅ No new external dependencies

## Integration Points

- **EditorContext**: Uses `activeFileId`, `setActiveFile`, `openFiles`
- **ScrollArea**: Tabs are inside ScrollArea, need to handle scrolling on focus
- **UnsavedChangesDialog**: No changes needed

## Quality Checks

- ✅ Keyboard navigation works correctly
- ✅ Focus management works correctly
- ✅ ARIA attributes properly set
- ✅ Screen reader support
- ✅ No regressions in existing functionality
- ✅ Tab scrolling works with keyboard navigation

## Expected Behavior

1. **ArrowLeft**: Move to previous tab (wraps to last if at first)
2. **ArrowRight**: Move to next tab (wraps to first if at last)
3. **Home**: Jump to first tab
4. **End**: Jump to last tab
5. **Enter/Space**: Activate focused tab (already works)
6. **Tab**: Move focus to next element
7. **Focus**: Active tab receives focus when changed programmatically
