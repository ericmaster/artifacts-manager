# Runbook: Local Development & Operations

Exact command sequences for building, testing, running, and using `artifacts-manager`.

## 1. Setup & Daily Commands

```bash
# Clone or enter repo
cd ~/tools/artifacts-manager

# Install dependencies
npm install

# Optional, separate step: guided Archify agent-skill install (defaults to No)
./bin/artman setup

# Run dev server (default port 41820)
npm run dev

# Run type check and SvelteKit check
npm run check

# Build production bundle
npm run build

# Run production build preview / server
npm run preview
# or
node build/index.js

# Run Markdown and browser regression suites
npm run test:unit
npm run test:e2e
```

## 2. CLI Tool Usage (`artman` / `artifacts-manager`)

The repo ships with a CLI helper in `./bin/artman`:

Archify is never downloaded or prompted for by `npm install`. `artman setup` asks permission, detects a supported agent when unambiguous, shows the destination and stable version/ref, and asks confirmation before installation. It reads the official stable manifest over the network and uses `npx skills add`; no development/master fallback. Without a TTY it skips unless given explicit `--agent <opencode|claude-code|codex> --yes` consent (for CI use an isolated HOME). Re-running for an installed agent does not update; opt in to replacement with `--update`. If offline, npx/skills missing, manifest invalid or installation fails, the hub still works; fix the reported cause and retry `./bin/artman setup`. Check the destination if the installer failed after writing files. `./bin/artman setup --help` lists options.

```bash
# Display help
./bin/artman --help

# Register a project directory in ~/.artifacts-manager.json
./bin/artman register /path/to/my-project

# List all registered projects and artifact counts
./bin/artman list

# Read-only validation of all registered artifact contracts
./bin/artman validate --all

# Read-only validation of one project
./bin/artman validate --project /path/to/my-project

# Add an artifact to a project manifest and register project
./bin/artman add \
  --project /path/to/my-project \
  --file /path/to/my-project/.artifacts-manager/orchestrator-topology.html \
  --title "Orchestrator Topology" \
  --desc "Interactive topology diagram of orchestrator nodes" \
  --tags "architecture,topology,orchestrator"
```

## 3. Verifying the Web App

1. Start dev server: `npm run dev`
2. Open in browser: `http://localhost:41820`
3. Click on any project card to inspect its artifacts index.
4. Click on an artifact entry to view the interactive iframe or rendered Markdown.
5. For Mermaid Markdown, verify the SVG at desktop and 375px. Block the Mermaid CDN once and confirm the escaped source plus generic alert remains readable.
