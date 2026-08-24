<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { 
    ChevronLeft, 
    ExternalLink, 
    Copy, 
    Check, 
    RotateCw, 
    Monitor, 
    Tablet, 
    Smartphone, 
    Code, 
    FileCode2, 
    FileText, 
    Info, 
    Tag as TagIcon,
    Calendar,
    FolderGit2
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let viewport = $state<'desktop' | 'tablet' | 'mobile'>('desktop');
  let showSource = $state(false);
  let showMetadata = $state(false);
  let copiedLink = $state(false);
  let iframeKey = $state(0);
  let markdownRoot = $state<HTMLElement | undefined>();
  const mermaidUrl = 'https://cdn.jsdelivr.net/npm/mermaid@11.17.1/dist/mermaid.esm.min.mjs';
  const mermaidError = 'Diagram unavailable. The Mermaid source is shown below.';
  type MermaidModule = {
    default: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, source: string) => Promise<{ svg: string }>;
    };
  };

  function resetMermaidFallbacks(root: HTMLElement) {
    for (const diagram of root.querySelectorAll<HTMLElement>('pre.mermaid[data-mermaid-source]')) {
      const source = diagram.dataset.mermaidSource ?? '';
      const code = document.createElement('code');
      code.textContent = source;
      diagram.replaceChildren(code);
      diagram.removeAttribute('data-mermaid-state');
      diagram.removeAttribute('aria-busy');
    }
    root.querySelectorAll('.mermaid-render-error').forEach((marker) => marker.remove());
  }

  function showMermaidError(diagram: HTMLElement) {
    diagram.dataset.mermaidState = 'error';
    diagram.setAttribute('role', 'alert');
    const marker = document.createElement('p');
    marker.className = 'mermaid-render-error';
    marker.setAttribute('role', 'alert');
    marker.textContent = mermaidError;
    diagram.insertAdjacentElement('afterend', marker);
  }

  onMount(() => {
    let renderVersion = 0;
    let loading: Promise<MermaidModule> | undefined;
    let renderedSignature = '';

    const renderDiagrams = async () => {
      const root = markdownRoot;
      if (!root || data.artifact.type !== 'markdown') return;
      const version = ++renderVersion;
      resetMermaidFallbacks(root);
      const diagrams = [...root.querySelectorAll<HTMLElement>('pre.mermaid[data-mermaid-source]')];
      renderedSignature = `${data.artifact.id}:${diagrams.map((diagram) => diagram.dataset.mermaidSource).join('\u0000')}`;
      if (!diagrams.length) return;

      try {
        loading ??= import(/* @vite-ignore */ mermaidUrl);
        const module = await loading;
        if (version !== renderVersion || !root.isConnected) return;
        module.default.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', flowchart: { htmlLabels: false } });

        for (const [index, diagram] of diagrams.entries()) {
          if (version !== renderVersion || !diagram.isConnected) return;
          diagram.setAttribute('aria-busy', 'true');
          try {
            const { svg } = await module.default.render(`mermaid-${data.artifact.id}-${index}`, diagram.dataset.mermaidSource ?? '');
            if (version !== renderVersion || !diagram.isConnected) return;
            diagram.innerHTML = svg;
            diagram.dataset.mermaidState = 'rendered';
            diagram.removeAttribute('role');
          } catch {
            if (version !== renderVersion || !diagram.isConnected) return;
            showMermaidError(diagram);
          } finally {
            diagram.removeAttribute('aria-busy');
          }
        }
      } catch {
        if (version !== renderVersion || !root.isConnected) return;
        diagrams.forEach(showMermaidError);
      }
    };

    const observer = new MutationObserver(() => {
      const root = markdownRoot;
      const signature = root
        ? `${data.artifact.id}:${[...root.querySelectorAll<HTMLElement>('pre.mermaid[data-mermaid-source]')].map((diagram) => diagram.dataset.mermaidSource).join('\u0000')}`
        : '';
      if (signature !== renderedSignature) void renderDiagrams();
    });
    if (markdownRoot) observer.observe(markdownRoot, { childList: true });
    void renderDiagrams();
    return () => {
      renderVersion += 1;
      observer.disconnect();
    };
  });

  function reloadIframe() {
    iframeKey += 1;
  }

  function copyArtifactLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      copiedLink = true;
      setTimeout(() => (copiedLink = false), 1500);
    }
  }

  function formatDate(isoStr?: string) {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  }
