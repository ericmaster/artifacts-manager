# Artifacts Manager Documentation Blueprint

This document defines how documentation is organized in this repository: the divide between
versioned and unversioned material, the directory layout, the filing rules that keep folders
from overlapping, and the frontmatter every document carries.

---

## 1. The Clean Divide: Versioned Wiki vs. Scratch Space

Two environments, deliberately separated:

| | **Versioned wiki** (`docs/`) | **Scratch space** (unversioned) |
|---|---|---|
| **Contains** | Invariants, contracts, decisions, runbooks | Raw notes, meeting transcripts, clippings, work-in-progress drafts, full research dumps |
| **Trust** | High — reviewed, current, safe to act on | Low — unreviewed, possibly stale or contradictory |
| **Lifecycle** | Git-tracked, reviewed, diffable | Freely edited, never reviewed, disposable |
| **Audience** | Humans + agents, as source of truth | Humans thinking out loud; agents reading for *input* only |

**Rules:**

1. **The repository is the SSOT.** `docs/` is the single source of truth for architecture,
   decisions, contracts, and procedures. Nothing outside it is authoritative.
2. **Scratch is input, never output.** An agent may *read* the scratch space to synthesize a
   document, but the synthesized result is committed to `docs/` — the scratch original is not
   the deliverable and is never linked as the canonical reference.
3. **No shared write surface.** Do not mount or sync the scratch space into the repository
   working tree. Concurrent human edits and agent writes in the same directory produce
   collisions and lock contention. Read it over its own interface (API, read-only path, or a
   copy), synthesize, then commit.
4. **Cite, don't inline.** When a `docs/` file distills something large, it states the takeaway
   and links back to the full source rather than pasting it in.

> **This project's scratch space:** SilverBullet `tools/artifacts-manager/` (fallback: `~/.scratch/artifacts-manager/`).

---

## 2. Organization System

A **hybrid folder/tag structure**:

* **Folders for namespacing** — physical directories isolate document *kinds*. This scopes
  search paths and prevents naming collisions.
* **Tags for typing** — YAML frontmatter classifies the document type (adr, spec, runbook) and
  cross-cutting concerns, so views can be compiled across folders without reorganizing them.

---

## 3. Directory Layout

```
artifacts-manager/
├── AGENTS.md                        # Core agent operational context (SSOT)
├── CLAUDE.md                        # Thin pointer to AGENTS.md
├── CONTEXT.md                       # Domain glossary
├── README.md                        # Human-facing overview
├── skills/                          # Shipped agent skills (with-artifact)
│   └── with-artifact/
└── docs/
    ├── index.md                     # Wiki landing page / document map
    ├── docs-organization-blueprint.md  # This file
    ├── adr/                         # Architectural Decision Records (technical choices)
    ├── specs/                       # Module contracts and feature specifications
    ├── architecture/                # System designs, topologies, C4 structural diagrams
    ├── processes/                   # Standing policies, governance, boundaries
    ├── workflows/                   # Lifecycle flows spanning multiple systems
    ├── runbooks/                    # Step-by-step command recipes
    └── research/                    # Takeaways and reports (full sources in scratch)
```

### Bounded Categorization Rules (Filing Best Practices)

| Location | Target | Audience / Use | Primary Question Answered |
| :--- | :--- | :--- | :--- |
| **`/skills/`** *(root)* | Executable agent logic | **Agent-harness only.** Parsed natively as direct capability prompts. | *What capabilities does the agent possess?* |
| **`docs/adr/`** | Decision Records | **Human + Agent.** Choices that are hard to reverse, surprising without context, and the result of a real trade-off. | *Why is it built this way?* |
| **`docs/specs/`** | Module & Feature Contracts | **Human + Agent.** Behavioral contract per module — what it must do, and why. | *What must this module do?* |
| **`docs/architecture/`** | Structural Designs | **Human + Agent.** Topologies, component maps, C4 diagrams. | *What is wired to what?* |
| **`docs/processes/`** | Standing Policies & Guidelines | **Human + Agent.** Rules, governance, and write discipline. | *What are the rules and boundaries of this system?* |
| **`docs/workflows/`** | Lifecycle Pathways | **Human + Agent.** Coordination sequences and pipeline lifecycles across systems. | *How does work flow from start to completion?* |
| **`docs/runbooks/`** | Technical Action Recipes | **Human (or authorized agent).** Exact CLI checklists for troubleshooting or deployment. | *What is the exact sequence of commands?* |
| **`docs/research/`** | Research Takeaways | **Human + Agent.** Summarized findings and recommendations. Full documents stay in the scratch space. | *What did we learn, and what do we recommend?* |

---

## 4. Metadata Schema & Frontmatter Conventions

### A. Decision Record (ADR)

```yaml
---
title: "ADR-0001: <Decision>"
type: adr
status: proposed | accepted | superseded
decided_by: <name>
date: <YYYY-MM-DD>
---
```

### B. Spec

```yaml
---
title: "Spec: <module>"
type: spec
status: active | superseded
covers: <source path this spec governs>
last_checked: <YYYY-MM-DD>
---
```

---

## 5. Compiled Views

> **View compiler:** Hand-maintained index in `docs/index.md` with links to all active ADRs and specs.
