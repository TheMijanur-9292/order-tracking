<script>
  export let isLoadingAllData;
  export let totalRestaurants;
  export let totalZones;
  export let receivers;
  export let timeSlots;
  export let selectAdminTab;
  export let openAddRest;
  export let activeTab;
  export let openAddRec;
  export let fetchOrderHistory;
  export let orderHistoryList;
</script>

  <div class="tab-content-animated">
    <div class="metrics-grid">
      <div class="metric-card card-total">
        <div class="metric-icon"><i class="fa-solid fa-store"></i></div>
        <div class="metric-data">
          <span class="metric-label">Total Restaurants</span>
          <span class="metric-value">
            {#if isLoadingAllData}
              <span class="skeleton-shimmer" style="width: 50px; height: 30px; display: inline-block;"></span>
            {:else}
              {totalRestaurants}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card card-zones">
        <div class="metric-icon"><i class="fa-solid fa-map-location-dot"></i></div>
        <div class="metric-data">
          <span class="metric-label">Active Zones</span>
          <span class="metric-value">
            {#if isLoadingAllData}
              <span class="skeleton-shimmer" style="width: 40px; height: 30px; display: inline-block;"></span>
            {:else}
              {totalZones}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
        <div class="metric-icon" style="background:rgba(168,85,247,0.12); color:#a855f7;"><i class="fa-solid fa-users"></i></div>
        <div class="metric-data">
          <span class="metric-label">Saved Receivers</span>
          <span class="metric-value">
            {#if isLoadingAllData}
              <span class="skeleton-shimmer" style="width: 45px; height: 30px; display: inline-block;"></span>
            {:else}
              {receivers.length}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
        <div class="metric-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;"><i class="fa-solid fa-clock"></i></div>
        <div class="metric-data">
          <span class="metric-label">Time Slots</span>
          <span class="metric-value">
            {#if isLoadingAllData}
              <span class="skeleton-shimmer" style="width: 40px; height: 30px; display: inline-block;"></span>
            {:else}
              {timeSlots.length}
            {/if}
          </span>
        </div>
      </div>
    </div>

  <!-- QUICK ACTION CARDS -->
  <div class="quick-cards-grid" style="margin-top:1.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.2rem;">
    <div class="admin-box-card" style="border-color: rgba(236, 72, 153, 0.35); background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05));">
      <h3><i class="fa-solid fa-wand-magic-sparkles" style="color:#ec4899;"></i> Smart Order Suggestion</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">AI suggestions based on Zone & Distance from previous months' history.</p>
      <button class="btn btn-purple" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); border:none;" on:click={() => selectAdminTab('suggestions')}><i class="fa-solid fa-sparkles"></i> Open Suggestions</button>
    </div>

    <div class="admin-box-card">
      <h3><i class="fa-solid fa-square-plus" style="color:var(--primary-accent)"></i> Quick Add Restaurant</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Add new food joint to any Kolkata zone instantly.</p>
      <button class="btn btn-primary" on:click={openAddRest}><i class="fa-solid fa-plus"></i> Add Restaurant</button>
    </div>

    <div class="admin-box-card">
      <h3><i class="fa-solid fa-clock" style="color:var(--amber-accent)"></i> Manage Time Slots</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Configure Breakfast, Lunch, Snacks, Dinner & Night slots.</p>
      <button class="btn btn-emerald" on:click={() => activeTab = 'timeslots'}><i class="fa-solid fa-gear"></i> Time Slots ({timeSlots.length})</button>
    </div>

    <div class="admin-box-card">
      <h3><i class="fa-solid fa-user-plus" style="color:var(--purple-accent)"></i> Quick Add Receiver</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Save new receiver delivery name, phone & address.</p>
      <button class="btn btn-purple" on:click={openAddRec}><i class="fa-solid fa-plus"></i> Add Receiver</button>
    </div>

    <div class="admin-box-card">
      <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--emerald-accent)"></i> View Order History</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Check full logs, receivers, time slots & export CSV reports.</p>
      <button class="btn btn-emerald" on:click={() => { activeTab = 'history'; fetchOrderHistory(); }}><i class="fa-solid fa-receipt"></i> Order History ({orderHistoryList.length})</button>
    </div>
  </div>
</div>
