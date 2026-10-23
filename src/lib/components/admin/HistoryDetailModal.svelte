<script>
  export let selectedHistoryItem;
  export let showHistoryDetailModal;
  export let copyText;
</script>

<div class="modal-overlay">
  <div class="modal-card" style="max-width:520px;">
    <div class="modal-header">
      <h3><i class="fa-solid fa-receipt" style="color:var(--primary-accent);"></i> Order Record #{selectedHistoryItem.id}</h3>
      <button class="btn-close" on:click={() => showHistoryDetailModal = false}>&times;</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:1rem; padding:0.5rem 0;">
      <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Restaurant Details</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-size:1.1rem; font-family:'Outfit', sans-serif; margin-bottom:0.25rem;">{selectedHistoryItem.restaurant_name}</h4>
          {#if selectedHistoryItem.restaurant_distance || selectedHistoryItem.distance}
            <span style="font-size:0.75rem; color:var(--primary-accent); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:0.2rem 0.6rem; border-radius:12px; font-weight:700;">
              <i class="fa-solid fa-route"></i> {selectedHistoryItem.restaurant_distance || selectedHistoryItem.distance}
            </span>
          {/if}
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;"><i class="fa-solid fa-location-dot"></i> {selectedHistoryItem.restaurant_address || 'Address not provided'}</p>
        <div style="display:flex; gap:0.5rem;">
          {#if selectedHistoryItem.swiggy_url}
            <a href={selectedHistoryItem.swiggy_url} target="_blank" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:#fc8019; border-color:#fc8019;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Swiggy</a>
          {/if}
          {#if selectedHistoryItem.zomato_url}
            <a href={selectedHistoryItem.zomato_url} target="_blank" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:#cb202d; border-color:#cb202d;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Zomato</a>
          {/if}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
        <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Month & Slot</div>
          <div style="font-weight:700; font-size:0.9rem;">{selectedHistoryItem.month_year}</div>
          <div style="font-size:0.8rem; color:var(--primary-accent); font-weight:600; margin-top:0.2rem;"><i class="fa-solid fa-clock"></i> {selectedHistoryItem.time_slot || 'Lunch'}</div>
        </div>

        <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Order Status</div>
          {#if selectedHistoryItem.status === 'Ordered'}
            <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--emerald-accent); font-weight:700; border:1px solid rgba(16,185,129,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-circle-check"></i> Ordered</span>
          {:else if selectedHistoryItem.status === 'Cancelled'}
            <span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:700; border:1px solid rgba(239,68,68,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-ban"></i> Cancelled</span>
          {:else}
            <span class="badge" style="background:rgba(245,158,11,0.15); color:var(--amber-accent); font-weight:700; border:1px solid rgba(245,158,11,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-hourglass-half"></i> Pending</span>
          {/if}
        </div>
      </div>

      <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
        <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Assigned Delivery Receiver</div>
        {#if selectedHistoryItem.receiver_name}
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">{selectedHistoryItem.receiver_name}</div>
          {#if selectedHistoryItem.receiver_phone}
            <div style="font-size:0.82rem; color:var(--emerald-accent); font-weight:600; margin:0.2rem 0;"><i class="fa-solid fa-phone"></i> {selectedHistoryItem.receiver_phone}</div>
          {/if}
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;"><i class="fa-solid fa-location-dot"></i> {selectedHistoryItem.receiver_address || 'Address not available'}</p>
        {:else}
          <p style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">No receiver was assigned for this order.</p>
        {/if}
      </div>
    </div>

    <div class="modal-footer" style="justify-content:space-between;">
      <button class="btn btn-outline" on:click={() => copyText(`hist-${selectedHistoryItem.id}`, `${selectedHistoryItem.restaurant_name} | ${selectedHistoryItem.month_year} | ${selectedHistoryItem.time_slot} | Receiver: ${selectedHistoryItem.receiver_name || 'None'}`)}>
        <i class="fa-solid fa-copy"></i> Copy Summary
      </button>
      <button class="btn btn-primary" on:click={() => showHistoryDetailModal = false}>Close</button>
    </div>
  </div>
</div>
