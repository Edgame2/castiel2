# File Management Module
## Components, Features, and File Operations

---

## OVERVIEW

**Location:** `src/renderer/components/FileExplorer/`, `src/renderer/components/EditorTabs/`  
**Purpose:** File system navigation, file operations, and tab management

---

## UI COMPONENTS

### Main Components

#### 1. File Explorer
**Files:** `FileExplorer.tsx`, `FileTree.tsx`  
**Location:** `src/renderer/components/FileExplorer.tsx`, `src/renderer/components/FileTree.tsx`

**Purpose:** Hierarchical file system tree navigation

**Features:**
- Hierarchical file tree
- Expand/collapse folders
- File/folder icons
- Context menus
- Drag and drop
- Keyboard navigation
- File selection
- Multi-select support

**Tree Node Structure:**
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

---

#### 2. Editor Tabs
**File:** `EditorTabs.tsx`  
**Location:** `src/renderer/components/EditorTabs.tsx`

**Purpose:** Tab management for open files

**Features:**
- Multiple tabs per editor group
- Tab switching
- Tab closing
- Tab pinning
- Tab decorations (modified, unsaved)
- Tab reordering (drag and drop)
- Tab context menu
- Tab icons
- Modified indicator
- Close button

**Tab States:**
- `active` - Currently selected tab
- `inactive` - Not selected
- `modified` - Has unsaved changes
- `pinned` - Tab is pinned
- `preview` - Temporary preview tab

---

#### 3. File Operation Dialogs

**Components:**
- `NewFileDialog.tsx` - Create new file/folder dialog
- `RenameDialog.tsx` - Rename file/folder dialog
- `DeleteConfirmDialog.tsx` - Delete confirmation dialog

**Features:**
- Input validation
- Error handling
- Confirmation prompts
- Keyboard shortcuts

---

#### 4. Quick Open
**File:** `QuickOpen.tsx`  
**Location:** `src/renderer/components/QuickOpen.tsx`

**Purpose:** Quick file search and open

**Features:**
- Fuzzy file search
- Recent files list
- File path search
- File type filtering
- Keyboard navigation
- Preview on hover

**Keyboard Shortcut:** `Ctrl/Cmd + P`

---

### Supporting Components

#### 5. File Icon Provider
**Purpose:** Provide file type icons

**Icon Types:**
- File extension icons (.ts, .tsx, .js, .css, etc.)
- Folder icons (open/closed)
- Special file icons (package.json, tsconfig.json, etc.)
- Modified indicators
- Error indicators

**Icon Mapping:**
```typescript
const iconMap = {
  '.ts': 'typescript-icon',
  '.tsx': 'react-icon',
  '.js': 'javascript-icon',
  '.jsx': 'react-icon',
  '.css': 'css-icon',
  '.scss': 'sass-icon',
  '.html': 'html-icon',
  '.json': 'json-icon',
  '.md': 'markdown-icon',
  '.py': 'python-icon',
  '.java': 'java-icon',
  '.go': 'go-icon',
  '.rs': 'rust-icon',
  // ... more mappings
};
```

---

#### 6. File Context Menu
**Purpose:** Right-click context menu for files/folders

**File Menu Options:**
- New File
- New Folder
- Open
- Open to Side
- Rename
- Delete
- Copy
- Cut
- Paste
- Copy Path
- Copy Relative Path
- Reveal in File Explorer
- Reveal in Finder/Explorer
- Open in Terminal

**Folder Menu Options:**
- New File
- New Folder
- Rename
- Delete
- Copy
- Cut
- Paste
- Copy Path
- Collapse All
- Reveal in File Explorer
- Open in Terminal

---

## FILE OPERATIONS

### Via IPC (Electron API)

All file operations go through `window.electronAPI.file.*`

#### 1. Read File
```typescript
const content = await window.electronAPI.file.read(filePath);
```

**Parameters:**
- `filePath: string` - Absolute file path

**Returns:** `Promise<string>` - File content

---

#### 2. Write File
```typescript
await window.electronAPI.file.write(filePath, content);
```

**Parameters:**
- `filePath: string` - Absolute file path
- `content: string` - File content to write

**Returns:** `Promise<void>`

---

#### 3. Create File
```typescript
await window.electronAPI.file.create(filePath, content);
```

**Parameters:**
- `filePath: string` - Absolute file path
- `content: string` - Initial file content (optional, default: '')

**Returns:** `Promise<void>`

---

#### 4. Delete File/Folder
```typescript
await window.electronAPI.file.delete(path);
```

**Parameters:**
- `path: string` - Absolute file or folder path

**Returns:** `Promise<void>`

