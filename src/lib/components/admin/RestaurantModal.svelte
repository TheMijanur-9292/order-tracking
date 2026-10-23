<script>
  export let editRestId;
  export let showRestModal;
  export let saveRest;
  export let restZoneId;
  export let zones;
  export let restName;
  export let restPlatform;
  export let restDistance;
  export let restAddress;
</script>

<div class="modal-overlay">
  <div class="modal-card">
    <div class="modal-header">
      <h3><i class="fa-solid fa-utensils"></i> {editRestId ? 'Edit Restaurant' : 'Add Restaurant'}</h3>
      <button class="btn-close" on:click={() => showRestModal = false}>&times;</button>
    </div>
    <form on:submit|preventDefault={saveRest}>
      <div class="form-group">
        <label>Zone *</label>
        <select class="form-control" bind:value={restZoneId}>
          {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
        </select>
      </div>
      <div class="form-group">
        <label>Restaurant Name *</label>
        <input type="text" class="form-control" bind:value={restName} required />
      </div>
      <div class="form-group">
        <label>Platform</label>
        <select class="form-control" bind:value={restPlatform}>
          <option value="Both">Both (Swiggy & Zomato)</option>
          <option value="Swiggy">Swiggy Only</option>
          <option value="Zomato">Zomato Only</option>
        </select>
      </div>
      <div class="form-group">
        <label>Distance *</label>
        <select class="form-control" bind:value={restDistance}>
          <option value="A. 0-1">A. 0-1</option>
          <option value="B. 1-2">B. 1-2</option>
          <option value="C. 2-3">C. 2-3</option>
          <option value="D. 3-5">D. 3-5</option>
          <option value="E. 5-7">E. 5-7</option>
          <option value="F. 7+">F. 7+</option>
        </select>
      </div>
      <div class="form-group">
        <label>Address / Landmark</label>
        <textarea class="form-control" rows="3" bind:value={restAddress}></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showRestModal = false}>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Restaurant</button>
      </div>
    </form>
  </div>
</div>
