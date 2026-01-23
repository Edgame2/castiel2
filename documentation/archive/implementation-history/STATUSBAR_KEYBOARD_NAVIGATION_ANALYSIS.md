# StatusBar Keyboard Navigation - Pre-Implementation Analysis

## Current State Analysis

### Existing Implementation
**Files**: 
- `src/renderer/components/StatusBar.tsx`
- `src/renderer/components/StatusBarItem.tsx`

**Current Features**:
- ✅ StatusBar has `role="status"` and `aria-label`
- ✅ StatusBarItem uses button/span based on onClick
- ✅ Clickable items have `tabIndex={0}`
- ✅ Items are clickable
- ✅ Visual hover states

**Missing Features**:
- ❌ No keyboard navigation between items (ArrowLeft/Right)
- ❌ No focus management for navigation
- ❌ No ARIA toolbar roles
- ❌ No Home/End support
- ❌ No visual focus indicator for keyboard navigation

### VS Code Best Practices
From `.cursor/Vscode.md`:
- Status bar items should be keyboard accessible
- Most items are interactive (clickable)
- Progressive disclosure: Click item for detailed actions/settings
- Items should support keyboard navigation

### Similar Implementations
**EditorTabs** (`src/renderer/components/EditorTabs.tsx`):
- ✅ ArrowLeft/ArrowRight navigation
- ✅ Home/End support
- ✅ Focus management with refs
- ✅ ARIA tab roles

**ActivityBar** (`src/renderer/components/ActivityBar.tsx`):
- ✅ ArrowUp/ArrowDown navigation
- ✅ Home/End support
- ✅ Focus management with refs
- ✅ ARIA attributes

**Pattern to Follow**:
- Container handles keyboard events
- Item refs for focus management
- ARIA toolbar roles for accessibility
- Focus auto-update on selection change
- Horizontal navigation (ArrowLeft/Right) for status bar

## Implementation Plan

### Step 1: Add ARIA Toolbar Roles
- Add `role="toolbar"` to StatusBar container
- Add `role="toolbaritem"` to clickable items
- Keep `role="status"` for the container (dual role or wrapper)
- Add `aria-label` to toolbar

### Step 2: Add Keyboard Navigation
- ArrowLeft/ArrowRight to navigate between clickable items
- Home/End to jump to first/last clickable item
- Enter/Space to activate (already works via onClick)
- Tab key to move focus out

### Step 3: Add Focus Management
- Track item refs (only for clickable items)
- Auto-focus first clickable item when navigating
- Handle focus on keyboard navigation
- Ensure focus visible styles

### Step 4: Enhance StatusBarItem
- Add forwardRef for focus management
- Add ARIA attributes
- Ensure proper focus styles

## Files to Modify

1. **`src/renderer/components/StatusBar.tsx`**
   - Add useRef, useCallback, useEffect imports
   - Add container ref and item refs map
   - Add keyboard handler
   - Add ARIA toolbar role
   - Add focus management

2. **`src/renderer/components/StatusBarItem.tsx`**
   - Add forwardRef for focus management
   - Add ARIA attributes
   - Ensure proper focus styles

## Dependencies

- ✅ React hooks (useRef, useCallback, useEffect, forwardRef)
- ✅ Existing StatusBar structure (no changes needed)
- ✅ Existing components (no new dependencies)
- ✅ No new external dependencies

## Integration Points

- **MainLayout**: Uses StatusBar, no changes needed
- **StatusBarItem**: Already supports onClick, no changes needed

## Quality Checks

- ✅ Keyboard navigation works correctly
- ✅ Focus management works correctly
- ✅ ARIA toolbar roles properly set
- ✅ Screen reader support
- ✅ No regressions in existing functionality
- ✅ Only clickable items are navigable

## Expected Behavior

1. **ArrowLeft**: Move to previous clickable item
2. **ArrowRight**: Move to next clickable item
3. **Home**: Jump to first clickable item
4. **End**: Jump to last clickable item
5. **Enter/Space**: Activate focused item (already works)
6. **Tab**: Move focus to next element
7. **Focus**: First clickable item receives focus when navigating
