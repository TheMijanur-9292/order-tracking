<script>
  export let editRestId;
  export let showRestModal;
  export let saveRestaurant;
  export let restZoneId;
  export let zonesData;
  export let restName;
  export let restPlatform;
  export let restDistance;
  export let restAddress;
</script>

<div class="modal-overlay">
  <div class="modal-card" style="max-width:540px;">
    <div class="modal-header">
      <h3>
        <i class="fa-solid fa-store" style="color:var(--swiggy-color)"></i>
        {editRestId ? 'Edit Extra Restaurant' : 'Add New Restaurant'}
      </h3>
      <button class="btn-close" on:click={() => showRestModal = false}>&times;</button>
    </div>

    <form on:submit|preventDefault={saveRestaurant}>
      <div class="form-group">
        <label>Select Kolkata Zone *</label>
        <select class="form-control" bind:value={restZoneId} required>
          <option value="" disabled>-- Choose Zone --</option>
          {#each zonesData as z}
            <option value={z.id}>{z.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>Restaurant Name *</label>
        <input type="text" class="form-control" placeholder="e.g. Arsalan Restaurant & Caterer" bind:value={restName} required />
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:0.85rem;">
        <div class="form-group">
          <label>Platform</label>
          <select class="form-control" bind:value={restPlatform}>
            <option value="Both">Both (Swiggy & Zomato)</option>
            <option value="Swiggy">Swiggy Only</option>
            <option value="Zomato">Zomato Only</option>
          </select>
        </div>

        <div class="form-group">
          <label>Distance Tier</label>
          <select class="form-control" bind:value={restDistance}>
            <option value="A. 0-1">A. 0-1 km</option>
            <option value="B. 1-2">B. 1-2 km</option>
            <option value="C. 2-3">C. 2-3 km</option>
            <option value="D. 3-5">D. 3-5 km</option>
            <option value="E. 5-7">E. 5-7 km</option>
            <option value="F. 7+">F. 7+ km</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Receiver / Delivery Address</label>
        <textarea class="form-control" rows="2" placeholder="Delivery receiver address for this zone..." bind:value={restAddress}></textarea>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showRestModal = false}>Cancel</button>
        <button type="submit" class="btn btn-primary">
          <i class="fa-solid fa-check"></i> {editRestId ? 'Update Restaurant' : 'Save Restaurant'}
        </button>
      </div>
    </form>
  </div>
</div>
