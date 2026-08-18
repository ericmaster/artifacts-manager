<script lang="ts">
  import { Sparkles, FolderPlus, Layers } from 'lucide-svelte';
  import RegisterModal from './RegisterModal.svelte';

  let registerModalOpen = $state(false);
</script>

<header class="glass-nav sticky-header">
  <div class="nav-container">
    <a href="/" class="brand-link">
      <div class="brand-icon">
        <Layers size={20} class="text-indigo-400" />
      </div>
      <div class="brand-text">
        <span class="brand-title">Artifacts Manager</span>
        <span class="brand-badge">Nimblersoft OS</span>
      </div>
    </a>

    <div class="nav-actions">
      <a href="/" class="nav-link">
        <Sparkles size={16} />
        <span>Projects</span>
      </a>

      <button class="btn-primary" onclick={() => (registerModalOpen = true)}>
        <FolderPlus size={16} />
        <span>Register Project</span>
      </button>
    </div>
  </div>
</header>

<RegisterModal bind:open={registerModalOpen} onRegistered={() => {
  if (typeof window !== 'undefined') window.location.reload();
}} />

<style>
  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
  }

  .nav-container {
    max-width: 1380px;
    margin: 0 auto;
    padding: 0.85rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: opacity 0.15s ease;
  }

  .brand-link:hover {
    opacity: 0.9;
  }

  .brand-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2));
    border: 1px solid rgba(99, 102, 241, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-indigo);
    box-shadow: 0 0 15px -3px rgba(99, 102, 241, 0.3);
  }

  .brand-text {
    display: flex;
    flex-direction: column;
  }

  .brand-title {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .brand-badge {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent-cyan);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    padding: 0.5rem 0.85rem;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
  }

  .nav-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }
</style>
