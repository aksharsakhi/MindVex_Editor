# AI Chat Integration

## Overview
The AI chat integration provides a powerful conversational interface that can understand and modify your codebase. It allows users to chat with their code and receive intelligent assistance.

## Features
- **Code Context Awareness**: AI understands the entire project context
- **Active File Mode**: Focus AI attention on the currently active file
- **Selected Files Mode**: Allow users to specify which files the AI should consider
- **No Context Mode**: Chat without providing any project files to the AI
- **Code Generation**: AI can create new files and modify existing ones
- **File Operations**: AI can create, delete, and modify files based on chat instructions
- **Real-time Interaction**: See AI changes reflected immediately in the editor

## Key Components
- BaseChat: Main chat interface component
- useChat hook: Manages the chat conversation state
- API integration: Handles communication with AI providers
- Context management: Controls which files are sent to the AI
- Artifact system: Handles AI-generated code and file operations

## Usage
1. Type your request in the chat input field
2. Select the appropriate context mode (active file, selected files, or no context)
3. The AI will analyze your code and provide a response
4. AI-generated code changes appear as artifacts that can be applied to your project
5. Review and accept changes as needed

## Context Modes
- **Active File**: Only the currently opened file is sent to the AI
- **Selected Files**: Only files specifically selected by the user are sent
- **No Context**: No project files are sent to the AI
- **Full Context**: All project files are sent to the AI (default behavior)

## Supported AI Providers
- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)
- Ollama (self-hosted models)

## Technical Details
- Uses Vercel AI SDK for chat functionality
- Implements streaming responses for real-time interaction
- Context selection uses intelligent file analysis
- Supports multiple AI providers simultaneously

## Algorithms Used

### Context Selection Algorithm
- Purpose: Determines which files to include in the AI request based on user selection
- Implementation: Uses a filtering algorithm that checks the current context mode and selected files
- Process: 
  1. If in 'active file' mode, only the currently active file is included
  2. If in 'selected files' mode, only user-selected files are included
  3. If in 'no context' mode, no files are included
  4. Otherwise, all workspace files are included
- Time Complexity: O(n) where n is the number of files in the workspace

### File Content Extraction Algorithm
- Purpose: Efficiently extracts and formats file content for AI consumption
- Implementation: Uses a recursive algorithm that traverses the file tree and formats content appropriately
- Process: 
  1. Iterates through selected files
  2. Reads file content from WebContainer
  3. Formats content with proper syntax highlighting information
  4. Packages files with metadata (file path, language, etc.)
- Time Complexity: O(n*m) where n is the number of files and m is the average file size

### Message Processing Algorithm
- Purpose: Processes user messages and AI responses for proper formatting
- Implementation: Uses a streaming algorithm that processes chunks of text in real-time
- Process: 
  1. Receives streaming response from AI provider
  2. Parses the response for artifacts and code changes
  3. Formats the response for display in the chat interface
  4. Updates the UI in real-time as the response streams in
- Time Complexity: O(n) where n is the length of the response

### Artifact Parsing Algorithm
- Purpose: Extracts and processes AI-generated code artifacts from responses
- Implementation: Uses a pattern matching algorithm to identify artifact blocks in AI responses
- Process: 
  1. Scans AI response for artifact markers (boltArtifact/mindvexArtifact)
  2. Extracts file paths and content from artifact blocks
  3. Validates file paths to prevent security issues
  4. Prepares artifacts for application to the file system
- Time Complexity: O(n) where n is the length of the AI response

### AI Provider Selection Algorithm
- Purpose: Determines which AI provider to use based on configuration and availability
- Implementation: Uses a fallback algorithm that tries providers in order of preference
- Process: 
  1. Checks configuration for preferred provider
  2. Verifies provider availability and credentials
  3. Falls back to alternative providers if primary is unavailable
  4. Balances requests across multiple providers if configured
- Time Complexity: O(n) where n is the number of configured providers