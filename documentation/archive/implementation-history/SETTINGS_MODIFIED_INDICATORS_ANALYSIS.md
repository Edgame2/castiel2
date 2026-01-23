# Settings Modified Indicators & Individual Reset Analysis

## Current State

### SettingsPanel Implementation
**File**: `src/renderer/components/SettingsPanel.tsx`

**Current Features**:
- ✅ Settings panel with ConfigForm
- ✅ Settings search (just completed)
- ✅ Save/Reset to defaults functionality (resets ALL settings)
- ✅ Settings organized in tabs

**Missing VS Code Patterns**:
- ❌ Modified indicator (shows which settings changed from default)
- ❌ Individual reset capability (reset single setting to default)
- ❌ Default values tracking
- ❌ Visual indication of modified settings

### ConfigForm Implementation
**File**: `src/renderer/components/ConfigForm.tsx`

**Current Structure**:
- Settings organized in 5 tabs
- Each setting has a path (e.g., `planning.strategy`)
- Settings can be changed but no indication of modification
- No way to reset individual settings

## VS Code Requirements

From `.cursor/Vscode.md`:
1. **Modified indicator**: Shows which settings changed from default
2. **Reset capability**: Reset individual settings
3. **Default values**: Track default values for comparison
4. **Visual feedback**: Clear indication of modified state

## Implementation Plan

### Step 1: Create Default Values Registry
- Define default values for all settings
- Store in settingsRegistry or separate file
- Use for comparison with current values

### Step 2: Add Modified Detection Logic
- Compare current config with default values
- Identify which settings are modified
- Create utility function to check if setting is modified

### Step 3: Add Visual Indicators to ConfigForm
- Add modified indicator (dot, asterisk, or badge) next to modified settings
- Style modified settings differently (e.g., border, background)
- Show default value on hover/tooltip

### Step 4: Add Individual Reset Buttons
- Add reset button next to each modified setting
- Reset button only shows for modified settings
- Reset to default value on click
- Update config and UI immediately

### Step 5: Integrate into SettingsPanel
- Pass default values to ConfigForm
- Handle individual reset callbacks
- Update config when setting is reset

## Files to Create/Modify

### New Files
1. `src/renderer/utils/settingsDefaults.ts` - Default values for all settings

### Modified Files
1. `src/renderer/components/SettingsPanel.tsx` - Handle individual resets
2. `src/renderer/components/ConfigForm.tsx` - Add indicators and reset buttons
3. `src/renderer/utils/settingsRegistry.ts` - Add default values to metadata

## Dependencies

### Existing
- `SettingsPanel` - Current implementation
- `ConfigForm` - Current form component
- `settingsRegistry` - Settings metadata
- `shadcn/ui` - Button, Tooltip components
- React hooks - useState, useMemo, useCallback

### New
- None - all dependencies already available

## Integration Points

1. **SettingsPanel** → **ConfigForm**: Pass default values and reset handler
2. **ConfigForm** → **SettingsPanel**: Call reset handler when setting reset
3. **settingsDefaults** → **ConfigForm**: Provide default values for comparison
4. **settingsRegistry** → **ConfigForm**: Provide setting metadata

## Accessibility Considerations

- Modified indicators: `aria-label` explaining modification
- Reset buttons: `aria-label` for each setting (e.g., "Reset Planning Strategy to default")
- Tooltips: Show default value on hover
- Keyboard navigation: Tab order, Enter to reset

## Testing Considerations

- Modified indicators show correctly
- Individual reset works
- Default values are correct
- Visual feedback is clear
- Config updates correctly on reset
- UI updates immediately
