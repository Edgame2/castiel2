# Settings Search Implementation Analysis

## Current State

### SettingsPanel Implementation
**File**: `src/renderer/components/SettingsPanel.tsx`

**Current Features**:
- ✅ Settings panel with ConfigForm
- ✅ Settings organized in tabs (Planning, Execution, Models, Context, Quality)
- ✅ API Key management section
- ✅ Save/Reset functionality

**Missing**:
- ❌ Settings search functionality
- ❌ Search across all settings
- ❌ Highlight matching settings
- ❌ Auto-navigate to matching setting

### ConfigForm Implementation
**File**: `src/renderer/components/ConfigForm.tsx`

**Current Structure**:
- Settings organized in 5 tabs
- Each setting has:
  - Label (via `<Label>` component)
  - Description (via `<CardDescription>` or helper text)
  - Type (Select, Switch, Input, Checkbox)
  - Path (e.g., `planning.strategy`, `execution.autonomy`)

**Settings Count**: ~50+ settings across all tabs

### Existing Utilities
**File**: `src/renderer/utils/fuzzySearch.ts`

**Available Features**:
- ✅ `fuzzyMatch()` - Match query against target string
- ✅ `fuzzySearch()` - Search items with fuzzy matching
- ✅ `highlightMatches()` - Highlight matched characters
- ✅ Supports label, description, and keywords matching

## VS Code Settings Search Requirements

From `.cursor/Vscode.md`:
1. **Fast search** across all settings
2. **Real-time filtering** as user types
3. **Highlight matching text** in results
4. **Navigate to setting** when clicked
5. **Search across** setting names, descriptions, and values

## Implementation Plan

### Step 1: Extract Settings Metadata
- Create a settings registry that extracts all settings from ConfigForm
- Each setting entry should have:
  - `id`: Unique identifier (e.g., `planning.strategy`)
  - `label`: Display name
  - `description`: Help text
  - `category`: Tab name (Planning, Execution, etc.)
  - `path`: Config path
  - `type`: Setting type (select, switch, input, checkbox)
  - `keywords`: Additional search terms

### Step 2: Create SettingsSearch Component
- Search input at top of SettingsPanel
- Real-time filtering using `fuzzySearch` utility
- Display results with:
  - Highlighted match text
  - Category/tab indicator
  - Setting description
- Click result to navigate to setting

### Step 3: Integrate Search into SettingsPanel
- Add search input above tabs
- Filter ConfigForm based on search query
- Auto-switch to relevant tab when setting is selected
- Show "No results" state when no matches
- Clear search button

### Step 4: Enhance ConfigForm for Search
- Add `data-setting-id` attributes to setting elements
- Support programmatic scrolling to setting
- Highlight matching settings when search is active
- Filter out non-matching settings (or show all with highlights)

## Files to Create/Modify

### New Files
1. `src/renderer/utils/settingsRegistry.ts` - Settings metadata registry

### Modified Files
1. `src/renderer/components/SettingsPanel.tsx` - Add search input and filtering
2. `src/renderer/components/ConfigForm.tsx` - Add setting IDs and search support

## Dependencies

### Existing
- `fuzzySearch` utility - Already available
- `SettingsPanel` - Current implementation
- `ConfigForm` - Current form component
- `shadcn/ui` - Input, Button components
- React hooks - useState, useMemo, useCallback

### New
- None - all dependencies already available

## Integration Points

1. **SettingsPanel** → **SettingsSearch**: Search input and results display
2. **SettingsPanel** → **ConfigForm**: Pass search query and handle navigation
3. **fuzzySearch** → **SettingsSearch**: Use existing fuzzy search utility
4. **settingsRegistry** → **SettingsSearch**: Provide searchable settings metadata

## Accessibility Considerations

- Search input: `aria-label="Search settings"`, `aria-describedby` for results count
- Search results: `role="listbox"`, `aria-label` for each result
- Keyboard navigation: Arrow keys to navigate results, Enter to select
- Focus management: Focus search input on mount, return focus after selection

## Testing Considerations

- Search filters settings correctly
- Fuzzy matching works for partial queries
- Navigation to setting works
- Tab switching works when setting is in different tab
- Empty state displays correctly
- Keyboard navigation works
- Highlighting works correctly
