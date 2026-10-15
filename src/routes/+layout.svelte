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
      <details class="footer-coffee">
        <summary>☕ Buy me a coffee / Cómprame un café</summary>
        <img src="/images/deuna-qr-300.png" alt="DeUna QR code" width="150" loading="lazy" />
        <p>Si este recurso te sirvió, invítame un café con DeUna (Ecuador). Escanéalo con la app DeUna o la app de tu banco ecuatoriano.</p>
      </details>
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

  .footer-coffee {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .footer-coffee summary {
    cursor: pointer;
  }

  .footer-coffee img {
    display: block;
    margin: 0.5rem auto;
    border-radius: 6px;
    background: #fff;
  }

  .footer-note {
    font-size: 0.725rem;
    color: var(--text-muted);
  }
</style>
