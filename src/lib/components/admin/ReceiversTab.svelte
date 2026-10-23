<script>
  import { getPageList, PAGE_SIZE } from '$lib/utils/pagination.js';
  import { formatAdminMonthHeader as formatMonthHeader } from '$lib/utils/date.js';

  export let receivers;
  export let recSearch;
  export let receiverMonthFilter;
  export let fetchReceivers;
  export let currentMonth;
  export let availableReceiverMonths;
  export let openAddRec;
  export let copyText;
  export let copiedFieldId;
  export let openEditRec;
  export let deleteRec;
  export let recPage;

  $: filteredReceivers = receivers.filter(rec => {
    const q = recSearch.toLowerCase().trim();
    return rec.name.toLowerCase().includes(q) || (rec.address || '').toLowerCase().includes(q) || (rec.phone || '').toLowerCase().includes(q);
  });

  $: recTotalPages = Math.ceil(filteredReceivers.length / PAGE_SIZE) || 1;
  $: paginatedReceivers = filteredReceivers.slice((recPage - 1) * PAGE_SIZE, recPage * PAGE_SIZE);
</script>

<div class="admin-toolbar" style="flex-wrap:wrap; gap:0.75rem;">
  <div class="search-box" style="flex:1; min-width:240px;">
    <i class="fa-solid fa-magnifying-glass search-icon"></i>
    <input type="text" placeholder="Search receiver name, phone or address..." bind:value={recSearch} />
  </div>

  <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
    <label style="font-size:0.82rem; font-weight:700; color:var(--text-muted); display:flex; align-items:center; gap:0.35rem;">
      <i class="fa-regular fa-calendar-days" style="color:var(--primary-accent)"></i> Month:
    </label>
    <select class="select-filter" bind:value={receiverMonthFilter} on:change={fetchReceivers} style="min-width:180px;">
      <option value={currentMonth}>Current: {formatMonthHeader(currentMonth)}</option>
      <option value="all">All Months (All-Time)</option>
      {#each availableReceiverMonths.filter(m => m !== currentMonth) as m}
        <option value={m}>{formatMonthHeader(m)} ({m})</option>
      {/each}
    </select>
  </div>

  <button class="btn btn-purple" on:click={openAddRec}><i class="fa-solid fa-user-plus"></i> Add Receiver</button>
</div>

<div class="admin-table-wrapper">
  <table class="admin-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name / Label</th>
        <th>Phone Number</th>
        <th>Full Address</th>
        <th>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <i class="fa-solid fa-box-open" style="color:var(--primary-accent)"></i>
            <span>Orders ({receiverMonthFilter === 'all' ? 'All Months' : formatMonthHeader(receiverMonthFilter)})</span>
          </div>
        </th>
        <th>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <i class="fa-solid fa-receipt" style="color:var(--emerald-accent)"></i>
            <span>All-Time Total</span>
          </div>
        </th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each paginatedReceivers as rec (rec.id)}
        <tr>
          <td>#{rec.id}</td>
          <td>
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <strong>{rec.name}</strong>
              <button class="btn-copy-inline" on:click={() => copyText(`tbl-rec-name-${rec.id}`, rec.name)} title="Copy Name">
                {#if copiedFieldId === `tbl-rec-name-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
              </button>
              {#if rec.today_order_count > 0}
                <span style="font-size:0.68rem; font-weight:700; padding:0.12rem 0.45rem; border-radius:10px; background:rgba(245,158,11,0.16); color:var(--amber-accent); border:1px solid rgba(245,158,11,0.35);">
                  <i class="fa-solid fa-triangle-exclamation"></i> {rec.today_order_count} Today
                </span>
              {/if}
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span>{rec.phone || 'N/A'}</span>
              {#if rec.phone}
                <button class="btn-copy-inline" on:click={() => copyText(`tbl-rec-phone-${rec.id}`, rec.phone)} title="Copy Phone">
                  {#if copiedFieldId === `tbl-rec-phone-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                </button>
              {/if}
            </div>
          </td>
          <td style="max-width:280px;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:210px; font-size:0.82rem;">{rec.address}</span>
              <button class="btn-copy-inline" on:click={() => copyText(`tbl-rec-addr-${rec.id}`, rec.address)} title="Copy Address">
                {#if copiedFieldId === `tbl-rec-addr-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                class="btn-copy-inline"
                title="Open Receiver Address in Google Maps"
                style="color:var(--primary-accent); text-decoration:none;"
              >
                <i class="fa-solid fa-map-location-dot"></i>
              </a>
            </div>
          </td>
          <td>
            {#if rec.month_order_count > 0}
              <span class="badge" style="background:rgba(59,130,246,0.15); color:var(--primary-accent); font-weight:800; border:1px solid rgba(59,130,246,0.3); padding:0.25rem 0.65rem; border-radius:14px; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <i class="fa-solid fa-box-open"></i> {rec.month_order_count} Orders
              </span>
            {:else}
              <span style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">0 Orders</span>
            {/if}
          </td>
          <td>
            {#if rec.total_order_count > 0}
              <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--emerald-accent); font-weight:800; border:1px solid rgba(16,185,129,0.3); padding:0.25rem 0.65rem; border-radius:14px; font-size:0.82rem; display:inline-flex; align-items:center; gap:0.35rem;">
                <i class="fa-solid fa-receipt"></i> {rec.total_order_count} Total
              </span>
            {:else}
              <span style="color:var(--text-muted); font-size:0.8rem;">0 Total</span>
            {/if}
          </td>
          <td>
            <div style="display:flex; gap:0.3rem;">
              <button
                class="icon-btn"
                on:click={() => copyText(`tbl-rec-full-${rec.id}`, `${rec.name}\nPhone: ${rec.phone || 'N/A'}\nAddress: ${rec.address}`)}
                title="Copy Full Receiver Details"
              >
                {#if copiedFieldId === `tbl-rec-full-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-solid fa-clipboard"></i>{/if}
              </button>
              <button class="icon-btn" on:click={() => openEditRec(rec)} title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
              <button class="icon-btn icon-btn-danger" on:click={() => deleteRec(rec)} title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <!-- RECEIVERS PAGINATION BAR -->
  {#if recTotalPages > 1}
    <div class="pagination-wrapper">
      <div class="pagination-info">
        Showing <strong>{(recPage - 1) * PAGE_SIZE + 1}</strong> - <strong>{Math.min(recPage * PAGE_SIZE, filteredReceivers.length)}</strong> of <strong>{filteredReceivers.length}</strong> receivers
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" disabled={recPage === 1} on:click={() => { recPage--; }} title="Previous Page">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        {#each getPageList(recPage, recTotalPages) as p}
          {#if p === '...'}
            <span class="pagination-ellipsis">...</span>
          {:else}
            <button class="pagination-btn {recPage === p ? 'active' : ''}" on:click={() => { recPage = p; }}>{p}</button>
          {/if}
        {/each}
        <button class="pagination-btn" disabled={recPage === recTotalPages} on:click={() => { recPage++; }} title="Next Page">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  {/if}
</div>
