---
name: with-artifact
description: Generate an explanatory and interactive HTML/MD artifact in the local repository under .artifacts-manager/ to help the user deeply understand system topologies, architectures, refactors, state machines, data schemas, or complex concepts, and register it in Artifacts Manager.
---

# With-Artifact (Interactive Explanatory Artifact Generator)

Use this skill whenever you need to explain, visualize, or guide the user through a complex topic:
- **System Topologies & Architectures:** Multi-service wiring, container setups, Cloudflare edge vs origin flows, microservices.
- **State Machines & Lifecycles:** Auth transitions, queue pipelines, order lifecycles, orchestrator state flows.
- **Database & Data Schemas:** Table relationships, SQLite D1/Postgres entity diagrams, cache layers.
- **Refactors & Complex Changes:** Before/after comparisons, AST migrations, module decoupling maps.
- **Conceptual Deep-Dives:** Algorithms, protocol handshakes, security threat boundaries.
- **Grilling & Decision Questionnaires:** Interactive interview worksheets during planning/design sessions (`.artifacts-manager/grill-<session-slug>.html`) featuring frontier locking, dynamic decision-tree diagrams synced to choices, an `Other` choice for custom answers, free-text inputs, and copyable JSON exports.

Artifacts are saved inside the current repository under `.artifacts-manager/`, cataloged in `manifest.json`, registered in `~/.artifacts-manager.json`, and published at `https://artifacts.nimblersoft.com`.

---

## 1. Artifact Standards & Aesthetics

### Default Format: Interactive HTML (`.html`)
HTML is the preferred default. It allows rich vector diagrams, clickable interactive nodes, responsive tabs, and animated state simulators that text alone cannot provide.

**Design Guidelines (Nimblersoft Dark Design System):**
1. **Runtime contract:** Include exactly `<script src="https://cdn.tailwindcss.com/3.4.17"></script>` and Mermaid from `https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs`; keep all other logic local.
2. **Palette & Dark Mode:**
   - Background: Deep slate/dark `#090d16` or `#0f172a`
   - Card/Surface: Elevated `#131b2e` or `rgba(18, 26, 43, 0.8)` with subtle border `rgba(255, 255, 255, 0.08)`
   - Typography: Clean sans-serif (`system-ui`, `-apple-system`, `sans-serif`), monospace for code (`ui-monospace`, `monospace`)
   - Accents: Indigo (`#6366f1`), Cyan (`#06b6d4`), Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`)
3. **Interactivity:**
   - Clickable components: clicking a node or card opens an inspector panel showing implementation details, code snippets, or configuration.
   - Tabbed views: e.g. `[Topology Map]`, `[Data Flow]`, `[Component Breakdown]`, `[Source Code]`.
   - Use Mermaid for graph-shaped diagrams, especially data flow, connections, topology, sequence, and phase-specific vertical slices. Use stacked cards only for supporting detail that is not naturally a graph.
   - Preserve every Mermaid source in escaped `pre.mermaid[data-mermaid-source]` fallback text. Avoid HTML-sensitive Mermaid syntax such as `<-->` inside HTML artifacts; use `---` for an undirected connection or explicit `-->` edges.
    - Initialize Mermaid with `startOnLoad: false`, `flowchart.htmlLabels: false`, `wrappingWidth: 240`, and `useMaxWidth: false` for flowchart, sequence, class, state, er, and gantt. Match `src/lib/mermaid.ts`. For each source, call `mermaid.parse(source)` and then `mermaid.render(id, source)` into its own element. Never use `mermaid.run()` to rescan DOM that Mermaid may already have transformed.
   - On render failure, restore the readable source fallback and set `data-mermaid-state="error"`; on success set `data-mermaid-state="rendered"`.
   - HTML Mermaid may use `securityLevel: 'loose'` only for named, allowlisted local inspector callbacks; labels contain no arbitrary HTML.
   - Use Tailwind utilities for routine layout; retain custom CSS only for Mermaid sizing or specialized visuals.
   - Namespace custom component classes and scope selectors to their component container. Mermaid emits elements such as `g.node`, so never use a generic `.node` interaction selector that can collide with diagram internals.
   - Mermaid nodes are static by default: do not apply hover transforms, transitions, or animation to `.mermaid g.node` unless the user explicitly requests motion.
   - Put large Mermaid SVGs inside a focusable two-axis scroll viewport. Preserve a readable SVG width instead of forcing every graph to `width: 100%`; use `overflow: auto`, visible scrollbars, and `tabindex="0"` so pointer and keyboard users can reach the entire diagram.

---

## 2. Directory & Manifest Contract

All artifacts for a project live in:
```
<project-root>/
└── .artifacts-manager/
    ├── manifest.json
    ├── <artifact-slug>.html
    └── <other-artifact>.md
