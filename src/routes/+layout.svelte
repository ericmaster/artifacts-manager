<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  
  let { children } = $props();
</script>

<div class="app-shell">
  <Header />
  
  <main class="main-content">
    {@render children()}
  </main>

  <footer class="app-footer">
    <div class="footer-container">
      <p class="footer-copy">
        <span>Artifacts Manager</span> • <span>Nimblersoft Company OS</span> • <span>Port 41820</span>
      </p>
      <p class="footer-note">
        Interactive topology & architecture visualization hub for AI agents.
      </p>
    </div>
  </footer>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    max-width: 1380px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .app-footer {
    border-top: 1px solid var(--border-subtle);
    padding: 1.5rem 0;
    margin-top: auto;
    background: rgba(9, 13, 22, 0.6);
  }

  .footer-container {
    max-width: 1380px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    text-align: center;
  }

  .footer-copy {
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    gap: 0.5rem;
  }

  .footer-note {
    font-size: 0.725rem;
    color: var(--text-muted);
  }
</style>
