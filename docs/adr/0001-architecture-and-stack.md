---
title: "ADR-0001: Architecture, Storage Model & SvelteKit Stack"
type: adr
status: accepted
decided_by: ericmaster
date: 2026-08-18
---

# ADR-0001: Architecture, Storage Model & SvelteKit Stack

## Context

AI coding agents frequently generate visual explanations, system topologies, architecture diagrams, state machines, diff walkthroughs, and conceptual breakdowns. Historically, these were transiently scattered across chat transcripts or scratch directories without a unified way for engineers to search, categorize, and interactively inspect them across multiple repositories.

We need a lightweight, local-first management system and visualizer that:
1. Serves all local repositories on the machine.
2. Allows agents to generate self-contained, interactive HTML or Markdown artifacts under `<project>/.artifacts-manager/`.
3. Indexes and tracks projects centrally via `~/.artifacts-manager.json`.
4. Provides a fast, beautiful web dashboard with search, tag filtering, responsive viewports, and sandboxed interactive iframe rendering.

## Decision

1. **Web Stack:** Build the web application using **SvelteKit 2 + Svelte 5 + Vite** with `@sveltejs/adapter-node`. SvelteKit provides instant SSR/client routing, lightweight bundle footprint, and native server-side API endpoints (`+server.ts`) to read the local filesystem safely.
2. **Port Allocation:** Pin the web interface and API to localhost port **`41820`**.
3. **Storage Model:**
   - **Central Registry:** Stored in `~/.artifacts-manager.json`. Lists known repository paths, project slugs, and last-activity timestamps.
   - **Project Scope:** Each repository contains a `.artifacts-manager/` directory with a `manifest.json` file cataloging artifacts, tags, metadata, and relative file paths.
4. **Rendering Strategy:**
   - **HTML Artifacts:** Rendered inside a sandboxed `<iframe>` loaded from the `/api/raw/[projectSlug]/[file]` endpoint. This allows arbitrary interactive JavaScript (SVGs, zoom/pan, animations, buttons, charts) to execute safely without CSS or script collisions with the host application.
   - **Markdown Artifacts:** Rendered directly with `marked`, syntax highlighting (`prismjs`), and styled typography.
5. **Skill Integration:** Ship a first-class agent skill `with-artifact` that instructs agents across harnesses (Antigravity, Kilo, Claude Code) how to structure interactive artifacts and automatically register them in the project manifest and global registry.

## Consequences

- **Pros:**
  - Zero-database dependency: relies purely on JSON manifests and static files in git repositories.
  - Interactive freedom: agents can generate full standalone HTML applications with inline JS/CSS/SVGs that run unmodified in the viewer.
  - Project portability: `.artifacts-manager` folders can be committed directly to each repo or gitignored as desired.
- **Constraints:**
  - The server process requires read access to local repository directories listed in `~/.artifacts-manager.json`.
