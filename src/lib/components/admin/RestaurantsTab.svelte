<script>
  import { getPageList, PAGE_SIZE } from '$lib/utils/pagination.js';

  export let restaurants;
  export let restSearch;
  export let restZoneFilter;
  export let restDistanceFilter;
  export let restPlatformFilter;
  export let restSourceFilter;
  export let visibleZones;
  export let openAddRest;
  export let copyText;
  export let copiedFieldId;
  export let openEditRest;
  export let deleteRest;
  export let restPage;

  $: filteredRestaurants = restaurants.filter(r => {
    const q = restSearch.toLowerCase().trim();
    const nameMatch = r.name.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q);
    const zoneMatch = restZoneFilter === 'all' || r.zone_id == restZoneFilter;
    const distMatch = restDistanceFilter === 'all' || (r.distance || '').toLowerCase().trim() === restDistanceFilter.toLowerCase().trim() || (r.distance || '').includes(restDistanceFilter);
    const platMatch = restPlatformFilter === 'all' || r.platform === restPlatformFilter || r.platform === 'Both';
    const sourceMatch = restSourceFilter === 'all' || (restSourceFilter === 'list' ? r.is_seeded : !r.is_seeded);
    return nameMatch && zoneMatch && distMatch && platMatch && sourceMatch;
  });

  $: restTotalPages = Math.ceil(filteredRestaurants.length / PAGE_SIZE) || 1;
  $: paginatedRestaurants = filteredRestaurants.slice((restPage - 1) * PAGE_SIZE, restPage * PAGE_SIZE);
</script>

<div class="admin-toolbar">
  <div class="search-box" style="flex:1; min-width:250px;">
    <i class="fa-solid fa-magnifying-glass search-icon"></i>
    <input type="text" placeholder="Search restaurant or address..." bind:value={restSearch} />
  </div>

  <select class="select-filter" bind:value={restZoneFilter}>
    <option value="all">All Visible Zones ({visibleZones.length})</option>
    {#each visibleZones as z}<option value={z.id}>{z.name}</option>{/each}
  </select>

  <select class="select-filter" bind:value={restDistanceFilter}>
    <option value="all">All Distances</option>
    <option value="A. 0-1">A. 0-1</option>
    <option value="B. 1-2">B. 1-2</option>
    <option value="C. 2-3">C. 2-3</option>
    <option value="D. 3-5">D. 3-5</option>
    <option value="E. 5-7">E. 5-7</option>
    <option value="F. 7+">F. 7+</option>
  </select>

  <select class="select-filter" bind:value={restPlatformFilter}>
    <option value="all">All Platforms</option>
    <option value="Swiggy">Swiggy</option>
    <option value="Zomato">Zomato</option>
    <option value="Both">Both</option>
  </select>

  <select class="select-filter" bind:value={restSourceFilter}>
    <option value="all">All Sources</option>
    <option value="list">LIST (Seeded)</option>
    <option value="extra">EXTRA (Custom)</option>
  </select>

  <button class="btn btn-primary" on:click={openAddRest}>
    <i class="fa-solid fa-plus"></i> Add Restaurant
  </button>
</div>

<div class="admin-table-wrapper">
  <table class="admin-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Restaurant Name</th>
        <th>Zone</th>
        <th>Distance</th>
        <th>Platform</th>
        <th>Address & Copy</th>
        <th>Source</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each paginatedRestaurants as r (r.id)}
        <tr>
          <td>#{r.id}</td>
          <td><strong>{r.name}</strong></td>
          <td><span class="count-badge"><i class="fa-solid fa-location-dot"></i> {r.zone_name || 'Zone'}</span></td>
          <td>
            {#if r.distance}
              <span class="badge" style="background:rgba(59,130,246,0.12); color:var(--primary-accent); font-weight:700; border:1px solid rgba(59,130,246,0.25); padding:0.2rem 0.55rem; border-radius:12px; font-size:0.78rem; display:inline-flex; align-items:center; gap:0.3rem; white-space:nowrap;">
                <i class="fa-solid fa-route"></i> {r.distance}
              </span>
            {:else}
              <span style="color:var(--text-muted); font-size:0.8rem;">—</span>
            {/if}
          </td>
          <td>
            {#if r.platform === 'Swiggy'}<span class="badge-platform badge-swiggy">Swiggy</span>
            {:else if r.platform === 'Zomato'}<span class="badge-platform badge-zomato">Zomato</span>
            {:else}<span class="badge-platform badge-swiggy">Swiggy</span> <span class="badge-platform badge-zomato">Zomato</span>
            {/if}
          </td>
          <td style="max-width:260px;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; font-size:0.82rem;">{r.address || 'N/A'}</span>
              <button class="btn-copy-inline" on:click={() => copyText(`tbl-rest-${r.id}`, r.address)} title="Copy Address">
                {#if copiedFieldId === `tbl-rest-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.zone_name || ''} Kolkata`)}`}
                target="_blank"
                rel="noopener noreferrer"
                class="btn-copy-inline"
                title="Open in Google Maps"
                style="color:var(--primary-accent); text-decoration:none;"
              >
                <i class="fa-solid fa-map-location-dot"></i>
              </a>
            </div>
          </td>
          <td>
            {#if r.is_seeded || r.is_seeded === 1}
              <span class="badge-source badge-list">LIST</span>
            {:else}
              <span class="badge-source badge-extra">EXTRA</span>
            {/if}
          </td>
          <td>
            {#if r.is_seeded || r.is_seeded === 1}
              <span class="locked-badge"><i class="fa-solid fa-lock"></i> Locked</span>
            {:else}
              <div style="display:flex; gap:0.3rem;">
                <button class="icon-btn" on:click={() => openEditRest(r)} title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="icon-btn icon-btn-danger" on:click={() => deleteRest(r)} title="Delete"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- RESTAURANTS PAGINATION BAR -->
  {#if restTotalPages > 1}
    <div class="pagination-wrapper">
      <div class="pagination-info">
        Showing <strong>{(restPage - 1) * PAGE_SIZE + 1}</strong> - <strong>{Math.min(restPage * PAGE_SIZE, filteredRestaurants.length)}</strong> of <strong>{filteredRestaurants.length}</strong> restaurants
      </div>
      <div class="pagination-controls">
        <button 
          class="pagination-btn" 
          disabled={restPage === 1} 
          on:click={() => { restPage--; }} 
          title="Previous Page"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        {#each getPageList(restPage, restTotalPages) as p}
          {#if p === '...'}
            <span class="pagination-ellipsis">...</span>
          {:else}
            <button 
              class="pagination-btn {restPage === p ? 'active' : ''}" 
              on:click={() => { restPage = p; }}
            >
              {p}
            </button>
          {/if}
        {/each}
        <button 
          class="pagination-btn" 
          disabled={restPage === restTotalPages} 
          on:click={() => { restPage++; }} 
          title="Next Page"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  {/if}
</div>
