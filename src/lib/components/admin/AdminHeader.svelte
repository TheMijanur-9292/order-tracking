<script>
  import { userStore, isAdmin, logoutUser } from '$lib/authStore.js';

  export let toggleMobileDrawer;
  export let activeTab;
  export let toggleTheme;
  export let currentTheme;
</script>

<!-- ADMIN TOP HEADER BAR -->
<header class="admin-header">
  <div class="header-left">
    <button class="mobile-hamburger-btn" on:click={toggleMobileDrawer} title="Open Menu">
      <i class="fa-solid fa-bars"></i>
    </button>
    <h2 class="page-title">
      {#if activeTab === 'overview'}<i class="fa-solid fa-chart-line"></i> Dashboard Overview
      {:else if activeTab === 'suggestions'}<i class="fa-solid fa-wand-magic-sparkles" style="color:#ec4899;"></i> Smart Order Suggestions
      {:else if activeTab === 'restaurants'}<i class="fa-solid fa-utensils"></i> Restaurant Manager
      {:else if activeTab === 'history'}<i class="fa-solid fa-clock-rotate-left"></i> Order History & Analytics
      {:else if activeTab === 'zones'}<i class="fa-solid fa-map-location-dot"></i> Kolkata Zones Manager
      {:else if activeTab === 'receivers'}<i class="fa-solid fa-users"></i> Receiver Addresses Manager
      {:else if activeTab === 'timeslots'}<i class="fa-solid fa-clock"></i> Time Slot Management
      {:else if activeTab === 'import'}<i class="fa-solid fa-file-excel"></i> Excel / CSV Bulk Importer
      {:else if activeTab === 'account'}<i class="fa-solid fa-user-gear"></i> Account & Admin Users
      {/if}
    </h2>
  </div>

  <div class="header-right">
    {#if $isAdmin}
      <div class="admin-user-pill">
        <i class="fa-solid fa-user-shield"></i>
        <span class="desktop-only-txt">Admin: {$userStore?.email}</span>
      </div>

      <button class="btn btn-outline icon-btn-sm" on:click={logoutUser} title="Logout">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span class="desktop-only-txt">Logout</span>
      </button>
    {/if}

    <button class="theme-toggle-btn icon-btn-sm" on:click={toggleTheme} title="Toggle Theme">
      <i class={currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
      <span class="desktop-only-txt">{currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>

    <a href="/" class="btn btn-primary icon-btn-sm" style="text-decoration:none;" title="View Mode App">
      <i class="fa-solid fa-eye"></i>
      <span class="desktop-only-txt">View Mode App</span>
    </a>
  </div>
</header>
