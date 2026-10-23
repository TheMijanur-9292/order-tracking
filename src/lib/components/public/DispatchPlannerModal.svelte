<script>
  import { isAdmin } from '$lib/authStore.js';

  export let showPlannerModal;
  export let copyDispatchSheet;
  export let plannedRestaurantsList;
  export let todayOrderedRestaurantsList;
  export let plannedRestIds;
  export let showToast;
  export let openOrderWorkflowModal;
  export let togglePlanRestaurant;
</script>

<div class="modal-overlay">
  <div class="modal-card" style="max-width:680px;">
    <div class="modal-header">
      <div>
        <h3><i class="fa-solid fa-clipboard-list" style="color:var(--purple-accent)"></i> Today's Dispatch Planner & WhatsApp Sheet</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
          Plan restaurants or copy a 1-click formatted WhatsApp/Telegram dispatch sheet with auto-matched receivers.
        </p>
      </div>
      <button class="btn-close" on:click={() => showPlannerModal = false}>&times;</button>
    </div>

    <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-bottom:1rem;">
      <button type="button" class="btn btn-purple" on:click={() => copyDispatchSheet('planned')}>
        <i class="fa-brands fa-whatsapp"></i> Copy Planned List ({plannedRestaurantsList.length})
      </button>
      <button type="button" class="btn btn-emerald" on:click={() => copyDispatchSheet('today')}>
        <i class="fa-solid fa-copy"></i> Copy Today's Ordered ({todayOrderedRestaurantsList.length})
      </button>
      {#if plannedRestIds.length > 0}
        <button type="button" class="btn btn-outline" on:click={() => { plannedRestIds = []; showToast('Cleared planned queue'); }}>
          <i class="fa-solid fa-trash-can"></i> Clear Plan
        </button>
      {/if}
    </div>

    <div style="max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:0.6rem; padding-right:0.25rem;">
      {#if plannedRestaurantsList.length === 0 && todayOrderedRestaurantsList.length === 0}
        <div style="text-align:center; padding:2rem; color:var(--text-muted); background:var(--input-bg); border-radius:var(--radius-md);">
          <i class="fa-solid fa-clipboard-check" style="font-size:2rem; color:var(--purple-accent); margin-bottom:0.5rem;"></i>
          <p style="font-weight:600; color:var(--text-main);">No restaurants added to Today's Plan yet.</p>
          <p style="font-size:0.82rem; margin-top:0.25rem;">Click the <strong>+ Plan</strong> button on any restaurant card to queue it for today's dispatch sheet!</p>
        </div>
      {:else}
        {#each (plannedRestaurantsList.length > 0 ? plannedRestaurantsList : todayOrderedRestaurantsList) as item, idx (item.id)}
          <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 0.9rem; display:flex; justify-content:space-between; align-items:center; gap:0.75rem;">
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                <span style="font-weight:700; color:var(--purple-accent);">#{idx + 1}</span>
                <strong style="font-size:0.92rem;">{item.name}</strong>
                <span class="distance-tag" style="font-size:0.72rem;">{item.zone_name} • {item.distance}</span>
                {#if item.order_status === 'Ordered'}
                  <span style="font-size:0.72rem; color:var(--emerald-accent); font-weight:700;">✅ Ordered {item.time_slot ? `(${item.time_slot})` : ''}</span>
                {/if}
              </div>
              <div style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:0.2rem;">
                📍 {item.receiver_address || item.address}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              {#if item.order_status !== 'Ordered' && $isAdmin}
                <button type="button" class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.76rem;" on:click={() => { showPlannerModal = false; openOrderWorkflowModal(item); }}>
                  Order Now
                </button>
              {/if}
              {#if plannedRestIds.includes(item.id)}
                <button type="button" class="btn btn-outline" style="padding:0.35rem 0.55rem; font-size:0.76rem;" on:click={() => togglePlanRestaurant(item.id)} title="Remove from Plan">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-outline" on:click={() => showPlannerModal = false}>Close</button>
    </div>
  </div>
</div>
