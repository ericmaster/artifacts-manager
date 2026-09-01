/**
 * Nimblersoft Artifacts Manager Landing Page Script
 * Interactive Terminal, Viewport Switchers, Copy Handlers & Live Demos
 */

document.addEventListener('DOMContentLoaded', () => {
  initClipboard();
  initViewportControls();
  initShowcaseTabs();
  initTerminalTabs();
  initInteractiveMockup();
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
      }
    });
  });
}

// 4. Terminal Command Tabs
const terminalData = {
  register: `
<span class="term-prompt">$</span> ./bin/artman register /home/ericmaster/nimbler-ops
<span class="term-dim">Reading ~/.artifacts-manager.json ...</span>
<span class="term-dim">Indexing /home/ericmaster/nimbler-ops/.artifacts-manager/manifest.json ...</span>
<span class="term-success">✓ Registered project:</span> <span class="term-highlight">nimbler-ops</span> (24 active artifacts)
<span class="term-dim">Catalog updated at ~/.artifacts-manager.json</span>
<span class="term-prompt">$</span> 
`,
  list: `
<span class="term-prompt">$</span> ./bin/artman list
<span class="term-dim">Artifacts Manager Central Registry (v1.0.0)</span>
<span class="term-dim">─────────────────────────────────────────────────────────────────────────────</span>
<span class="term-highlight">nimbler-ops</span>                 /home/ericmaster/nimbler-ops                 24 artifacts
<span class="term-highlight">cambiacromo</span>                 /home/ericmaster/products/cambiacromo        8 artifacts
<span class="term-highlight">vespera</span>                     /home/ericmaster/products/vespera            12 artifacts
<span class="term-highlight">artifacts-manager</span>           /home/ericmaster/tools/artifacts-manager     4 artifacts
<span class="term-dim">─────────────────────────────────────────────────────────────────────────────</span>
<span class="term-success">Total: 4 projects | 48 total artifacts | Port 41820</span>
<span class="term-prompt">$</span> 
`,
  archive: `
<span class="term-prompt">$</span> ./bin/artman archive orchestrator-topology --project /home/ericmaster/nimbler-ops
<span class="term-dim">Loading manifest for nimbler-ops ...</span>
<span class="term-dim">Updating artifact status 'orchestrator-topology' -> archived: true ...</span>
<span class="term-success">✓ Archived artifact:</span> <span class="term-highlight">Orchestrator Topology & Flow</span> (orchestrator-topology) in nimbler-ops
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
    case 'register': return './bin/artman register /home/ericmaster/nimbler-ops';
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
