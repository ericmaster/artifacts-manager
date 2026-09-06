/**
 * Nimblersoft Artifacts Manager Landing Page Script
 * Interactive Demos, Viewport Switchers, Terminal Simulator, and Mermaid Runtime Contract
 */

const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs';
let mermaidModule = null;
let mermaidSequence = 0;

document.addEventListener('DOMContentLoaded', () => {
  initClipboard();
  initViewportControls();
  initShowcaseTabs();
  initTerminalTabs();
  initInteractiveMockup();
  initTopologyDemo();
  initGrillQuestionnaireDemo();
  initMarkdownSpecDemo();
  initMermaidRenderer();
});

// 1. Clipboard Copy Handlers
function initClipboard() {
  const copyButtons = document.querySelectorAll('[data-copy]');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalHTML = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    });
  });
}

// 2. Viewport Switcher Controls
function initViewportControls() {
  const vpButtons = document.querySelectorAll('.vp-btn');
  const mockupInner = document.getElementById('mockup-viewport-inner');
  const resolutionDisplay = document.getElementById('mockup-resolution');

  if (!mockupInner || vpButtons.length === 0) return;

  vpButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      vpButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const width = btn.getAttribute('data-width');
      if (width === '100%') {
        mockupInner.style.maxWidth = '100%';
        if (resolutionDisplay) resolutionDisplay.textContent = '100% Desktop';
      } else if (width === '768px') {
        mockupInner.style.maxWidth = '768px';
        if (resolutionDisplay) resolutionDisplay.textContent = '768px Tablet';
      } else if (width === '375px') {
        mockupInner.style.maxWidth = '375px';
        if (resolutionDisplay) resolutionDisplay.textContent = '375px Mobile';
      }
    });
  });
}

// 3. Showcase Tabs Switcher
function initShowcaseTabs() {
  const tabs = document.querySelectorAll('.showcase-tab');
  const panels = document.querySelectorAll('.showcase-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        // Render or adjust diagrams in newly visible panel
        if (mermaidModule) {
          renderAllMermaidInContainer(targetPanel);
        }
      }
    });
  });
}

// 4. Terminal Command Tabs
const terminalData = {
  register: `
<span class="term-prompt">$</span> ./bin/artman register /path/to/acme-app
<span class="term-dim">Reading ~/.artifacts-manager.json ...</span>
<span class="term-dim">Indexing /path/to/acme-app/.artifacts-manager/manifest.json ...</span>
<span class="term-success">✓ Registered project:</span> <span class="term-highlight">acme-app</span> (6 active artifacts)
<span class="term-dim">Catalog updated at ~/.artifacts-manager.json</span>
<span class="term-prompt">$</span> 
`,
  list: `
<span class="term-prompt">$</span> ./bin/artman list
<span class="term-dim">Artifacts Manager Central Registry (v1.0.0)</span>
<span class="term-dim">─────────────────────────────────────────────────────────────────────────────</span>
<span class="term-highlight">acme-app</span>                    /path/to/acme-app                    6 artifacts
<span class="term-highlight">inventory-dashboard</span>         /path/to/inventory-dashboard         3 artifacts
<span class="term-highlight">support-portal</span>              /path/to/support-portal              5 artifacts
<span class="term-highlight">artifacts-manager</span>           /path/to/artifacts-manager           4 artifacts
<span class="term-dim">─────────────────────────────────────────────────────────────────────────────</span>
<span class="term-success">Total: 4 projects | 48 total artifacts | Port 41820</span>
<span class="term-prompt">$</span> 
`,
  archive: `
<span class="term-prompt">$</span> ./bin/artman archive system-topology --project /path/to/acme-app
<span class="term-dim">Loading manifest for acme-app ...</span>
<span class="term-dim">Updating artifact status 'system-topology' -> archived: true ...</span>
<span class="term-success">✓ Archived artifact:</span> <span class="term-highlight">System Topology</span> (system-topology) in acme-app
<span class="term-dim">Manifest saved. Hidden from default active viewer.</span>
<span class="term-prompt">$</span> 
`,
  validate: `
<span class="term-prompt">$</span> ./bin/artman validate --all
<span class="term-dim">Validating 4 registered projects against ADR-0002 contracts...</span>
<span class="term-success">✓ [nimbler-ops]</span> 24/24 artifacts conform to runtime CDN & manifest containment.
<span class="term-success">✓ [cambiacromo]</span> 8/8 artifacts conform to Tailwind 3.4.17 & Mermaid 11.17.1.
<span class="term-success">✓ [vespera]</span> 12/12 artifacts valid (allowlisted KTH radar canvas).
<span class="term-success">✓ [artifacts-manager]</span> 4/4 artifacts validated. Zero broken references.
<span class="term-success">✓ All registered project contracts passed validation (0 errors, 0 warnings).</span>
<span class="term-prompt">$</span> 
`
};

