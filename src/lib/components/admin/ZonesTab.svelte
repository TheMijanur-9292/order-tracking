<script>
  import { getPageList, ZONE_PAGE_SIZE } from '$lib/utils/pagination.js';

  export let zones;
  export let visibleZones;
  export let hiddenZonesCount;
  export let bulkSetZoneVisibility;
  export let openAddZone;
  export let zoneSearch;
  export let zoneVisibilityFilter;
  export let toggleZoneVisibility;
  export let deleteZone;
  export let zonePage;

  $: filteredZones = zones.filter(z => {
    const q = zoneSearch.toLowerCase().trim();
    const nameMatch = !q || z.name.toLowerCase().includes(q);
    const isVis = z.is_visible !== false && z.is_visible !== 0;
    const visMatch = zoneVisibilityFilter === 'all' || (zoneVisibilityFilter === 'visible' ? isVis : !isVis);
    return nameMatch && visMatch;
  });

  $: zoneTotalPages = Math.ceil(filteredZones.length / ZONE_PAGE_SIZE) || 1;
  $: paginatedZones = filteredZones.slice((zonePage - 1) * ZONE_PAGE_SIZE, zonePage * ZONE_PAGE_SIZE);
</script>

<div class="admin-toolbar" style="justify-content:space-between; flex-wrap:wrap; gap:0.85rem;">
  <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
    <h3 style="margin:0;">Kolkata Zones List ({zones.length})</h3>
    <span style="font-size:0.78rem; font-weight:700; padding:0.25rem 0.65rem; border-radius:20px; background:rgba(16,185,129,0.14); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:0.35rem;">
      <i class="fa-solid fa-eye"></i> Visible: {visibleZones.length}
    </span>
    {#if hiddenZonesCount > 0}
      <span style="font-size:0.78rem; font-weight:700; padding:0.25rem 0.65rem; border-radius:20px; background:rgba(245,158,11,0.14); color:var(--amber-accent); border:1px solid rgba(245,158,11,0.3); display:inline-flex; align-items:center; gap:0.35rem;">
        <i class="fa-solid fa-eye-slash"></i> Hidden: {hiddenZonesCount}
      </span>
    {/if}
  </div>

  <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
    <button class="btn btn-outline" style="padding:0.45rem 0.85rem; font-size:0.8rem;" on:click={() => bulkSetZoneVisibility(true)} title="Show all zones on frontend">
      <i class="fa-solid fa-eye" style="color:var(--emerald-accent);"></i> Show All
    </button>
    <button class="btn btn-outline" style="padding:0.45rem 0.85rem; font-size:0.8rem;" on:click={() => bulkSetZoneVisibility(false)} title="Hide all zones from frontend">
      <i class="fa-solid fa-eye-slash" style="color:var(--amber-accent);"></i> Hide All
    </button>
    <button class="btn btn-primary" on:click={openAddZone}>
      <i class="fa-solid fa-plus"></i> Add New Zone
    </button>
  </div>
</div>

<div class="admin-toolbar" style="margin-top:0.75rem; gap:0.75rem; flex-wrap:wrap;">
  <div class="search-box" style="flex:1; min-width:220px;">
    <i class="fa-solid fa-magnifying-glass search-icon"></i>
    <input type="text" placeholder="Search zone name..." bind:value={zoneSearch} />
  </div>

  <div style="display:flex; gap:0.4rem;">
    <button class="btn {zoneVisibilityFilter === 'all' ? 'btn-primary' : 'btn-outline'}" style="padding:0.4rem 0.85rem; font-size:0.8rem;" on:click={() => zoneVisibilityFilter = 'all'}>
      All ({zones.length})
    </button>
    <button class="btn {zoneVisibilityFilter === 'visible' ? 'btn-primary' : 'btn-outline'}" style="padding:0.4rem 0.85rem; font-size:0.8rem;" on:click={() => zoneVisibilityFilter = 'visible'}>
      <i class="fa-solid fa-eye"></i> Visible ({visibleZones.length})
    </button>
    <button class="btn {zoneVisibilityFilter === 'hidden' ? 'btn-primary' : 'btn-outline'}" style="padding:0.4rem 0.85rem; font-size:0.8rem;" on:click={() => zoneVisibilityFilter = 'hidden'}>
      <i class="fa-solid fa-eye-slash"></i> Hidden ({hiddenZonesCount})
    </button>
  </div>
</div>

<div class="zones-crud-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(295px, 1fr)); gap:1rem; margin-top:1rem;">
  {#each paginatedZones as z (z.id)}
    {@const isVis = z.is_visible !== false && z.is_visible !== 0}
    {@const totalR = Number(z.total_restaurants || 0)}
    {@const ordR = Number(z.ordered_count || 0)}
    {@const pct = totalR > 0 ? Math.round((ordR / totalR) * 100) : 0}
    <div 
      class="admin-box-card" 
      style="display:flex; flex-direction:column; gap:0.65rem; transition:all 0.2s ease; {!isVis ? 'opacity:0.68; border-style:dashed; background:var(--input-bg);' : 'border-color:rgba(16,185,129,0.28);'}"
    >
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
        <div style="min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <h4 style="font-size:1.02rem; font-family:'Outfit', sans-serif; margin:0; {!isVis ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">
              <i class="fa-solid fa-location-dot" style="color:{isVis ? 'var(--primary-accent)' : 'var(--text-muted)'}"></i> {z.name}
            </h4>
            {#if isVis}
              <span style="font-size:0.68rem; font-weight:700; padding:0.12rem 0.48rem; border-radius:12px; background:rgba(16,185,129,0.14); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.3);">
                ON
              </span>
            {:else}
              <span style="font-size:0.68rem; font-weight:700; padding:0.12rem 0.48rem; border-radius:12px; background:rgba(245,158,11,0.15); color:var(--amber-accent); border:1px solid rgba(245,158,11,0.3);">
                HIDDEN
              </span>
            {/if}
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:0.25rem 0 0 0; display:flex; align-items:center; gap:0.45rem;">
            <span><strong>{totalR}</strong> Restaurants</span>
            <span>•</span>
            <span style="color:var(--emerald-accent); font-weight:700;">{ordR} Ordered ({pct}%)</span>
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:0.55rem; flex-shrink:0;">
          <button
            type="button"
            on:click={() => toggleZoneVisibility(z)}
            title={isVis ? 'Zone is VISIBLE on frontend (Click to Hide)' : 'Zone is HIDDEN from frontend (Click to Show)'}
            style="position:relative; width:46px; height:25px; border-radius:25px; border:none; cursor:pointer; transition:background 0.25s ease; background:{isVis ? '#10b981' : 'rgba(148,163,184,0.45)'}; padding:0; display:inline-flex; align-items:center;"
            aria-label="Toggle Zone Visibility"
          >
            <span
              style="position:absolute; top:3px; left:{isVis ? '24px' : '3px'}; width:19px; height:19px; border-radius:50%; background:#ffffff; box-shadow:0 1px 4px rgba(0,0,0,0.25); transition:left 0.22s cubic-bezier(0.4, 0, 0.2, 1); display:flex; align-items:center; justify-content:center; font-size:0.62rem; color:{isVis ? '#10b981' : '#64748b'};"
            >
              <i class="fa-solid {isVis ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </span>
          </button>

          {#if totalR > 0}
            <span
              class="locked-badge"
              title="এই জোনটিতে {totalR}টি রেস্তোরাঁ আছে তাই ডিলিট লক করা। ফ্রন্টএন্ড থেকে লুকাতে চাইলে পাশের সুইচটি অফ করুন।"
              style="padding:0.3rem 0.5rem; font-size:0.72rem; cursor:not-allowed;"
            >
              <i class="fa-solid fa-lock"></i>
            </span>
          {:else}
            <button class="icon-btn icon-btn-danger" on:click={() => deleteZone(z)} title="Delete Empty Zone">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          {/if}
        </div>
      </div>

      <!-- Zone Progress Bar -->
      <div style="width:100%; height:6px; background:var(--border-color); border-radius:99px; overflow:hidden;">
        <div style="height:100%; width:{pct}%; background:linear-gradient(90deg, var(--emerald-accent), #34d399); border-radius:99px; transition:width 0.3s ease;"></div>
      </div>
    </div>
  {/each}
</div>

<!-- ZONES PAGINATION BAR -->
{#if zoneTotalPages > 1}
  <div class="pagination-wrapper">
    <div class="pagination-info">
      Showing <strong>{(zonePage - 1) * ZONE_PAGE_SIZE + 1}</strong> - <strong>{Math.min(zonePage * ZONE_PAGE_SIZE, filteredZones.length)}</strong> of <strong>{filteredZones.length}</strong> zones
    </div>
    <div class="pagination-controls">
      <button class="pagination-btn" disabled={zonePage === 1} on:click={() => { zonePage--; }} title="Previous Page">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      {#each getPageList(zonePage, zoneTotalPages) as p}
        {#if p === '...'}
          <span class="pagination-ellipsis">...</span>
        {:else}
          <button class="pagination-btn {zonePage === p ? 'active' : ''}" on:click={() => { zonePage = p; }}>{p}</button>
        {/if}
      {/each}
      <button class="pagination-btn" disabled={zonePage === zoneTotalPages} on:click={() => { zonePage++; }} title="Next Page">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  </div>
{/if}
