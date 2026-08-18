# artifacts-manager — Agent Guide

Multi-project viewer and management hub for agent-generated interactive HTML and Markdown artifacts across all local repositories.

> [!IMPORTANT]
> **AGENTS.md CRITICAL RULES:**
> **No Fluff:** Minimum characters. Concise but 100% complete.
> **No History:** No changelogs. Reflect ONLY the current "Source of Truth".
> **Live Sync:** Keep this file updated with relevant code changes in the same commit.

> [!WARNING]
> **Avoid Redundant Documentation.** AGENTS.md is the Single Source of Truth. Do NOT create
> separate MAINTENANCE.md / ARCHITECTURE.md files. Domain terminology belongs in [CONTEXT.md](CONTEXT.md);
> decisions in `docs/adr/`; module contracts in `docs/specs/`; runbooks in `docs/runbooks/`. Filing rules:
> [`docs/docs-organization-blueprint.md`](docs/docs-organization-blueprint.md).

## Layout

```
bin/artman                           # CLI executable for registering projects & adding artifacts
skills/with-artifact/                # Shipped with-artifact agent skill (SKILL.md)
src/
├── app.css                          # Nimblersoft dark theme & tokens
├── app.html                         # Base HTML template
├── lib/
│   ├── server/registry.ts           # Central registry & manifest filesystem service
│   ├── components/                  # Reusable Svelte UI components (Navbar, TagFilter, etc.)
│   └── types.ts                     # TypeScript data contracts for registry & artifacts
└── routes/
    ├── +layout.svelte               # Root layout with navigation and dark styling
    ├── +page.svelte                 # Projects list & global stats dashboard
    ├── project/[projectSlug]/
    │   ├── +page.svelte             # Project explorer with search & tag filtering
    │   └── artifact/[artifactId]/
    │       └── +page.svelte         # Interactive artifact viewer (sandboxed iframe & Markdown)
    └── api/
        ├── projects/+server.ts      # Projects list & stats API
        ├── projects/[projectSlug]/+server.ts # Single project details API
        ├── raw/[projectSlug]/[...file]/+server.ts # Raw static asset/artifact file server
        └── register/+server.ts      # Project registration endpoint
docs/
├── adr/                             # Architectural decisions (ADR-0001)
├── specs/                           # Subsystem specs (core, with-artifact skill)
└── runbooks/                        # Command recipes (local-development)
```

## First-time setup

```bash
cd ~/tools/artifacts-manager
npm install
npm run dev
```

## Daily commands

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on port `41820` with hot module replacement |
| `npm run build` | Compile SvelteKit application using `@sveltejs/adapter-node` |
| `npm run preview` | Run production preview server on port `41820` |
| `npm run check` | Run TypeScript & SvelteKit type checks (`svelte-check`) |
| `./bin/artman list` | List all registered projects from CLI |
| `./bin/artman register <path>` | Register a local project directory into `~/.artifacts-manager.json` |

## Architecture at a glance

- **Zero-DB File System Contracts.** All state is persisted either in `~/.artifacts-manager.json` (central registry) or in `<project>/.artifacts-manager/manifest.json` (project-scoped artifacts catalog). Decision record: `docs/adr/0001-architecture-and-stack.md`. Spec: `docs/specs/artifacts-manager-core.md`.
- **Iframe Sandboxing.** HTML artifacts are served from `/api/raw/[projectSlug]/[...file]` and rendered inside an isolated `<iframe>` to prevent script execution leaks, global variable collisions, and CSS pollution.
- **Markdown Rendering.** Markdown files are rendered client-side/SSR using `marked` with `prismjs` syntax highlighting and full GitHub Alerts formatting.
- **Port Allocation.** Fixed to port `41820` to integrate cleanly into the local development fleet.

## Data model

### Central Registry (`~/.artifacts-manager.json`)
- `version`: string (e.g. `"1.0.0"`)
- `projects`: array of `{ name: string, path: string, registeredAt: string, lastActiveAt: string }`

### Project Manifest (`<project>/.artifacts-manager/manifest.json`)
- `version`: string
- `projectName`: string
- `description`: string
- `artifacts`: array of `{ id, title, type, file, description, tags, createdAt, updatedAt }`

## Testing

Type checking and build verification:
```bash
npm run check
npm run build
```

## Deployment

Runs locally as a Node.js process or dev service on port `41820`.

```bash
npm run build
node build/index.js
```

## Conventions

- Every artifact file must be placed under `.artifacts-manager/` in its project repository.
- Every artifact MUST be cataloged with an entry in `.artifacts-manager/manifest.json`.
- HTML artifacts MUST be standalone and self-contained with dark-mode styling matching the Nimblersoft Dark Design System.
- Tags must be lowercase, alphanumeric, with hyphens (`[a-z0-9-]+`).

## Specs

- Core: [`docs/specs/artifacts-manager-core.md`](docs/specs/artifacts-manager-core.md)
- `with-artifact` Skill: [`docs/specs/with-artifact-skill.md`](docs/specs/with-artifact-skill.md)
