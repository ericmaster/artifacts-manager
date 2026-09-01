<script lang="ts">
  import { FolderPlus, X, CheckCircle2, AlertCircle } from 'lucide-svelte';

  let { open = $bindable(false), onRegistered }: {
    open: boolean;
    onRegistered?: () => void;
  } = $props();

  let projectPath = $state('');
  let customName = $state('');
  let loading = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    if (!projectPath.trim()) return;

    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath.trim(),
          name: customName.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register project');
      }

      successMsg = data.message;
      projectPath = '';
      customName = '';
      if (onRegistered) onRegistered();
      setTimeout(() => {
        open = false;
        successMsg = '';
      }, 1200);
    } catch (err: any) {
      errorMsg = err.message;
    } finally {
      loading = false;
    }
  }

  function close() {
    open = false;
    errorMsg = '';
    successMsg = '';
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={close} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <div class="modal-icon">
            <FolderPlus size={20} class="text-indigo-400" />
          </div>
          <div>
            <h3>Register Project</h3>
            <p class="modal-sub">Add a local repository to track its artifacts</p>
          </div>
        </div>
        <button class="btn-icon" onclick={close} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {#if errorMsg}
        <div class="alert-box alert-error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      {/if}

      {#if successMsg}
        <div class="alert-box alert-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      {/if}

      <form onsubmit={handleRegister} class="modal-form">
        <div class="form-group">
          <label for="projectPath">Project Root Directory Path <span class="required">*</span></label>
          <input 
            id="projectPath"
            type="text" 
            class="input-glass"
            bind:value={projectPath} 
            placeholder="e.g. /path/to/my-project or ~/projects/my-project"
            required
            disabled={loading}
          />
          <span class="form-hint">Path to the project on disk containing .artifacts-manager/</span>
        </div>

        <div class="form-group">
          <label for="customName">Display Name (Optional)</label>
          <input 
            id="customName"
            type="text" 
            class="input-glass"
            bind:value={customName} 
            placeholder="e.g. My Project"
            disabled={loading}
          />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick={close} disabled={loading}>
            Cancel
          </button>
          <button type="submit" class="btn-primary" disabled={loading || !projectPath.trim()}>
            {#if loading}
              <span>Registering...</span>
            {:else}
              <span>Register Project</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 7, 13, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-card {
    background: #0f172a;
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg), 0 0 35px -5px rgba(99, 102, 241, 0.2);
    width: 100%;
    max-width: 520px;
    padding: 1.5rem;
    animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .modal-icon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: var(--accent-indigo-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .modal-header h3 {
    font-size: 1.15rem;
    color: var(--text-primary);
  }

  .modal-sub {
    font-size: 0.825rem;
    color: var(--text-muted);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .required {
    color: var(--accent-rose);
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .alert-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .alert-error {
    background: var(--accent-rose-subtle);
    color: #fda4af;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }

  .alert-success {
    background: var(--accent-emerald-subtle);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
