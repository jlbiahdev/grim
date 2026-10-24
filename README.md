# GRIM — GitHub Repo AI Monitor v0

A dashboard to keep track, at a glance, of every project you build with an AI assistant.

Each GitHub repository holds a small `summary.md` file: status, goals, blockers, next steps, and a link to the AI project or conversation behind it (Claude, ChatGPT, DeepSeek, Grok, Kimi…). GRIM reads these files and lays your projects out as a grid. One click shows a project's details; another reopens its AI conversation so you can pick up right where you left off.

## How it works

1. GRIM reads your GitHub repositories with a read-only personal access token, stored on your device.
2. For each repository, it reads `summary.md` from the most recently active branch, falling back to the default branch.
3. Each project appears as a tile, with a status light.
4. Click a tile to see its goals, blockers and next steps, then open the project in its AI or on GitHub.

Repositories without a `summary.md`, and forks, are not shown.

## `summary.md` format

Place it at the root of the repository:

    ---
    ai_project: https://claude.ai/project/…
    status: in progress     # in progress | blocked | paused | done
    ---

    ## Goals
    - …

    ## Blockers
    - None

    ## Next steps
    - …

- `ai_project`: https link to your AI project or conversation. Optional; without it, the open button is hidden.
- `status`: one of the four values above. Any other value shows in grey as "unknown status".

## Keeping summaries up to date automatically

The easiest way is to let the AI maintain the file itself. Add an instruction like this to its custom instructions:

> For every project under git, keep a summary.md at the repository root (ai_project and status header, then Goals, Blockers, Next steps). Update it and commit it to the working branch with every pull request, or when I say we're stopping.

The app's "Help" button gives the full instruction, ready to copy.

## GitHub token

Create a *fine-grained* token on GitHub (Settings → Developer settings → Personal access tokens):

- access to all your repositories;
- read-only permissions: "Contents" ("Metadata" is added automatically).

The token is stored locally by the app and only ever sent to the GitHub API.

## Download

macOS and Windows installers: coming soon in [Releases](../../releases).

The installers are not code-signed, so macOS or Windows will show a warning on first launch. On macOS, right-click the app and choose "Open"; on Windows, click "More info" then "Run anyway".

## Development

Requires Node.js 22.13 or later.

    npm install
    npm run dev            # UI only, in the browser
    npm run dev:electron   # Electron window (in a second terminal, with npm run dev running)
    npm run lint           # ESLint
    npm test               # tests
    npm run build          # full build
    npm start              # run the built app

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS. The UI is plain web code and Electron is only a thin shell, so the same codebase can later become an installable web app (PWA).

## License

To be decided.
