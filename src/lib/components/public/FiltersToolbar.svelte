<script>
  export let searchInputEl = undefined;
  export let searchQuery;
  export let currentZoneId;
  export let isZoneDropdownOpen;
  export let totalAllCount;
  export let selectedZoneObj;
  export let selectZone;
  export let zonesData;
  export let distanceFilter;
  export let isDistanceDropdownOpen;
  export let isStatusDropdownOpen;
  export let selectDistance;
  export let availableDistances;
  export let statusFilter;
  export let totalOrdered;
  export let totalPending;
  export let selectStatus;
</script>

<!-- TOOLBAR & FILTERS -->
<section class="toolbar">
  <div class="search-box">
    <div class="search-icon-badge">
      <i class="fa-solid fa-magnifying-glass"></i>
    </div>
    <input 
      type="text" 
      bind:this={searchInputEl}
      placeholder="Search restaurant, receiver name, distance, address..." 
      bind:value={searchQuery} 
    />
    {#if searchQuery}
      <button class="search-clear-btn" on:click={() => searchQuery = ''} title="Clear Search">
        <i class="fa-solid fa-xmark"></i>
      </button>
    {/if}
  </div>

  <div class="filter-group">
    <!-- CUSTOM STYLED ZONE DROPDOWN WITH ICON AND PILL BADGE -->
    <div class="custom-zone-dropdown">
      <button 
        type="button" 
        class="zone-dropdown-trigger {currentZoneId !== 'all' ? 'active-zone' : ''}" 
        on:click|stopPropagation={() => isZoneDropdownOpen = !isZoneDropdownOpen}
      >
        {#if currentZoneId === 'all'}
          <i class="fa-solid fa-globe"></i>
          <span class="zone-name-txt">All Zones</span>
          <span class="tab-badge">{totalAllCount}</span>
        {:else}
          <i class="fa-solid fa-location-dot"></i>
          <span class="zone-name-txt">{selectedZoneObj ? selectedZoneObj.name : 'Zone'}</span>
          <span class="tab-badge">{selectedZoneObj ? (selectedZoneObj.ordered_count || 0) : 0}/{selectedZoneObj ? (selectedZoneObj.total_restaurants || 0) : 0}</span>
        {/if}
        <i class="fa-solid fa-chevron-down arrow-icon"></i>
      </button>

      {#if isZoneDropdownOpen}
        <div class="zone-dropdown-menu">
          <button 
            type="button" 
            class="zone-dropdown-item {currentZoneId === 'all' ? 'selected' : ''}" 
            on:click={() => selectZone('all')}
          >
            <span class="item-left">
              <i class="fa-solid fa-globe"></i>
              <span>All Zones</span>
            </span>
            <span class="tab-badge">{totalAllCount}</span>
          </button>

          {#each zonesData as z}
            {@const zTot = Number(z.total_restaurants || 0)}
            {@const zOrd = Number(z.ordered_count || 0)}
            {@const zPct = zTot > 0 ? Math.round((zOrd / zTot) * 100) : 0}
            <button 
              type="button" 
              class="zone-dropdown-item {currentZoneId == z.id ? 'selected' : ''}" 
              on:click={() => selectZone(z.id)}
            >
              <span class="item-left" style="flex-direction:column; align-items:flex-start; gap:0.2rem; flex:1;">
                <span style="display:flex; align-items:center; gap:0.45rem;">
                  <i class="fa-solid fa-location-dot"></i>
                  <span>{z.name}</span>
                </span>
                <span style="width:100%; height:4px; background:rgba(148,163,184,0.2); border-radius:999px; overflow:hidden; display:block;">
                  <span style="width:{zPct}%; height:100%; background:{zPct === 100 ? '#10b981' : '#f59e0b'}; display:block;"></span>
                </span>
              </span>
              <span class="tab-badge">{zOrd}/{zTot}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- CUSTOM STYLED DISTANCE DROPDOWN -->
    <div class="custom-zone-dropdown">
      <button 
        type="button" 
        class="zone-dropdown-trigger {distanceFilter !== 'all' ? 'active-zone' : ''}" 
        on:click|stopPropagation={() => {
          isDistanceDropdownOpen = !isDistanceDropdownOpen;
          isZoneDropdownOpen = false;
          isStatusDropdownOpen = false;
        }}
      >
        <i class="fa-solid fa-route"></i>
        <span class="zone-name-txt">{distanceFilter === 'all' ? 'All Distances' : distanceFilter}</span>
        <i class="fa-solid fa-chevron-down arrow-icon"></i>
      </button>

      {#if isDistanceDropdownOpen}
        <div class="zone-dropdown-menu">
          <button 
            type="button" 
            class="zone-dropdown-item {distanceFilter === 'all' ? 'selected' : ''}" 
            on:click={() => selectDistance('all')}
          >
            <span class="item-left">
              <i class="fa-solid fa-layer-group"></i>
              <span>All Distances</span>
            </span>
          </button>

          {#each availableDistances as dist}
            <button 
              type="button" 
              class="zone-dropdown-item {distanceFilter === dist ? 'selected' : ''}" 
              on:click={() => selectDistance(dist)}
            >
              <span class="item-left">
                <i class="fa-solid fa-route"></i>
                <span>{dist}</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- CUSTOM STYLED STATUS DROPDOWN -->
    <div class="custom-zone-dropdown">
      <button 
        type="button" 
        class="zone-dropdown-trigger {statusFilter !== 'all' ? 'active-zone' : ''}" 
        on:click|stopPropagation={() => {
          isStatusDropdownOpen = !isStatusDropdownOpen;
          isZoneDropdownOpen = false;
          isDistanceDropdownOpen = false;
        }}
      >
        {#if statusFilter === 'all'}
          <i class="fa-solid fa-list-check"></i>
          <span class="zone-name-txt">All Status</span>
        {:else if statusFilter === 'Ordered'}
          <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
          <span class="zone-name-txt">Ordered Only</span>
          <span class="tab-badge">{totalOrdered}</span>
        {:else}
          <i class="fa-solid fa-clock" style="color: #f59e0b;"></i>
          <span class="zone-name-txt">Pending Only</span>
          <span class="tab-badge">{totalPending}</span>
        {/if}
        <i class="fa-solid fa-chevron-down arrow-icon"></i>
      </button>

      {#if isStatusDropdownOpen}
        <div class="zone-dropdown-menu">
          <button 
            type="button" 
            class="zone-dropdown-item {statusFilter === 'all' ? 'selected' : ''}" 
            on:click={() => selectStatus('all')}
          >
            <span class="item-left">
              <i class="fa-solid fa-list-check"></i>
              <span>All Status</span>
            </span>
            <span class="tab-badge">{totalAllCount}</span>
          </button>

          <button 
            type="button" 
            class="zone-dropdown-item {statusFilter === 'Ordered' ? 'selected' : ''}" 
            on:click={() => selectStatus('Ordered')}
          >
            <span class="item-left">
              <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
              <span>Ordered Only</span>
            </span>
            <span class="tab-badge">{totalOrdered}</span>
          </button>

          <button 
            type="button" 
            class="zone-dropdown-item {statusFilter === 'Pending' ? 'selected' : ''}" 
            on:click={() => selectStatus('Pending')}
          >
            <span class="item-left">
              <i class="fa-solid fa-clock" style="color: #f59e0b;"></i>
              <span>Pending Only</span>
            </span>
            <span class="tab-badge">{totalPending}</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>
