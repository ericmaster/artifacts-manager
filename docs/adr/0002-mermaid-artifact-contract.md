---
title: "ADR-0002: Versioned Tailwind and Mermaid Artifact Contract"
type: adr
status: accepted
date: 2026-08-24
---

# ADR-0002: Versioned Tailwind and Mermaid Artifact Contract

## Decision

HTML artifacts use Tailwind `https://cdn.tailwindcss.com/3.4.17` and Mermaid `https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs`. Graph-shaped views use Mermaid source with readable `pre.mermaid[data-mermaid-source]` fallback; routine layout uses Tailwind utilities. The interactive C4 dashboard uses Mermaid's ELK layout and scopes relationship edges to the currently expanded group, while its root overview uses invisible band-order anchors. The HTML iframe sandbox and Open Raw route are unchanged.

Markdown is parsed and sanitized on the server, then Mermaid is imported and rendered client-only with `securityLevel: 'strict'`, deterministic sequential IDs, generic error alerts, and escaped source fallback. Graph types initialize with `useMaxWidth: false` so diagrams keep their intrinsic SVG size; containers scroll instead of shrinking labels. HTML artifacts may use Mermaid `securityLevel: 'loose'` only for allowlisted local inspector callbacks.

## Consequences

Manifest IDs, files, and `createdAt` are stable; migrations update `updatedAt` and relevant lowercase tags. Custom CSS is limited to Mermaid sizing and specialized visual exceptions.
