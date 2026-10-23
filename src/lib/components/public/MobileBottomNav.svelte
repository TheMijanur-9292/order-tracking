<script>
  import { isAdmin, isLoginModalOpen } from '$lib/authStore.js';

  export let scrollToTop;
  export let openAddModal;
  export let showImportModal;
  export let focusSearch;
  export let scrollToStats;
</script>

<!-- MOBILE APP BOTTOM QUICK ACTION BAR (ROLE SPECIFIC) -->
<nav class="mobile-bottom-nav">
  {#if $isAdmin}
    <!-- ADMIN QUICK ACTIONS -->
    <button type="button" class="bottom-nav-item active" on:click={scrollToTop} title="Tracker Home">
      <div class="nav-icon-box"><i class="fa-solid fa-house"></i></div>
      <span class="nav-label">Home</span>
    </button>

    <button type="button" class="bottom-nav-item prominent-action" on:click={openAddModal} title="Add Restaurant">
      <div class="prominent-circle"><i class="fa-solid fa-plus"></i></div>
      <span class="nav-label">Add New</span>
    </button>

    <button type="button" class="bottom-nav-item" on:click={() => showImportModal = true} title="Import Excel">
      <div class="nav-icon-box"><i class="fa-solid fa-file-excel"></i></div>
      <span class="nav-label">Import</span>
    </button>

    <a href="/admin" class="bottom-nav-item" title="Admin Workspace Hub">
      <div class="nav-icon-box"><i class="fa-solid fa-user-shield"></i></div>
      <span class="nav-label">Admin Hub</span>
    </a>
  {:else}
    <!-- NORMAL / GUEST USER QUICK ACTIONS -->
    <button type="button" class="bottom-nav-item active" on:click={scrollToTop} title="Home Tracker">
      <div class="nav-icon-box"><i class="fa-solid fa-compass"></i></div>
      <span class="nav-label">Explore</span>
    </button>

    <button type="button" class="bottom-nav-item" on:click={focusSearch} title="Search & Filter">
      <div class="nav-icon-box"><i class="fa-solid fa-magnifying-glass"></i></div>
      <span class="nav-label">Search</span>
    </button>

    <button type="button" class="bottom-nav-item" on:click={scrollToStats} title="Summary Stats">
      <div class="nav-icon-box"><i class="fa-solid fa-chart-pie"></i></div>
      <span class="nav-label">Stats</span>
    </button>

    <button type="button" class="bottom-nav-item" on:click={() => isLoginModalOpen.set(true)} title="Admin Login">
      <div class="nav-icon-box"><i class="fa-solid fa-lock"></i></div>
      <span class="nav-label">Admin Login</span>
    </button>
  {/if}
</nav>
