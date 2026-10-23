<script>
  export let showQuickOrderModal;
  export let submitQuickOrder;
  export let quickOrderRestaurant;
  export let quickOrderMonth;
  export let quickOrderSlot;
  export let timeSlots;
  export let quickOrderPlatform;
  export let handleQuickReceiverSelect;
  export let quickOrderReceiverId;
  export let receivers;
  export let quickOrderReceiverName;
  export let quickOrderReceiverPhone;
  export let quickOrderReceiverAddress;
  export let quickOrderNotes;
  export let isSubmittingQuickOrder;
</script>

<div class="modal-overlay" on:click|self={() => showQuickOrderModal = false}>
  <div class="modal-card" style="max-width:540px;">
    <div class="modal-header">
      <h3><i class="fa-solid fa-paper-plane" style="color:var(--primary-accent);"></i> Place Order / Mark Completed</h3>
      <button class="btn-close" on:click={() => showQuickOrderModal = false}>&times;</button>
    </div>

    <form on:submit|preventDefault={submitQuickOrder}>
      <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem; margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <h4 style="font-size:1.15rem; font-family:'Outfit', sans-serif; margin:0;">{quickOrderRestaurant.name}</h4>
            {#if quickOrderRestaurant.is_seeded || quickOrderRestaurant.is_seeded === 1 || quickOrderRestaurant.is_seeded === true}
              <span class="badge-source badge-list"><i class="fa-solid fa-list-check"></i> LIST</span>
            {:else}
              <span class="badge-source badge-extra"><i class="fa-solid fa-folder-plus"></i> EXTRA</span>
            {/if}
          </div>
          <span class="sugg-dist-pill"><i class="fa-solid fa-route"></i> {quickOrderRestaurant.distance}</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin:0.35rem 0 0 0;"><i class="fa-solid fa-map-pin"></i> {quickOrderRestaurant.zone_name} • {quickOrderRestaurant.address || 'Kolkata'}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
        <div class="form-group">
          <label>Target Month *</label>
          <input type="month" class="form-control" bind:value={quickOrderMonth} required />
        </div>

        <div class="form-group">
          <label>Time Slot *</label>
          <select class="form-control" bind:value={quickOrderSlot} required>
            {#each timeSlots as slot}
              <option value={slot.slot_name}>{slot.slot_name} ({slot.start_time} - {slot.end_time})</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Platform Used</label>
        <select class="form-control" bind:value={quickOrderPlatform}>
          <option value="Swiggy">Swiggy</option>
          <option value="Zomato">Zomato</option>
          <option value="Swiggy/Zomato">Swiggy/Zomato (Both)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Select Saved Receiver (Auto-fills details)</label>
        <select class="form-control" on:change={handleQuickReceiverSelect} bind:value={quickOrderReceiverId}>
          <option value="">-- Choose or Enter Manually --</option>
          {#each receivers as rec}
            <option value={String(rec.id)}>{rec.name} {rec.phone ? `(${rec.phone})` : ''}</option>
          {/each}
        </select>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
        <div class="form-group">
          <label>Receiver Name</label>
          <input type="text" class="form-control" placeholder="e.g. Syed-Jadavpur" bind:value={quickOrderReceiverName} />
        </div>
        <div class="form-group">
          <label>Receiver Phone</label>
          <input type="text" class="form-control" placeholder="e.g. +91 8101222684" bind:value={quickOrderReceiverPhone} />
        </div>
      </div>

      <div class="form-group">
        <label>Delivery Address</label>
        <textarea class="form-control" rows="2" placeholder="Full delivery drop address..." bind:value={quickOrderReceiverAddress}></textarea>
      </div>

      <div class="form-group">
        <label>Order Notes / Reference (Optional)</label>
        <input type="text" class="form-control" placeholder="e.g. Awign Order #1042" bind:value={quickOrderNotes} />
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showQuickOrderModal = false}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={isSubmittingQuickOrder}>
          {#if isSubmittingQuickOrder}
            <i class="fa-solid fa-spinner fa-spin"></i> Saving...
          {:else}
            <i class="fa-solid fa-check"></i> Confirm & Mark Ordered
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
