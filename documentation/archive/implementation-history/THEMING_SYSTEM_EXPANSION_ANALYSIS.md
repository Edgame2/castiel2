# Theming System Expansion Analysis

## Current State

### CSS Variables
**File**: `src/renderer/styles/index.css`

**Current Color Variables**:
- ✅ Basic shadcn/ui variables (~15 variables)
- ✅ Limited IDE-specific variables (activity-bar, sidebar, status-bar, panel)
- ✅ Light and dark theme support
- ❌ Only ~20 total color variables

**Missing**:
- ❌ Editor colors (foreground, background, selection, line numbers, etc.)
- ❌ Workbench colors (title bar, menu bar, etc.)
- ❌ Activity bar colors (badge, hover, etc.)
- ❌ Sidebar colors (tree, list, etc.)
- ❌ Panel colors (tabs, borders, etc.)
- ❌ Status bar colors (items, hover, etc.)
- ❌ Button colors
- ❌ Input colors
- ❌ List colors
- ❌ Tree colors
- ❌ Badge colors
- ❌ Progress bar colors
- ❌ Scrollbar colors
- ❌ Widget colors
- ❌ Notification colors
- ❌ And 300+ more...

### VS Code Color System

**Organization**:
- **Editor colors**: ~50 colors (foreground, background, selection, line numbers, etc.)
- **Workbench colors**: ~100 colors (title bar, menu bar, activity bar, sidebar, panel, status bar)
- **Button colors**: ~20 colors
- **Input colors**: ~15 colors
- **List/Tree colors**: ~30 colors
- **Badge colors**: ~10 colors
- **Progress bar colors**: ~10 colors
- **Scrollbar colors**: ~10 colors
- **Widget colors**: ~20 colors
- **Notification colors**: ~15 colors
- **Extension colors**: ~50 colors
- **Debug colors**: ~30 colors
- **Git colors**: ~20 colors
- **Terminal colors**: ~30 colors
- **And more...**

**Total**: 400+ color keys

## Implementation Plan

### Step 1: Organize Color Keys by Category
Create a structured system with categories:
1. Editor colors
2. Workbench colors
3. Button colors
4. Input colors
5. List/Tree colors
6. Badge colors
7. Progress bar colors
8. Scrollbar colors
9. Widget colors
10. Notification colors
11. Extension colors
12. Debug colors
13. Git colors
14. Terminal colors

### Step 2: Add CSS Variables
- Add all color keys as CSS variables
- Use VS Code naming convention: `--vscode-{category}-{property}`
- Support both light and dark themes
- Use HSL format for consistency

### Step 3: Update Tailwind Config
- Add color mappings to Tailwind config
- Enable easy access via Tailwind classes

### Step 4: Documentation
- Document all color keys
- Provide usage examples
- Create color reference guide

## Files to Create/Modify

### Create:
1. `src/renderer/styles/vscode-colors.css` - Comprehensive VS Code color definitions

### Modify:
1. `src/renderer/styles/index.css` - Import and integrate new colors
2. `tailwind.config.js` - Add color mappings

## Dependencies

- ✅ CSS custom properties (already supported)
- ✅ HSL color format (already in use)
- ✅ Theme provider (already exists)

## Quality Checks

- ✅ All 400+ color keys defined
- ✅ Light and dark themes supported
- ✅ Consistent naming convention
- ✅ HSL format throughout
- ✅ Well-organized by category
- ✅ Documented