function initTerminalTabs() {
  const tabs = document.querySelectorAll('.term-tab');
  const screen = document.getElementById('terminal-content');
  const copyBtn = document.getElementById('term-copy-btn');

  if (!screen || tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const cmd = tab.getAttribute('data-cmd');
      if (terminalData[cmd]) {
        screen.innerHTML = terminalData[cmd].trim();
        if (copyBtn) {
          const rawCommand = getRawCommand(cmd);
          copyBtn.setAttribute('data-copy', rawCommand);
        }
      }
    });
  });
}

function getRawCommand(cmd) {
  switch (cmd) {
    case 'register': return './bin/artman register /path/to/acme-app';
    case 'list': return './bin/artman list';
    case 'archive': return './bin/artman archive orchestrator-topology';
    case 'validate': return './bin/artman validate --all';
    default: return './bin/artman list';
  }
}

// 5. Interactive Mockup Filter Simulator
function initInteractiveMockup() {
  const tagChips = document.querySelectorAll('.mockup-tag-filter');
  const cards = document.querySelectorAll('.mockup-artifact-card');

  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      tagChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const tag = chip.getAttribute('data-tag');
      cards.forEach(card => {
        const cardTags = card.getAttribute('data-tags') || '';
        if (tag === 'all' || cardTags.includes(tag)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// 6. Demo 1: Interactive System Topology
const topologyData = {
  gateway: {
    badge: '01 • Ingress Layer',
    title: 'API Gateway & Ingress',
    desc: 'Handles TLS termination, routing, port 41820 allocation, and path-traversal security verification before passing requests to internal handlers.',
    sec: 'Path-traversal guard (403 on ../ escapes)',
    endpoint: 'http://127.0.0.1:41820/api/raw/*',
    contract: 'ADR-0001 & ADR-0002 Verified'
  },
  orchestrator: {
    badge: '02 • Dispatch Layer',
    title: 'Task Orchestrator & State Machine',
    desc: 'Core workflow engine managing background execution queues, retry policies, and subagent state lifecycle.',
    sec: 'Process isolation, timeout caps, and queue backpressure',
    endpoint: 'POST /api/register, PATCH /api/projects/:slug/artifacts/:id',
    contract: 'Stateful coordination & subagent dispatch'
  },
  sandbox: {
    badge: '03 • Execution Layer',
    title: 'Sandboxed Iframe Hub',
    desc: 'Executes rich client-side JavaScript, Tailwind animations, and interactive diagrams in isolated sandboxed iframes without host pollution.',
    sec: 'iframe sandbox="allow-scripts allow-forms allow-popups"',
    endpoint: '/api/raw/[projectSlug]/[...file]',
    contract: 'Zero global variable leaks or CSS collisions'
  },
  storage: {
    badge: '04 • Persistence Layer',
    title: 'Zero-DB Manifests & Central Registry',
    desc: 'Pure JSON-persisted state model with local repo manifests and central catalog index in ~/.artifacts-manager.json.',
    sec: 'Local filesystem permissions & Git revision tracking',
    endpoint: '~/.artifacts-manager.json & <repo>/.artifacts-manager/manifest.json',
    contract: 'Zero-DB JSON contracts (ADR-0001)'
  }
};

function getTopologyDiagramSource(activeNodeId) {
  return `flowchart LR
  client["Client Browser (41820)"] --> gateway["API Gateway"]
  gateway --> orchestrator["Task Orchestrator"]
  orchestrator --> sandbox["Sandboxed Iframe Hub"]
  sandbox --> storage["Zero-DB Manifests"]
  classDef default fill:#0d152c,stroke:#252f55,stroke-width:1px,color:#f0f4ff;
  classDef active fill:#132247,stroke:#00f0ff,stroke-width:2px,color:#00f0ff;
  class ${activeNodeId} active;`;
}

function initTopologyDemo() {
  const nodeCards = document.querySelectorAll('.topo-node-card');
  const badgeEl = document.getElementById('topo-inspect-badge');
  const titleEl = document.getElementById('topo-inspect-title');
  const descEl = document.getElementById('topo-inspect-desc');
  const secEl = document.getElementById('topo-inspect-sec');
  const endpointEl = document.getElementById('topo-inspect-endpoint');
  const contractEl = document.getElementById('topo-inspect-contract');
  const diagramEl = document.getElementById('topology-mermaid');

  if (!nodeCards.length) return;

  nodeCards.forEach(card => {
    card.addEventListener('click', () => {
      nodeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const nodeId = card.getAttribute('data-node-id');
      const item = topologyData[nodeId];
      if (item) {
        if (badgeEl) badgeEl.textContent = item.badge;
        if (titleEl) titleEl.textContent = item.title;
        if (descEl) descEl.textContent = item.desc;
        if (secEl) secEl.textContent = item.sec;
        if (endpointEl) endpointEl.textContent = item.endpoint;
        if (contractEl) contractEl.textContent = item.contract;

        if (diagramEl && mermaidModule) {
          const newSource = getTopologyDiagramSource(nodeId);
          renderDiagram(diagramEl, newSource);
        }
      }
    });
  });
}

// 7. Demo 2: Grill Questionnaire & Reactive Decisions
function getQ1DiagramSource(choiceVal) {
  const activeNode = choiceVal === 'sqlite-daemon' ? 'optB' : (choiceVal === 'cloud-d1' ? 'optC' : 'optA');
  return `flowchart TD
  q1["Persistence Strategy"] --> optA["Zero-DB Filesystem JSON"]
  q1 --> optB["Central SQLite Daemon"]
  q1 --> optC["Cloudflare D1 & KV"]
  classDef default fill:#0d152c,stroke:#252f55,stroke-width:1px,color:#f0f4ff;
  classDef selected fill:#2e1065,stroke:#c084fc,stroke-width:2px,color:#fff;
  class ${activeNode} selected;`;
}

function getQ2DiagramSource(choiceVal) {
  const activeNode = choiceVal === 'shadow-dom' ? 'optB' : (choiceVal === 'static-svg' ? 'optC' : 'optA');
  return `flowchart TD
  q2["Sandboxing Strategy"] --> optA["Sandboxed Iframe Hub"]
  q2 --> optB["Shadow DOM Web Components"]
  q2 --> optC["Static Pre-rendered SVG"]
  classDef default fill:#0d152c,stroke:#252f55,stroke-width:1px,color:#f0f4ff;
  classDef selected fill:#2e1065,stroke:#c084fc,stroke-width:2px,color:#fff;
  class ${activeNode} selected;`;
}

function initGrillQuestionnaireDemo() {
  const lockBox = document.getElementById('frontier-lock-box');
  const lockCheckbox = document.getElementById('frontier-lock-checkbox');

  if (lockCheckbox && lockBox) {
    lockCheckbox.addEventListener('change', () => {
      lockBox.dataset.locked = lockCheckbox.checked ? 'true' : 'false';
    });
  }

  // Choice change for Q1
  const q1Radios = document.querySelectorAll("input[name='q1-choice']");
  const q1Mermaid = document.getElementById('q1-mermaid');
  q1Radios.forEach(radio => {
    radio.addEventListener('change', e => {
      document.querySelectorAll("[data-qid='q1'] .grill-choice-card").forEach(c => c.classList.remove('selected'));
      const parent = e.target.closest('.grill-choice-card');
      if (parent) parent.classList.add('selected');

      if (q1Mermaid && mermaidModule) {
        const source = getQ1DiagramSource(e.target.value);
        renderDiagram(q1Mermaid, source);
      }
    });
  });

  // Choice change for Q2
  const q2Radios = document.querySelectorAll("input[name='q2-choice']");
  const q2Mermaid = document.getElementById('q2-mermaid');
  q2Radios.forEach(radio => {
    radio.addEventListener('change', e => {
      document.querySelectorAll("[data-qid='q2'] .grill-choice-card").forEach(c => c.classList.remove('selected'));
      const parent = e.target.closest('.grill-choice-card');
      if (parent) parent.classList.add('selected');

      if (q2Mermaid && mermaidModule) {
        const source = getQ2DiagramSource(e.target.value);
        renderDiagram(q2Mermaid, source);
      }
    });
  });

  // Grill Copy Export button
  const exportBtn = document.getElementById('grill-copy-export');
  const exportStatus = document.getElementById('grill-export-status');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const q1Choice = document.querySelector("input[name='q1-choice']:checked")?.value || 'zero-db';
      const q2Choice = document.querySelector("input[name='q2-choice']:checked")?.value || 'iframe-sandbox';
      const q1Free = document.getElementById('q1-free')?.value || '';
      const q2Free = document.getElementById('q2-free')?.value || '';

      const exportData = {
        schema: 1,
        kind: 'grill-session',
        session_slug: 'architecture-stress-test',
        round: 1,
        frontier_locked: lockCheckbox ? lockCheckbox.checked : true,
        questions: [
          {
            id: 'Q1',
            title: 'State Persistence Strategy',
            body: 'How should multi-project artifacts store central state and manifest indexes across local repositories?',
            recommended: 'Zero-DB filesystem JSON manifests (~/.artifacts-manager.json + manifest.json).',
            choice: q1Choice,
            free_text: q1Free,
            mermaid: getQ1DiagramSource(q1Choice)
          },
          {
            id: 'Q2',
            title: 'Execution Isolation & Sandboxing',
            body: 'How should interactive HTML artifacts with arbitrary JavaScript and custom styles be safely isolated?',
            recommended: 'Sandboxed iframes served from dedicated /api/raw/ endpoint with strict CSP.',
            choice: q2Choice,
            free_text: q2Free,
            mermaid: getQ2DiagramSource(q2Choice)
          }
        ]
      };

      const markdownOutput = [
        '# Architectural Decision Stress-Test Grill Export',
        '',
        `- frontier_locked: ${exportData.frontier_locked}`,
        `- round: 1`,
        '',
        '## Q1 — State Persistence Strategy',
        exportData.questions[0].body,
        '',
        `Recommended: ${exportData.questions[0].recommended}`,
        `Choice: ${exportData.questions[0].choice}`,
        '',
        exportData.questions[0].free_text,
        '',
        '```mermaid',
        exportData.questions[0].mermaid.trim(),
        '```',
        '',
        '## Q2 — Execution Isolation & Sandboxing',
        exportData.questions[1].body,
        '',
        `Recommended: ${exportData.questions[1].recommended}`,
        `Choice: ${exportData.questions[1].choice}`,
        '',
        exportData.questions[1].free_text,
        '',
        '```mermaid',
        exportData.questions[1].mermaid.trim(),
        '```'
      ].join('\n');

      const payload = [
        '```markdown',
        markdownOutput,
        '```',
        '',
        '```json',
        JSON.stringify(exportData, null, 2),
        '```'
      ].join('\n');

      try {
        await navigator.clipboard.writeText(payload);
        if (exportStatus) {
          exportStatus.textContent = '✓ Copied fenced Markdown + JSON';
          setTimeout(() => { exportStatus.textContent = ''; }, 3500);
        }
      } catch (err) {
        console.error('Failed to copy grill export', err);
      }
    });
  }
}

// 8. Demo 3: Markdown Spec Viewer
function initMarkdownSpecDemo() {
  const viewBtns = document.querySelectorAll('[data-md-view]');
  const renderedView = document.getElementById('md-rendered-view');
  const sourceView = document.getElementById('md-source-view');
  const specMermaid = document.getElementById('markdown-spec-mermaid');

  if (!viewBtns.length || !renderedView || !sourceView) return;

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-md-view');
      if (mode === 'rendered') {
        renderedView.style.display = 'flex';
        sourceView.style.display = 'none';
        if (specMermaid && mermaidModule) {
          const source = specMermaid.dataset.mermaidSource || specMermaid.textContent.trim();
          renderDiagram(specMermaid, source);
        }
      } else {
        renderedView.style.display = 'none';
        sourceView.style.display = 'block';
      }
    });
  });
}

