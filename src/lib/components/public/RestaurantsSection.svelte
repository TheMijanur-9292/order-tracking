<script>
  import { isAdmin } from '$lib/authStore.js';
  import { formatMonthHeader, formatFullOrderDate } from '$lib/utils/date.js';
  import { getGoogleMapsUrl } from '$lib/utils/maps.js';
  import { maskPhoneNumber } from '$lib/utils/phone.js';

  export let currentZoneId;
  export let zonesData;
  export let showPlannerModal;
  export let plannedRestIds;
  export let todayOrderedRestaurantsList;
  export let paginatedRestaurants;
  export let filteredRestaurants;
  export let pageSize;
  export let isLoadingData;
  export let currentMonth;
  export let copiedFieldId;
  export let togglePlanRestaurant;
  export let copyText;
  export let openOrderWorkflowModal;
  export let resetOrderStatus;
  export let openEditModal;
  export let deleteRestaurant;
  export let currentPage;
  export let totalPages;
  export let goToPage;
</script>

<!-- SECTION TITLE & CARDS GRID -->
<section>
  <div class="section-header">
    <h3>
      {currentZoneId === 'all' ? 'Showing All Kolkata Restaurants' : `Zone: ${zonesData.find(z => z.id == currentZoneId)?.name || 'Selected Zone'}`}
    </h3>
    <div class="section-header-actions">
      <button
        type="button"
        class="btn btn-outline section-action-pill"
        style="border-color:rgba(168,85,247,0.4); color:var(--purple-accent);"
        on:click={() => showPlannerModal = true}
        title="Open Today's WhatsApp/Telegram Dispatch Planner"
      >
        <i class="fa-solid fa-clipboard-list"></i> Dispatch Planner
        {#if plannedRestIds.length > 0}
          <span class="tab-badge" style="background:var(--purple-accent); color:#fff; margin-left:0.2rem;">{plannedRestIds.length}</span>
        {:else if todayOrderedRestaurantsList.length > 0}
          <span class="tab-badge" style="background:var(--emerald-accent); color:#fff; margin-left:0.2rem;">{todayOrderedRestaurantsList.length}</span>
        {/if}
      </button>

      <span class="count-badge section-action-pill">
        Showing {paginatedRestaurants.length} of {filteredRestaurants.length}
      </span>

      <select class="select-filter section-action-pill" bind:value={pageSize}>
        <option value={15}>15 per page</option>
        <option value={30}>30 per page</option>
        <option value={60}>60 per page</option>
        <option value="all">Show All</option>
      </select>
    </div>
  </div>

  {#if isLoadingData}
    <!-- SKELETON SHIMMER LOADING GRID -->
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.2rem; margin-top:1.5rem;">
      {#each Array(6) as _}
        <div class="skeleton-card" style="min-height:140px; padding:1.2rem; display:flex; flex-direction:column; justify-content:space-between;">
          <div style="display:flex; justify-content:space-between;">
            <span class="skeleton-shimmer" style="width: 140px; height: 20px;"></span>
            <span class="skeleton-shimmer" style="width: 60px; height: 20px;"></span>
          </div>
          <span class="skeleton-shimmer" style="width: 200px; height: 16px;"></span>
          <div style="display:flex; justify-content:space-between; margin-top:0.5rem;">
            <span class="skeleton-shimmer" style="width: 100px; height: 32px; border-radius:8px;"></span>
            <span class="skeleton-shimmer" style="width: 90px; height: 32px; border-radius:8px;"></span>
          </div>
        </div>
      {/each}
    </div>
    <div class="loading-wrapper" style="margin-top:1.5rem;">
      <div class="spinner-ring"></div>
      <div class="loading-txt">
        <i class="fa-solid fa-cloud-arrow-down" style="color:var(--swiggy-color)"></i> Fetching Kolkata Restaurants for {formatMonthHeader(currentMonth)}...
      </div>
    </div>
  {:else if filteredRestaurants.length === 0}
    <div class="empty-state">
      <i class="fa-solid fa-store-slash empty-icon"></i>
      <h4>No Restaurants Found</h4>
      <p>Try clearing your search term or switching to another Kolkata Zone for {formatMonthHeader(currentMonth)}.</p>
    </div>
  {:else}
    <!-- RESTAURANT CARDS GRID (PAGINATED & VIRTUALIZED) -->
    <div class="restaurants-grid">
      {#each paginatedRestaurants as r (r.id)}
        <div class="restaurant-card {r.order_status === 'Ordered' ? 'is-ordered' : ''}">
          <div class="card-top">
            <div>
              <h4 class="rest-name">{r.name}</h4>
              <span class="rest-zone">
                <i class="fa-solid fa-location-dot"></i> {r.zone_name || 'Kolkata Zone'}
              </span>
            </div>
            <div class="tags-right">
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <span class="month-card-badge">
                  <i class="fa-regular fa-calendar-days"></i> {formatMonthHeader(currentMonth)}
                </span>
                {#if r.is_seeded || r.is_seeded === 1}
                  <span class="badge-source badge-list">
                    <i class="fa-solid fa-list-check"></i> LIST
                  </span>
                {:else}
                  <span class="badge-source badge-extra">
                    <i class="fa-solid fa-folder-plus"></i> EXTRA
                  </span>
                {/if}
              </div>
              <span class="distance-tag">
                <i class="fa-solid fa-route"></i> {r.distance || 'C. 2-3'}
              </span>
            </div>
          </div>

          <div class="card-mid">
            <!-- PROMINENT ORDERED DATE HIGHLIGHT BANNER -->
            {#if r.order_status === 'Ordered'}
              <div class="prominent-ordered-banner">
                <div class="banner-icon-box">
                  <i class="fa-solid fa-calendar-check"></i>
                </div>
                <div class="banner-text">
                  <span class="banner-title">ORDER MARKED DATE</span>
                  <span class="banner-date">{formatFullOrderDate(r.ordered_at, currentMonth)}</span>
                </div>
              </div>
            {/if}

            <div class="platform-badges" style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                {#if r.platform === 'Swiggy'}
                  <span class="badge-platform badge-swiggy">Swiggy</span>
                {:else if r.platform === 'Zomato'}
                  <span class="badge-platform badge-zomato">Zomato</span>
                {:else}
                  <span class="badge-platform badge-swiggy">Swiggy</span>
                  <span class="badge-platform badge-zomato">Zomato</span>
                {/if}

                <!-- ORDERED TIME SLOT BADGE -->
                {#if r.order_status === 'Ordered' && r.time_slot}
                  <span style="font-size:0.75rem; font-weight:700; color:var(--amber-accent); background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); padding:0.25rem 0.6rem; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                    <i class="fa-solid fa-clock"></i> {r.time_slot}
                  </span>
                {/if}
              </div>

              <div style="display:flex; align-items:center; gap:0.35rem;">
                <a
                  href={getGoogleMapsUrl(`${r.name} ${r.zone_name || ''}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-outline"
                  style="padding:0.2rem 0.5rem; font-size:0.73rem; border-radius:6px;"
                  title="View Restaurant on Google Maps"
                >
                  <i class="fa-solid fa-map-location-dot" style="color:var(--primary-accent)"></i> Map
                </a>
                <button
                  type="button"
                  class="btn btn-outline"
                  style="padding:0.2rem 0.5rem; font-size:0.73rem; border-radius:6px; {plannedRestIds.includes(r.id) ? 'background:rgba(168,85,247,0.15); border-color:var(--purple-accent); color:var(--purple-accent);' : ''}"
                  on:click={() => togglePlanRestaurant(r.id)}
                  title="Add/Remove from Today's Dispatch Plan"
                >
                  <i class="fa-solid {plannedRestIds.includes(r.id) ? 'fa-check' : 'fa-plus'}"></i> {plannedRestIds.includes(r.id) ? 'Planned' : 'Plan'}
                </button>
              </div>
            </div>

            <!-- SINGLE LINE TRUNCATED RESTAURANT ADDRESS + COPY BUTTON -->
            <div class="address-text" title={r.address || 'Kolkata Receiver Address Available'}>
              <i class="fa-solid fa-location-arrow" style="flex-shrink:0;"></i>
              <span class="address-content">{r.address || 'Kolkata Receiver Address Available'}</span>
              <button 
                class="btn-copy-address" 
                on:click={() => copyText(`rest-${r.id}`, r.address || 'Kolkata Receiver Address Available')} 
                title="Copy Receiver Address"
              >
                {#if copiedFieldId === `rest-${r.id}`}
                  <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>
                {:else}
                  <i class="fa-regular fa-copy"></i>
                {/if}
              </button>
            </div>

            <!-- ASSIGNED RECEIVER INFO BADGE (ONLY VISIBLE FOR LOGGED IN ADMIN) -->
            {#if $isAdmin && r.order_status === 'Ordered' && r.receiver_name}
              <div class="rec-assigned-badge" style="background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.3); padding:0.45rem 0.75rem; border-radius:var(--radius-sm); margin-top:0.2rem; font-size:0.82rem; color:var(--text-main);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem;">
                  <span style="font-weight:700; color:var(--purple-accent); display:flex; align-items:center; gap:0.4rem;">
                    <i class="fa-solid fa-user-check"></i> {r.receiver_name}
                  </span>
                  <div style="display:flex; align-items:center; gap:0.35rem;">
                    {#if r.receiver_phone}
                      <span style="font-size:0.78rem; font-weight:600; color:var(--emerald-accent);">{$isAdmin ? r.receiver_phone : maskPhoneNumber(r.receiver_phone)}</span>
                    {/if}
                    <button
                      class="btn-copy-inline"
                      on:click={() => copyText(`rfull-${r.id}`, `Name: ${r.receiver_name}\nPhone: ${r.receiver_phone || 'N/A'}\nAddress: ${r.receiver_address || r.address || ''}`)}
                      title="Copy Full Receiver Details (Name + Phone + Address)"
                    >
                      {#if copiedFieldId === `rfull-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-solid fa-copy"></i>{/if}
                    </button>
                  </div>
                </div>
                {#if r.receiver_address}
                  <div style="display:flex; align-items:center; gap:0.4rem; margin-top:0.2rem; font-size:0.78rem; color:var(--text-muted);">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">{r.receiver_address}</span>
                    {#if $isAdmin}
                      <button class="btn-copy-inline" on:click={() => copyText(`rrec-${r.id}`, r.receiver_address)} title="Copy Receiver Address">
                        {#if copiedFieldId === `rrec-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="card-bottom">
            {#if r.order_status === 'Ordered'}
              <span 
                class="action-toggle-btn btn-status-ordered" 
                style="cursor: default;"
              >
                <i class="fa-solid fa-circle-check"></i> Ordered
              </span>
              {#if $isAdmin}
                <button 
                  class="icon-btn" 
                  on:click={() => openOrderWorkflowModal(r)} 
                  title="Quick Edit Time Slot or Assigned Receiver"
                >
                  <i class="fa-solid fa-pen"></i>
                </button>
              {/if}
              <button 
                class="icon-btn icon-btn-danger" 
                on:click={() => resetOrderStatus(r)} 
                title="Reset status back to Pending"
              >
                <i class="fa-solid fa-rotate-left"></i>
              </button>
            {:else}
              <button 
                class="action-toggle-btn btn-status-pending" 
                on:click={() => openOrderWorkflowModal(r)}
              >
                <i class="fa-solid fa-truck-ramp-box"></i> Mark as Ordered
              </button>
            {/if}

            {#if r.is_seeded || r.is_seeded === 1}
              <span class="locked-badge" title="Original LIST items cannot be edited or deleted">
                <i class="fa-solid fa-lock"></i> Locked
              </span>
            {:else if $isAdmin}
              <div class="card-admin-actions">
                <button class="icon-btn" on:click={() => openEditModal(r)} title="Edit Extra Restaurant">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-btn icon-btn-danger" on:click={() => deleteRestaurant(r)} title="Delete Extra Restaurant">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            {:else}
              <span class="locked-badge" title="Login as Admin to edit or delete">
                <i class="fa-solid fa-lock"></i> Locked
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- PAGINATION CONTROLS BAR -->
    {#if pageSize !== 'all' && totalPages > 1}
      <div class="pagination-bar" style="margin-top:2rem; display:flex; justify-content:center; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <button 
          class="btn btn-outline" 
          style="padding:0.45rem 0.85rem; font-size:0.85rem;"
          disabled={currentPage === 1} 
          on:click={() => goToPage(currentPage - 1)}
        >
          <i class="fa-solid fa-chevron-left"></i> Previous
        </button>

        <div style="display:flex; gap:0.25rem;">
          {#each Array(totalPages) as _, idx}
            {@const pageNum = idx + 1}
            {#if pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)}
              <button 
                class="btn {currentPage === pageNum ? 'btn-primary' : 'btn-outline'}" 
                style="padding:0.45rem 0.75rem; font-size:0.85rem; min-width:38px;"
                on:click={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            {:else if pageNum === currentPage - 3 || pageNum === currentPage + 3}
              <span style="padding:0.45rem 0.3rem; color:var(--text-muted);">...</span>
            {/if}
          {/each}
        </div>

        <button 
          class="btn btn-outline" 
          style="padding:0.45rem 0.85rem; font-size:0.85rem;"
          disabled={currentPage === totalPages} 
          on:click={() => goToPage(currentPage + 1)}
        >
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    {/if}
  {/if}
</section>
