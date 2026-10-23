<script>
  export let showConfirmModal;
  export let isExecutingConfirm;
  export let isConfirmDanger;
  export let confirmBtnIcon;
  export let confirmTitle;
  export let confirmMessage;
  export let confirmBtnText;
  export let executeConfirmedAction;
</script>

<div class="modal-overlay" on:click|self={() => { if (!isExecutingConfirm) showConfirmModal = false; }}>
  <div class="modal-card confirm-modal-card">
    <div class="confirm-icon-wrapper {isConfirmDanger ? 'danger' : 'warning'}">
      <i class="fa-solid {confirmBtnIcon || 'fa-triangle-exclamation'}"></i>
    </div>
    <h3 class="confirm-title">{confirmTitle || 'Are you sure?'}</h3>
    <p class="confirm-message">{confirmMessage}</p>
    <div class="modal-footer" style="justify-content:center; gap:0.85rem; border-top:none; margin-top:1.25rem;">
      <button type="button" class="btn btn-outline" disabled={isExecutingConfirm} on:click={() => showConfirmModal = false}>Cancel</button>
      <button type="button" class="btn {isConfirmDanger ? 'btn-danger-action' : 'btn-purple'}" disabled={isExecutingConfirm} on:click={executeConfirmedAction}>
        {#if isExecutingConfirm}
          <i class="fa-solid fa-spinner fa-spin"></i> Processing...
        {:else}
          <i class="fa-solid {confirmBtnIcon}"></i> {confirmBtnText}
        {/if}
      </button>
    </div>
  </div>
</div>
