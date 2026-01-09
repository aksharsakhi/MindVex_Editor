# File Explorer

## Overview
The file explorer provides a comprehensive interface for navigating and managing project files and directories within the MindVex editor.

## Features
- **Hierarchical View**: Displays files and folders in a tree structure
- **Folder Collapsing**: Expand and collapse folders to manage view
- **File Operations**: Create, delete, and rename files and folders
- **Visual Indicators**: Shows file types with appropriate icons
- **Drag and Drop**: Support for importing files by dragging them into the workspace
- **Search Capability**: Quickly find files within the project

## Key Components
- FileTree: Renders the hierarchical file structure
- FileTreeItem: Represents individual files or folders
- Context menus: Provide file operations through right-click menus
- Drag and drop handlers: Manage file imports

## Usage
1. Browse the project structure in the left sidebar
2. Click on folders to expand/collapse them
3. Click on files to open them in the editor
4. Right-click for context menu with file operations
5. Drag files from your computer to import them
6. Create new files or folders using the menu options

## Technical Details
- Integrates with the WebContainer file system
- Updates in real-time as files are created or deleted
- Maintains expanded/collapsed state across sessions
- Supports all file types including binary files

## Algorithms Used

### File Tree Construction Algorithm
- Purpose: Builds and maintains the hierarchical file structure
- Implementation: Uses a recursive algorithm that traverses the WebContainer file system
- Process: 
  1. Reads the root directory from WebContainer
  2. Recursively processes each subdirectory
  3. Creates tree nodes for files and directories
  4. Maintains parent-child relationships between nodes
- Time Complexity: O(n) where n is the number of files and directories

### Directory Traversal Algorithm
- Purpose: Efficiently navigates through the file system hierarchy
- Implementation: Uses a depth-first search algorithm to explore the directory structure
- Process: 
  1. Starts at the root directory
  2. Visits each subdirectory recursively
  3. Processes files in each directory
  4. Maintains path information for each file
- Time Complexity: O(n) where n is the number of files and directories

### File Sorting Algorithm
- Purpose: Orders files and directories in a consistent, user-friendly manner
- Implementation: Uses a custom sorting algorithm that separates directories from files
- Process: 
  1. Groups directories first, then files
  2. Sorts each group alphabetically
  3. Applies special handling for common file patterns (e.g., package.json prioritized)
- Time Complexity: O(n log n) where n is the number of items to sort

### Path Resolution Algorithm
- Purpose: Converts relative paths to absolute paths and validates them
- Implementation: Uses a path normalization algorithm to ensure security and correctness
- Process: 
  1. Normalizes the input path to eliminate relative references
  2. Validates the path is within the allowed workspace directory
  3. Resolves the path to its canonical form
  4. Checks for path traversal security issues
- Time Complexity: O(p) where p is the length of the path

### State Persistence Algorithm
- Purpose: Maintains expanded/collapsed state of folders across sessions
- Implementation: Uses a tree state serialization algorithm with localStorage
- Process: 
  1. Serializes the expanded state of each folder node
  2. Stores the state in localStorage
  3. Restores the state when the application loads
  4. Updates the state as users expand/collapse folders
- Time Complexity: O(n) for serialization/deserialization where n is the number of nodes