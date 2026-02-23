# Dashboard Analytics

## Overview

The Dashboard provides backend-powered analytics and insights about your codebase. It integrates with the `MindVex_Editor_Backend` REST API to mine git history, analyze code hotspots, visualize file trends, and surface blame annotations.

> **Requires backend**: All analytics features require the `MindVex_Editor_Backend` service to be running and a repository to be connected.

## Features

- **Git History Mining**: Clone a remote repository and extract its full commit history via `POST /api/analytics/mine`
- **Hotspot Analysis**: Identify the most frequently modified files over the project lifetime via `GET /api/analytics/hotspots`
- **File Trend Analysis**: See how often a specific file changes over time via `GET /api/analytics/file-trend`
- **Evolutionary Blame**: Understand who changed a file, when, and how much via `GET /api/analytics/blame`
- **Dependency Graph**: Build and query the file-level dependency graph via `POST /api/graph/build` and `GET /api/graph/dependencies`
- **SCIP Code Intelligence**: Upload SCIP index files for hover information and find-all-references (`POST /api/scip/upload`, `GET /api/scip/hover`)

## Key Components

- `Dashboard.client.tsx` — Full client-side dashboard that fetches data from the backend REST API
- `BaseDashboard.tsx` — SSR-safe fallback skeleton (no data) for initial page render
- `analyticsClient.ts` — Frontend API client for `POST /api/analytics/mine`, `GET /api/analytics/hotspots`, etc.
- `graphClient.ts` — Frontend API client for graph build and dependency/reference queries
- `scipClient.ts` — Frontend API client for SCIP upload, hover, and job status

## Usage

1. Navigate to the **Dashboard** view in the workbench (or go to `/dashboard`)
2. Connect your repository using GitHub OAuth (via the backend)
3. Click **Mine Git History** to trigger `POST /api/analytics/mine` — this clones the repo and processes all commits
4. View **Hotspot Analysis** to see which files change most frequently
5. Click on a file to view its **File Trend** chart
6. Use **Evolutionary Blame** to see per-file authorship and change frequency
7. Use the **Graph** section to build and explore the dependency graph
8. Upload a SCIP index file for advanced hover and reference features

## Backend API Integration

| Frontend Action | Backend Endpoint | Description |
|---|---|---|
| Mine history | `POST /api/analytics/mine` | Clones repo, processes git log |
| View hotspots | `GET /api/analytics/hotspots` | Top N most-changed files |
| File trend chart | `GET /api/analytics/file-trend?file=...` | Commit count per time period |
| Blame view | `GET /api/analytics/blame?file=...` | Authorship breakdown |
| Build graph | `POST /api/graph/build` | Dependency graph construction |
| Get dependencies | `GET /api/graph/dependencies` | Files and their imports |
| Find references | `GET /api/graph/references?symbol=...` | All usages of a symbol |
| Upload SCIP | `POST /api/scip/upload` | Ingest a SCIP index |
| Hover info | `GET /api/scip/hover?...` | Symbol hover data |

## Technical Details

- The frontend uses Nanostores (`workbenchStore`) to track the active workbench view
- All HTTP calls to the backend include a JWT token in the `Authorization: Bearer` header
- Git repository cloning happens server-side; the browser only receives analysed results
- Dashboard transitions between views (Code / Diff / Preview / Dashboard / Quick Actions) use the `WorkbenchViewType` union type

## Quick Actions

The **Quick Actions** view (`/workbench  Quick Actions`) is a placeholder for upcoming analysis tools:

| Tool | Status |
|---|---|
| Multi-Language AST Parsing | Coming soon |
| Real-Time Graph Update (Incremental) | Coming soon |
| Change Impact Analysis | Coming soon |
| Cycle Detection (Architectural Anomaly) | Coming soon |
