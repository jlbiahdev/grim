# GRIM — GitHub Repo AI Monitor v0

A dashboard to keep track, at a glance, of every project you build with an AI assistant.

Each GitHub repository holds a small `summary.md` file: status, goals, blockers, next steps, and a link to the AI project behind it (Claude in this v0; ChatGPT, DeepSeek, Grok, Kimi and others are on the roadmap). GRIM reads these files and lays your projects out as a grid. One click shows a project's details; another reopens its Claude project so you can pick up right where you left off.

## How it works

1. GRIM reads your GitHub repositories with a read-only personal access token, stored on your device.
2. For each repository, it reads `summary.md` from the most recently active branch, falling back to the default branch.
3. Each project appears as a tile, with a status light.
4. Click a tile to see its goals, blockers and next steps, then open the project in Claude or on GitHub.

Only repositories you own are read. Organization and collaborator repositories, forks, and repositories without a `summary.md` are not shown.

## `summary.md` format

Place it at the root of the repository. In this v0, section titles and status values are read in French:

    ---
    claude_project: https://claude.ai/project/…
    status: en cours        # en cours | bloqué | en pause | terminé
    ---

    ## Attentes
    - …

    ## Blocages
    - Aucun

    ## Prochaines étapes
    - …

- `claude_project`: https link to the claude.ai project. Optional; without it, the open button is hidden.
- `status`: one of the four values above (in progress, blocked, paused, done). Any other value shows in grey as "unknown status".
- The `Attentes`, `Blocages` and `Prochaines étapes` sections hold the goals, blockers and next steps.

## Keeping summaries up to date automatically

The easiest way is to let the AI maintain the file itself. Add an instruction like this to its custom instructions:

> For every project under git, keep a summary.md at the repository root (claude_project and status header, then the Attentes, Blocages and Prochaines étapes sections). Update it and commit it to the working branch with every pull request, or when I say we're stopping.

## GitHub token

Create a *fine-grained* token on GitHub (Settings → Developer settings → Personal access tokens):

- access to all your repositories;
- read-only permissions: "Contents" ("Metadata" is added automatically).

The token is stored locally by the app and only ever sent to the GitHub API.

## Download

Get the installer for your system from [Releases](../../releases):

- **macOS** (Apple silicon: `GRIM-<version>-arm64.dmg`; Intel: `GRIM-<version>-x64.dmg`)
- **Windows** (`GRIM-<version>-x64.exe`)

The app is not code-signed, so your system warns you the first time.

### Install on macOS

1. Open the `.dmg` and drag **GRIM** into **Applications**.
2. Open GRIM. If macOS blocks it, go to **System Settings → Privacy & Security**, scroll down and click **Open Anyway**, then confirm.
3. If macOS says the app "is damaged and can't be opened", run this once in Terminal, then open GRIM again:

       xattr -cr /Applications/GRIM.app

### Install on Windows

1. Run `GRIM-<version>-x64.exe`.
2. If SmartScreen shows "Windows protected your PC", click **More info**, then **Run anyway**.
3. Follow the installer. GRIM appears in the Start menu.

The app does not update itself: download the new version from Releases when one comes out.

## Development

Requires Node.js 22.13 or later.

    npm install
    npm run dev            # UI only, in the browser
    npm run dev:electron   # Electron window (in a second terminal, with npm run dev running)
    npm run lint           # ESLint
    npm test               # tests
    npm run build          # full build
    npm start              # build, then run the app
    npm run package        # build the installer for the current system (in release/)

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS. The UI is plain web code and Electron is only a thin shell, so the same codebase can later become an installable web app (PWA).

## Roadmap

- **Any AI assistant**: an `ai_project` field accepting a link to any AI project or conversation (Claude, ChatGPT, DeepSeek, Grok, Kimi…), with an "Open in …" button named after the assistant. `claude_project` will keep working.
- **English summaries**: English section titles (`Goals`, `Blockers`, `Next steps`) and status values (`in progress`, `blocked`, `paused`, `done`), alongside French.
- **English interface**: the app is in French for now.
- **Help button**: the full AI instruction, ready to copy.
- **Web app**: the same codebase as an installable web app (PWA).

## License

[MIT](LICENSE). The bundled Jura font is © The Jura Project Authors, licensed under the SIL Open Font License 1.1.
