# Dashboard Analytics

## Overview
The dashboard provides comprehensive analytics and insights about your codebase, including dependency analysis, architecture visualization, and code quality metrics.

## Features
- **Dependency Analysis**: Automatically identifies project dependencies from package.json and import statements
- **Architecture Visualization**: Displays architecture layers based on directory structure
- **Code Quality Metrics**: Provides health scoring and identifies potential issues
- **File Structure Mapping**: Visualizes the project structure in multiple grid layouts
- **Issue Detection**: Finds TODOs, FIXMEs, HACKs, XXXs, and BUGs in the code
- **Real-time Analysis**: Updates automatically as files change in the workspace

## Key Components
- BaseDashboard: Main dashboard interface component
- DependencyAnalyzer: Parses package.json and identifies imports
- ArchitectureDetector: Analyzes directory structure to identify layers
- QualityMetrics: Implements health scoring algorithms
- FileStructureMapper: Creates visualizations of the file structure

## Usage
1. Access the dashboard from the main menu
2. View dependency analysis showing all project dependencies
3. Explore architecture layers detected in your project
4. Review code quality metrics and health scores
5. Identify potential issues marked in the code
6. Monitor file structure through visual mapping

## Technical Details
- Analyzes package.json files to identify project dependencies
- Uses import statement parsing to identify cross-file dependencies
- Implements sophisticated algorithms for architecture layer detection
- Provides health scoring based on code complexity and maintainability factors
- Updates analysis in real-time as files are modified in the workspace

## Algorithms Used

### Dependency Analysis Algorithm
- **Purpose**: Automatically identifies project dependencies from package.json and import statements
- **Algorithm Type**: Recursive file parsing and dependency resolution
- **Time Complexity**: O(n*m) where n is the number of files and m is the average file size
- **Implementation**: 
  1. Parses package.json to identify declared dependencies
  2. Recursively scans all source files for import/export statements
  3. Maps import paths to actual file locations
  4. Builds dependency graph showing relationships between modules

### Architecture Visualization Algorithm
- **Purpose**: Displays architecture layers based on directory structure
- **Algorithm Type**: Directory structure analysis and clustering
- **Time Complexity**: O(d) where d is the number of directories
- **Implementation**: 
  1. Analyzes directory hierarchy and naming patterns
  2. Groups related directories into architectural layers (e.g., components, services, utils)
  3. Applies heuristics to identify common architectural patterns
  4. Generates visual representation of the architectural layers

### Code Quality Metrics Algorithm
- **Purpose**: Provides health scoring and identifies potential issues
- **Algorithm Type**: Multi-factor scoring with weighted metrics
- **Time Complexity**: O(f*c) where f is the number of files and c is the average complexity per file
- **Implementation**: 
  1. Calculates cyclomatic complexity for each function/module
  2. Analyzes code duplication across the project
  3. Evaluates maintainability index based on code structure
  4. Aggregates scores into overall health metrics with weighting factors

### File Structure Mapping Algorithm
- **Purpose**: Visualizes the project structure in multiple grid layouts
- **Algorithm Type**: Hierarchical tree visualization with layout optimization
- **Time Complexity**: O(n) where n is the number of files and directories
- **Implementation**: 
  1. Builds hierarchical tree representation of the file system
  2. Applies layout algorithms to optimize visual presentation
  3. Generates multiple view options (grid, tree, graph layouts)
  4. Calculates spatial positioning for clear visualization

### Issue Detection Algorithm
- **Purpose**: Finds TODOs, FIXMEs, HACKs, XXXs, and BUGs in the code
- **Algorithm Type**: Pattern matching with regular expressions
- **Time Complexity**: O(l) where l is the total number of lines in the project
- **Implementation**: 
  1. Scans all code files for predefined comment patterns
  2. Uses regular expressions to identify issue markers
  3. Extracts context around each issue marker
  4. Categorizes and summarizes identified issues

### Real-time Analysis Algorithm
- **Purpose**: Updates automatically as files change in the workspace
- **Algorithm Type**: Event-driven incremental analysis
- **Time Complexity**: O(Δf) where Δf is the number of changed files
- **Implementation**: 
  1. Monitors file system events for changes
  2. Applies differential analysis to only re-analyze changed components
  3. Updates affected metrics incrementally
  4. Propagates changes through dependency graph to affected components

### Cycle Detection Algorithm
- **Purpose**: Identifies cyclic dependencies in the codebase
- **Algorithm Type**: DFS-based cycle detection for directed graphs
- **Time Complexity**: O(V + E) where V is the number of vertices (nodes) and E is the number of edges
- **Implementation**: Uses recursion stack tracking to detect back edges indicating cycles
- **Process**: 
  1. Builds an adjacency list representation of the knowledge graph
  2. Performs DFS traversal for each unvisited node
  3. Tracks nodes in the current recursion stack
  4. Identifies cycles when a back edge is found to a node in the recursion stack
  5. Extracts the cycle path using parent tracking

### Graph Traversal Algorithms
- **BFS for Impact Analysis**: Used to find nodes that are indirectly impacted by following dependencies
- **DFS for Structure Analysis**: Used to traverse the code structure for architecture detection

### Knowledge Graph Construction
- **AST Parsing**: Abstract Syntax Tree parsing for multiple languages to extract code elements
- **Graph Building**: Constructs nodes for modules, classes, functions, and variables
- **Relationship Mapping**: Identifies import, call, inheritance, and dependency relationships