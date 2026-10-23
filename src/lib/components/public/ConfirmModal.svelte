<script>
  export let confirmTitle;
  export let confirmMessage;
  export let isExecutingConfirm;
  export let showConfirmModal;
  export let executeConfirmedAction;
</script>

<div class="modal-overlay">
  <div class="modal-card confirm-modal-card">
    <div class="confirm-icon-wrapper danger">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
    <h3 class="confirm-title">{confirmTitle || 'Are you sure?'}</h3>
    <p class="confirm-message">{confirmMessage}</p>
    <div class="modal-footer" style="justify-content:center; gap:0.85rem; border-top:none; margin-top:1.25rem;">
      <button class="btn btn-outline" on:click={() => !isExecutingConfirm && (showConfirmModal = false)} disabled={isExecutingConfirm}>Cancel</button>
      <button class="btn btn-danger-action" on:click={executeConfirmedAction} disabled={isExecutingConfirm}>
        {#if isExecutingConfirm}
          <i class="fa-solid fa-spinner fa-spin"></i> Confirming...
        {:else}
          <i class="fa-solid fa-trash-can"></i> Confirm Action
        {/if}
      </button>
    </div>
  </div>
</div>