// 9. ADR-0002 Mermaid Runtime Engine
async function initMermaidRenderer() {
  try {
    const module = await import(MERMAID_CDN);
    mermaidModule = module.default || module;
    mermaidModule.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'dark',
      flowchart: { htmlLabels: false }
    });

    // Initial render of all diagrams visible in active panels
    const activePanel = document.querySelector('.showcase-panel.active') || document;
    await renderAllMermaidInContainer(activePanel);
  } catch (err) {
    console.error('Failed to load Mermaid CDN runtime', err);
  }
}

async function renderDiagram(element, source) {
  if (!mermaidModule || !element) return;
  element.dataset.mermaidSource = source;
  const diagramId = `mermaid-landing-seq-${++mermaidSequence}`;

  try {
    await mermaidModule.parse(source);
    const { svg } = await mermaidModule.render(diagramId, source);
    element.innerHTML = svg;
    element.dataset.mermaidState = 'rendered';
  } catch (err) {
    element.textContent = source;
    element.dataset.mermaidState = 'error';
    console.error('Mermaid rendering failed', err);
  }
}

async function renderAllMermaidInContainer(container) {
  if (!mermaidModule || !container) return;
  const diagrams = container.querySelectorAll('.mermaid[data-mermaid-source], pre.mermaid');
  for (const el of diagrams) {
    const source = el.dataset.mermaidSource || el.textContent.trim();
    if (source) {
      await renderDiagram(el, source);
    }
  }
}
