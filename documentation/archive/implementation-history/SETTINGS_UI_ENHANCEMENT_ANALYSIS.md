# Settings UI Enhancement Analysis

## Current State

### SettingsPanel Implementation
**File**: `src/renderer/components/SettingsPanel.tsx`

**Current Features**:
- ✅ Basic settings panel with ConfigForm
- ✅ API Key management
- ✅ Save/Reset to defaults functionality
- ✅ Error and success notifications
- ✅ Loading states

**Missing VS Code Patterns**:
- ❌ Settings search (fast search across all settings)
- ❌ Settings grouping (category organization)
- ❌ Modified indicator (shows which settings changed from default)
- ❌ Individual reset capability (reset single setting)
- ❌ Three-level settings (Default → User → Workspace)
- ❌ JSON backing (settings.json file)

## VS Code Settings UI Requirements

From `.cursor/Vscode.md`:
1. **Settings Search**: Fast search across all settings
2. **Settings Grouping**: Settings organized by category
3. **Modified Indicator**: Shows which settings changed from default
4. **Reset Capability**: Reset individual settings
5. **Three-level Settings**: Default → User → Workspace hierarchy
6. **JSON Backing**: UI writes to settings.json

## Implementation Plan

### Step 1: Add Settings Search
- Search input at top of settings panel
- Real-time filtering of settings
- Highlight matching text
- Search across setting names, descriptions, and values
- Clear search button

### Step 2: Add Settings Grouping
- Organize settings into categories (General, Editor, Appearance, etc.)
- Tabs or accordion for categories
- Category icons
- Collapsible sections

### Step 3: Add Modified Indicator
- Visual indicator (dot, asterisk, or color) for modified settings
- Compare current value with default value
- "Reset" button next to modified settings
- Show default value on hover

### Step 4: Add Individual Reset
- Reset button for each setting
- Reset to default value
- Visual feedback on reset
- Update modified indicators

### Step 5: Enhance Settings Structure
- Define settings schema with categories, defaults, descriptions
- Support for different setting types (boolean, string, number, enum)
- Validation for setting values
- Type-safe setting definitions

## Files to Create/Modify

### New Files
1. `src/renderer/utils/settingsSchema.ts` - Settings schema definitions
2. `src/renderer/components/SettingsSearch.tsx` - Search input component
3. `src/renderer/components/SettingsGroup.tsx` - Settings category group component
4. `src/renderer/components/SettingsItem.tsx` - Individual setting item component

### Modified Files
1. `src/renderer/components/SettingsPanel.tsx` - Enhanced with search, grouping, indicators
2. `src/renderer/components/ConfigForm.tsx` - May need updates for new structure

## Dependencies

### Existing
- `SettingsPanel` - Current implementation
- `ConfigForm` - Current form component
- `shadcn/ui` - Input, Button, Card, Tabs components
- React hooks - useState, useCallback, useEffect, useMemo

### New
- None - all dependencies already available

## Integration Points

1. **SettingsPanel** → **SettingsSearch**: Search input and filtering
2. **SettingsPanel** → **SettingsGroup**: Category organization
3. **SettingsPanel** → **SettingsItem**: Individual setting display
4. **SettingsSchema** → **SettingsPanel**: Settings definitions and defaults

## Accessibility Considerations

- Search input: `aria-label`, `aria-describedby`
- Settings groups: `role="group"`, `aria-label` for category
- Modified indicators: `aria-label` explaining modification
- Reset buttons: `aria-label` for each setting
- Keyboard navigation: Tab order, Enter to reset

## Testing Considerations

- Search filters settings correctly
- Grouping organizes settings properly
- Modified indicators show correctly
- Individual reset works
- Default values are correct
- Validation works for setting types
