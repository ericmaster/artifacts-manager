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

Artifacts are saved inside the current repository under `.artifacts-manager/`, cataloged in `manifest.json`, registered in `~/.artifacts-manager.json`, and viewable at `http://localhost:41820`.

---

## 1. Artifact Standards & Aesthetics

### Default Format: Interactive HTML (`.html`)
HTML is the preferred default. It allows rich vector diagrams, clickable interactive nodes, responsive tabs, and animated state simulators that text alone cannot provide.

**Design Guidelines (Nimblersoft Dark Design System):**
1. **Self-Contained:** Place all styling inside `<style>` and all interactive logic inside `<script>`. Do not require external network assets.
2. **Palette & Dark Mode:**
   - Background: Deep slate/dark `#090d16` or `#0f172a`
   - Card/Surface: Elevated `#131b2e` or `rgba(18, 26, 43, 0.8)` with subtle border `rgba(255, 255, 255, 0.08)`
   - Typography: Clean sans-serif (`system-ui`, `-apple-system`, `sans-serif`), monospace for code (`ui-monospace`, `monospace`)
   - Accents: Indigo (`#6366f1`), Cyan (`#06b6d4`), Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`)
3. **Interactivity:**
   - Clickable components: clicking a node or card opens an inspector panel showing implementation details, code snippets, or configuration.
   - Tabbed views: e.g. `[Topology Map]`, `[Data Flow]`, `[Component Breakdown]`, `[Source Code]`.
   - SVG diagrams: vector paths with glowing borders, hover tooltips, and clear directional arrows.

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
/home/ericmaster/tools/artifacts-manager/bin/artman add \
  --project "<project-root>" \
  --file "<artifact-slug>.html" \
  --title "<Artifact Title>" \
  --desc "<Short description>" \
  --tags "<comma,separated,tags>"
```

Or write/update `<project-root>/.artifacts-manager/manifest.json` and ensure `<project-root>` is in `~/.artifacts-manager.json`.

### Step 4: Share Direct Link with User
In your response, provide the direct URL to inspect the artifact:
`http://localhost:41820/project/<projectSlug>/artifact/<artifactId>`

---

## 4. Reusable Interactive HTML Template

Use this starter template for creating high-impact interactive artifacts:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Topology</title>
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
</body>
</html>
```
