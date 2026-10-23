<script>
  import { getPageList, PAGE_SIZE } from '$lib/utils/pagination.js';

  export let isLoadingHistory;
  export let orderHistoryStats;
  export let historySearchQuery;
  export let fetchOrderHistory;
  export let historyMonthFilter;
  export let availableHistoryMonths;
  export let historyStatusFilter;
  export let historyZoneFilter;
  export let zones;
  export let historySlotFilter;
  export let timeSlots;
  export let exportHistoryToCSV;
  export let orderHistoryList;
  export let openHistoryDetail;
  export let resetHistoryOrderStatus;
  export let historyPage;

  $: historyTotalPages = Math.ceil(orderHistoryList.length / PAGE_SIZE) || 1;
  $: paginatedHistory = orderHistoryList.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
</script>

  <div class="tab-content-animated">
    <div class="metrics-grid">
      <div class="metric-card card-total">
        <div class="metric-icon"><i class="fa-solid fa-clipboard-list"></i></div>
        <div class="metric-data">
          <span class="metric-label">Total History Records</span>
          <span class="metric-value">
            {#if isLoadingHistory}
              <span class="skeleton-shimmer" style="width: 45px; height: 28px; display: inline-block;"></span>
            {:else}
              {orderHistoryStats.total_orders}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
        <div class="metric-icon" style="background:rgba(16,185,129,0.12); color:#10b981;"><i class="fa-solid fa-circle-check"></i></div>
        <div class="metric-data">
          <span class="metric-label">Marked as Ordered</span>
          <span class="metric-value">
            {#if isLoadingHistory}
              <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
            {:else}
              {orderHistoryStats.total_ordered}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
        <div class="metric-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;"><i class="fa-solid fa-hourglass-half"></i></div>
        <div class="metric-data">
          <span class="metric-label">Pending Orders</span>
          <span class="metric-value">
            {#if isLoadingHistory}
              <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
            {:else}
              {orderHistoryStats.total_pending}
            {/if}
          </span>
        </div>
      </div>

      <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
        <div class="metric-icon" style="background:rgba(168,85,247,0.12); color:#a855f7;"><i class="fa-solid fa-user-check"></i></div>
        <div class="metric-data">
          <span class="metric-label">Assigned Receivers</span>
          <span class="metric-value">
            {#if isLoadingHistory}
              <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
            {:else}
              {orderHistoryStats.unique_receivers}
            {/if}
          </span>
        </div>
      </div>
    </div>

  <div class="admin-toolbar" style="margin-top:1.5rem;">
    <div class="search-box" style="flex:1; min-width:240px;">
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input 
        type="text" 
        placeholder="Search restaurant, receiver, phone or address..." 
        bind:value={historySearchQuery} 
        on:input={fetchOrderHistory} 
      />
    </div>

    <select class="select-filter" bind:value={historyMonthFilter} on:change={fetchOrderHistory}>
      <option value="all">All Months ({availableHistoryMonths.length})</option>
      {#each availableHistoryMonths as m}
        <option value={m}>{m}</option>
      {/each}
    </select>

    <select class="select-filter" bind:value={historyStatusFilter} on:change={fetchOrderHistory}>
      <option value="all">All Statuses</option>
      <option value="Ordered">Ordered Only</option>
      <option value="Pending">Pending Only</option>
      <option value="Cancelled">Cancelled Only</option>
    </select>

    <select class="select-filter" bind:value={historyZoneFilter} on:change={fetchOrderHistory}>
      <option value="all">All Zones ({zones.length})</option>
      {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
    </select>

    <select class="select-filter" bind:value={historySlotFilter} on:change={fetchOrderHistory}>
      <option value="all">All Time Slots</option>
      {#each timeSlots as slot}<option value={slot.slot_name}>{slot.slot_name}</option>{/each}
    </select>

    <button class="btn btn-emerald" on:click={exportHistoryToCSV}>
      <i class="fa-solid fa-file-csv"></i> Export CSV
    </button>
  </div>

  <div class="admin-table-wrapper" style="margin-top:1rem;">
    {#if isLoadingHistory}
      <div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem; margin-bottom:0.5rem; display:block;"></i>
        Loading order history...
      </div>
    {:else if orderHistoryList.length === 0}
      <div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <i class="fa-solid fa-receipt" style="font-size:2.5rem; opacity:0.4; margin-bottom:0.75rem; display:block;"></i>
        No order history records found matching your filters.
      </div>
    {:else}
      <table class="admin-table">
        <thead>
          <tr>
            <th>Month & Order ID</th>
            <th>Restaurant & Zone</th>
            <th>Status</th>
            <th>Time Slot</th>
            <th>Assigned Receiver</th>
            <th>Ordered Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedHistory as h (h.id)}
            <tr>
              <td>
                <span class="badge" style="background:var(--input-bg); border:1px solid var(--border-color); color:var(--text-main); font-weight:700;">{h.month_year}</span>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">#ORD-{h.id}</div>
              </td>
              <td>
                <div style="font-weight:700; font-family:'Outfit', sans-serif;">{h.restaurant_name}</div>
                <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.25rem; flex-wrap:wrap;">
                  {#if h.zone_name}
                    <span class="zone-pill" style="font-size:0.72rem;">{h.zone_name}</span>
                  {/if}
                  {#if h.restaurant_distance || h.distance}
                    <span style="font-size:0.7rem; color:var(--primary-accent); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:0.12rem 0.45rem; border-radius:10px; font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;">
                      <i class="fa-solid fa-route" style="font-size:0.65rem;"></i> {h.restaurant_distance || h.distance}
                    </span>
                  {/if}
                </div>
              </td>
              <td>
                {#if h.status === 'Ordered'}
                  <span class="badge badge-ordered" style="background:rgba(16,185,129,0.15); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                    <i class="fa-solid fa-circle-check"></i> Ordered
                  </span>
                {:else if h.status === 'Cancelled'}
                  <span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                    <i class="fa-solid fa-ban"></i> Cancelled
                  </span>
                {:else}
                  <span class="badge badge-pending" style="background:rgba(245,158,11,0.15); color:var(--amber-accent); border:1px solid rgba(245,158,11,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                    <i class="fa-solid fa-hourglass-half"></i> Pending
                  </span>
                {/if}
              </td>
              <td>
                {#if h.time_slot}
                  <span style="font-size:0.8rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:6px; background:rgba(59,130,246,0.12); color:var(--primary-accent); display:inline-flex; align-items:center; gap:0.3rem;">
                    <i class="fa-solid fa-clock"></i> {h.time_slot}
                  </span>
                {:else}
                  <span style="font-size:0.78rem; color:var(--text-muted);">-</span>
                {/if}
              </td>
              <td>
                {#if h.receiver_name}
                  <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">{h.receiver_name}</div>
                  {#if h.receiver_phone}
                    <div style="font-size:0.78rem; color:var(--emerald-accent); font-weight:600;"><i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> {h.receiver_phone}</div>
                  {/if}
                  {#if h.receiver_address}
                    <div style="font-size:0.75rem; color:var(--text-muted); max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title={h.receiver_address}>
                      <i class="fa-solid fa-location-dot" style="color:var(--swiggy-color);"></i> {h.receiver_address}
                    </div>
                  {/if}
                {:else}
                  <span style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">No receiver assigned</span>
                {/if}
              </td>
              <td>
                {#if h.ordered_at}
                  <div style="font-size:0.8rem; font-weight:600; color:var(--text-main);">{new Date(h.ordered_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">{new Date(h.ordered_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                {:else}
                  <span style="font-size:0.78rem; color:var(--text-muted);">-</span>
                {/if}
              </td>
              <td>
                <div style="display:flex; gap:0.4rem;">
                  <button class="btn btn-outline" style="padding:0.3rem 0.55rem; font-size:0.75rem;" title="View Order Details" on:click={() => openHistoryDetail(h)}>
                    <i class="fa-solid fa-eye"></i> Details
                  </button>
                  {#if h.status === 'Ordered'}
                    <button class="btn btn-danger-action" style="padding:0.3rem 0.55rem; font-size:0.75rem;" title="Reset Order to Pending" on:click={() => resetHistoryOrderStatus(h)}>
                      <i class="fa-solid fa-rotate-left"></i> Reset
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- HISTORY PAGINATION BAR -->
      {#if historyTotalPages > 1}
        <div class="pagination-wrapper">
          <div class="pagination-info">
            Showing <strong>{(historyPage - 1) * PAGE_SIZE + 1}</strong> - <strong>{Math.min(historyPage * PAGE_SIZE, orderHistoryList.length)}</strong> of <strong>{orderHistoryList.length}</strong> orders
          </div>
          <div class="pagination-controls">
            <button 
              class="pagination-btn" 
              disabled={historyPage === 1} 
              on:click={() => { historyPage--; }} 
              title="Previous Page"
            >
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            {#each getPageList(historyPage, historyTotalPages) as p}
              {#if p === '...'}
                <span class="pagination-ellipsis">...</span>
              {:else}
                <button 
                  class="pagination-btn {historyPage === p ? 'active' : ''}" 
                  on:click={() => { historyPage = p; }}
                >
                  {p}
                </button>
              {/if}
            {/each}
            <button 
              class="pagination-btn" 
              disabled={historyPage === historyTotalPages} 
              on:click={() => { historyPage++; }} 
              title="Next Page"
            >
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
