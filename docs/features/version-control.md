# Version Control

## Overview
The version control feature enables users to connect their projects to Git repositories on GitHub or GitLab, allowing for seamless code synchronization and collaboration.

## Features
- **GitHub Integration**: Push projects directly to GitHub repositories
- **GitLab Integration**: Push projects directly to GitLab repositories
- **Repository Creation**: Create new public or private repositories
- **Branch Management**: Support for pushing to specific branches
- **Authentication**: Secure token-based authentication
- **Commit Messages**: Customizable commit messages for pushes

## Key Components
- GitLabApiService: Handles GitLab API interactions
- GitHub API integration: Manages GitHub repository operations
- Authentication system: Securely stores and manages API tokens
- Repository management: Handles repository creation and updates

## Usage
1. Configure your GitHub or GitLab token in settings
2. Enter a repository name for your project
3. Choose whether to create a public or private repository
4. Select the branch to push to (defaults to main)
5. Add a custom commit message if desired
6. Click to push your entire project to the repository

## Technical Details
- Uses GitHub/GitLab REST APIs for repository operations
- Handles authentication securely via browser cookies
- Implements proper error handling for various API responses
- Supports both public and private repository creation
- Automatically commits all project files during the push operation

## Algorithms Used

### Repository Synchronization Algorithm
- Purpose: Efficiently packages and uploads entire project to remote repository
- Implementation: Uses a recursive file traversal algorithm to collect all project files
- Process: 
  1. Traverses the entire project directory structure
  2. Excludes specified files/directories (e.g., .git, node_modules)
  3. Packages files into appropriate format for API upload
  4. Commits all files with the specified commit message
- Time Complexity: O(n*m) where n is the number of files and m is the average file size

### Authentication Token Validation Algorithm
- Purpose: Ensures API tokens are valid before attempting repository operations
- Implementation: Uses a verification algorithm that makes a test API call
- Process: 
  1. Makes a lightweight API call to validate the token
  2. Checks the response for authentication errors
  3. Caches the validation result to avoid repeated checks
  4. Refreshes validation when operations fail
- Time Complexity: O(1) for cached validation, O(1) for API call

### File Filtering Algorithm
- Purpose: Determines which files should be included in the repository push
- Implementation: Uses a pattern matching algorithm with configurable ignore rules
- Process: 
  1. Compares each file path against ignore patterns (.gitignore-style)
  2. Excludes common build directories, cache files, and system files
  3. Includes all code files, configuration files, and documentation
  4. Preserves directory structure during packaging
- Time Complexity: O(n*p) where n is the number of files and p is the number of ignore patterns

### Error Recovery Algorithm
- Purpose: Handles API errors and attempts to recover from common failure scenarios
- Implementation: Uses an exponential backoff algorithm with progressive error handling
- Process: 
  1. Identifies the type of error from API response
  2. Applies appropriate recovery strategy (retry, modify request, etc.)
  3. Implements exponential backoff for transient errors
  4. Provides detailed error messages for debugging
- Time Complexity: O(1) for error identification, variable for recovery actions

### Branch Management Algorithm
- Purpose: Handles operations related to Git branches during repository operations
- Implementation: Uses a branch validation algorithm that checks for branch existence
- Process: 
  1. Checks if the specified branch exists in the remote repository
  2. Creates the branch if it doesn't exist
  3. Verifies branch permissions before pushing
  4. Falls back to default branch if specified branch is unavailable
- Time Complexity: O(1) for branch verification