**Features:**
- Deletes files
- Deletes folders recursively
- Moves to trash/recycle bin (if supported)

---

#### 5. Rename/Move
```typescript
await window.electronAPI.file.rename(oldPath, newPath);
```

**Parameters:**
- `oldPath: string` - Current absolute path
- `newPath: string` - New absolute path

**Returns:** `Promise<void>`

**Use Cases:**
- Rename file/folder
- Move file/folder to different directory

---

#### 6. Copy
```typescript
await window.electronAPI.file.copy(sourcePath, destPath);
```

**Parameters:**
- `sourcePath: string` - Source file/folder path
- `destPath: string` - Destination path

**Returns:** `Promise<void>`

---

#### 7. Check Existence
```typescript
const exists = await window.electronAPI.file.exists(path);
```

**Parameters:**
- `path: string` - File or folder path

**Returns:** `Promise<boolean>` - True if exists

---

#### 8. Get File Stats
```typescript
const stats = await window.electronAPI.file.stat(path);
```

**Parameters:**
- `path: string` - File or folder path

**Returns:** `Promise<FileStats>`

```typescript
interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
}
```

---

#### 9. Create Directory
```typescript
await window.electronAPI.file.createDirectory(dirPath);
```

**Parameters:**
- `dirPath: string` - Directory path to create

**Returns:** `Promise<void>`

**Features:**
- Creates directory
- Creates parent directories if needed (recursive)

---

#### 10. List Directory
```typescript
const entries = await window.electronAPI.file.readDirectory(dirPath);
```

**Parameters:**
- `dirPath: string` - Directory path to list

**Returns:** `Promise<FileEntry[]>`

```typescript
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}
```

---

#### 11. Watch File/Directory
```typescript
window.electronAPI.file.watch(path, (event) => {
  if (event.type === 'change') {
    // File changed
    reloadFile();
  } else if (event.type === 'delete') {
    // File deleted
    closeFile();
  } else if (event.type === 'rename') {
    // File renamed
    updateFilePath();
  }
});
```

**Parameters:**
- `path: string` - File or directory to watch
- `callback: (event: FileEvent) => void` - Event callback

**Event Types:**
- `change` - File content changed
- `delete` - File deleted
- `rename` - File renamed/moved
- `create` - New file created (directory watching)

---

#### 12. Index File
```typescript
await window.electronAPI.file.index(filePath);
```

**Parameters:**
- `filePath: string` - File to index

**Returns:** `Promise<void>`

**Purpose:** Index file for search and context aggregation

---

## FILE EXPLORER FEATURES

### 1. Keyboard Navigation

**Keys:**
- `Arrow Up` - Previous item
- `Arrow Down` - Next item
- `Arrow Right` - Expand folder
- `Arrow Left` - Collapse folder
- `Enter` - Open file / Expand folder
- `Space` - Expand/collapse folder
- `Delete` - Delete file/folder
- `F2` - Rename file/folder
- `Ctrl/Cmd + C` - Copy
- `Ctrl/Cmd + X` - Cut
- `Ctrl/Cmd + V` - Paste
- `Ctrl/Cmd + A` - Select all

---

### 2. Mouse Navigation

**Actions:**
- `Click` - Select item
- `Double-click` - Open file / Expand folder
- `Right-click` - Context menu
- `Drag` - Start drag operation
- `Drop` - Complete drag operation
- `Ctrl/Cmd + Click` - Multi-select
- `Shift + Click` - Range select

---

### 3. Drag and Drop

**Drag Operations:**
- Drag file to move (default)
- `Ctrl/Cmd + Drag` - Copy file
- `Alt + Drag` - Create link
- Drag to editor group - Open in editor
- Drag to terminal - Insert path
- Drag between folders - Move/Copy file

**Drop Targets:**
- Folders (move/copy into)
- Editor groups (open file)
- Terminal (insert path)

**Visual Feedback:**
- Drag ghost image
- Drop target highlighting
- Copy/move cursor indicator

---

### 4. Multi-Select

**Selection Methods:**
- `Ctrl/Cmd + Click` - Add/remove from selection
- `Shift + Click` - Select range
- `Ctrl/Cmd + A` - Select all

**Multi-Select Operations:**
- Delete multiple files
- Copy multiple files
- Move multiple files
- Open multiple files

---

### 5. File Watching & Synchronization

**Features:**
- Detect external file changes
- Detect file deletions
- Detect file creations
- Detect file renames
- Prompt to reload changed files
- Auto-update tree on changes

**External Change Handling:**
```typescript
// File modified externally
if (fileModifiedExternally) {
  showReloadPrompt('File changed on disk. Reload?');
}

// File deleted externally
if (fileDeletedExternally) {
  closeFileInEditor();
  removeFromTree();
}
```

