---
title: "Spec: with-artifact Skill"
type: spec
status: active
covers: skills/with-artifact/SKILL.md
last_checked: 2026-08-18
---

# Spec: `with-artifact` Skill

This spec defines the behavior, trigger criteria, and generation contract for the `with-artifact` agent skill.

## 1. Purpose & Triggers

The `with-artifact` skill instructs an AI coding agent to generate an explanatory and interactive artifact whenever explaining complex architectural, structural, or conceptual topics.

### Trigger Scenarios:
- **Topology & Architecture:** Explaining system architectures, microservices, cloud resources, or container wiring.
- **State Machines & Flows:** Explaining authentication cycles, queue transitions, lifecycle workflows.
- **Database & Data Schema:** Explaining entity relations, SQLite/PostgreSQL schemas, migration diffs.
- **Refactors & Complex Changes:** Visualizing before/after module structures, AST transformations, or component refactorings.
- **Concepts & Design Decisions:** Explaining domain models, trade-offs, algorithms, or protocol sequences.

---

## 2. Artifact Standards

### A. HTML Artifacts (Default & Recommended for Visuals)
- **Runtime contract:** Include exact Tailwind `https://cdn.tailwindcss.com/3.4.17` and Mermaid `https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs`; keep all other logic local.
- **Design System:** Follows the Nimblersoft Dark/Agentic palette:
  - Deep dark background (`#0a0d14` / `#0f172a`)
  - Elevated surfaces (`#1e293b` / `rgba(30, 41, 59, 0.7)`)
  - Accent colors (`#6366f1` indigo, `#06b6d4` cyan, `#10b981` emerald, `#f59e0b` amber)
  - Clear typography (`system-ui`, `-apple-system`, `sans-serif`)
- **Interactivity:** Includes interactive elements such as:
  - Clickable node cards that expand details or inspect code.
  - Mermaid source for graph-shaped diagrams with `pre.mermaid[data-mermaid-source]` fallback. HTML Mermaid may use `securityLevel: 'loose'` only for named allowlisted local inspector callbacks; labels contain no arbitrary HTML.
  - Tabbed sections (e.g. "Overview", "Sequence", "Component Map", "Data Flow").
  - Animated state transitions or step-by-step walkthrough buttons.

### B. Markdown Artifacts
- **Rich Document:** Standard Markdown with GitHub alerts (`> [!NOTE]`, `> [!IMPORTANT]`, etc.), tables, code blocks with syntax highlighting, and Mermaid code fences (`mermaid`).

---

## 3. Storage & Registration Contract

When creating an artifact:
1. Write the file into `<project-root>/.artifacts-manager/<artifact-slug>.<html|md>`.
2. Ensure `<project-root>/.artifacts-manager/manifest.json` exists and append/update the artifact item with:
   - `id`: kebab-case slug
   - `title`: descriptive human-readable title
   - `type`: `"html"` | `"markdown"`
   - `file`: `<artifact-slug>.<html|md>`
   - `description`: concise summary
   - `tags`: lowercase tag list (e.g. `["architecture", "database", "svelte"]`)
   - `createdAt`: ISO timestamp
    - `updatedAt`: ISO timestamp; preserve existing `id`, `file`, and `createdAt`, updating only this timestamp and relevant lowercase tags during migration.
3. Register `<project-root>` in `~/.artifacts-manager.json` if not already present.
4. Output a clickable URL for the user to open the artifact in the `artifacts-manager` web app:
   `http://localhost:41820/project/<projectSlug>/artifact/<artifactId>`
