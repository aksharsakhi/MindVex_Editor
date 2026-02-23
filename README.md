# MindVex - AI-Powered Browser-Based Code Editor

<div align="center">
  <h3>A complete development environment that runs entirely in your browser</h3>
  <p>Powered by WebContainer technology for secure client-side execution</p>
</div>

## 🚀 Features

### 📝 Intelligent Code Editor

- Multi-tab interface with syntax highlighting for multiple languages
- Real-time code editing with immediate feedback
- File tree navigation for easy project exploration
- File search panel for finding content across the project
- Support for both text and binary files

### 🤖 AI-Powered Assistance

- Context-aware chat interface that understands your entire codebase
- Multiple context modes: active file, selected files, or full project
- AI can generate, modify, and optimize code based on your requests
- Support for multiple AI providers (OpenAI, Anthropic, Google, Ollama)

### 📊 Project Analytics Dashboard (Backend-Powered)

- Git history mining with hotspot detection and commit frequency analysis
- SCIP-based code intelligence: hover info, find-all-references
- Evolutionary blame — who changed what, when, and how often
- File-level trend analysis showing churn over time
- Dependency graph construction via backend API
- Requires `MindVex_Editor_Backend` to be running for full functionality

### 🔧 Integrated Development Tools

- Full-featured terminal running directly in the browser
- Version control integration with GitHub and GitLab
- One-click repository creation and code pushing
- Support for both public and private repositories

### 🎨 Modern UI

- Dark theme with orange accents for comfortable coding
- Responsive design adapting to different screen sizes
- Intuitive menu system with quick access to all features
- Consistent styling across all components

## 🛠️ Architecture

MindVex is built with modern web technologies:

- **Frontend**: React (Remix) with TypeScript, deployed as a Cloudflare Worker
- **Styling**: UnoCSS for atomic CSS
- **State Management**: Nanostores for reactive state management
- **AI Integration**: Vercel AI SDK for chat capabilities
- **File System**: WebContainer API for secure browser-based execution
- **Backend**: Spring Boot REST API (see `MindVex_Editor_Backend/`)

## 🌟 Key Benefits

1. **Security**: All code execution happens client-side via WebContainer
2. **Convenience**: No setup required — works directly in the browser
3. **AI Integration**: Powerful AI assistance for coding tasks
4. **Analytics**: Deep insights powered by backend git-mining and SCIP analysis
5. **Flexibility**: Multiple context modes for different development scenarios
6. **Persistence**: Workspace state preserved across sessions

## 📋 Use Cases

- **Rapid Prototyping**: Quickly set up and experiment with new projects
- **Code Review**: Use AI to analyze and improve existing code
- **Learning**: Explore new technologies with AI-assisted explanations
- **Collaboration**: Share project links for team development
- **Codebase Analysis**: Mine git history, understand hotspots, trace references

## 📦 Installation

MindVex runs entirely in the browser and requires no installation for end users. For local development:

### Recommended: Using pnpm

```bash
git clone <repository-url>
cd MindVex_Editor
pnpm install
pnpm run dev
```

### Using npm (may have dependency conflicts)

```bash
npm install --legacy-peer-deps
npm run dev
```

Then open your browser to the local URL provided by Vite.

> **Note**: For backend-powered features (analytics, git mining, SCIP), also start `MindVex_Editor_Backend` — see its `README.md` for setup instructions.

## 🚀 Getting Started

1. Open MindVex in a modern web browser
2. Create a new project or import an existing folder
3. Start coding in the multi-tab editor
4. Use the AI chat for assistance with your code
5. Check the dashboard for analytics (requires backend)
6. Push your code to GitHub or GitLab when ready

## 🛠️ Usage

### Initial Setup

1. Upon first visit, the main menu shows options to import a folder, create a new folder, or clone a repository
2. Import your project folder by dragging-and-dropping or selecting files
3. The workbench loads with your project files in the file explorer

### Working with Files

1. Navigate your project using the file tree on the left
2. Click files to open them in editor tabs
3. Create new files using the context menu in the file explorer
4. Edit with syntax highlighting — changes are saved automatically to WebContainer

### Using AI Assistance

1. Access the AI chat through the menu or chat icon
2. Select your preferred context mode (active file, selected files, or no context)
3. Type your request in the chat input
4. Review AI-generated artifacts before applying them
5. Use "Add Context" to include specific files in the conversation

### Project Analytics (requires backend)

1. Navigate to the Dashboard view in the workbench
2. Connect a repository using your GitHub OAuth credentials
3. Trigger git-history mining via the dashboard
4. View hotspots, file trends, blame analysis, and dependency graphs
5. Upload SCIP data for hover-information and find-all-references

### Version Control

1. Use the Git panel (via the header or workbench) to connect to GitHub or GitLab
2. Enter your repository name and authentication token
3. Push your entire project with a single click
4. View branch history and commit logs

## 🎯 Key Features by View

| View              | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| **Code**          | Multi-tab editor with file tree, search, and file-lock management |
| **Diff**          | Side-by-side diff viewer for comparing file changes               |
| **Preview**       | Live in-browser preview of running web applications               |
| **Dashboard**     | Analytics dashboard powered by backend REST API                   |
| **Quick Actions** | Placeholder for upcoming AST-based analysis tools                 |

## 📚 Documentation

Feature-level documentation is in `docs/features/`:

- [Workspace Management](docs/features/workspace-management.md)
- [Code Editor](docs/features/code-editor.md)
- [AI Chat Integration](docs/features/ai-chat-integration.md)
- [Dashboard Analytics](docs/features/dashboard-analytics.md)
- [File Explorer](docs/features/file-explorer.md)
- [Version Control](docs/features/version-control.md)
- [Integrated Terminal](docs/features/terminal.md)
- [Theme Customization](docs/features/theme-customization.md)

For a comprehensive overview, see [MindVex Overview](docs/MindVex.md).

## ⚙️ Configuration

Configure AI providers via environment variables or the Settings panel:

- **OpenAI API Key**: For GPT models
- **Anthropic API Key**: For Claude models
- **Google API Key**: For Gemini models
- **Ollama**: For self-hosted models (local setup required)
- **Backend URL**: Set `VITE_BACKEND_URL` to point to the Spring Boot backend

## 🔒 Security

- Client-side execution via WebContainer — code never leaves the browser during execution
- Secure token storage for version control integrations
- Path validation to prevent directory traversal attacks
- File type validation to prevent malicious uploads

## 🚨 Known Limitations

- Large projects may encounter browser memory constraints under WebContainer
- Some Node.js-specific APIs are not available within WebContainer's sandbox
- AI model availability depends on external service providers
- Advanced analysis features (AST parsing, cycle detection) are under development

## 🆘 Troubleshooting

- **Files not appearing**: Refresh the workspace or check file import paths
- **AI not responding**: Verify API keys are properly configured in Settings
- **Dashboard empty**: Ensure the backend service is running and configured
- **Git operations failing**: Check token permissions and repository access rights

---

MindVex represents the next generation of browser-based development tools, combining the convenience of web applications with the power of AI and the security of client-side execution.
