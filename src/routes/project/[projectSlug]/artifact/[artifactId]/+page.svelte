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
    FolderGit2,
    Archive,
    ArchiveRestore,
    Trash2
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let viewport = $state<'desktop' | 'tablet' | 'mobile'>('desktop');
  let showSource = $state(false);
  let showMetadata = $state(false);
  let copiedLink = $state(false);
  let iframeKey = $state(0);
  let markdownRoot = $state<HTMLElement | undefined>();

  // Interactive archive / delete states
  let isArchived = $state(Boolean(data.artifact.archived));
  let archivedAt = $state(data.artifact.archivedAt);
  let deleteModalOpen = $state(false);
  let isPending = $state(false);
  let toastMessage = $state<string | null>(null);
  let toastTimeout: any;

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage = null;
    }, 3000);
  }

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

  async function toggleArchive() {
    isPending = true;
    const target = !isArchived;
    try {
      const res = await fetch(`/api/projects/${data.artifact.projectSlug}/artifacts/${data.artifact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: target })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update artifact status');
      }
      isArchived = target;
      archivedAt = target ? new Date().toISOString() : undefined;
      data.artifact.archived = target;
      data.artifact.archivedAt = archivedAt;
      showToast(target ? 'Artifact archived' : 'Artifact restored to active');
    } catch (err: any) {
      alert(`Error updating artifact: ${err.message}`);
    } finally {
      isPending = false;
    }
  }

  async function executeDelete() {
    isPending = true;
    try {
      const res = await fetch(`/api/projects/${data.artifact.projectSlug}/artifacts/${data.artifact.id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete artifact');
      }
      if (typeof window !== 'undefined') {
        window.location.href = `/project/${data.artifact.projectSlug}`;
      }
    } catch (err: any) {
      alert(`Error deleting artifact: ${err.message}`);
      isPending = false;
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

        {#if isArchived}
          <span class="type-badge tag-badge-archived">
            <Archive size={12} />
            <span>Archived</span>
          </span>
        {/if}
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

        <!-- Archive / Restore action -->
        <button 
          class="btn-icon" 
          class:btn-active-archived={isArchived}
          onclick={toggleArchive} 
          disabled={isPending}
          title={isArchived ? "Restore artifact to active" : "Archive artifact"}
        >
          {#if isArchived}
            <ArchiveRestore size={16} class="text-amber-400" />
          {:else}
            <Archive size={16} />
          {/if}
        </button>

        <!-- Delete action -->
        <button 
          class="btn-icon btn-icon-danger" 
          onclick={() => (deleteModalOpen = true)} 
          disabled={isPending}
          title="Delete artifact permanently"
        >
          <Trash2 size={16} />
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

  <!-- Archived Notice Banner if applicable -->
  {#if isArchived}
    <div class="archived-banner glass-panel">
      <div class="banner-left">
        <Archive size={18} class="text-amber-400" />
        <span>
          This artifact is <strong>archived</strong> and hidden from the default project explorer view.
          {#if archivedAt}
            <span class="banner-timestamp">Archived on {formatDate(archivedAt)}</span>
          {/if}
        </span>
      </div>
      <div class="banner-right">
        <button class="btn-sm btn-secondary" onclick={toggleArchive} disabled={isPending}>
          <ArchiveRestore size={14} />
          <span>Restore to Active</span>
        </button>
        <button class="btn-sm btn-danger" onclick={() => (deleteModalOpen = true)} disabled={isPending}>
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  {/if}

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
          <span class="meta-label">Status</span>
          {#if isArchived}
            <span class="meta-status-chip meta-status-archived">
              <Archive size={12} />
              <span>Archived</span>
            </span>
          {:else}
            <span class="meta-status-chip meta-status-active">
              <Check size={12} />
              <span>Active</span>
            </span>
          {/if}
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

        <div class="drawer-actions-box">
          <button class="btn-secondary w-full" onclick={toggleArchive} disabled={isPending}>
            {#if isArchived}
              <ArchiveRestore size={14} class="text-amber-400" />
              <span>Restore to Active</span>
            {:else}
              <Archive size={14} />
              <span>Archive Artifact</span>
            {/if}
          </button>
          <button class="btn-danger-subtle w-full" onclick={() => (deleteModalOpen = true)} disabled={isPending}>
            <Trash2 size={14} />
            <span>Delete Artifact</span>
          </button>
        </div>
      </aside>
    {/if}
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen}
  <div class="modal-backdrop" onclick={() => { if (!isPending) deleteModalOpen = false; }} role="presentation">
    <div class="modal-card glass-panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="modal-danger-icon">
          <Trash2 size={22} />
        </div>
        <div class="modal-title-box">
          <h3>Delete Artifact</h3>
          <p class="modal-subtitle">Permanent action — cannot be undone.</p>
        </div>
      </div>

      <div class="modal-body">
        <p class="modal-warning-text">
          Are you sure you want to permanently delete <strong>{data.artifact.title}</strong>?
        </p>
        <div class="delete-file-info">
          <span class="file-label">File to be removed:</span>
          <code class="file-code">.artifacts-manager/{data.artifact.file}</code>
        </div>
        <p class="modal-subtext">
          This will remove the artifact from <code>manifest.json</code> and delete its file from disk. You will be redirected to the project page.
        </p>
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn-secondary" 
          disabled={isPending} 
          onclick={() => (deleteModalOpen = false)}
        >
          Cancel
        </button>
        <button 
          type="button" 
          class="btn-danger" 
          disabled={isPending} 
          onclick={executeDelete}
        >
          {#if isPending}
            <RotateCw size={15} class="animate-spin" />
            <span>Deleting...</span>
          {:else}
            <Trash2 size={15} />
            <span>Delete Permanently</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if toastMessage}
  <div class="toast-notification glass-panel">
    <Check size={16} class="text-emerald-400" />
    <span>{toastMessage}</span>
    <button class="toast-close" onclick={() => (toastMessage = null)}>×</button>
  </div>
{/if}

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

  .tag-badge-archived {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
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

  .btn-icon-danger:hover {
    color: var(--accent-rose);
    border-color: rgba(244, 63, 94, 0.4);
    background: rgba(244, 63, 94, 0.1);
  }

  .open-raw-btn {
    padding: 0.45rem 0.85rem;
    font-size: 0.825rem;
  }

  /* Archived Banner */
  .archived-banner {
    padding: 0.85rem 1.25rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: #fef3c7;
  }

  .banner-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .banner-timestamp {
    font-size: 0.775rem;
    color: var(--text-muted);
    margin-left: 0.5rem;
  }

  .banner-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-sm {
    padding: 0.35rem 0.75rem;
    font-size: 0.775rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: var(--radius-sm);
    font-weight: 500;
  }

  .btn-danger-subtle {
    background: rgba(244, 63, 94, 0.12);
    color: #fda4af;
    border: 1px solid rgba(244, 63, 94, 0.3);
    transition: all 0.15s ease;
  }

  .btn-danger-subtle:hover:not(:disabled) {
    background: rgba(244, 63, 94, 0.25);
    color: #ffffff;
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

  .meta-status-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
    width: fit-content;
  }

  .meta-status-active {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .meta-status-archived {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
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

  .drawer-actions-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-subtle);
    margin-top: auto;
  }

  .w-full {
    width: 100%;
    justify-content: center;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }

  .modal-card {
    max-width: 480px;
    width: 100%;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    box-shadow: var(--shadow-xl), 0 0 35px -5px rgba(244, 63, 94, 0.25);
    border-color: rgba(244, 63, 94, 0.3);
    animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .modal-danger-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: rgba(244, 63, 94, 0.15);
    border: 1px solid rgba(244, 63, 94, 0.3);
    color: var(--accent-rose);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-title-box h3 {
    font-size: 1.2rem;
    color: var(--text-primary);
  }

  .modal-subtitle {
    font-size: 0.8rem;
    color: var(--accent-rose);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .delete-file-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.35);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  .file-label {
    font-size: 0.725rem;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
  }

  .file-code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--accent-rose);
    word-break: break-all;
  }

  .modal-subtext {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-subtle);
  }

  .btn-danger {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #e11d48;
    color: #ffffff;
    padding: 0.55rem 1.1rem;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid #f43f5e;
    box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
    transition: all 0.15s ease;
  }

  .btn-danger:hover:not(:disabled) {
    background: #be123c;
    box-shadow: 0 6px 16px rgba(225, 29, 72, 0.45);
    transform: translateY(-1px);
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Toast */
  .toast-notification {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1.25rem;
    border-radius: var(--radius-md);
    background: #131b2e;
    border: 1px solid rgba(16, 185, 129, 0.4);
    box-shadow: var(--shadow-xl), 0 0 25px -5px rgba(16, 185, 129, 0.25);
    font-size: 0.875rem;
    color: var(--text-primary);
    z-index: 120;
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-close {
    font-size: 1.1rem;
    color: var(--text-muted);
    padding: 0.2rem;
    line-height: 1;
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  @keyframes slideLeft {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(15px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
