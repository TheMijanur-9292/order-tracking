<script>
  export let editSlotId;
  export let showSlotModal;
  export let saveTimeSlot;
  export let slotName;
  export let slotStartTime;
  export let slotEndTime;
  export let slotIcon;
  export let slotColor;
</script>

<div class="modal-overlay">
  <div class="modal-card">
    <div class="modal-header">
      <h3><i class="fa-solid fa-clock" style="color:var(--emerald-accent)"></i> {editSlotId ? 'Edit Time Slot' : 'Add Time Slot'}</h3>
      <button class="btn-close" on:click={() => showSlotModal = false}>&times;</button>
    </div>
    <form on:submit|preventDefault={saveTimeSlot}>
      <div class="form-group">
        <label>Time Slot Name *</label>
        <input type="text" class="form-control" placeholder="e.g. Breakfast, Lunch, Snacks, Dinner" bind:value={slotName} required />
      </div>
      <div class="form-row" style="display:flex; gap:0.75rem;">
        <div class="form-group" style="flex:1;">
          <label>Start Time *</label>
          <input type="text" class="form-control" placeholder="e.g. 07:00 AM" bind:value={slotStartTime} required />
        </div>
        <div class="form-group" style="flex:1;">
          <label>End Time *</label>
          <input type="text" class="form-control" placeholder="e.g. 11:00 AM" bind:value={slotEndTime} required />
        </div>
      </div>
      <div class="form-row" style="display:flex; gap:0.75rem;">
        <div class="form-group" style="flex:1;">
          <label>FontAwesome Icon</label>
          <input type="text" class="form-control" placeholder="e.g. fa-sun, fa-utensils, fa-moon" bind:value={slotIcon} />
        </div>
        <div class="form-group" style="flex:1;">
          <label>Color Theme</label>
          <input type="color" class="form-control" style="height:42px; padding:0.2rem;" bind:value={slotColor} />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showSlotModal = false}>Cancel</button>
        <button type="submit" class="btn btn-emerald">Save Time Slot</button>
      </div>
    </form>
  </div>
</div>
