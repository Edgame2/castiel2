# Focus Management Enhancement - Pre-Implementation Analysis

## Current State Analysis

### Existing Implementation
**Files**: 
- `src/renderer/components/ui/dialog.tsx` - Uses Radix UI DialogPrimitive
- `src/renderer/components/CommandPalette.tsx` - Uses shadcn CommandDialog
- `src/renderer/components/QuickOpen.tsx` - Uses CommandDialog
- `src/renderer/components/GoToSymbol.tsx` - Uses CommandDialog
- `src/renderer/components/GoToLine.tsx` - Uses CommandDialog

**Current Features**:
- ✅ Radix UI Dialog handles focus trap automatically
- ✅ Radix UI Dialog handles escape key
- ✅ CommandDialog (shadcn) handles focus management
- ✅ Dialogs can be closed

**Missing Features**:
- ❌ No explicit focus return to trigger on dialog close
- ❌ No verification of focus trap behavior
- ❌ CommandPalette doesn't return focus to trigger
- ❌ QuickOpen doesn't return focus to trigger
- ❌ No focus management documentation

### VS Code Best Practices
From `.cursor/Vscode.md`:
- Dialogs should trap focus (keep focus inside dialog)
- Focus should return to trigger when dialog closes
- First focusable element should receive focus when dialog opens
- Escape key should close dialog and return focus

### Radix UI Behavior
**Radix UI DialogPrimitive**:
- ✅ Automatically traps focus
- ✅ Handles escape key
- ✅ Focuses first element on open
- ⚠️ May not return focus to trigger (needs verification)

**shadcn CommandDialog**:
- ✅ Uses Radix UI DialogPrimitive
- ✅ Handles focus management
- ⚠️ May not return focus to trigger (needs verification)

## Implementation Plan

### Step 1: Verify Dialog Focus Management
- Test current focus trap behavior
- Verify focus return on close
- Document current behavior

### Step 2: Enhance Dialog Focus Return
- Add focus return to trigger on close
- Use `onOpenChange` callback to track trigger
- Store trigger element before opening

### Step 3: Enhance CommandPalette Focus Return
- Store trigger element reference
- Return focus to trigger on close
- Handle case where trigger doesn't exist

### Step 4: Enhance QuickOpen/GoToSymbol/GoToLine
- Add focus return to trigger
- Consistent behavior across all dialogs

## Files to Modify

1. **`src/renderer/components/CommandPalette.tsx`**
   - Add trigger ref tracking
   - Return focus on close

2. **`src/renderer/components/QuickOpen.tsx`**
   - Add trigger ref tracking
   - Return focus on close

3. **`src/renderer/components/GoToSymbol.tsx`**
   - Add trigger ref tracking
   - Return focus on close

4. **`src/renderer/components/GoToLine.tsx`**
   - Add trigger ref tracking
   - Return focus on close

5. **`src/renderer/components/ui/dialog.tsx`** (Optional)
   - Enhance DialogContent to support focus return
   - Add prop for trigger element

## Dependencies

- ✅ React hooks (useRef, useEffect)
- ✅ Radix UI DialogPrimitive (already used)
- ✅ Existing components (no new dependencies)

## Integration Points

- **CommandPalette**: Opens via keyboard shortcut or menu
- **QuickOpen**: Opens via keyboard shortcut
- **GoToSymbol**: Opens via keyboard shortcut
- **GoToLine**: Opens via keyboard shortcut
- **Dialogs**: Various dialogs throughout the app

## Quality Checks

- ✅ Focus trap works correctly
- ✅ Focus returns to trigger on close
- ✅ First element receives focus on open
- ✅ Escape key closes and returns focus
- ✅ No regressions in existing functionality

## Expected Behavior

1. **Dialog opens**: First focusable element receives focus
2. **Focus trap**: Tab key cycles through dialog elements only
3. **Escape key**: Closes dialog and returns focus to trigger
4. **Close button**: Closes dialog and returns focus to trigger
5. **Overlay click**: Closes dialog and returns focus to trigger (if enabled)
