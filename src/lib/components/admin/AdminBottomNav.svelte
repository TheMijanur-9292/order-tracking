<script>
  export let activeTab;
  export let selectAdminTab;
</script>

<!-- ADMIN MOBILE BOTTOM BAR -->
<nav class="mobile-bottom-nav">
  <a href="/" class="bottom-nav-item" title="Back to Main Tracker">
    <div class="nav-icon-box"><i class="fa-solid fa-house"></i></div>
    <span class="nav-label">Tracker</span>
  </a>

  <button type="button" class="bottom-nav-item {activeTab === 'suggestions' ? 'active' : ''}" on:click={() => selectAdminTab('suggestions')} title="Smart Suggestions">
    <div class="nav-icon-box"><i class="fa-solid fa-lightbulb"></i></div>
    <span class="nav-label">Suggestions</span>
  </button>

  <button type="button" class="bottom-nav-item {activeTab === 'restaurants' ? 'active' : ''}" on:click={() => selectAdminTab('restaurants')} title="Restaurants">
    <div class="nav-icon-box"><i class="fa-solid fa-store"></i></div>
    <span class="nav-label">Restaurants</span>
  </button>

  <button type="button" class="bottom-nav-item {activeTab === 'history' ? 'active' : ''}" on:click={() => selectAdminTab('history')} title="Order History">
    <div class="nav-icon-box"><i class="fa-solid fa-clock-rotate-left"></i></div>
    <span class="nav-label">History</span>
  </button>

  <button type="button" class="bottom-nav-item {activeTab === 'overview' ? 'active' : ''}" on:click={() => selectAdminTab('overview')} title="Overview Hub">
    <div class="nav-icon-box"><i class="fa-solid fa-gauge-high"></i></div>
    <span class="nav-label">Hub</span>
  </button>
</nav>
