# Activity Bar Customizable Order Analysis

## Current State

### ActivityBar Component
**File**: `src/renderer/components/ActivityBar.tsx`

**Current Features**:
- ✅ Hardcoded `activities` array with fixed order
- ✅ Keyboard navigation (ArrowUp/Down, Home/End)
- ✅ Keyboard shortcuts (Ctrl+1-9, Ctrl+Shift+)
- ❌ No customization support
- ❌ No persistence of custom order
- ❌ No hide/show functionality

**Current Order**:
1. Explorer
2. Search
3. Source Control
4. Debug
5. Extensions
6. Chat
7. Plans
8. Project
9. Productivity
10. Settings

### LayoutService
**File**: `src/renderer/platform/layout/layoutService.ts`

**Current Features**:
- ✅ Persists layout state (sidebar width, panel height, etc.)
- ✅ Loads/saves to localStorage
- ✅ EventEmitter for layout changes
- ❌ No Activity Bar order persistence

**Current Interface**:
```typescript
interface IWorkbenchLayoutInfo {
  sideBarWidth: number;
  panelHeight: number;
  secondarySidebarWidth: number;
  editorGroupWidths: number[];
  activityBarVisible: boolean;
  sideBarVisible: boolean;
  panelVisible: boolean;
  statusBarVisible: boolean;
  panelPosition: 'bottom' | 'right' | 'left';
}
```

## VS Code Requirements

From `.cursor/Vscode.md` and VS Code behavior:
1. **Customizable order**: Users can reorder Activity Bar items
2. **Hide/show items**: Users can hide items they don't use
3. **Persistence**: Custom order persists across sessions
4. **Context menu**: Right-click to access customization options
5. **Reset**: Option to reset to default order

## Implementation Plan

### Step 1: Extend LayoutService for Activity Bar Order
- Add `activityBarOrder` to `IWorkbenchLayoutInfo`
- Add `activityBarHidden` to track hidden items
- Add methods to get/set Activity Bar order
- Persist to localStorage

### Step 2: Update ActivityBar to Use Custom Order
- Accept `order` and `hidden` props (or get from LayoutService)
- Sort activities array based on custom order
- Filter out hidden items
- Maintain default order as fallback

### Step 3: Add Context Menu for Customization
- Right-click on Activity Bar item shows context menu
- Options: "Move Up", "Move Down", "Hide", "Show All"
- Or: Drag-and-drop for reordering (more complex)

### Step 4: Add Settings UI (Optional)
- Settings panel option to customize Activity Bar
- Visual drag-and-drop interface
- Checkboxes to show/hide items

## Files to Modify/Create

### Modify
1. `src/renderer/platform/layout/layoutService.ts` - Add Activity Bar order persistence
2. `src/renderer/components/ActivityBar.tsx` - Use custom order, add context menu
3. `src/renderer/components/MainLayout.tsx` - Pass order/hidden to ActivityBar

### Create (Optional)
1. `src/renderer/components/ActivityBarSettings.tsx` - Settings UI for customization

## Dependencies

### Existing
- `LayoutService` - Already exists, can be extended
- `ActivityBar` - Already exists, needs customization support
- Context menu system - Already exists

### New
- Activity Bar order state management
- Context menu for Activity Bar items

## Integration Points

1. **LayoutService** → **ActivityBar**: Provides custom order and hidden items
2. **ActivityBar** → **LayoutService**: Updates order when changed
3. **Context Menu** → **ActivityBar**: Provides customization UI
4. **MainLayout** → **ActivityBar**: Passes order/hidden props

## Implementation Strategy

### Phase 1: Basic Customization (This Implementation)
- ✅ Extend LayoutService for order/hidden state
- ✅ Update ActivityBar to use custom order
- ✅ Add context menu for "Move Up", "Move Down", "Hide"
- ✅ Persist to localStorage

### Phase 2: Enhanced Features (Future)
- Drag-and-drop reordering
- Settings UI panel
- Reset to default
- Show all hidden items

## Accessibility Considerations

- Context menu: Keyboard accessible
- Reordering: Keyboard shortcuts (Move Up/Down)
- Hidden items: Can be shown again via context menu
- Screen reader: Announce order changes

## Testing Considerations

- Custom order persists across sessions
- Hidden items don't appear
- Move Up/Down works correctly
- Hide/Show works correctly
- Default order works if no custom order
- Keyboard navigation works with custom order
- Keyboard shortcuts still work (Ctrl+1-9)

## Decision: Implementation Scope

**Recommended Approach**: Start with **basic customization**
- Context menu with Move Up/Down/Hide options
- Persistence via LayoutService
- Simple, manageable complexity
- Foundation for future enhancements

**Alternative**: If too complex, consider:
- Panel drag-and-drop (similar complexity)
- Other simpler features

## Next Steps

1. **Decision Point**: Confirm if Activity Bar customization should be implemented now
2. **If Proceeding**: Start with Phase 1 (basic customization)
3. **If Deferring**: Move to simpler features
