# Workspace Management

## Overview
The workspace management feature allows users to create, import, and manage file projects within the MindVex editor. This includes handling files, folders, and maintaining persistent state across sessions.

## Features
- **File Operations**: Create, delete, and edit files directly in the browser
- **Folder Management**: Create and delete folders to organize your project
- **Import Capabilities**: Import existing folders or repositories into the workspace
- **Persistent Storage**: Uses localStorage to save and restore workspace state
- **WebContainer Integration**: Leverages WebContainer technology for secure client-side file system operations

## Key Components
- WorkbenchStore: Manages the overall workspace state
- FilesStore: Handles file system operations
- EditorStore: Manages document editing state
- Persistence layer: Saves workspace state to localStorage

## Usage
1. Create new files and folders using the file tree UI
2. Import existing projects by dragging and dropping folders
3. Your workspace is automatically saved and can be restored on return
4. Switch between different projects using the repository history

## Technical Details
- All operations happen client-side using WebContainer
- Files are stored in-memory during the session
- Workspace state is persisted to localStorage
- Supports both text and binary files

## Algorithms Used

### File Path Validation Algorithm
- **Purpose**: Validates file paths to ensure they are within the allowed work directory
- **Validation Process**: Uses `path.relative()` to check that file paths are within the allowed directory
- **Security**: Prevents path traversal attacks by ensuring files are only created within the project directory

### Directory Traversal Algorithm
- **Purpose**: Recursively walks through the file system to discover all files
- **Implementation**: Uses asynchronous recursion to handle nested directories
- **Filtering**: Skips system directories like node_modules, .git, dist, build, etc.

### State Synchronization Algorithm
- **Mechanism**: Uses nanostores for reactive state management
- **Process**: Synchronizes file operations between different components in real-time
- **Efficiency**: Minimizes unnecessary re-renders through atomic state updates