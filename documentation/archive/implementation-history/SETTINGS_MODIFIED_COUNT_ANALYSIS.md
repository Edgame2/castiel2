# Settings Modified Count & Reset All Modified Analysis

## Current State

### SettingsPanel Implementation
**File**: `src/renderer/components/SettingsPanel.tsx`

**Current Features**:
- ✅ Settings search
- ✅ Save button
- ✅ Reset to Defaults button (resets ALL settings)
- ✅ Individual reset buttons (per setting)
- ✅ Modified indicators (yellow dots)

**Missing VS Code Patterns**:
- ❌ Modified count indicator (shows how many settings are modified)
- ❌ Reset All Modified button (resets only modified settings, not all)

## VS Code Requirements

From VS Code best practices:
1. **Modified count**: Show count of modified settings (e.g., "3 settings modified")
2. **Reset All Modified**: Button to reset only modified settings (vs. "Reset to Defaults" which resets everything)
3. **Visual feedback**: Clear indication of how many settings have been changed

## Implementation Plan

### Step 1: Add Modified Count Calculation
- Use `getModifiedSettings()` from `settingsDefaults`
- Calculate count of modified settings
- Display in SettingsPanel header

### Step 2: Add Reset All Modified Functionality
- Create `handleResetAllModified()` function
- Reset each modified setting to default
- Update config and UI
- Show success message

### Step 3: Add UI Elements
- Modified count badge/indicator in header
- "Reset All Modified" button (next to "Reset to Defaults")
- Visual styling for modified count

## Files to Modify

1. `src/renderer/components/SettingsPanel.tsx` - Add modified count and reset all modified button

## Dependencies

### Existing
- `settingsDefaults.getModifiedSettings()` - Already exists
- `settingsDefaults.resetSettingToDefault()` - Already exists
- `DEFAULT_CONFIG` - Already exists
- `shadcn/ui` - Button, Badge components

### New
- None - all dependencies already available

## Integration Points

1. **SettingsPanel** → **settingsDefaults**: Get modified settings count
2. **SettingsPanel** → **ConfigForm**: Update config when resetting all modified
3. **SettingsPanel** → **UI**: Display count and button

## Accessibility Considerations

- Modified count: `aria-label` explaining count
- Reset All Modified button: `aria-label` with count (e.g., "Reset 3 modified settings")
- Keyboard navigation: Tab order, Enter to reset

## Testing Considerations

- Modified count shows correctly
- Reset All Modified works
- Count updates when settings change
- Count updates when individual settings are reset
- Visual feedback is clear
