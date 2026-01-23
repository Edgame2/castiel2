# Virtual Tree Rendering Analysis

## Current State

### FileTree Component
**File**: `src/renderer/components/FileTree.tsx`

**Current Implementation**:
- Recursive tree rendering (`renderNode()`)
- Renders all nodes in the tree
- No virtual scrolling
- Performance issue: Renders all nodes even if not visible

**Structure**:
```typescript
interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}
```

**Rendering**:
- Recursive `renderNode()` function
- Renders all nodes regardless of visibility
- Depth-based indentation (16px per level)

### Virtual List Hook
**File**: `src/renderer/hooks/useVirtualList.ts`

**Current Implementation**:
- Designed for flat lists
- Fixed item height
- Uses scroll position to calculate visible range
- Not suitable for trees (variable heights, nested structure)

## Challenge: Tree Virtual Rendering

### Problems with Current Hook
1. **Variable Heights**: Tree items have different heights based on depth
2. **Nested Structure**: Trees are recursive, not flat
3. **Expansion State**: Only expanded nodes should be visible
4. **Dynamic Updates**: Expanding/collapsing changes visible items

### Solution Approach

1. **Flatten Tree to Linear List**
   - Traverse tree recursively
   - Only include expanded nodes and their visible children
   - Maintain depth information for each item
   - Calculate cumulative heights

2. **Variable Height Virtual Rendering**
   - Track height per item (based on depth)
   - Calculate cumulative heights for positioning
   - Use binary search to find visible range
   - Render only visible items

3. **Handle Expansion/Collapse**
   - Re-flatten tree when expansion state changes
   - Maintain scroll position (if possible)
   - Update virtual list

## Implementation Plan

### Step 1: Create Tree Flattening Function
- Flatten tree to linear list
- Include only expanded nodes
- Track depth and cumulative height

### Step 2: Create Virtual Tree Hook
- Extend `useVirtualList` for trees
- Handle variable heights
- Support expansion/collapse

### Step 3: Integrate into FileTree
- Replace recursive rendering with virtual rendering
- Maintain existing functionality (expand/collapse, click handlers)

## Files to Create/Modify

### Create:
1. `src/renderer/hooks/useVirtualTree.ts` - Virtual tree rendering hook

### Modify:
1. `src/renderer/components/FileTree.tsx` - Use virtual rendering

## Dependencies

- ✅ useVirtualList hook - Base for virtual rendering
- ✅ FileTree component - Target for integration
- ✅ FileTreeItem component - Individual item renderer

## Performance Benefits

- **Before**: Renders all nodes (could be 1000+ items)
- **After**: Renders only visible nodes (~20-30 items)
- **Improvement**: 10-50x performance improvement for large trees