</script>

<div class="viewer-layout">
  <!-- Top Navigation & Breadcrumbs -->
  <header class="viewer-header glass-panel">
    <div class="header-left">
      <nav class="breadcrumb">
        <a href="/" class="crumb-link">Projects</a>
        <span class="crumb-separator">/</span>
        <a href="/project/{data.artifact.projectSlug}" class="crumb-link">
          {data.artifact.projectName}
        </a>
        <span class="crumb-separator">/</span>
        <span class="crumb-current">{data.artifact.title}</span>
      </nav>

      <div class="title-row">
        <h1>{data.artifact.title}</h1>
        <span 
          class="type-badge" 
          class:tag-badge-html={data.artifact.type === 'html'} 
          class:tag-badge-md={data.artifact.type === 'markdown'}
        >
          {#if data.artifact.type === 'html'}
            <FileCode2 size={13} />
            <span>Interactive HTML</span>
          {:else}
            <FileText size={13} />
            <span>Markdown</span>
          {/if}
        </span>
      </div>
    </div>

    <!-- Toolbar actions -->
    <div class="header-right">
      {#if data.artifact.type === 'html' && !showSource}
        <div class="viewport-switcher">
          <button 
            class="btn-icon" 
            class:active={viewport === 'desktop'} 
            onclick={() => (viewport = 'desktop')} 
            title="Desktop View (100%)"
          >
            <Monitor size={16} />
          </button>
          <button 
            class="btn-icon" 
            class:active={viewport === 'tablet'} 
            onclick={() => (viewport = 'tablet')} 
            title="Tablet View (768px)"
          >
            <Tablet size={16} />
          </button>
          <button 
            class="btn-icon" 
            class:active={viewport === 'mobile'} 
            onclick={() => (viewport = 'mobile')} 
            title="Mobile View (375px)"
          >
            <Smartphone size={16} />
          </button>
        </div>
      {/if}

      <div class="action-buttons">
        {#if data.artifact.type === 'html'}
          <button 
            class="btn-icon" 
            class:active={showSource} 
            onclick={() => (showSource = !showSource)} 
            title="Toggle Source Code"
          >
            <Code size={16} />
          </button>

          <button 
            class="btn-icon" 
            onclick={reloadIframe} 
            title="Reload Artifact Frame"
          >
            <RotateCw size={16} />
          </button>
        {/if}

        <button 
          class="btn-icon" 
          class:active={showMetadata} 
          onclick={() => (showMetadata = !showMetadata)} 
          title="Toggle Metadata Drawer"
        >
          <Info size={16} />
        </button>

        <button 
          class="btn-icon" 
          onclick={copyArtifactLink} 
          title="Copy Link to Artifact"
        >
          {#if copiedLink}
            <Check size={16} class="text-emerald-400" />
          {:else}
            <Copy size={16} />
          {/if}
        </button>

        <a 
          href={data.artifact.rawUrl} 
          target="_blank" 
          rel="noreferrer" 
          class="btn-secondary open-raw-btn"
          title="Open raw file in a new tab"
        >
          <span>Open Raw</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  </header>

  <!-- Main Viewer & Side Pane Container -->
  <div class="viewer-body-container">
    <div class="viewer-content-pane">
      {#if showSource}
        <!-- Raw Source Code View -->
        <div class="source-view glass-panel">
          <div class="source-header">
            <span>Source: <code>{data.artifact.file}</code></span>
            <button class="btn-icon" onclick={() => (showSource = false)}>✕</button>
          </div>
          <pre class="source-pre"><code>{data.artifact.rawContent || 'No source content available'}</code></pre>
        </div>
      {:else if data.artifact.type === 'html'}
        <!-- HTML Artifact Sandboxed Iframe -->
        <div class="iframe-wrapper viewport-{viewport}">
          {#key iframeKey}
            <iframe 
              src={data.artifact.rawUrl} 
              title={data.artifact.title}
              class="artifact-iframe"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
            ></iframe>
          {/key}
        </div>
      {:else}
        <!-- Markdown Rendered View -->
        <div class="markdown-container glass-panel">
          <article class="markdown-body" bind:this={markdownRoot}>
            {@html data.renderedHtml}
          </article>
        </div>
      {/if}
    </div>

    <!-- Metadata Sidebar Drawer -->
    {#if showMetadata}
      <aside class="metadata-drawer glass-panel">
        <div class="drawer-header">
          <h3>Artifact Metadata</h3>
          <button class="btn-icon" onclick={() => (showMetadata = false)}>✕</button>
        </div>

        <div class="drawer-section">
          <span class="meta-label">Artifact ID</span>
          <code class="meta-code">{data.artifact.id}</code>
        </div>

        <div class="drawer-section">
          <span class="meta-label">Project</span>
          <span class="meta-value">{data.artifact.projectName}</span>
          <code class="meta-subcode">{data.artifact.projectPath}</code>
        </div>

        <div class="drawer-section">
          <span class="meta-label">Relative File</span>
          <code class="meta-code">{data.artifact.file}</code>
        </div>

        {#if data.artifact.description}
          <div class="drawer-section">
            <span class="meta-label">Description</span>
            <p class="meta-desc">{data.artifact.description}</p>
          </div>
        {/if}

        {#if data.artifact.tags && data.artifact.tags.length > 0}
          <div class="drawer-section">
            <span class="meta-label">Tags</span>
            <div class="meta-tags-list">
              {#each data.artifact.tags as tag}
                <a href="/project/{data.artifact.projectSlug}?tag={tag}" class="tag-pill">
                  #{tag}
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <div class="drawer-section">
          <span class="meta-label">Created At</span>
          <span class="meta-value">{formatDate(data.artifact.createdAt)}</span>
        </div>

        {#if data.artifact.updatedAt}
          <div class="drawer-section">
            <span class="meta-label">Updated At</span>
            <span class="meta-value">{formatDate(data.artifact.updatedAt)}</span>
          </div>
        {/if}
      </aside>
    {/if}
  </div>
</div>

<style>
  .viewer-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: calc(100vh - 180px);
  }

  .viewer-header {
    padding: 1.15rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .crumb-link {
    color: var(--text-secondary);
    transition: color 0.15s ease;
  }

  .crumb-link:hover {
    color: var(--accent-indigo);
  }

  .crumb-current {
    color: var(--text-primary);
    font-weight: 500;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .title-row h1 {
    font-size: 1.45rem;
    color: var(--text-primary);
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.15rem 0.6rem;
    border-radius: var(--radius-full);
    font-size: 0.725rem;
    font-weight: 600;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .viewport-switcher {
    display: flex;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 0.2rem;
    gap: 0.2rem;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .open-raw-btn {
    padding: 0.45rem 0.85rem;
    font-size: 0.825rem;
  }

  /* Main Container */
  .viewer-body-container {
    display: flex;
    gap: 1rem;
    flex: 1;
    min-height: 75vh;
  }

  .viewer-content-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Iframe Wrapper & Resizing */
  .iframe-wrapper {
    flex: 1;
    width: 100%;
    min-height: 75vh;
    height: 100%;
    margin: 0 auto;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: #080c14;
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-lg);
    transition: max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .viewport-desktop {
    max-width: 100%;
  }

  .viewport-tablet {
    max-width: 768px;
    border: 2px solid rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 30px -5px rgba(99, 102, 241, 0.2);
  }

  .viewport-mobile {
    max-width: 375px;
    border: 2px solid rgba(6, 182, 212, 0.4);
    box-shadow: 0 0 30px -5px rgba(6, 182, 212, 0.2);
  }

  .artifact-iframe {
    width: 100%;
    height: 100%;
    min-height: 75vh;
    border: none;
    display: block;
    background: #080c14;
  }

  /* Markdown Container */
  .markdown-container {
    padding: 2rem;
    min-height: 75vh;
  }

  /* Source View */
  .source-view {
    padding: 1.5rem;
    min-height: 75vh;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .source-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .source-pre {
    background: #050811;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: #e2e8f0;
    flex: 1;
  }

  /* Metadata Drawer */
  .metadata-drawer {
    width: 300px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    flex-shrink: 0;
    animation: slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .drawer-header h3 {
    font-size: 1rem;
  }

  .drawer-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .meta-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .meta-value {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .meta-code {
    font-family: var(--font-mono);
    font-size: 0.775rem;
    color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.08);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(6, 182, 212, 0.2);
    word-break: break-all;
  }

  .meta-subcode {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    word-break: break-all;
  }

  .meta-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .meta-tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  @keyframes slideLeft {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
