<script>
  export let showZoneModal;
  export let saveZone;
  export let zoneName;
  export let zoneDesc;
</script>

<div class="modal-overlay">
  <div class="modal-card">
    <div class="modal-header">
      <h3><i class="fa-solid fa-map-location-dot"></i> Add New Zone</h3>
      <button class="btn-close" on:click={() => showZoneModal = false}>&times;</button>
    </div>
    <form on:submit|preventDefault={saveZone}>
      <div class="form-group">
        <label>Zone Name *</label>
        <input type="text" class="form-control" placeholder="e.g. Kolkata-Howrah" bind:value={zoneName} required />
      </div>
      <div class="form-group">
        <label>Description (Optional)</label>
        <input type="text" class="form-control" bind:value={zoneDesc} />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showZoneModal = false}>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Zone</button>
      </div>
    </form>
  </div>
</div>
