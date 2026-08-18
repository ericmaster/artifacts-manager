<script lang="ts">
  let { tag, active = false, count = 0, onclick }: {
    tag: string;
    active?: boolean;
    count?: number;
    onclick?: (tag: string) => void;
  } = $props();

  function handleClick() {
    if (onclick) onclick(tag);
  }
</script>

<button 
  type="button"
  class="tag-pill" 
  class:active 
  onclick={handleClick}
  title="Filter by tag: {tag}"
>
  <span class="tag-hash">#</span>
  <span class="tag-name">{tag}</span>
  {#if count > 0}
    <span class="tag-count">{count}</span>
  {/if}
</button>

<style>
  .tag-hash {
    color: var(--text-muted);
    font-weight: 400;
  }
  .tag-count {
    background: rgba(255, 255, 255, 0.1);
    font-size: 0.7em;
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-full);
    color: var(--text-secondary);
  }
  .active .tag-count {
    background: var(--accent-indigo);
    color: #ffffff;
  }
</style>
