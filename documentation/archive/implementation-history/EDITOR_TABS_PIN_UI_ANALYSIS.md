# Editor Tabs Pin/Unpin UI Analysis

## Current State

### EditorTabs Implementation
**File**: `src/renderer/components/EditorTabs.tsx`

**Current Features**:
- ✅ Pin icon displayed for pinned files (line 197-199)
- ✅ Files sorted with pinned files first (line 37-39)
- ✅ `togglePin` function available from `useEditor()` (line 29)
- ✅ Keyboard navigation implemented
- ✅ Context menu placeholder exists (line 154-156)

**Missing**:
- ❌ No way to pin/unpin tabs via UI
- ❌ Context menu not implemented (just prevents default)
- ❌ No pin button on tabs

### EditorContext Implementation
**File**: `src/renderer/contexts/EditorContext.tsx`

**Current Features**:
- ✅ `togglePin` function implemented (line 146-150)
- ✅ `isPinned` property on OpenFile (line 11)
- ✅ Pin state managed in state

**Status**: Backend functionality complete, UI missing

## VS Code Requirements

From `.cursor/Vscode.md`:
1. **Pinned tabs**: Pin important files (smaller, left-aligned)
2. **Context menu**: Right-click tab for actions (including pin/unpin)
3. **Visual indicator**: Pin icon shown for pinned tabs

## Implementation Plan

### Step 1: Add Context Menu for Tabs
- Implement context menu on right-click
- Add "Pin" / "Unpin" menu item
- Add other VS Code-style actions (Close, Close Others, Close Saved, etc.)
- Use existing MenuService if available, or shadcn/ui DropdownMenu

### Step 2: Add Pin Button (Optional Enhancement)
- Add pin button next to close button on tabs
- Only show on hover (to avoid clutter)
- Toggle pin state on click

### Step 3: Update Visual Styling
- Ensure pinned tabs are visually distinct
- Left-align pinned tabs (already done via sorting)
- Consider making pinned tabs slightly smaller (VS Code pattern)

## Files to Modify

1. `src/renderer/components/EditorTabs.tsx` - Add context menu and pin button

## Dependencies

### Existing
- `togglePin` from `useEditor()` - Already exists
- `shadcn/ui` DropdownMenu - Already imported
- Pin icon from lucide-react - Already imported

### New
- None - all dependencies already available

## Integration Points

1. **EditorTabs** → **EditorContext**: Call `togglePin` on action
2. **EditorTabs** → **UI**: Display context menu and pin button
3. **EditorTabs** → **State**: Update pin state via context

## Accessibility Considerations

- Context menu: Keyboard accessible (Shift+F10 or right-click)
- Pin button: `aria-label` for pin/unpin state
- Context menu items: `aria-label` for each action
- Keyboard navigation: Tab order, Enter to activate

## Testing Considerations

- Context menu opens on right-click
- Pin/unpin works correctly
- Pin state persists correctly
- Visual indicators update
- Keyboard navigation works
- Accessibility works
