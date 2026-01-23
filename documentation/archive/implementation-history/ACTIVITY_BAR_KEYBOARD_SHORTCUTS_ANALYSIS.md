# Activity Bar Keyboard Shortcuts Analysis

## Current State

### ActivityBar Component
**File**: `src/renderer/components/ActivityBar.tsx`

**Current Features**:
- ✅ Keyboard navigation (ArrowUp/Down, Home/End, Enter/Space)
- ✅ Tooltips show shortcuts (e.g., "Explorer (Ctrl+Shift+E)")
- ❌ Shortcuts not actually implemented
- ❌ No global keyboard shortcuts for switching views

**Current Tooltips**:
- Explorer: "Explorer (Ctrl+Shift+E)"
- Search: "Search (Ctrl+Shift+F)"
- Source Control: "Source Control (Ctrl+Shift+G)"
- Debug: "Run and Debug (Ctrl+Shift+D)"
- Extensions: "Extensions (Ctrl+Shift+X)"
- Settings: "Settings (Ctrl+,)"

### KeybindingService
**File**: `src/renderer/platform/keybinding/keybindingService.ts`

**Current Features**:
- ✅ Global keyboard shortcut handling
- ✅ Default keybindings registered
- ✅ Command-based execution
- ✅ Mac/Windows key detection
- ❌ No Activity Bar view shortcuts registered

### MainLayout
**File**: `src/renderer/components/MainLayout.tsx`

**Current Features**:
- ✅ Some keyboard shortcuts (Command Palette, Quick Open, etc.)
- ✅ Uses KeybindingService
- ❌ No Activity Bar view shortcuts

## VS Code Requirements

From `.cursor/Vscode.md` and VS Code behavior:
1. **Activity Bar shortcuts**: Ctrl+1, Ctrl+2, etc. for first 9 views
2. **View-specific shortcuts**: Ctrl+Shift+E (Explorer), Ctrl+Shift+F (Search), etc.
3. **Tooltip accuracy**: Tooltips should reflect actual shortcuts
4. **Global shortcuts**: Work from anywhere in the application

## Implementation Plan

### Step 1: Register Activity Bar Shortcuts in KeybindingService
- Add shortcuts for Activity Bar views:
  - Ctrl+1, Ctrl+2, ..., Ctrl+9 (first 9 views)
  - Ctrl+Shift+E (Explorer)
  - Ctrl+Shift+F (Search)
  - Ctrl+Shift+G (Source Control)
  - Ctrl+Shift+D (Debug)
  - Ctrl+Shift+X (Extensions)
  - Ctrl+, (Settings)
- Map to commands like `workbench.view.explorer`, `workbench.view.search`, etc.

### Step 2: Register Commands in CommandService
- Register commands for each Activity Bar view:
  - `workbench.view.explorer`
  - `workbench.view.search`
  - `workbench.view.scm` (Source Control)
  - `workbench.view.debug`
  - `workbench.view.extensions`
  - `workbench.view.chat`
  - `workbench.view.plans`
  - `workbench.view.project`
  - `workbench.view.productivity`
  - `workbench.view.settings`
- Commands should call `setActiveView` in MainLayout

### Step 3: Connect Commands to MainLayout
- In MainLayout, register command handlers for Activity Bar view commands
- Commands should switch to the corresponding view
- Ensure sidebar is visible when switching views

### Step 4: Update Tooltips (Optional)
- Verify tooltips match actual shortcuts
- Update any tooltips that don't have shortcuts yet

## Files to Modify

1. `src/renderer/platform/keybinding/keybindingService.ts` - Add Activity Bar shortcuts
2. `src/renderer/platform/commands/commandService.ts` - Register view commands (if not already)
3. `src/renderer/components/MainLayout.tsx` - Register command handlers
4. `src/renderer/components/ActivityBar.tsx` - Verify tooltips (optional)

## Dependencies

### Existing
- `KeybindingService` - Already exists
- `CommandService` - Already exists
- `MainLayout` - Already has `setActiveView`
- `ActivityBar` - Already has view definitions

### New
- Command handlers for view switching

## Integration Points

1. **KeybindingService** → **CommandService**: Shortcuts trigger commands
2. **CommandService** → **MainLayout**: Commands call `setActiveView`
3. **MainLayout** → **ActivityBar**: View change updates UI

## Shortcut Mapping

| View | Shortcut | Command |
|------|----------|---------|
| Explorer | Ctrl+Shift+E, Ctrl+1 | `workbench.view.explorer` |
| Search | Ctrl+Shift+F, Ctrl+2 | `workbench.view.search` |
| Source Control | Ctrl+Shift+G, Ctrl+3 | `workbench.view.scm` |
| Debug | Ctrl+Shift+D, Ctrl+4 | `workbench.view.debug` |
| Extensions | Ctrl+Shift+X, Ctrl+5 | `workbench.view.extensions` |
| Chat | Ctrl+6 | `workbench.view.chat` |
| Plans | Ctrl+7 | `workbench.view.plans` |
| Project | Ctrl+8 | `workbench.view.project` |
| Productivity | Ctrl+9 | `workbench.view.productivity` |
| Settings | Ctrl+, | `workbench.view.settings` |

## Accessibility Considerations

- Shortcuts work globally (not just when ActivityBar has focus)
- Tooltips show shortcuts for discoverability
- Keyboard navigation still works within ActivityBar
- Screen readers announce view changes

## Testing Considerations

- Ctrl+1-9 switch to corresponding views
- Ctrl+Shift+E/F/G/D/X switch to specific views
- Ctrl+, opens Settings
- Shortcuts work from anywhere in app
- Shortcuts don't interfere with editor shortcuts
- Tooltips match actual shortcuts

## Implementation Decision

**Scope**: Implement all Activity Bar keyboard shortcuts
- Provides full VS Code parity
- Improves discoverability
- Enhances productivity
- Relatively simple implementation