```

### `manifest.json` Format
```json
{
  "version": "1.0.0",
  "projectName": "my-project",
  "description": "Project description",
  "artifacts": [
    {
      "id": "system-topology",
      "title": "System Topology & Architecture",
      "type": "html",
      "file": "system-topology.html",
      "description": "Interactive node diagram of system services and message queues.",
      "tags": ["architecture", "topology", "services"],
      "createdAt": "2026-08-18T17:00:00.000Z",
      "updatedAt": "2026-08-18T17:00:00.000Z"
    }
  ]
}
```

---

## 3. Step-by-Step Procedure

### Step 1: Design the Artifact
1. Choose a kebab-case identifier (e.g. `auth-flow-topology`, `db-schema-map`, `orchestrator-refactor`).
2. Draft the interactive HTML content (see template below) or Markdown content.

### Step 2: Write the Artifact File
Write the file to `<project-root>/.artifacts-manager/<artifact-slug>.html`.

### Step 3: Register in Manifest and Central Registry
You can either run the CLI helper:
```bash
artman add \
  --project "<project-root>" \
  --file "<artifact-slug>.html" \
  --title "<Artifact Title>" \
  --desc "<Short description>" \
  --tags "<comma,separated,tags>"
```

Or write/update `<project-root>/.artifacts-manager/manifest.json` and ensure `<project-root>` is in `~/.artifacts-manager.json`.

### Step 4: Validate Static and Runtime Behavior
Run the project validator after registration:
```bash
artman validate --project "<project-root>"
```

For HTML artifacts, open the Artifacts Manager viewer route and test the sandboxed `iframe.artifact-iframe`, not only the raw file. Exercise every tab, phase, or state that changes a diagram and assert all of the following:
- Every expected diagram has `data-mermaid-state="rendered"` and at least one Mermaid `g.node`.
- No `.error-icon`, `.error-text`, `[data-mermaid-state="error"]`, `Syntax error`, or `Parse error` appears.
- No browser console or page errors occur.
- Desktop and mobile viewports have no unintended page-level overflow.
- Hovering Mermaid nodes does not change their computed transform or document-relative position unless diagram motion was explicitly requested.
- Any diagram whose readable dimensions exceed its viewport has a non-zero native scroll range on the required axis, and pointer plus arrow-key scrolling can reach the hidden content without moving the whole page.

Do not treat the presence or count of `<svg>` elements as success: Mermaid renders syntax failures as SVGs too.

Keep runtime QA local. From the Artifacts Manager checkout, run `npm run dev` and use `http://127.0.0.1:41820/project/<projectSlug>/artifact/<artifactId>` as the validation target. The loopback viewer needs no tunnel or public exposure.

### Step 5: Preserve Metadata and Share Direct Link
Preserve an existing artifact's `id`, `file`, and `createdAt`; update only `updatedAt` and relevant lowercase tags such as `tailwind` and `mermaid`.
In your response, provide the canonical public URL:
`https://artifacts.nimblersoft.com/project/<projectSlug>/artifact/<artifactId>`

The CLI may print a localhost viewer URL. Treat it as local diagnostics only; user-facing links always use `https://artifacts.nimblersoft.com`.

---

## 4. Reusable Interactive HTML Templates

