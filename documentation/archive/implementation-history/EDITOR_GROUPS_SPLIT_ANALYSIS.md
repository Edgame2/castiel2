# Editor Groups & Split Editor Analysis

## Current State

### Editor Rendering
**File**: `src/renderer/components/MainLayout.tsx`

**Current Implementation**:
- ✅ Single `Editor` component rendered
- ✅ `EditorTabs` component shows all open files
- ✅ `EditorContext` manages `openFiles` and `activeFileId`
- ❌ No support for multiple editor groups
- ❌ No split editor functionality
- ❌ No grid layout system

**Current Structure**:
```tsx
<ResizablePanel>
  <main>
    <EditorTabs />
    <Breadcrumbs />
    <Editor />
  </main>
</ResizablePanel>
```

### EditorContext
**File**: `src/renderer/contexts/EditorContext.tsx`

**Current State**:
- ✅ Manages `openFiles` array
- ✅ Manages `activeFileId` (single active file)
- ✅ File operations (open, close, save, etc.)
- ❌ No editor group concept
- ❌ No group-specific file management
- ❌ No split operations

### EditorTabs
**File**: `src/renderer/components/EditorTabs.tsx`

**Current State**:
- ✅ Displays all open files
- ✅ Shows active file
- ✅ Supports pin, preview, dirty indicators
- ❌ No group-specific tabs
- ❌ No group switching UI

## VS Code Requirements

From `.cursor/Vscode.md`:
1. **Grid-based editor group system**: Horizontal/vertical splits, nested splits, 2D grid
2. **Editor groups**: Multiple independent editor instances
3. **Group actions**: Split horizontally, split vertically, close group, etc.
4. **Tab management per group**: Each group has its own tabs
5. **Active group**: One group is active at a time
6. **Layout persistence**: Save/restore split configurations

## Implementation Plan

### Architecture Decision

**Option A: Full Grid System (Complex)**
- Implement full VS Code-style grid layout
- Support arbitrary nested splits
- Complex state management
- High complexity, high flexibility

**Option B: Simplified Split System (Pragmatic)**
- Support horizontal and vertical splits
- Limit to 2-4 groups (practical limit)
- Simpler state management
- Lower complexity, good UX

**Decision**: **Option B (Simplified Split System)**
- More practical for initial implementation
- Can be extended later if needed
- Follows "Quality First" principle - simpler = fewer bugs
- Still provides core VS Code functionality

### Step 1: Extend EditorContext for Editor Groups
- Add `EditorGroup` interface
- Add `editorGroups` state (array of groups)
- Add `activeGroupId` state
- Modify file operations to be group-aware
- Add split operations (horizontal/vertical)

### Step 2: Create EditorGroup Component
- Render Editor component for each group
- Render EditorTabs per group
- Handle group-specific file management
- Support resizing between groups

### Step 3: Update MainLayout for Split Layout
- Replace single Editor with EditorGroup container
- Support ResizablePanelGroup for splits
- Handle split operations (horizontal/vertical)
- Manage group layout state

### Step 4: Add Split UI Controls
- Context menu options: "Split Right", "Split Down"
- Keyboard shortcuts (if needed)
- Close group action
- Switch between groups

### Step 5: Update EditorTabs for Groups
- Show tabs per group (or all groups with group indicator)
- Group switching UI
- Active group highlighting

## Data Structure Design

### EditorGroup Interface
```typescript
interface EditorGroup {
  id: string;
  files: OpenFile[];  // Files open in this group
  activeFileId: string | null;
  // Layout info could be added later
}
```

### EditorContext Changes
```typescript
interface EditorContextType {
  // Existing...
  editorGroups: EditorGroup[];
  activeGroupId: string | null;
  openFile: (file, groupId?, preview?) => string;
  splitEditor: (direction: 'horizontal' | 'vertical', groupId?: string) => string;
  closeGroup: (groupId: string) => void;
  setActiveGroup: (groupId: string) => void;
  // ... other group-aware operations
}
```

