<script>
  export let isMobileDrawerOpen;
  export let closeMobileDrawer;
  export let activeTab;
  export let selectAdminTab;
  export let isLoadingAllData;
  export let restaurants;
  export let orderHistoryList;
  export let zones;
  export let receivers;
  export let timeSlots;
</script>

<!-- MOBILE DRAWER BACKDROP -->
{#if isMobileDrawerOpen}
  <div class="admin-drawer-backdrop" on:click={closeMobileDrawer}></div>
{/if}

<!-- SIDEBAR NAVIGATION (DESKTOP DOCKED & MOBILE DRAWER) -->
<aside class="admin-sidebar {isMobileDrawerOpen ? 'is-drawer-open' : ''}">
  <div class="sidebar-brand">
    <div style="display:flex; align-items:center; gap:0.6rem;">
      <div class="brand-icon"><i class="fa-solid fa-shield-halved"></i></div>
      <div>
        <h2 class="sidebar-title">Admin Workspace</h2>
        <span class="sidebar-subtitle">Superadmin Control</span>
      </div>
    </div>
    <button class="mobile-drawer-close-btn" on:click={closeMobileDrawer} title="Close Menu">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>

  <nav class="sidebar-menu">
    <button 
      class="sidebar-item {activeTab === 'overview' ? 'active' : ''}" 
      on:click={() => selectAdminTab('overview')}
    >
      <i class="fa-solid fa-chart-line"></i>
      <span>Overview & Stats</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'suggestions' ? 'active' : ''}" 
      on:click={() => selectAdminTab('suggestions')}
    >
      <i class="fa-solid fa-wand-magic-sparkles" style="color: #ec4899;"></i>
      <span>Order Suggestion</span>
      <span class="badge-ai-sparkle">Smart</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'restaurants' ? 'active' : ''}" 
      on:click={() => selectAdminTab('restaurants')}
    >
      <i class="fa-solid fa-utensils"></i>
      <span>Restaurants {#if isLoadingAllData}<span class="skeleton-pill"></span>{:else}({restaurants.length}){/if}</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'history' ? 'active' : ''}" 
      on:click={() => selectAdminTab('history')}
    >
      <i class="fa-solid fa-clock-rotate-left"></i>
      <span>Order History {#if isLoadingAllData}<span class="skeleton-pill"></span>{:else}({orderHistoryList.length}){/if}</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'zones' ? 'active' : ''}" 
      on:click={() => selectAdminTab('zones')}
    >
      <i class="fa-solid fa-map-location-dot"></i>
      <span>Zones {#if isLoadingAllData}<span class="skeleton-pill"></span>{:else}({zones.length}){/if}</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'receivers' ? 'active' : ''}" 
      on:click={() => selectAdminTab('receivers')}
    >
      <i class="fa-solid fa-users"></i>
      <span>Receivers {#if isLoadingAllData}<span class="skeleton-pill"></span>{:else}({receivers.length}){/if}</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'timeslots' ? 'active' : ''}" 
      on:click={() => selectAdminTab('timeslots')}
    >
      <i class="fa-solid fa-clock"></i>
      <span>Time Slots {#if isLoadingAllData}<span class="skeleton-pill"></span>{:else}({timeSlots.length}){/if}</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'import' ? 'active' : ''}" 
      on:click={() => selectAdminTab('import')}
    >
      <i class="fa-solid fa-file-excel"></i>
      <span>Excel Importer</span>
    </button>

    <button 
      class="sidebar-item {activeTab === 'account' ? 'active' : ''}" 
      on:click={() => selectAdminTab('account')}
    >
      <i class="fa-solid fa-user-gear"></i>
      <span>Account & Admins</span>
    </button>
  </nav>

  <div class="sidebar-footer">
    <a href="/" class="btn btn-outline mode-switch-btn" style="text-decoration:none; width:100%;">
      <i class="fa-solid fa-eye"></i> Switch to View Mode
    </a>
  </div>
</aside>
