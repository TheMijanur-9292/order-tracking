<script>
  import { getPageList, PAGE_SIZE } from '$lib/utils/pagination.js';

  export let isLoadingSuggestions;
  export let suggestionsStats;
  export let suggMonthFilter;
  export let suggZoneFilter;
  export let fetchSuggestions;
  export let visibleZones;
  export let suggSlotFilter;
  export let timeSlots;
  export let suggSearchQuery;
  export let suggDistanceFilter;
  export let selectSuggestionDistance;
  export let availableDistances;
  export let suggStrategyFilter;
  export let selectSuggestionStrategy;
  export let topReceiverSuggestions;
  export let applyTopReceiver;
  export let suggestionsList;
  export let copyDispatchText;
  export let openQuickOrder;
  export let suggPage;

  $: suggTotalPages = Math.ceil(suggestionsList.length / PAGE_SIZE) || 1;
  $: paginatedSuggestions = suggestionsList.slice((suggPage - 1) * PAGE_SIZE, suggPage * PAGE_SIZE);
</script>

<div class="tab-content-animated" style="display:flex; flex-direction:column; gap:1.5rem;">

  <!-- TOP METRICS SUMMARY ROW -->
  <div class="suggestions-top-grid">
    <div class="sugg-metric-card">
      <div class="sugg-metric-icon" style="background:rgba(59,130,246,0.15); color:#3b82f6;">
        <i class="fa-solid fa-utensils"></i>
      </div>
      <div class="sugg-metric-info">
        <span class="sugg-metric-title">Matching Joints</span>
        <span class="sugg-metric-num">
          {#if isLoadingSuggestions}
            <span class="skeleton-shimmer" style="width:40px; height:24px; display:inline-block;"></span>
          {:else}
            {suggestionsStats.total_matching}
          {/if}
        </span>
      </div>
    </div>

    <div class="sugg-metric-card">
      <div class="sugg-metric-icon" style="background:rgba(245,158,11,0.15); color:#f59e0b;">
        <i class="fa-solid fa-trophy"></i>
      </div>
      <div class="sugg-metric-info">
        <span class="sugg-metric-title">Proven Repeat Picks</span>
        <span class="sugg-metric-num">
          {#if isLoadingSuggestions}
            <span class="skeleton-shimmer" style="width:40px; height:24px; display:inline-block;"></span>
          {:else}
            {suggestionsStats.total_proven}
          {/if}
        </span>
      </div>
    </div>

    <div class="sugg-metric-card">
      <div class="sugg-metric-icon" style="background:rgba(16,185,129,0.15); color:#10b981;">
        <i class="fa-solid fa-seedling"></i>
      </div>
      <div class="sugg-metric-info">
        <span class="sugg-metric-title">Fresh Untapped</span>
        <span class="sugg-metric-num">
          {#if isLoadingSuggestions}
            <span class="skeleton-shimmer" style="width:40px; height:24px; display:inline-block;"></span>
          {:else}
            {suggestionsStats.total_fresh}
          {/if}
        </span>
      </div>
    </div>

    <div class="sugg-metric-card">
      <div class="sugg-metric-icon" style="background:rgba(168,85,247,0.15); color:#a855f7;">
        <i class="fa-solid fa-calendar-check"></i>
      </div>
      <div class="sugg-metric-info">
        <span class="sugg-metric-title">Pending ({suggMonthFilter})</span>
        <span class="sugg-metric-num">
          {#if isLoadingSuggestions}
            <span class="skeleton-shimmer" style="width:40px; height:24px; display:inline-block;"></span>
          {:else}
            {suggestionsStats.total_pending_this_month}
          {/if}
        </span>
      </div>
    </div>
  </div>

  <!-- SMART CONTROL DECK -->
  <div class="suggestions-control-panel">
    <!-- ROW 1: PRIMARY FILTERS (ZONE, TARGET MONTH, TIME SLOT, SEARCH) -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; align-items:flex-end;">
      <div class="form-group" style="margin-bottom:0;">
        <label style="font-weight:700; font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fa-solid fa-map-location-dot" style="color:var(--primary-accent);"></i> Select Zone *
        </label>
        <select class="form-control" bind:value={suggZoneFilter} on:change={fetchSuggestions}>
          <option value="all">📍 All Visible Zones ({visibleZones.length})</option>
          {#each visibleZones as z}
            <option value={z.id}>{z.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group" style="margin-bottom:0;">
        <label style="font-weight:700; font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fa-solid fa-calendar-days" style="color:var(--amber-accent);"></i> Target Ordering Month
        </label>
        <input 
          type="month" 
          class="form-control" 
          bind:value={suggMonthFilter} 
          on:change={fetchSuggestions}
        />
      </div>

      <div class="form-group" style="margin-bottom:0;">
        <label style="font-weight:700; font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fa-solid fa-clock" style="color:var(--emerald-accent);"></i> Preferred Time Slot
        </label>
        <select class="form-control" bind:value={suggSlotFilter} on:change={fetchSuggestions}>
          <option value="all">All Time Slots</option>
          {#each timeSlots as slot}
            <option value={slot.slot_name}>{slot.slot_name} ({slot.start_time})</option>
          {/each}
        </select>
      </div>

      <div class="form-group" style="margin-bottom:0;">
        <label style="font-weight:700; font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">
          <i class="fa-solid fa-magnifying-glass"></i> Search Joint / Address
        </label>
        <input 
          type="text" 
          class="form-control" 
          placeholder="Type name or address..." 
          bind:value={suggSearchQuery} 
          on:input={fetchSuggestions}
        />
      </div>
    </div>

    <!-- ROW 2: INTERACTIVE DISTANCE CHIPS -->
    <div>
      <div class="filter-section-title">
        <i class="fa-solid fa-route" style="color:var(--primary-accent);"></i> Filter by Distance Range:
      </div>
      <div class="distance-chips-container">
        <button 
          class="distance-chip-btn {suggDistanceFilter === 'all' ? 'active' : ''}" 
          on:click={() => selectSuggestionDistance('all')}
        >
          <i class="fa-solid fa-arrows-left-right-to-line"></i> All Distances
        </button>
        {#each availableDistances as dist}
          <button 
            class="distance-chip-btn {suggDistanceFilter === dist ? 'active' : ''}" 
            on:click={() => selectSuggestionDistance(dist)}
          >
            <i class="fa-solid fa-location-arrow"></i> {dist}
          </button>
        {/each}
      </div>
    </div>

    <!-- ROW 3: STRATEGY TABS -->
    <div>
      <div class="filter-section-title">
        <i class="fa-solid fa-brain" style="color:#ec4899;"></i> Smart Recommendation Mode:
      </div>
      <div class="strategy-tabs-bar">
        <button 
          class="strategy-tab-btn {suggStrategyFilter === 'all' ? 'active' : ''}" 
          on:click={() => selectSuggestionStrategy('all')}
        >
          <i class="fa-solid fa-wand-magic-sparkles" style="color:#ec4899;"></i> All Smart Matches ({suggestionsStats.total_matching})
        </button>

        <button 
          class="strategy-tab-btn {suggStrategyFilter === 'proven' ? 'active' : ''}" 
          on:click={() => selectSuggestionStrategy('proven')}
        >
          <i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Proven & Frequent ({suggestionsStats.total_proven})
        </button>

        <button 
          class="strategy-tab-btn {suggStrategyFilter === 'fresh' ? 'active' : ''}" 
          on:click={() => selectSuggestionStrategy('fresh')}
        >
          <i class="fa-solid fa-seedling" style="color:#3b82f6;"></i> Fresh Untapped ({suggestionsStats.total_fresh})
        </button>

        <button 
          class="strategy-tab-btn {suggStrategyFilter === 'last_month' ? 'active' : ''}" 
          on:click={() => selectSuggestionStrategy('last_month')}
        >
          <i class="fa-solid fa-bolt" style="color:#10b981;"></i> Last Month Picks ({suggestionsStats.total_last_month ?? 0})
        </button>
      </div>
    </div>

    <!-- ROW 4: TOP RECEIVER SUGGESTIONS IN THIS ZONE -->
    {#if topReceiverSuggestions.length > 0}
      <div class="top-receivers-banner">
        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:700; color:#8b5cf6;">
          <i class="fa-solid fa-user-check"></i> Most Frequent Receivers in this Area:
        </div>
        <div class="top-receivers-chips">
          {#each topReceiverSuggestions as topRec}
            <button class="receiver-quick-pill" on:click={() => applyTopReceiver(topRec)} title="Click to quickly preselect this receiver">
              <i class="fa-solid fa-user"></i> {topRec.name} <span style="opacity:0.75; font-size:0.75rem;">({topRec.count}x)</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- SUGGESTIONS CARDS GRID -->
  {#if isLoadingSuggestions}
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:1.25rem;">
      {#each Array(6) as _}
        <div class="suggestion-card" style="height:210px; display:flex; flex-direction:column; gap:0.8rem;">
          <div class="skeleton-shimmer" style="width:70%; height:24px;"></div>
          <div class="skeleton-shimmer" style="width:40%; height:16px;"></div>
          <div class="skeleton-shimmer" style="width:100%; height:50px; margin-top:auto;"></div>
        </div>
      {/each}
    </div>
  {:else if suggestionsList.length === 0}
    <div class="empty-state-box" style="padding:3.5rem 1.5rem; text-align:center; background:var(--bg-card); border:1px dashed var(--border-color); border-radius:var(--radius-lg);">
      <i class="fa-solid fa-magnifying-glass-location" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem; opacity:0.6;"></i>
      <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">No Restaurants Found</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; max-width:450px; margin:0 auto 1.25rem auto;">
        No restaurants match your selected Zone and Distance ({suggDistanceFilter}). Try selecting another distance tier or clearing filters.
      </p>
      <button class="btn btn-outline" on:click={() => { suggZoneFilter = 'all'; suggDistanceFilter = 'all'; suggStrategyFilter = 'all'; fetchSuggestions(); }}>
        <i class="fa-solid fa-rotate-left"></i> Reset All Filters
      </button>
    </div>
  {:else}
    <div class="suggestions-grid">
      {#each paginatedSuggestions as item (item.id)}
        <div class="suggestion-card card-{item.tag_type}">
          <!-- CARD HEADER -->
          <div class="sugg-card-header">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <h3 class="sugg-rest-name" style="margin:0;">{item.name}</h3>
                {#if item.is_seeded || item.is_seeded === 1 || item.is_seeded === true}
                  <span class="badge-source badge-list">
                    <i class="fa-solid fa-list-check"></i> LIST
                  </span>
                {:else}
                  <span class="badge-source badge-extra">
                    <i class="fa-solid fa-folder-plus"></i> EXTRA
                  </span>
                {/if}
              </div>
              <div class="sugg-meta-row" style="margin-top:0.35rem;">
                <span class="sugg-zone-pill"><i class="fa-solid fa-map-pin"></i> {item.zone_name}</span>
                <span class="sugg-dist-pill"><i class="fa-solid fa-route"></i> {item.distance}</span>
                {#if item.platform === 'Both'}
                  <span style="font-size:0.75rem; color:#fc8019; font-weight:700;"><i class="fa-solid fa-bolt"></i> Swiggy & Zomato</span>
                {:else if item.platform === 'Swiggy'}
                  <span style="font-size:0.75rem; color:#fc8019; font-weight:700;">Swiggy Only</span>
                {:else if item.platform === 'Zomato'}
                  <span style="font-size:0.75rem; color:#cb202d; font-weight:700;">Zomato Only</span>
                {/if}
              </div>
            </div>

            <span class="sugg-badge sugg-badge-{item.tag_type}">
              {item.recommendation_tag}
            </span>
          </div>

          <!-- ADDRESS -->
          {#if item.address}
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              <i class="fa-solid fa-location-dot" style="color:var(--text-muted); opacity:0.75;"></i> {item.address}
            </p>
          {/if}

          <!-- HISTORY LOG & INSIGHTS BOX -->
          <div class="sugg-history-box">
            <div class="sugg-history-header">
              <span><i class="fa-solid fa-clock-rotate-left"></i> Ordering History</span>
              <span style="font-weight:700; color:{item.history_count > 0 ? 'var(--emerald-accent)' : 'var(--text-muted)'};">
                {item.history_count > 0 ? `${item.history_count}x Orders in History` : 'Never Ordered'}
              </span>
            </div>

            {#if item.latest_history}
              <div style="font-size:0.8rem; color:var(--text-main); display:flex; flex-direction:column; gap:0.2rem;">
                <div>
                  <strong>Last Order:</strong> {item.latest_history.month_year} ({item.latest_history.time_slot || 'Lunch'})
                  {#if item.latest_history.ordered_at}
                    <span style="color:var(--text-muted); font-size:0.75rem;"> • {new Date(item.latest_history.ordered_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                  {/if}
                </div>
                {#if item.latest_history.receiver_name}
                  <div style="color:var(--purple-accent); font-weight:600; font-size:0.78rem;">
                    <i class="fa-solid fa-user"></i> Receiver: {item.latest_history.receiver_name}
                    {#if item.latest_history.receiver_phone}
                      <span style="color:var(--text-muted);"> ({item.latest_history.receiver_phone})</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else}
              <div style="color:var(--text-muted); font-style:italic; font-size:0.78rem;">
                ✨ Fresh candidate! No prior orders logged yet.
              </div>
            {/if}
          </div>

          <!-- ACTIONS ROW -->
          <div class="sugg-actions-row">
            <button 
              class="btn btn-outline" 
              style="padding:0.45rem 0.85rem; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.4rem;" 
              on:click={() => copyDispatchText(item)} 
              title="Copy formatted dispatch info"
            >
              <i class="fa-solid fa-copy"></i>
              <span>Copy Info</span>
            </button>

            <button 
              class="btn {item.is_ordered_target_month ? 'btn-outline' : 'btn-primary'}" 
              style="padding:0.45rem 1.1rem; font-size:0.85rem; margin-left:auto; font-weight:700; display:inline-flex; align-items:center; gap:0.45rem;"
              on:click={() => openQuickOrder(item)}
            >
              {#if item.is_ordered_target_month}
                <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i> Ordered for {suggMonthFilter}
              {:else}
                <i class="fa-solid fa-paper-plane"></i> Quick Order
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- SUGGESTIONS PAGINATION BAR -->
    {#if suggTotalPages > 1}
      <div class="pagination-wrapper">
        <div class="pagination-info">
          Showing <strong>{(suggPage - 1) * PAGE_SIZE + 1}</strong> - <strong>{Math.min(suggPage * PAGE_SIZE, suggestionsList.length)}</strong> of <strong>{suggestionsList.length}</strong> restaurants
        </div>
        <div class="pagination-controls">
          <button 
            class="pagination-btn" 
            disabled={suggPage === 1} 
            on:click={() => { suggPage--; }} 
            title="Previous Page"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          {#each getPageList(suggPage, suggTotalPages) as p}
            {#if p === '...'}
              <span class="pagination-ellipsis">...</span>
            {:else}
              <button 
                class="pagination-btn {suggPage === p ? 'active' : ''}" 
                on:click={() => { suggPage = p; }}
              >
                {p}
              </button>
            {/if}
          {/each}
          <button 
            class="pagination-btn" 
            disabled={suggPage === suggTotalPages} 
            on:click={() => { suggPage++; }} 
            title="Next Page"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