### 4.1 System Architecture & Topology Template
Use this starter template for creating interactive component and architecture maps:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Topology</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <style>
    :root {
      --bg: #090d16;
      --card: #131b2e;
      --border: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --indigo: #6366f1;
      --cyan: #06b6d4;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 1.5rem;
      min-height: 100vh;
    }
    .header { margin-bottom: 1.5rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      margin-bottom: 0.5rem;
    }
    h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.35rem; }
    p.subtitle { color: var(--text-muted); font-size: 0.9rem; }
    
    .layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
    }

    .canvas-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
    }
    
    /* Interactive Node Grid or SVG Canvas */
    .nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .node-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .node-card:hover {
      border-color: var(--indigo);
      background: rgba(99, 102, 241, 0.08);
      transform: translateY(-2px);
    }
    .node-card.active {
      border-color: var(--cyan);
      box-shadow: 0 0 15px -3px rgba(6, 182, 212, 0.3);
    }

    .detail-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .detail-card h3 { font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--cyan); }
    .detail-desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }
    .mermaid-viewport { overflow: auto; max-width: 100%; scrollbar-width: auto; }
    .mermaid svg { display: block; width: auto !important; height: auto !important; max-width: none !important; }
    .mermaid[data-mermaid-state="error"] { white-space: pre-wrap; color: #fecdd3; }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">Interactive Topology</span>
    <h1>System Architecture & Dataflow</h1>
    <p class="subtitle">Click on any node to inspect responsibilities, contracts, and data models.</p>
  </div>

  <div class="layout">
    <div class="canvas-card">
      <div class="nodes-grid">
        <div class="node-card active" onclick="selectNode('gateway')">
          <h4>API Gateway</h4>
          <p style="font-size: 0.75rem; color: var(--text-muted);">Edge Router & Auth</p>
        </div>
        <div class="node-card" onclick="selectNode('orchestrator')">
          <h4>Orchestrator</h4>
          <p style="font-size: 0.75rem; color: var(--text-muted);">Queue & Dispatch</p>
        </div>
        <div class="node-card" onclick="selectNode('storage')">
          <h4>D1 Database</h4>
          <p style="font-size: 0.75rem; color: var(--text-muted);">SQLite State Store</p>
        </div>
      </div>
      <div class="mermaid-viewport mt-4" tabindex="0">
        <pre class="mermaid" data-mermaid-source="flowchart LR&#10;gateway --&gt; orchestrator&#10;orchestrator --&gt; storage">flowchart LR
gateway --> orchestrator
orchestrator --> storage</pre>
      </div>
    </div>

    <div class="detail-card" id="detail-pane">
      <h3 id="detail-title">API Gateway</h3>
      <p class="detail-desc" id="detail-desc">
        Handles SSL termination, rate limiting, and JWT authentication at the Cloudflare edge before routing requests to internal workers.
      </p>
    </div>
  </div>

  <script>
    const data = {
      gateway: {
        title: 'API Gateway',
        desc: 'Handles SSL termination, rate limiting, and JWT authentication at the Cloudflare edge before routing requests to internal workers.'
      },
      orchestrator: {
        title: 'Orchestrator',
        desc: 'Core workflow engine managing background execution queues, retry logic, and subagent state dispatch.'
      },
      storage: {
        title: 'D1 Database',
        desc: 'Serverless SQLite persistence layer storing relational entity models, audit logs, and operational telemetry.'
      }
    };

    function selectNode(id) {
      document.querySelectorAll('.node-card').forEach(el => el.classList.remove('active'));
      event.currentTarget.classList.add('active');
      const item = data[id];
      if (item) {
        document.getElementById('detail-title').innerText = item.title;
        document.getElementById('detail-desc').innerText = item.desc;
      }
    }
  </script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', flowchart: { htmlLabels: false, useMaxWidth: false, wrappingWidth: 240, nodeSpacing: 40, rankSpacing: 56, padding: 12 }, sequence: { useMaxWidth: false }, gantt: { useMaxWidth: false }, class: { useMaxWidth: false }, state: { useMaxWidth: false }, er: { useMaxWidth: false } });
    let diagramSequence = 0;
    for (const element of document.querySelectorAll('.mermaid[data-mermaid-source]')) {
      const source = element.dataset.mermaidSource ?? element.textContent.trim();
      try {
        await mermaid.parse(source);
        const { svg, bindFunctions } = await mermaid.render(`artifact-diagram-${diagramSequence += 1}`, source);
        element.innerHTML = svg;
        element.dataset.mermaidState = 'rendered';
        bindFunctions?.(element);
      } catch (error) {
        element.textContent = source;
        element.dataset.mermaidState = 'error';
        console.error('Mermaid diagram failed validation', error);
      }
    }
  </script>
</body>
</html>
```

---

### 4.2 Grilling & Decision Questionnaire Template (`assets/grill-questionnaire.html`)

When conducting interactive grilling sessions during pre-plan or design workflows (`grilling`, `/grill-with-docs`, `planner` agent pre-plan), write or rewrite the session artifact at `.artifacts-manager/grill-<session-slug>.html` seeded from the skill's canonical asset `skills/with-artifact/assets/grill-questionnaire.html`.

#### Required Widget Contract:
1. **Frontier Lock (`#frontier-lock`):** Amber status banner and lock checkbox indicating whether this round's questions are locked.
2. **Dynamic Per-Question Mermaid Slot (`.mermaid-container`):** Decision-tree diagram rendered via ADR-0002 runtime that dynamically updates and highlights the chosen branch when the operator selects different options.
3. **Choice Selection Options (`.choices`):** Interactive cards/radios for recommended and alternate paths.
4. **Free-Text Input (`textarea`):** Operator prose area for custom answers and constraints.
5. **Copy Export (`#copy-export`):** Single action copying the JSON payload (`schema: 1, kind: "grill-session"`).

#### Export JSON Data Contract:
```json
{
  "schema": 1,
  "kind": "grill-session",
  "session_slug": "<session-slug>",
  "round": 1,
  "frontier_locked": true,
  "questions": [
    {
      "id": "Q1",
      "title": "Successful outcome",
      "body": "What observable result means this plan succeeded?",
      "recommended": "Ship the smallest vertical slice that proves the path.",
      "choices": ["smallest-slice", "full-scope", "other"],
      "choice": "smallest-slice",
      "free_text": "",
      "mermaid": "flowchart TD..."
    }
  ]
}
```
