<script lang="ts">
  import type { PageData } from './$types';
  import { 
    ChevronLeft, 
    Search, 
    Tag as TagIcon, 
    FileCode2, 
    FileText, 
    ExternalLink, 
    ArrowRight, 
    LayoutGrid, 
    List, 
    FolderGit2, 
    AlertCircle, 
    Sparkles, 
    Calendar,
    Copy,
    Check,
    Archive,
    ArchiveRestore,
    Trash2,
    RotateCw
  } from 'lucide-svelte';
  import TagBadge from '$lib/components/TagBadge.svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedTags = $state<string[]>([]);
  let selectedType = $state<'all' | 'html' | 'markdown'>('all');
  let selectedStatus = $state<'active' | 'archived' | 'all'>('active');
  let viewMode = $state<'grid' | 'list'>('grid');
  let copiedPath = $state(false);

  // Local state for interactive artifact changes
  let artifactsList = $state([...data.project.artifacts]);
  let deleteModalOpen = $state(false);
  let artifactToDelete = $state<any | null>(null);
  let isActionPending = $state(false);
  let toastMessage = $state<string | null>(null);
  let toastTimeout: any;

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage = null;
    }, 3000);
  }

  let activeCount = $derived(artifactsList.filter(a => !a.archived).length);
  let archivedCount = $derived(artifactsList.filter(a => !!a.archived).length);
  let totalCount = $derived(artifactsList.length);

  // Filter artifacts
  let filteredArtifacts = $derived(
    artifactsList.filter(art => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.description.toLowerCase().includes(q) ||
        art.file.toLowerCase().includes(q) ||
        art.tags.some(t => t.toLowerCase().includes(q));

      const matchesType = 
        selectedType === 'all' || 
        art.type === selectedType;

      const matchesStatus = 
        selectedStatus === 'all' ||
        (selectedStatus === 'archived' ? !!art.archived : !art.archived);

      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.every(st => art.tags.map(t => t.toLowerCase()).includes(st.toLowerCase()));

      return matchesSearch && matchesType && matchesStatus && matchesTags;
    })
  );

  function toggleTag(tag: string) {
    const lower = tag.toLowerCase();
    if (selectedTags.includes(lower)) {
      selectedTags = selectedTags.filter(t => t !== lower);
    } else {
      selectedTags = [...selectedTags, lower];
    }
  }

  function clearFilters() {
    searchQuery = '';
    selectedTags = [];
    selectedType = 'all';
    selectedStatus = 'active';
  }

  function copyProjectPath() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(data.project.path);
      copiedPath = true;
      setTimeout(() => (copiedPath = false), 1500);
    }
  }

  function formatDate(isoStr?: string) {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  }

  async function toggleArchive(art: any) {
    const targetState = !art.archived;
    isActionPending = true;
    try {
      const res = await fetch(`/api/projects/${data.project.slug}/artifacts/${art.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: targetState })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update artifact status');
      }

      const idx = artifactsList.findIndex(a => a.id === art.id);
      if (idx >= 0) {
        artifactsList[idx] = {
          ...artifactsList[idx],
          archived: targetState,
          archivedAt: targetState ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      showToast(targetState ? `Archived "${art.title}"` : `Restored "${art.title}"`);
    } catch (err: any) {
      alert(`Error updating artifact: ${err.message}`);
    } finally {
      isActionPending = false;
    }
  }

  function promptDelete(art: any) {
    artifactToDelete = art;
    deleteModalOpen = true;
  }

  async function executeDelete() {
    if (!artifactToDelete) return;
    isActionPending = true;
    try {
      const res = await fetch(`/api/projects/${data.project.slug}/artifacts/${artifactToDelete.id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete artifact');
      }

      const deletedTitle = artifactToDelete.title;
      artifactsList = artifactsList.filter(a => a.id !== artifactToDelete.id);
      deleteModalOpen = false;
      artifactToDelete = null;
      showToast(`Permanently deleted "${deletedTitle}"`);
    } catch (err: any) {
      alert(`Error deleting artifact: ${err.message}`);
    } finally {
      isActionPending = false;
    }
  }
</script>

<div class="project-page">
  <!-- Breadcrumb navigation -->
  <nav class="breadcrumb">
    <a href="/" class="crumb-link">
      <ChevronLeft size={16} />
      <span>Projects</span>
    </a>
    <span class="crumb-separator">/</span>
    <span class="crumb-current">{data.project.name}</span>
  </nav>

  <!-- Project Header Card -->
  <header class="project-header glass-panel">
    <div class="header-main">
      <div class="header-icon-box">
        <FolderGit2 size={24} class="text-indigo-400" />
      </div>
      <div class="header-info">
        <div class="header-title-row">
          <h1>{data.project.name}</h1>
          <span class="artifact-count-pill">
            {activeCount} {activeCount === 1 ? 'Active Artifact' : 'Active Artifacts'}
            {#if archivedCount > 0}
              <span class="archived-subcount">({archivedCount} archived)</span>
            {/if}
          </span>
        </div>
        {#if data.project.description}
          <p class="header-desc">{data.project.description}</p>
        {/if}
        <div class="header-path-box">
          <code class="path-code">{data.project.path}</code>
          <button class="btn-icon copy-btn" onclick={copyProjectPath} title="Copy project path">
            {#if copiedPath}
              <Check size={14} class="text-emerald-400" />
            {:else}
              <Copy size={14} />
            {/if}
          </button>
        </div>
      </div>
    </div>

    {#if !data.project.exists}
      <div class="alert-box alert-error">
        <AlertCircle size={16} />
        <span>Warning: This project directory could not be resolved on disk ({data.project.path}).</span>
      </div>
    {/if}
  </header>

  <!-- Filter & Search Toolbar -->
  <section class="toolbar-section glass-panel">
    <div class="toolbar-top">
      <div class="search-wrap">
        <Search size={18} class="search-icon" />
        <input 
          type="text" 
          class="input-glass search-input" 
          placeholder="Search artifacts by title, description, file, or tag..." 
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="clear-btn" onclick={() => (searchQuery = '')}>×</button>
        {/if}
      </div>

      <!-- Lifecycle / Status Filter -->
      <div class="segmented-control status-filter-group">
        <button 
          class="filter-btn" 
          class:active={selectedStatus === 'active'} 
          onclick={() => (selectedStatus = 'active')}
        >
          <span>Active</span>
          <span class="count-bubble">{activeCount}</span>
        </button>
        <button 
          class="filter-btn" 
          class:active={selectedStatus === 'archived'} 
          onclick={() => (selectedStatus = 'archived')}
        >
          <Archive size={13} />
          <span>Archived</span>
          {#if archivedCount > 0}
            <span class="count-bubble count-bubble-amber">{archivedCount}</span>
          {/if}
        </button>
        <button 
          class="filter-btn" 
          class:active={selectedStatus === 'all'} 
          onclick={() => (selectedStatus = 'all')}
        >
          <span>All</span>
          <span class="count-bubble">{totalCount}</span>
        </button>
      </div>

      <div class="segmented-control type-filter-group">
        <button 
          class="filter-btn" 
          class:active={selectedType === 'all'} 
          onclick={() => (selectedType = 'all')}
        >
          All
        </button>
        <button 
          class="filter-btn" 
          class:active={selectedType === 'html'} 
          onclick={() => (selectedType = 'html')}
        >
          <span class="dot dot-html"></span>
          HTML
        </button>
        <button 
          class="filter-btn" 
          class:active={selectedType === 'markdown'} 
          onclick={() => (selectedType = 'markdown')}
        >
          <span class="dot dot-md"></span>
          MD
        </button>
      </div>

      <div class="view-switch-group">
        <button 
          class="btn-icon" 
          class:active={viewMode === 'grid'} 
          onclick={() => (viewMode = 'grid')}
          title="Grid view"
        >
          <LayoutGrid size={16} />
        </button>
        <button 
          class="btn-icon" 
          class:active={viewMode === 'list'} 
          onclick={() => (viewMode = 'list')}
          title="List view"
        >
          <List size={16} />
        </button>
      </div>
    </div>

    <!-- Tag Filter Bar -->
    {#if Object.keys(data.tagCounts).length > 0}
      <div class="tags-filter-bar">
        <div class="tags-filter-label">
          <TagIcon size={14} />
          <span>Filter by Tags:</span>
        </div>
        <div class="tags-pills-wrap">
          {#each Object.entries(data.tagCounts) as [tag, count]}
            <TagBadge 
              {tag} 
              {count}
              active={selectedTags.includes(tag)} 
              onclick={toggleTag} 
            />
          {/each}
        </div>
        {#if selectedTags.length > 0 || selectedType !== 'all' || selectedStatus !== 'active' || searchQuery}
          <button class="clear-all-link" onclick={clearFilters}>
            Clear all filters
          </button>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Artifacts List / Grid -->
  <section class="artifacts-display-section">
    <div class="display-header">
      <div class="display-title-group">
        <h2>
          {#if selectedStatus === 'active'}
            Active Artifacts ({filteredArtifacts.length})
          {:else if selectedStatus === 'archived'}
            Archived Artifacts ({filteredArtifacts.length})
          {:else}
            All Artifacts ({filteredArtifacts.length})
          {/if}
        </h2>
      </div>
      {#if selectedTags.length > 0}
        <div class="active-tags-summary">
          <span>Active tag filters:</span>
          {#each selectedTags as tag}
            <span class="active-tag-chip">
              #{tag}
              <button onclick={() => toggleTag(tag)} class="tag-remove-x">×</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    {#if filteredArtifacts.length === 0}
      <div class="empty-state glass-panel">
        <div class="empty-icon">
          {#if selectedStatus === 'archived'}
            <Archive size={36} class="text-amber-400" />
          {:else}
            <FileCode2 size={36} class="text-indigo-400" />
          {/if}
        </div>
        <h3>
          {#if selectedStatus === 'archived'}
            No archived artifacts
          {:else}
            No artifacts found
          {/if}
        </h3>
        <p class="empty-text">
          {#if searchQuery || selectedTags.length > 0 || selectedType !== 'all'}
            No artifacts in <strong>{data.project.name}</strong> match your filter criteria.
          {:else if selectedStatus === 'archived'}
            There are no archived artifacts in this project.
          {:else}
            No active artifacts found in <code>.artifacts-manager/manifest.json</code> for this project.
          {/if}
        </p>
        {#if searchQuery || selectedTags.length > 0 || selectedType !== 'all' || selectedStatus !== 'active'}
          <button class="btn-secondary" onclick={clearFilters}>
            Reset Filters
          </button>
        {:else}
          <div class="skill-hint-box">
            <Sparkles size={16} class="text-cyan-400" />
            <span>Generate an artifact using the <code>with-artifact</code> skill in this repository.</span>
          </div>
        {/if}
      </div>
    {:else if viewMode === 'grid'}
      <div class="artifacts-grid">
        {#each filteredArtifacts as artifact (artifact.id)}
          <div class="artifact-card glass-panel" class:card-archived={artifact.archived}>
            <div class="art-card-top">
              <div class="badges-row">
                <span class="type-badge" class:tag-badge-html={artifact.type === 'html'} class:tag-badge-md={artifact.type === 'markdown'}>
                  {#if artifact.type === 'html'}
                    <FileCode2 size={13} />
                    <span>Interactive HTML</span>
                  {:else}
                    <FileText size={13} />
                    <span>Markdown</span>
                  {/if}
                </span>

                {#if artifact.archived}
                  <span class="type-badge tag-badge-archived" title="This artifact is archived">
                    <Archive size={12} />
                    <span>Archived</span>
                  </span>
                {/if}
              </div>

              <span class="art-date">
                <Calendar size={12} />
                {formatDate(artifact.createdAt || artifact.updatedAt)}
              </span>
            </div>

            <div class="art-card-content">
              <a href="/project/{data.project.slug}/artifact/{artifact.id}" class="art-title-link">
                <h3>{artifact.title}</h3>
              </a>
              <p class="art-desc">{artifact.description || 'No description provided.'}</p>
            </div>

            {#if artifact.tags && artifact.tags.length > 0}
              <div class="art-tags">
                {#each artifact.tags as tag}
                  <button 
                    class="mini-tag-btn" 
                    class:active={selectedTags.includes(tag.toLowerCase())}
                    onclick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </button>
                {/each}
              </div>
            {/if}

            <div class="art-card-actions">
              <div class="art-action-group-left">
                <a 
                  href="/api/raw/{data.project.slug}/{artifact.file}" 
                  target="_blank" 
                  rel="noreferrer"
                  class="btn-icon" 
                  title="Open raw file in new tab"
                >
                  <ExternalLink size={15} />
                </a>

                <button 
                  class="btn-icon" 
                  class:btn-active-archived={artifact.archived}
                  onclick={() => toggleArchive(artifact)} 
                  title={artifact.archived ? 'Restore artifact to active' : 'Archive artifact'}
                >
                  {#if artifact.archived}
                    <ArchiveRestore size={15} class="text-amber-400" />
                  {:else}
                    <Archive size={15} />
                  {/if}
                </button>

                <button 
                  class="btn-icon btn-icon-danger" 
                  onclick={() => promptDelete(artifact)} 
                  title="Delete artifact permanently"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <a 
                href="/project/{data.project.slug}/artifact/{artifact.id}" 
                class="btn-primary view-btn"
              >
                <span>View Artifact</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="artifacts-list glass-panel">
        {#each filteredArtifacts as artifact (artifact.id)}
          <div class="list-item" class:item-archived={artifact.archived}>
            <div class="list-item-left">
              <span class="type-badge" class:tag-badge-html={artifact.type === 'html'} class:tag-badge-md={artifact.type === 'markdown'}>
                {#if artifact.type === 'html'}
                  <FileCode2 size={13} />
                  <span>HTML</span>
                {:else}
                  <FileText size={13} />
                  <span>MD</span>
                {/if}
              </span>

              {#if artifact.archived}
                <span class="type-badge tag-badge-archived" title="Archived">
                  <Archive size={11} />
                  <span>Archived</span>
                </span>
              {/if}

              <div class="list-title-box">
                <a href="/project/{data.project.slug}/artifact/{artifact.id}" class="list-title-link">
                  <h4>{artifact.title}</h4>
                </a>
                <span class="list-file-path">{artifact.file}</span>
              </div>
            </div>

            <div class="list-item-tags">
              {#each artifact.tags.slice(0, 3) as tag}
                <button 
                  class="mini-tag-btn" 
                  class:active={selectedTags.includes(tag.toLowerCase())}
                  onclick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              {/each}
            </div>

            <div class="list-item-right">
              <span class="art-date">{formatDate(artifact.createdAt || artifact.updatedAt)}</span>
              
              <a 
                href="/api/raw/{data.project.slug}/{artifact.file}" 
                target="_blank" 
                rel="noreferrer"
                class="btn-icon" 
                title="Open raw in new tab"
              >
                <ExternalLink size={15} />
              </a>

              <button 
                class="btn-icon" 
                class:btn-active-archived={artifact.archived}
                onclick={() => toggleArchive(artifact)} 
                title={artifact.archived ? 'Restore artifact to active' : 'Archive artifact'}
              >
                {#if artifact.archived}
                  <ArchiveRestore size={15} class="text-amber-400" />
                {:else}
                  <Archive size={15} />
                {/if}
              </button>

              <button 
                class="btn-icon btn-icon-danger" 
                onclick={() => promptDelete(artifact)} 
                title="Delete artifact permanently"
              >
                <Trash2 size={15} />
              </button>

              <a 
                href="/project/{data.project.slug}/artifact/{artifact.id}" 
                class="btn-secondary"
              >
                <span>Inspect</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && artifactToDelete}
  <div class="modal-backdrop" onclick={() => { if (!isActionPending) deleteModalOpen = false; }} role="presentation">
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
          Are you sure you want to permanently delete <strong>{artifactToDelete.title}</strong>?
        </p>
        <div class="delete-file-info">
          <span class="file-label">Catalog & file path:</span>
          <code class="file-code">.artifacts-manager/{artifactToDelete.file}</code>
        </div>
        <p class="modal-subtext">
          This will remove the entry from <code>manifest.json</code> and delete the file from the local repository directory.
        </p>
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn-secondary" 
          disabled={isActionPending} 
          onclick={() => (deleteModalOpen = false)}
        >
          Cancel
        </button>
        <button 
          type="button" 
          class="btn-danger" 
          disabled={isActionPending} 
          onclick={executeDelete}
        >
          {#if isActionPending}
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
  .project-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .crumb-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
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

  .crumb-separator {
    color: var(--text-muted);
  }

  .project-header {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .header-main {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-icon-box {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    background: var(--accent-indigo-subtle);
    border: 1px solid rgba(99, 102, 241, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-title-row h1 {
    font-size: 1.65rem;
  }

  .artifact-count-pill {
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    border: 1px solid rgba(99, 102, 241, 0.3);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .archived-subcount {
    color: #fbbf24;
    font-weight: 500;
  }

  .header-desc {
    font-size: 0.925rem;
    color: var(--text-secondary);
  }

  .header-path-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .path-code {
    font-family: var(--font-mono);
    font-size: 0.775rem;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.25);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  .copy-btn {
    padding: 0.35rem;
  }

  /* Toolbar */
  .toolbar-section {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .toolbar-top {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 240px;
  }

  :global(.search-icon) {
    position: absolute;
    left: 1rem;
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding-left: 2.75rem;
    padding-right: 2.5rem;
  }

  .clear-btn {
    position: absolute;
    right: 0.85rem;
    font-size: 1.2rem;
    color: var(--text-muted);
  }

  .segmented-control {
    display: flex;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 0.25rem;
    gap: 0.25rem;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.85rem;
    border-radius: var(--radius-sm);
    font-size: 0.825rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }

  .filter-btn:hover {
    color: var(--text-primary);
  }

  .filter-btn.active {
    background: var(--accent-indigo);
    color: #ffffff;
    box-shadow: var(--shadow-sm);
  }

  .count-bubble {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    font-weight: 600;
  }

  .filter-btn.active .count-bubble {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }

  .count-bubble-amber {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .dot-html { background: #38bdf8; }
  .dot-md { background: #34d399; }

  .view-switch-group {
    display: flex;
    gap: 0.35rem;
  }

  .tags-filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-subtle);
  }

  .tags-filter-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .tags-pills-wrap {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .clear-all-link {
    font-size: 0.75rem;
    color: var(--accent-rose);
    text-decoration: underline;
    margin-left: auto;
  }

  /* Display section */
  .artifacts-display-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .display-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .display-header h2 {
    font-size: 1.35rem;
  }

  .active-tags-summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .active-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-full);
    background: var(--accent-indigo-subtle);
    border: 1px solid var(--accent-indigo);
    color: #818cf8;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .tag-remove-x {
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .tag-remove-x:hover {
    color: #ffffff;
  }

  /* Artifacts Grid */
  .artifacts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.25rem;
  }

  .artifact-card {
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
  }

  .artifact-card:hover {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: var(--shadow-lg), 0 0 20px -3px rgba(99, 102, 241, 0.2);
    transform: translateY(-2px);
  }

  .card-archived {
    opacity: 0.78;
    border-color: rgba(245, 158, 11, 0.25);
  }

  .card-archived:hover {
    opacity: 1;
    border-color: rgba(245, 158, 11, 0.45);
    box-shadow: var(--shadow-lg), 0 0 20px -3px rgba(245, 158, 11, 0.15);
  }

  .art-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .badges-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full);
    font-size: 0.725rem;
    font-weight: 600;
  }

  .tag-badge-archived {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .art-date {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .art-card-content {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .art-title-link h3 {
    font-size: 1.15rem;
    color: var(--text-primary);
    transition: color 0.15s ease;
  }

  .art-title-link:hover h3 {
    color: #818cf8;
  }

  .art-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .art-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .mini-tag-btn {
    font-size: 0.725rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    transition: all 0.15s ease;
  }

  .mini-tag-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .mini-tag-btn.active {
    background: var(--accent-indigo-subtle);
    border-color: var(--accent-indigo);
    color: #818cf8;
  }

  .art-card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-subtle);
    margin-top: auto;
  }

  .art-action-group-left {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn-icon-danger:hover {
    color: var(--accent-rose);
    border-color: rgba(244, 63, 94, 0.4);
    background: rgba(244, 63, 94, 0.1);
  }

  .view-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  /* List View */
  .artifacts-list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-subtle);
    gap: 1rem;
    transition: background 0.15s ease;
  }

  .list-item:last-child {
    border-bottom: none;
  }

  .list-item:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .item-archived {
    opacity: 0.8;
    background: rgba(245, 158, 11, 0.02);
  }

  .list-item-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;
  }

  .list-title-box {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .list-title-link h4 {
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .list-title-link:hover h4 {
    color: #818cf8;
  }

  .list-file-path {
    font-family: var(--font-mono);
    font-size: 0.725rem;
    color: var(--text-muted);
  }

  .list-item-tags {
    display: flex;
    gap: 0.35rem;
  }

  .list-item-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Empty state */
  .empty-state {
    padding: 3.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-lg);
    background: var(--accent-indigo-subtle);
    border: 1px solid rgba(99, 102, 241, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    max-width: 450px;
  }

  .skill-hint-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: var(--radius-md);
    background: var(--accent-cyan-subtle);
    border: 1px solid rgba(6, 182, 212, 0.3);
    font-size: 0.85rem;
    color: #e0f2fe;
    margin-top: 0.5rem;
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
