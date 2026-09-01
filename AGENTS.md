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
bin/artman                           # CLI executable for registering projects & managing artifacts (add, archive, restore, delete)
landing/                             # Static landing page & Cloudflare Worker (artifacts-manager.ericmaster.ninja)
│   ├── index.html                   # Landing page markup with interactive demos & mockups
│   ├── style.css                    # Nimblersoft Dark design system & animations
│   ├── app.js                       # Interactive terminal simulator & viewport switchers
│   └── wrangler.jsonc               # Cloudflare Workers static assets deployment config
skills/with-artifact/                # Shipped with-artifact agent skill (SKILL.md, assets/)
│   ├── SKILL.md                     # Skill instructions and generation contracts
│   └── assets/                      # Canonical artifact starter templates (grill-questionnaire.html, system-topology.html)
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
    │   ├── +page.svelte             # Project explorer with search, tag & status filtering, archive/delete actions
    │   └── artifact/[artifactId]/
    │       └── +page.svelte         # Interactive artifact viewer (sandboxed iframe & Markdown)
    └── api/
        ├── projects/+server.ts      # Projects list & stats API
        ├── projects/[projectSlug]/+server.ts # Single project details API
        ├── projects/[projectSlug]/artifacts/[artifactId]/+server.ts # Artifact archive/unarchive & delete API
        ├── raw/[projectSlug]/[...file]/+server.ts # Raw static asset/artifact file server
        └── register/+server.ts      # Project registration endpoint
docs/
├── adr/                             # Architectural decisions (ADR-0001, ADR-0002)
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
| `./bin/artman list` | List all registered projects and artifact counts |
| `./bin/artman register <path>` | Register a local project directory into `~/.artifacts-manager.json` |
| `./bin/artman archive <id> [--project <path>]` | Archive an artifact (hides from default view) |
| `./bin/artman restore <id> [--project <path>]` | Restore an archived artifact to active |
| `./bin/artman delete <id> [--project <path>]` | Permanently delete an artifact from manifest and disk |
| `./bin/artman validate --all` | Read-only validation of registered artifact contracts |

## Architecture at a glance

- **Zero-DB File System Contracts.** All state is persisted either in `~/.artifacts-manager.json` (central registry) or in `<project>/.artifacts-manager/manifest.json` (project-scoped artifacts catalog). Decision record: `docs/adr/0001-architecture-and-stack.md`. Spec: `docs/specs/artifacts-manager-core.md`.
- **Iframe Sandboxing.** HTML artifacts are served from `/api/raw/[projectSlug]/[...file]` and rendered inside an isolated `<iframe>` to prevent script execution leaks, global variable collisions, and CSS pollution.
- **Markdown Rendering.** Markdown is sanitized server-side after `marked`; Mermaid fences render client-only with strict security and readable escaped fallback source.
- **Artifact Runtime Contract.** HTML artifacts use Tailwind `3.4.17` and Mermaid `11.17.1` from the exact CDN URLs in ADR-0002. Preserve artifact IDs/files/createdAt during migrations.
- **Validation.** `artman validate` never writes and reports manifest containment/currentness, runtime URLs, Mermaid fallback syntax, migration identity, and narrow legacy static-SVG warnings. Browser QA must test the sandboxed iframe and reject Mermaid error SVGs/text; SVG presence alone is not success. `vespera:kth-irl-self-evaluation` allowlists only `canvas#radar` plus decorative icon SVGs.
- **Port Allocation.** Fixed to port `41820` to integrate cleanly into the local development fleet.

## Data model

### Central Registry (`~/.artifacts-manager.json`)
- `version`: string (e.g. `"1.0.0"`)
- `projects`: array of `{ name: string, path: string, registeredAt: string, lastActiveAt: string }`

### Project Manifest (`<project>/.artifacts-manager/manifest.json`)
- `version`: string
- `projectName`: string
- `description`: string
- `artifacts`: array of `{ id, title, type, file, description, tags, createdAt, updatedAt, archived?, archivedAt? }`

## Testing

Type checking and build verification:
```bash
npm run check
npm run build
npm run test:unit
npm run test:e2e
```

## Deployment
 
- Local Hub: Runs locally as a Node.js process or dev service on port `41820`.
- Landing Page: Deployed to Cloudflare Workers with custom domain `artifacts-manager.ericmaster.ninja` (`cd landing && npx wrangler deploy`).
 
 ```bash
 npm run build
 node build/index.js
 ```

## Conventions

- Every artifact file must be placed under `.artifacts-manager/` in its project repository.
- Every artifact MUST be cataloged with an entry in `.artifacts-manager/manifest.json`.
- HTML artifacts MUST be standalone, use only the pinned Tailwind/Mermaid runtime URLs from ADR-0002, and keep all other styling and logic local.
- Tags must be lowercase, alphanumeric, with hyphens (`[a-z0-9-]+`).

## Specs

- Core: [`docs/specs/artifacts-manager-core.md`](docs/specs/artifacts-manager-core.md)
- `with-artifact` Skill: [`docs/specs/with-artifact-skill.md`](docs/specs/with-artifact-skill.md)
