# Artifacts Manager — Documentation

Wiki index for the `artifacts-manager` project. Agent working context lives in
[AGENTS.md](../AGENTS.md); domain terminology in [CONTEXT.md](../CONTEXT.md).

| Folder | Contains | Answers |
|---|---|---|
| [`adr/`](adr/) | Architectural Decision Records | *Why is it built this way?* |
| [`specs/`](specs/) | Module contracts and feature specs | *What must this module do?* |
| [`runbooks/`](runbooks/) | Exact command sequences | *What do I run to do X?* |

Filing rules and frontmatter schemas are SSOT in
[`docs-organization-blueprint.md`](docs-organization-blueprint.md) — consult §3 when a
document's home is ambiguous, and apply the frontmatter from §4.

## Decisions

* [ADR-0001: Architecture, Storage Model & SvelteKit Stack](adr/0001-architecture-and-stack.md) — SvelteKit + Node adapter, standalone HTML sandboxed iframe rendering, and central registry contract.

## Specs

* [Spec: Artifacts Manager Core](specs/artifacts-manager-core.md) — Central registry schema, per-project manifest format, REST API endpoints, and viewer routing.
* [Spec: `with-artifact` Skill](specs/with-artifact-skill.md) — Standardized agent skill contract for generating interactive HTML and Markdown artifacts.

## Runbooks

* [Runbook: Local Development & Operations](runbooks/local-development.md) — Starting dev server, building for production, registering repositories, and CLI usage.
