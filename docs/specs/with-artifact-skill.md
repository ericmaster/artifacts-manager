---
title: "Spec: with-artifact Skill"
type: spec
status: active
covers: skills/with-artifact/SKILL.md
last_checked: 2026-09-03
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
  - Mermaid for graph-shaped data flow, connections, topology, sequence, and vertical-slice phase views; stacked cards remain supporting detail.
  - Escaped `pre.mermaid[data-mermaid-source]` fallback for every Mermaid diagram. HTML artifacts avoid `<-->` and other HTML-sensitive source; use `---` or explicit `-->` edges.
- Explicit `mermaid.parse(source)` followed by `mermaid.render(id, source)` with `startOnLoad: false`; never rescan Mermaid-mutated DOM with `mermaid.run()`.
- Initialize Mermaid with `useMaxWidth: false` for flowchart, sequence, class, state, er, and gantt, plus `flowchart.htmlLabels: false` and `wrappingWidth: 240`. Match `src/lib/mermaid.ts`.
- `data-mermaid-state="rendered"` on success and readable source with `data-mermaid-state="error"` on failure. HTML Mermaid may use `securityLevel: 'loose'` only for named allowlisted local inspector callbacks; labels contain no arbitrary HTML.
- Custom component selectors are namespaced or container-scoped so they cannot collide with Mermaid internals such as `g.node`. Mermaid nodes receive no hover transform, transition, or animation unless motion is an explicit artifact requirement.
- Wrap each diagram in a focusable two-axis `overflow: auto` viewport (`tabindex="0"`). CSS must set SVG `width: auto`, `height: auto`, and `max-width: none`; never force wide graphs to `width: 100%`.
  - Tabbed sections (e.g. "Overview", "Sequence", "Component Map", "Data Flow").
  - Animated state transitions or step-by-step walkthrough buttons.

### B. Grilling & Decision Artifacts (`grill-<slug>.html`)
- **Template Source:** Seeded from `skills/with-artifact/assets/grill-questionnaire.html`.
- **Required Widgets:**
  1. **Frontier lock:** Status indicator and toggle to lock current questions.
  2. **Dynamic per-question Mermaid slot:** Live Mermaid diagram that updates and highlights active paths upon choice selection.
  3. **Choice input:** Radio buttons / option cards for recommended and alternate choices.
  4. **Free-text input:** Textarea for operator notes and rationale.
  5. **Copy export:** Single action copying the JSON payload (`schema: 1, kind: "grill-session"`).
- **Session Export Contract:**
  JSON payload must include `schema: 1`, `kind: "grill-session"`, `session_slug`, `round`, `frontier_locked`, and an array of `questions` with `id`, `title`, `body`, `recommended`, `choices`, `choice`, `free_text`, and `mermaid`.

### C. Markdown Artifacts
- **Rich Document:** Standard Markdown with GitHub alerts (`> [!NOTE]`, `> [!IMPORTANT]`, etc.), tables, code blocks with syntax highlighting, and Mermaid code fences (`mermaid`).

### D. Validation Gate
- Run `artman validate --project <project-root>`; Mermaid fallback sources are parsed with pinned Mermaid grammar.
- Test the sandboxed Artifacts Manager iframe and every interactive diagram state.
- Reject `.error-icon`, `.error-text`, `[data-mermaid-state="error"]`, `Syntax error`, `Parse error`, browser console errors, and page errors.
- Require at least one Mermaid `g.node` per expected graph and verify desktop/mobile overflow.
- Verify Mermaid nodes keep the same computed transform and document-relative position on hover unless diagram motion was explicitly requested.
- For diagrams larger than their viewport, verify non-zero scroll range on each required axis and exercise pointer plus arrow-key scrolling inside the diagram without page-level overflow.
- Never accept SVG presence alone because Mermaid syntax failures are SVGs.

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
4. Output the canonical public URL for the user to open the artifact:
   `https://artifacts.nimblersoft.com/project/<projectSlug>/artifact/<artifactId>`
   Treat localhost URLs as local diagnostics only.