---

### 6. File Filtering

**Filter Types:**
- Hide hidden files (dotfiles)
- Hide ignored files (.gitignore)
- Filter by file type
- Filter by name pattern

**Configuration:**
```typescript
interface FileFilterConfig {
  showHidden: boolean;
  showIgnored: boolean;
  fileTypes: string[];
  excludePatterns: string[];
}
```

---

## EDITOR TAB FEATURES

### 1. Tab Operations

**Operations:**
- Open tab
- Close tab
- Close all tabs
- Close other tabs
- Close tabs to right
- Close saved tabs
- Reopen closed tab
- Pin/Unpin tab
- Split editor (open in new group)

---

### 2. Tab Keyboard Shortcuts

**Shortcuts:**
- `Ctrl/Cmd + Tab` - Next tab
- `Ctrl/Cmd + Shift + Tab` - Previous tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + K, W` - Close all tabs
- `Ctrl/Cmd + K, Ctrl/Cmd + W` - Close other tabs
- `Ctrl/Cmd + K, Enter` - Keep editor (convert preview to permanent)
- `Ctrl/Cmd + 1-9` - Switch to tab by number

---

### 3. Tab Context Menu

**Menu Options:**
- Close
- Close Others
- Close to Right
- Close All
- Close Saved
- Pin/Unpin
- Split Up
- Split Down
- Split Left
- Split Right
- Copy Path
- Copy Relative Path
- Reveal in File Explorer
- Reopen Closed Tab

---

### 4. Tab Decorations

**Visual Indicators:**
- Modified indicator (dot) - Unsaved changes
- Pinned indicator (pin icon) - Pinned tab
- Preview indicator (italics) - Preview tab
- Error indicator (error icon) - File has errors
- Git status (color) - Git status indicator

---

### 5. Tab Reordering

**Methods:**
- Drag and drop tabs to reorder
- Drag tabs between editor groups
- Keyboard shortcuts to move tabs

---

### 6. Preview Tabs

**Features:**
- Single-click opens preview tab
- Preview tab shown in italics
- Opening another file replaces preview
- Double-click or edit converts to permanent
- `Ctrl/Cmd + K, Enter` to keep preview

---

## QUICK OPEN FEATURES

### 1. Fuzzy Search

**Algorithm:**
- Fuzzy matching by filename
- Path matching
- Recent files prioritized
- Score-based ranking

**Search Examples:**
- `abc` matches `AppBarComponent.tsx`
- `src/app` matches files in `src/app/`
- `comp` matches `Component.tsx`

---

### 2. Recent Files

**Features:**
- Track recently opened files
- Show at top of results
- Persist across sessions
- Clear recent list option

---

### 3. File Preview

**Features:**
- Hover to preview file content
- Show file path
- Show file size
- Show modification date

---

## INTEGRATION POINTS

### Used By:

1. **Monaco Editor Module**
   - Opens files in editor
   - Loads file content
   - Saves file changes

2. **Activity Bar Module**
   - Explorer view
   - File tree display

3. **Command Palette Module**
   - File operation commands
   - Quick open integration

4. **Search Module**
   - File search
   - Content search

### Uses:

1. **IPC Communication Module**
   - File operations via IPC
   - File watching events

2. **Platform Services Module**
   - File system access
   - Path operations

3. **UI Components Module**
   - Dialog components
   - Context menu components
   - Icon components

---

## NO API ENDPOINTS

The File Management module has **no HTTP API endpoints** - all file operations go through IPC.

**IPC Channels Used:**
- `file:read`
- `file:write`
- `file:create`
- `file:delete`
- `file:rename`
- `file:copy`
- `file:exists`
- `file:stat`
- `file:create-directory`
- `file:read-directory`
- `file:watch`
- `file:index`

---

## SUMMARY

### UI Components: 6
1. File Explorer (with FileTree)
2. Editor Tabs
3. File Operation Dialogs
4. Quick Open
5. File Icon Provider
6. File Context Menu

### File Operations: 12
1. Read
2. Write
3. Create
4. Delete
5. Rename/Move
6. Copy
7. Check Existence
8. Get Stats
9. Create Directory
10. List Directory
11. Watch
12. Index

### Features:
- **Navigation:** Keyboard, mouse, drag-and-drop
- **Selection:** Single, multi, range
- **Tabs:** Multiple tabs, pinning, reordering
- **Search:** Fuzzy search, recent files
- **Watching:** External change detection
- **Synchronization:** Auto-reload, conflict resolution

### Keyboard Shortcuts: 20+
- File explorer navigation
- File operations
- Tab management
- Quick open

### No API Endpoints (uses IPC)
