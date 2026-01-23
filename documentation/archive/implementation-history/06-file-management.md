# File Management Module

**Category:** Editor & UI  
**Location:** `src/renderer/components/FileExplorer/`, `src/renderer/components/EditorTabs/`  
**Last Updated:** 2025-01-27

---

## Overview

The File Management Module provides file system navigation, file operations, and tab management for the Coder IDE. It includes the file explorer tree, editor tabs, and file operation dialogs.

## Purpose

- File tree navigation
- File operations (create, delete, rename, move)
- Tab management for open files
- Quick file search
- File context menus
- File watching and synchronization

---

## Key Components

### 1. File Explorer (`FileExplorer.tsx`, `FileTree.tsx`)

**Location:** `src/renderer/components/FileExplorer.tsx`, `src/renderer/components/FileTree.tsx`

**Purpose:** File system tree navigation

**Features:**
- Hierarchical file tree
- Expand/collapse folders
- File/folder icons
- Context menus
- Drag and drop
- Keyboard navigation

### 2. Editor Tabs (`EditorTabs.tsx`)

**Location:** `src/renderer/components/EditorTabs.tsx`

**Purpose:** Tab management for open files

**Features:**
- Multiple tabs
- Tab switching
- Tab closing
- Tab pinning
- Tab decorations (modified, unsaved)
- Tab reordering

### 3. File Operations

**Components:**
- `NewFileDialog.tsx` - Create new file/folder
- Context menus - Right-click operations

**Operations:**
- Create file/folder
- Delete file/folder
- Rename file/folder
- Move file/folder
- Copy file/folder
- Open file
- Reveal in file explorer

---

## File Explorer

### Tree Structure

```typescript
interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  expanded?: boolean;
  selected?: boolean;
}
```

### Navigation

**Keyboard Navigation:**
- Arrow keys - Navigate tree
- Enter - Open file/expand folder
- Space - Expand/collapse
- Delete - Delete file/folder
- F2 - Rename

**Mouse Navigation:**
- Click - Select
- Double-click - Open file/expand folder
- Right-click - Context menu

### Context Menu

**File Operations:**
- New File
- New Folder
- Rename
- Delete
- Copy
- Cut
- Paste
- Reveal in File Explorer

**Folder Operations:**
- New File
- New Folder
- Rename
- Delete
- Copy
- Cut
- Paste
- Collapse All

---

## Editor Tabs

### Tab Features

**Tab States:**
- Active - Currently selected tab
- Modified - File has unsaved changes
- Pinned - Tab is pinned
- Preview - Temporary preview tab

**Tab Operations:**
- Click - Switch to tab
- Middle-click - Close tab
- Right-click - Context menu
- Drag - Reorder tabs
- Pin - Pin tab

### Tab Context Menu

- Close
- Close Others
- Close to Right
- Close All
- Pin/Unpin
- Copy Path
- Reveal in File Explorer

### Tab Decorations

**Icons:**
- Modified indicator (dot)
- Unsaved indicator
- Pinned indicator
- Error indicator

---

## File Operations

### Create File

```typescript
// Create new file
await window.electronAPI.file.create(filePath, content);
```

### Create Folder

```typescript
// Create new folder
await window.electronAPI.file.createDirectory(dirPath);
```

### Delete File/Folder

```typescript
// Delete file or folder
await window.electronAPI.file.delete(path);
```

### Rename

```typescript
// Rename file or folder
await window.electronAPI.file.rename(oldPath, newPath);
```

### Move/Copy

```typescript
// Move file
await window.electronAPI.file.move(sourcePath, destPath);

// Copy file
await window.electronAPI.file.copy(sourcePath, destPath);
```

---

## File Watching

### Watch for Changes

```typescript
// Watch file for changes
window.electronAPI.file.watch(filePath, (event) => {
  if (event.type === 'change') {
    // File was modified externally
    reloadFile();
  } else if (event.type === 'delete') {
    // File was deleted
    closeFile();
  }
});
```

### Synchronization

- Detect external file changes
- Prompt to reload if modified
- Handle file deletions
- Handle file renames

---

## Quick File Search

### Quick Open

**Component:** `QuickOpen.tsx`

**Features:**
- Fuzzy file search
- Recent files
- File path search
- Keyboard shortcuts

**Usage:**
- `Ctrl/Cmd + P` - Quick open
- Type to search
- Arrow keys to navigate
- Enter to open

---

## File Icons

### Icon Mapping

- File type icons
- Folder icons
- Modified indicators
- Error indicators

### Custom Icons

```typescript
const iconMap = {
  '.ts': 'typescript-icon',
  '.tsx': 'react-icon',
  '.js': 'javascript-icon',
  // ... more mappings
};
```

---

## Drag and Drop

### File Operations

- Drag file to move
- Drag file to copy (with modifier key)
- Drag file to editor group
- Drag file to terminal

### Validation

- Validate drop targets
- Check permissions
- Handle errors

---

## Keyboard Shortcuts

### File Explorer

- `Ctrl/Cmd + N` - New file
- `Ctrl/Cmd + Shift + N` - New folder
- `F2` - Rename
- `Delete` - Delete
- `Ctrl/Cmd + C` - Copy
- `Ctrl/Cmd + X` - Cut
- `Ctrl/Cmd + V` - Paste

### Tabs

- `Ctrl/Cmd + Tab` - Next tab
- `Ctrl/Cmd + Shift + Tab` - Previous tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + K, W` - Close all tabs
- `Ctrl/Cmd + K, Ctrl/Cmd + W` - Close other tabs

---

## Related Modules

- **Monaco Editor Module** - Opens files in editor
- **Command & Palette Module** - File commands
- **Activity Bar & Views Module** - File explorer view

---

## Summary

The File Management Module provides comprehensive file system navigation and operations in the Coder IDE. With file explorer, editor tabs, file operations, and quick search, it enables efficient file management and navigation throughout the development workflow.
