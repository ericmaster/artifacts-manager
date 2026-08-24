---
title: "Spec: Artifacts Manager Core"
type: spec
status: active
covers: src/lib/server/registry.ts
last_checked: 2026-08-18
---

# Spec: Artifacts Manager Core

This spec governs the central machine registry, the project-level manifest schema, the backend filesystem reader, the REST API endpoints, and the web viewer interface.

## 1. Central Machine Registry (`~/.artifacts-manager.json`)

The central registry tracks all local workspaces registered with the artifacts manager.

### Schema

```json
{
  "version": "1.0.0",
  "projects": [
    {
      "name": "nimbler-ops",
      "path": "/home/ericmaster/nimbler-ops",
      "registeredAt": "2026-08-18T17:00:00.000Z",
      "lastActiveAt": "2026-08-18T17:00:00.000Z"
    }
  ]
}
```

### Invariants:
1. `path` must be an absolute directory path on the local filesystem.
2. `name` is unique or derived from the directory basename if omitted.
3. If `~/.artifacts-manager.json` does not exist, the server creates it on first access.
4. Non-existent directories on disk are marked with `exists: false` in API responses rather than crashing.

---

## 2. Project Manifest (`<project-root>/.artifacts-manager/manifest.json`)

Each registered repository contains an `.artifacts-manager/` folder storing its artifacts and a `manifest.json` catalog.

### Schema

```json
{
  "version": "1.0.0",
  "projectName": "nimbler-ops",
  "description": "Nimblersoft Company OS",
  "artifacts": [
    {
      "id": "orchestrator-topology",
      "title": "Orchestrator Topology & Flow",
      "type": "html",
      "file": "orchestrator-topology.html",
      "description": "Interactive diagram of orchestrator nodes, queues, and handlers.",
      "tags": ["architecture", "orchestrator", "topology", "state-machine"],
      "createdAt": "2026-08-18T17:15:00.000Z",
      "updatedAt": "2026-08-18T17:15:00.000Z"
    }
  ]
}
```

### Invariants:
1. `id` must be a kebab-case unique slug per project.
2. `type` must be `"html"` or `"markdown"`.
3. `file` is relative to `<project-root>/.artifacts-manager/`.
4. `tags` is an array of lowercase strings used for multi-faceted filtering.

---

## 3. Server Endpoints

### `GET /api/projects`
Returns an array of registered projects with aggregated stats:
- `name`: string
- `path`: string
- `slug`: string (URL-safe project key)
- `exists`: boolean
- `hasManifest`: boolean
- `artifactCount`: number
- `tags`: string[] (all distinct tags used in the project)
- `lastActiveAt`: ISO timestamp

### `GET /api/projects/[projectSlug]`
Returns full project manifest, artifact list, and tags breakdown for the selected project.

### `GET /api/raw/[projectSlug]/[...file]`
Serves the raw artifact file or nested static asset (images, css, js) from `<project-root>/.artifacts-manager/<file>` with the corresponding `Content-Type` header (`text/html; charset=utf-8`, `text/markdown; charset=utf-8`, `image/svg+xml`, etc.).
Security: Path traversal (`../`) is strictly rejected and resolved paths must stay within the project's `.artifacts-manager` folder.

### `POST /api/register`
Body: `{ path: string, name?: string }`
Registers or updates a repository path in `~/.artifacts-manager.json`.

---

## 4. Web UI Features

1. **Dashboard Home (`/`)**:
   - Lists all projects with quick stats (Total Projects, Total Artifacts, Total Tags).
   - Card grid with project path, artifact count, tag cloud, and direct link to project artifacts.
   - Quick registration modal for adding a new local repository.
2. **Project Explorer (`/project/[projectSlug]`)**:
   - Real-time text search (matches titles, descriptions, and tags).
   - Multi-select tag filter pills with active counts and a "Clear filters" toggle.
   - Type filter: `All`, `HTML (Interactive)`, `Markdown`.
   - Grid / List view toggle.
3. **Artifact Viewer (`/project/[projectSlug]/artifact/[artifactId]`)**:
   - Breadcrumb navigation: `Projects / <Project Name> / <Artifact Title>`.
   - Action toolbar: Resolution presets (Desktop 100%, Tablet 768px, Mobile 375px), Open Raw in New Tab, Copy Link, View Source toggle.
   - HTML rendering: Sandboxed `<iframe>` for isolation and script safety.
    - Markdown rendering: `src/lib/server/markdown.ts` parses Markdown and applies `sanitize-html` at the `{@html}` insertion boundary. Its explicit tag and attribute allowlist permits `class`, `data-*`, `href`, and `src`; URLs are limited to `http`, `https`, `mailto`, and relative paths. SVG, event handlers, unsafe URLs, and raw HTML are excluded. Client-only strict Mermaid rendering keeps source escaped and readable on CDN or render failure.
   - Collapsible metadata sidebar.
