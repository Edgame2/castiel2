# Editor Preview Mode Analysis

## Current State

### EditorContext Implementation
**File**: `src/renderer/contexts/EditorContext.tsx`

**Current Features**:
- ✅ `openFile` function opens files
- ✅ `isPinned` property on OpenFile
- ✅ `isDirty` property on OpenFile
- ❌ No `isPreview` property
- ❌ No preview mode logic

**Current Behavior**:
- Opening a file always creates a new tab (or activates existing)
- No distinction between preview and regular tabs
- No automatic replacement of preview tabs

### EditorTabs Implementation
**File**: `src/renderer/components/EditorTabs.tsx`

**Current Features**:
- ✅ Displays `isDirty` with italic styling
- ✅ Displays `isPinned` with pin icon
- ❌ No preview mode styling
- ❌ No preview mode handling

### FileTree/FileExplorer Implementation
**File**: `src/renderer/components/FileTree.tsx` (likely)

**Current Behavior**:
- Need to check how files are opened (single-click vs double-click)
- Need to understand if preview mode should be triggered

## VS Code Requirements

From `.cursor/Vscode.md`:
1. **Preview mode**: Italic tabs that get replaced (single-click in explorer)
2. **Auto-replace**: Opening a new file in preview mode replaces the existing preview tab
3. **Convert to regular**: Preview tab becomes regular when:
   - User edits the file
   - User double-clicks the file
   - User explicitly "keeps" the file

## Implementation Plan

### Step 1: Add Preview Mode to EditorContext
- Add `isPreview` property to `OpenFile` interface
- Modify `openFile` to accept `preview?: boolean` parameter
- Implement preview replacement logic (replace existing preview tab)
- Add `convertPreviewToRegular` function

### Step 2: Update openFile Logic
- If opening in preview mode and a preview tab exists, replace it
- If opening in preview mode and file already open (not preview), activate it
- If opening in preview mode and file already open (preview), activate it
- If opening in regular mode, create new tab or activate existing

### Step 3: Convert Preview to Regular
- Convert when user edits file (`updateFileContent`)
- Convert when user double-clicks (need to add double-click handler)
- Convert when user explicitly keeps file (context menu option)

### Step 4: Update EditorTabs Visual Styling
- Show italic styling for preview tabs
- Distinguish from dirty tabs (both can be italic, but preview is different)

### Step 5: Update File Opening Logic
- Check how FileTree opens files
- Add preview mode support (single-click = preview, double-click = regular)

## Files to Modify

1. `src/renderer/contexts/EditorContext.tsx` - Add preview mode logic
2. `src/renderer/components/EditorTabs.tsx` - Add preview styling
3. `src/renderer/components/FileTree.tsx` or `FileExplorer.tsx` - Add preview mode on single-click

## Dependencies

### Existing
- `EditorContext` - Already exists
- `EditorTabs` - Already exists
- File opening logic - Need to locate

### New
- None - all dependencies already available

## Integration Points

1. **FileTree/FileExplorer** → **EditorContext**: Call `openFile` with `preview: true` for single-click
2. **EditorContext** → **EditorTabs**: Pass `isPreview` property
3. **EditorContext** → **Editor**: Convert preview to regular on edit
4. **EditorTabs** → **UI**: Show italic styling for preview tabs

## Accessibility Considerations

- Preview tabs: `aria-label` indicating preview state
- Visual distinction: Italic styling for preview
- Screen reader: Announce preview state

## Testing Considerations

- Single-click opens in preview mode
- Double-click opens in regular mode
- Preview tab replaced when opening new preview
- Preview converts to regular on edit
- Preview converts to regular on double-click
- Visual styling shows preview state
- Existing tabs not affected
