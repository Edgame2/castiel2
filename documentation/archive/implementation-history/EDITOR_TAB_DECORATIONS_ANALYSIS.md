# Editor Tab Decorations Analysis

## Current State

### EditorTabs Implementation
**File**: `src/renderer/components/EditorTabs.tsx`

**Current Features**:
- ✅ Displays file name
- ✅ Shows `isPinned` with pin icon
- ✅ Shows `isDirty` with dot indicator
- ✅ Shows `isPreview` with italic styling
- ❌ No file type icons
- ❌ No color coding
- ❌ No badges (error count, warnings, etc.)

**Current Tab Rendering**:
```tsx
{file.isPinned && (
  <Pin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
)}
<span className={cn('truncate max-w-[200px]', ...)}>
  {file.name}
  {file.isDirty && <span className="ml-1">•</span>}
</span>
```

### OpenFile Interface
**File**: `src/renderer/contexts/EditorContext.tsx`

**Current Properties**:
- `id`, `path`, `name`, `content`, `language`, `isDirty`, `isPinned`, `isPreview`
- ❌ No `icon` property
- ❌ No `color` property
- ❌ No `badge` property

### File Type Detection
**File**: `src/renderer/utils/fileUtils.ts` (likely)

**Current State**:
- Need to check if file type detection exists
- Need to check if language detection exists (already used in `detectLanguageFromPath`)

## VS Code Requirements

From `.cursor/Vscode.md`:
1. **Tab decorations**: Icons, colors, badges for extensions
2. **File type icons**: Visual representation of file types
3. **Color coding**: Different colors for different file types or states
4. **Badges**: Error/warning counts, git status, etc.

## Implementation Plan

### Step 1: Create File Type Icon Utility
- Create utility to map file extensions to icons
- Use lucide-react icons (already in project)
- Support common file types (TypeScript, JavaScript, Python, etc.)
- Fallback to generic File icon

### Step 2: Add Icon to OpenFile (Optional)
- Option A: Add `icon` property to `OpenFile` interface
- Option B: Compute icon from file path/extension in component
- **Decision**: Option B (compute in component) - simpler, no state changes needed

### Step 3: Update EditorTabs to Display Icons
- Add file type icon before file name
- Use appropriate icon based on file extension
- Maintain existing pin icon, dirty indicator, preview styling

### Step 4: Add Color Coding (Optional Enhancement)
- Different colors for different file types
- Use CSS variables for theming
- Keep subtle, don't overwhelm

### Step 5: Add Badges (Future Enhancement)
- Error/warning counts
- Git status indicators
- Extension-provided badges
- **Note**: This requires integration with other systems (linter, git, etc.)

## Files to Modify

1. `src/renderer/components/EditorTabs.tsx` - Add icon display
2. `src/renderer/utils/fileUtils.ts` (or create new) - File type icon utility

## Dependencies

### Existing
- `lucide-react` - Icon library (already in project)
- `fileUtils.ts` - File utilities (likely exists)
- `EditorContext` - File data

### New
- File type icon mapping utility

## Integration Points

1. **FileUtils** → **EditorTabs**: Get icon for file extension
2. **EditorTabs** → **UI**: Display icon in tab

## Icon Mapping Strategy

### Common File Types
- `.ts`, `.tsx` → TypeScript icon (FileCode or similar)
- `.js`, `.jsx` → JavaScript icon
- `.py` → Python icon
- `.json` → JSON icon
- `.md` → Markdown icon
- `.css`, `.scss` → CSS icon
- `.html` → HTML icon
- `.xml` → XML icon
- `.yaml`, `.yml` → YAML icon
- `.sh`, `.bash` → Shell icon
- `.gitignore`, `.env` → Config icon
- Default → File icon

### Icon Selection
- Use lucide-react icons
- Choose icons that are visually distinct
- Keep size consistent (h-3 w-3 to match Pin icon)

## Accessibility Considerations

- Icons: `aria-hidden="true"` (already used for Pin icon)
- Icon meaning: File type is conveyed by file extension in name
- Screen reader: File name already announced, icon is decorative

## Testing Considerations

- Icon displays for common file types
- Fallback icon for unknown types
- Icon doesn't break existing layout
- Icon works with pinned, dirty, preview states
- Icon size matches existing Pin icon

## Implementation Decision

**Scope**: Start with **file type icons only** (Step 1-3)
- Simple, high-value visual enhancement
- No state changes needed
- Reuses existing icon library
- Can be extended later with colors/badges

**Future Enhancements**:
- Color coding (Step 4)
- Badges (Step 5) - requires integration with linter/git
