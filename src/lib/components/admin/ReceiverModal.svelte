<script>
  export let editRecId;
  export let showRecModal;
  export let saveRec;
  export let recName;
  export let recPhone;
  export let recAddress;
</script>

<div class="modal-overlay">
  <div class="modal-card">
    <div class="modal-header">
      <h3><i class="fa-solid fa-user-plus"></i> {editRecId ? 'Edit Receiver' : 'Add Receiver'}</h3>
      <button class="btn-close" on:click={() => showRecModal = false}>&times;</button>
    </div>
    <form on:submit|preventDefault={saveRec}>
      <div class="form-group">
        <label>Receiver Name / Label *</label>
        <input type="text" class="form-control" bind:value={recName} required />
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="text" class="form-control" bind:value={recPhone} />
      </div>
      <div class="form-group">
        <label>Full Address *</label>
        <textarea class="form-control" rows="3" bind:value={recAddress} required></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showRecModal = false}>Cancel</button>
        <button type="submit" class="btn btn-purple">Save Receiver</button>
      </div>
    </form>
  </div>
</div>