## Files to Modify/Create

### Modify
1. `src/renderer/contexts/EditorContext.tsx` - Add editor group support
2. `src/renderer/components/MainLayout.tsx` - Replace single Editor with EditorGroup container
3. `src/renderer/components/EditorTabs.tsx` - Support group-specific tabs (or show all with group indicator)

### Create
1. `src/renderer/components/EditorGroup.tsx` - Component for rendering a single editor group
2. `src/renderer/components/EditorGroupContainer.tsx` - Container managing multiple groups and splits

## Dependencies

### Existing
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` - Already in use
- `EditorContext` - Needs extension
- `Editor` component - Can be reused per group
- `EditorTabs` - Needs group awareness

### New
- EditorGroup state management
- Split layout management
- Group switching logic

## Integration Points

1. **EditorContext** → **EditorGroupContainer**: Provides group state and operations
2. **EditorGroupContainer** → **EditorGroup**: Renders individual groups
3. **EditorGroup** → **EditorTabs**: Shows tabs for that group
4. **EditorGroup** → **Editor**: Renders editor for that group
5. **MainLayout** → **EditorGroupContainer**: Replaces single Editor

## Complexity Assessment

### High Complexity Areas
1. **State Management**: Managing multiple groups, active group, file-to-group mapping
2. **Split Operations**: Creating new groups, managing layout
3. **File Operations**: Ensuring operations target correct group
4. **Tab Management**: Showing tabs per group or unified view

### Medium Complexity Areas
1. **Layout Persistence**: Saving/restoring split configurations
2. **Group Switching**: UI for switching between groups
3. **Resizing**: Managing ResizablePanel sizes

### Low Complexity Areas
1. **Rendering**: Reusing existing Editor component
2. **Styling**: Using existing ResizablePanel components

## Implementation Strategy

### Phase 1: Basic Editor Groups (This Implementation)
- ✅ Support 2 groups (horizontal split)
- ✅ Basic group operations (split, close)
- ✅ Group-aware file operations
- ✅ Simple tab display (all tabs with group indicator)

### Phase 2: Enhanced Features (Future)
- Vertical splits
- More than 2 groups
- Layout persistence
- Advanced tab management

## Accessibility Considerations

- Group switching: Keyboard navigation
- Split operations: Keyboard shortcuts
- ARIA labels: "Editor group 1", "Editor group 2"
- Focus management: Focus moves to active group

## Testing Considerations

- Split editor horizontally
- Split editor vertically
- Open file in specific group
- Close group
- Switch between groups
- File operations work per group
- Tabs show correct group
- Resizing works correctly

## Risk Assessment

### High Risk
- **State Management Complexity**: Managing multiple groups correctly
- **File-to-Group Mapping**: Ensuring files open in correct group
- **Active Group Management**: Ensuring correct group is active

### Medium Risk
- **Layout Management**: ResizablePanel coordination
- **Tab Display**: Showing tabs per group vs unified

### Low Risk
- **Component Rendering**: Reusing existing components
- **Styling**: Using existing UI components

## Decision: Implementation Scope

Given the complexity and the "Quality First" principle:

**Recommended Approach**: Start with **simplified implementation**
- Support 2 groups (horizontal split only initially)
- Basic split/close operations
- Group-aware file operations
- Simple tab display (all tabs, group indicator)

This provides:
- ✅ Core VS Code functionality
- ✅ Manageable complexity
- ✅ Foundation for future enhancements
- ✅ Quality over features

**Alternative**: If this is too complex, consider:
- Activity Bar customization (simpler)
- Panel drag-and-drop (simpler)
- Other low-priority features

## Next Steps

1. **Decision Point**: Confirm if editor groups should be implemented now, or defer to simpler features
2. **If Proceeding**: Start with Phase 1 (basic 2-group horizontal split)
3. **If Deferring**: Move to simpler features (Activity Bar customization, etc.)
