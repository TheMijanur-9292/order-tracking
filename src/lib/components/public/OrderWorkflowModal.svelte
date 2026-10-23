<script>
  import { formatMonthHeader } from '$lib/utils/date.js';

  export let isAssigningOrder;
  export let orderModalStep;
  export let selectedRestForOrder;
  export let currentMonth;
  export let showOrderModal;
  export let timeSlotsList;
  export let selectedTimeSlot;
  export let selectTimeSlotStep;
  export let receiverSearchQuery;
  export let receiversList;
  export let showQuickAddRec;
  export let filteredReceiversForPicker;
  export let confirmOrderWithReceiver;
  export let copyReceiverFull;
  export let copiedFieldId;
  export let saveQuickReceiver;
  export let quickRecName;
  export let quickRecPhone;
  export let quickRecAddress;
</script>

<div class="modal-overlay">
  <div class="modal-card" style="max-width:650px; position:relative;">
    <!-- ANIMATING LOADING OVERLAY FOR ASSIGNING ORDER -->
    {#if isAssigningOrder}
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--modal-bg); opacity: 0.94; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; border-radius: var(--radius-lg); backdrop-filter: blur(4px);">
        <div style="width: 50px; height: 50px; border: 4px solid var(--border-color); border-top-color: var(--purple-accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1.25rem;"></div>
        <p style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.15rem; color: var(--text-main); margin: 0;">Assigning Delivery Receiver...</p>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.35rem;">Please wait while the order is being confirmed.</p>
      </div>
    {/if}

    <div class="modal-header">
      <div>
        <h3 style="font-size:1.2rem; font-family:'Outfit', sans-serif;">
          {#if orderModalStep === 'slot'}
            <i class="fa-solid fa-clock" style="color:var(--amber-accent)"></i> Step 1 of 2: Select Time Slot
          {:else}
            <i class="fa-solid fa-user-check" style="color:var(--purple-accent)"></i> Step 2 of 2: Assign Delivery Receiver
          {/if}
        </h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
          Ordering for: <strong style="color:var(--text-main)">{selectedRestForOrder?.name}</strong> • <span style="color:var(--swiggy-color); font-weight:600;">{selectedRestForOrder?.zone_name || 'Kolkata'}</span> ({formatMonthHeader(currentMonth)})
        </p>
      </div>
      <button class="btn-close" on:click={() => !isAssigningOrder && (showOrderModal = false)} disabled={isAssigningOrder}>&times;</button>
    </div>

    <!-- STEP 1: CHOOSE TIME SLOT -->
    {#if orderModalStep === 'slot'}
      <div style="margin-bottom:1rem;">
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
          Select the ordering meal time slot for this restaurant:
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.85rem;">
          {#each timeSlotsList as slot}
            <button 
              type="button" 
              class="btn btn-outline"
              style="padding:1rem; border-radius:var(--radius-md); border-left:4px solid {slot.color_theme || '#3b82f6'}; {selectedTimeSlot?.slot_name === slot.slot_name ? 'background:rgba(245,158,11,0.12); border-color:var(--amber-accent);' : ''} justify-content:flex-start; text-align:left; gap:0.75rem;"
              on:click={() => selectTimeSlotStep(slot)}
            >
              <div style="width:38px; height:38px; border-radius:var(--radius-sm); background:rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; font-size:1.1rem; color:{slot.color_theme || '#3b82f6'}; flex-shrink:0;">
                <i class="fa-solid {slot.icon || 'fa-clock'}"></i>
              </div>
              <div>
                <div style="font-weight:700; font-size:0.95rem; color:var(--text-main); font-family:'Outfit', sans-serif;">{slot.slot_name}</div>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">{slot.start_time} - {slot.end_time}</div>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div class="modal-footer" style="justify-content:flex-end;">
        <button type="button" class="btn btn-outline" on:click={() => showOrderModal = false}>
          Cancel
        </button>
      </div>
    {/if}

    <!-- STEP 2: CHOOSE RECEIVER -->
    {#if orderModalStep === 'receiver'}
      {#if !showQuickAddRec}
        <!-- SELECTED TIME SLOT SUMMARY BANNER -->
        <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:0.65rem 0.9rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.85rem; font-weight:700; color:var(--amber-accent); display:flex; align-items:center; gap:0.4rem;">
            <i class="fa-solid {selectedTimeSlot?.icon || 'fa-clock'}"></i> Selected Slot: {selectedTimeSlot?.slot_name} ({selectedTimeSlot?.start_time} - {selectedTimeSlot?.end_time})
          </span>
          <button class="btn btn-outline" style="padding:0.25rem 0.65rem; font-size:0.75rem;" on:click={() => !isAssigningOrder && (orderModalStep = 'slot')} disabled={isAssigningOrder}>
            &larr; Change Slot
          </button>
        </div>

        <!-- SEARCH & RECEIVER LIST -->
        <div class="search-box" style="margin-bottom:1rem;">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            placeholder="Search receiver name, phone or address..." 
            bind:value={receiverSearchQuery} 
            disabled={isAssigningOrder}
          />
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">
            SELECT FROM {receiversList.length} SAVED RECEIVERS (AUTO-MATCHED TO ZONE)
          </span>
          <button class="btn btn-outline" style="padding:0.35rem 0.75rem; font-size:0.8rem;" on:click={() => !isAssigningOrder && (showQuickAddRec = true)} disabled={isAssigningOrder}>
            <i class="fa-solid fa-user-plus" style="color:var(--purple-accent)"></i> + Add New Receiver
          </button>
        </div>

        <div class="receiver-picker-scroll" style="max-height:320px; overflow-y:auto; display:flex; flex-direction:column; gap:0.6rem; padding-right:0.3rem;">
          {#if filteredReceiversForPicker.length === 0}
            <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">
              No receivers match "{receiverSearchQuery}".
            </div>
          {:else}
            {#each filteredReceiversForPicker as rec (rec.id)}
              <div 
                class="picker-rec-item" 
                style="background:{rec.matchScore >= 50 ? 'rgba(16,185,129,0.08)' : 'var(--input-bg)'}; border:1px solid {rec.matchScore >= 50 ? 'rgba(16,185,129,0.45)' : 'var(--border-color)'}; border-radius:var(--radius-md); padding:0.85rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:var(--transition); {isAssigningOrder ? 'opacity: 0.6; pointer-events: none;' : ''}"
                on:click={() => !isAssigningOrder && confirmOrderWithReceiver(rec)}
              >
                <div style="flex:1; min-width:0; padding-right:0.75rem;">
                  <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                    <strong style="font-size:0.95rem; font-family:'Outfit', sans-serif;">{rec.name}</strong>
                    {#if rec.matchScore >= 50}
                      <span style="font-size:0.7rem; font-weight:700; background:rgba(16,185,129,0.18); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.35); padding:0.12rem 0.45rem; border-radius:999px;">
                        ⚡ Best Match for Zone
                      </span>
                    {/if}
                    {#if rec.phone}
                      <span style="font-size:0.8rem; font-weight:700; color:var(--emerald-accent);">{rec.phone}</span>
                    {/if}
                    {#if Number(rec.today_order_count || 0) > 0}
                      <span style="font-size:0.72rem; font-weight:700; padding:0.12rem 0.45rem; border-radius:999px; background:{Number(rec.today_order_count) >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color:{Number(rec.today_order_count) >= 2 ? '#ef4444' : '#f59e0b'};" title="Orders assigned to this receiver today">
                        ⚠️ {rec.today_order_count} Today
                      </span>
                    {/if}
                  </div>
                  <p style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:0.25rem;">
                    <i class="fa-solid fa-location-dot" style="color:var(--swiggy-color)"></i> {rec.address}
                  </p>
                </div>
                <div style="display:flex; align-items:center; gap:0.4rem; flex-shrink:0;" on:click|stopPropagation>
                  <button
                    type="button"
                    class="btn btn-outline"
                    style="padding:0.4rem 0.6rem; font-size:0.78rem;"
                    on:click={() => copyReceiverFull(rec, 'pickrec')}
                    title="Copy Name + Phone + Address"
                  >
                    {#if copiedFieldId === `pickrec-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                  </button>
                  <button
                    type="button"
                    class="btn btn-purple"
                    style="padding:0.45rem 0.85rem; font-size:0.82rem;"
                    disabled={isAssigningOrder}
                    on:click={() => !isAssigningOrder && confirmOrderWithReceiver(rec)}
                  >
                    <i class="fa-solid fa-check"></i> Assign
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="modal-footer" style="justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && confirmOrderWithReceiver(null)} disabled={isAssigningOrder}>
            Mark without Receiver
          </button>
          <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && (showOrderModal = false)} disabled={isAssigningOrder}>
            Cancel
          </button>
        </div>
      {:else}
        <!-- QUICK ADD NEW RECEIVER FORM INSIDE MODAL -->
        <form on:submit|preventDefault={saveQuickReceiver} style="margin-top:0.5rem;">
          <div class="form-group">
            <label>Receiver Name / Label *</label>
            <input type="text" class="form-control" placeholder="e.g. Arif Imtiyaz frnd Jadavpur" bind:value={quickRecName} disabled={isAssigningOrder} required />
          </div>

          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" class="form-control" placeholder="e.g. +91-8617615800" bind:value={quickRecPhone} disabled={isAssigningOrder} />
          </div>

          <div class="form-group">
            <label>Full Delivery Address *</label>
            <textarea class="form-control" rows="3" placeholder="Full address..." bind:value={quickRecAddress} disabled={isAssigningOrder} required></textarea>
          </div>

          <div class="modal-footer" style="justify-content:space-between;">
            <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && (showQuickAddRec = false)} disabled={isAssigningOrder}>
              &larr; Back to Receivers List
            </button>
            <button type="submit" class="btn btn-purple" disabled={isAssigningOrder}>
              {#if isAssigningOrder}
                <i class="fa-solid fa-spinner fa-spin"></i> Saving...
              {:else}
                <i class="fa-solid fa-check"></i> Save & Assign Receiver
              {/if}
            </button>
          </div>
        </form>
      {/if}
    {/if}
  </div>
</div>
