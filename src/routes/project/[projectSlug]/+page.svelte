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
    Check
  } from 'lucide-svelte';
  import TagBadge from '$lib/components/TagBadge.svelte';

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let selectedTags = $state<string[]>([]);
  let selectedType = $state<'all' | 'html' | 'markdown'>('all');
  let viewMode = $state<'grid' | 'list'>('grid');
  let copiedPath = $state(false);

  // Filter artifacts
  let filteredArtifacts = $derived(
    data.project.artifacts.filter(art => {
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

      const matchesTags = 
        selectedTags.length === 0 || 
        selectedTags.every(st => art.tags.map(t => t.toLowerCase()).includes(st.toLowerCase()));

      return matchesSearch && matchesType && matchesTags;
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
            {data.project.artifactCount} {data.project.artifactCount === 1 ? 'Artifact' : 'Artifacts'}
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

      <div class="type-filter-group">
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
          Markdown
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
        {#if selectedTags.length > 0 || selectedType !== 'all' || searchQuery}
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
      <h2>Artifacts ({filteredArtifacts.length})</h2>
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
          <FileCode2 size={36} class="text-indigo-400" />
        </div>
        <h3>No artifacts found</h3>
        <p class="empty-text">
          {#if searchQuery || selectedTags.length > 0 || selectedType !== 'all'}
            No artifacts in <strong>{data.project.name}</strong> match your filter criteria.
          {:else}
            No artifacts found in <code>.artifacts-manager/manifest.json</code> for this project.
          {/if}
        </p>
        {#if searchQuery || selectedTags.length > 0 || selectedType !== 'all'}
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
        {#each filteredArtifacts as artifact}
          <div class="artifact-card glass-panel">
            <div class="art-card-top">
              <span class="type-badge" class:tag-badge-html={artifact.type === 'html'} class:tag-badge-md={artifact.type === 'markdown'}>
                {#if artifact.type === 'html'}
                  <FileCode2 size={13} />
                  <span>Interactive HTML</span>
                {:else}
                  <FileText size={13} />
                  <span>Markdown</span>
                {/if}
              </span>

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
              <a 
                href="/api/raw/{data.project.slug}/{artifact.file}" 
                target="_blank" 
                rel="noreferrer"
                class="btn-icon" 
                title="Open raw file in new tab"
              >
                <ExternalLink size={15} />
              </a>

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
        {#each filteredArtifacts as artifact}
          <div class="list-item">
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
    min-width: 260px;
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

  .type-filter-group {
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

  .art-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .list-item-left {
    display: flex;
    align-items: center;
    gap: 1rem;
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
    gap: 0.75rem;
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
</style>
