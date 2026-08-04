<script>
  import { onMount } from 'svelte';
  import { userStore, isAdmin, isLoginModalOpen, authLoading, logoutUser } from '$lib/authStore.js';


  // Active Admin Sidebar Tab: 'overview' | 'restaurants' | 'zones' | 'receivers' | 'timeslots' | 'history' | 'import'
  let activeTab = 'overview';

  // ORDER HISTORY MODULE STATE
  let orderHistoryList = [];
  let orderHistoryStats = { total_orders: 0, total_ordered: 0, total_pending: 0, unique_receivers: 0 };
  let availableHistoryMonths = [];
  let historyMonthFilter = 'all';
  let historyStatusFilter = 'all';
  let historyZoneFilter = 'all';
  let historySlotFilter = 'all';
  let historySearchQuery = '';
  let isLoadingHistory = false;

  let selectedHistoryItem = null;
  let showHistoryDetailModal = false;

  // Data Collections
  let zones = [];
  let restaurants = [];
  let receivers = [];
  let timeSlots = [];

  // Stats
  let totalZones = 0;
  let totalRestaurants = 0;
  let totalReceivers = 0;
  let totalOrdered = 0;
  let totalPending = 0;
  let currentMonth = getCurrentMonthString();

  // Search & Filter
  let restSearch = '';
  let restZoneFilter = 'all';
  let restPlatformFilter = 'all';
  let restSourceFilter = 'all';

  let recSearch = '';

  // Theme & Toast
  let currentTheme = 'light';
  let toastMessage = '';
  let toastType = 'success';
  let toastVisible = false;

  // Modals
  let showRestModal = false;
  let editRestId = null;
  let restZoneId = '';
  let restName = '';
  let restPlatform = 'Both';
  let restDistance = '2-3 km';
  let restAddress = '';

  let showZoneModal = false;
  let editZoneId = null;
  let zoneName = '';
  let zoneDesc = '';

  let showRecModal = false;
  let editRecId = null;
  let recName = '';
  let recPhone = '';
  let recAddress = '';

  // TIME SLOTS MODAL STATE
  let showSlotModal = false;
  let editSlotId = null;
  let slotName = '';
  let slotStartTime = '';
  let slotEndTime = '';
  let slotIcon = 'fa-clock';
  let slotColor = '#3b82f6';
  let slotOrder = 1;

  // CUSTOM CONFIRMATION MODAL STATE
  let showConfirmModal = false;
  let confirmTitle = '';
  let confirmMessage = '';
  let confirmBtnText = 'Confirm Action';
  let confirmBtnIcon = 'fa-check';
  let isConfirmDanger = false;
  let isExecutingConfirm = false;
  let pendingDeleteAction = null; // function to execute on confirm

  let importFile = null;
  let importZoneId = '';
  let importNewZone = '';
  let fileNameText = '';

  let copiedFieldId = null;

  function getCurrentMonthString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function showToast(msg, type = 'success') {
    toastMessage = msg;
    toastType = type;
    toastVisible = true;
    setTimeout(() => { toastVisible = false; }, 3500);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`);
  }

  // Global Loading State
  let isLoadingAllData = true;

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    loadAllData();
  });

  $: if (!$authLoading && !$isAdmin) {
    isLoginModalOpen.set(true);
    showToast('Admin login required to perform write actions', 'error');
  }

  async function loadAllData() {
    isLoadingAllData = true;
    try {
      await Promise.all([fetchZones(), fetchRestaurants(), fetchReceivers(), fetchTimeSlots(), fetchStats(), fetchOrderHistory()]);
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingAllData = false;
    }
  }

  async function fetchOrderHistory() {
    isLoadingHistory = true;
    try {
      const queryParams = new URLSearchParams({
        month_year: historyMonthFilter,
        status: historyStatusFilter,
        zone_id: historyZoneFilter,
        time_slot: historySlotFilter,
        search: historySearchQuery
      });
      const res = await fetch(`/api/orders/history?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        orderHistoryList = data.history;
        orderHistoryStats = data.stats;
        availableHistoryMonths = data.available_months || [];
      }
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      isLoadingHistory = false;
    }
  }

  function exportHistoryToCSV() {
    if (orderHistoryList.length === 0) return showToast('No history records to export', 'error');
    const headers = ['Order ID', 'Month', 'Restaurant', 'Zone', 'Status', 'Time Slot', 'Platform', 'Receiver Name', 'Receiver Phone', 'Receiver Address', 'Ordered At'];
    const rows = orderHistoryList.map(h => [
      h.id,
      `"${h.month_year}"`,
      `"${(h.restaurant_name || '').replace(/"/g, '""')}"`,
      `"${(h.zone_name || '').replace(/"/g, '""')}"`,
      `"${h.status}"`,
      `"${h.time_slot || 'Lunch'}"`,
      `"${h.platform_used || 'Swiggy/Zomato'}"`,
      `"${(h.receiver_name || 'N/A').replace(/"/g, '""')}"`,
      `"${(h.receiver_phone || 'N/A').replace(/"/g, '""')}"`,
      `"${(h.receiver_address || 'N/A').replace(/"/g, '""')}"`,
      `"${h.ordered_at ? new Date(h.ordered_at).toLocaleString('en-IN') : 'Pending'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Order_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported Order History to CSV!');
  }

  async function resetHistoryOrderStatus(item) {
    requestConfirmation(
      'Reset Order Status?',
      `Reset order status for "${item.restaurant_name}" back to Pending for ${item.month_year}?`,
      async () => {
        try {
          const res = await fetch('/api/orders/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: item.restaurant_id,
              month_year: item.month_year,
              action: 'reset'
            })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Order reset to Pending');
            await Promise.all([fetchOrderHistory(), loadAllData()]);
          } else {
            showToast(data.error || 'Failed to reset order', 'error');
          }
        } catch (e) {
          showToast('Error resetting order', 'error');
        }
      },
      'Reset Order',
      'fa-rotate-left',
      false
    );
  }

  function openHistoryDetail(item) {
    selectedHistoryItem = item;
    showHistoryDetailModal = true;
  }

  async function fetchZones() {
    try {
      const res = await fetch(`/api/zones?month_year=${currentMonth}`);
      const data = await res.json();
      if (data.success) zones = data.zones;
    } catch (e) { console.error(e); }
  }

  async function fetchRestaurants() {
    try {
      const res = await fetch(`/api/restaurants?month_year=${currentMonth}&zone_id=all`);
      const data = await res.json();
      if (data.success) restaurants = data.restaurants;
    } catch (e) { console.error(e); }
  }

  async function fetchReceivers() {
    try {
      const res = await fetch('/api/receivers');
      const data = await res.json();
      if (data.success) receivers = data.receivers;
    } catch (e) { console.error(e); }
  }

  async function fetchTimeSlots() {
    try {
      const res = await fetch('/api/time-slots');
      const data = await res.json();
      if (data.success) timeSlots = data.time_slots;
    } catch (e) { console.error(e); }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`/api/stats?month_year=${currentMonth}`);
      const data = await res.json();
      if (data.success) {
        totalZones = data.total_zones;
        totalRestaurants = data.total_restaurants;
        totalOrdered = data.total_ordered;
        totalPending = data.total_pending;
      }
    } catch (e) { console.error(e); }
  }

  // Reactive Derived Lists
  $: filteredRestaurants = restaurants.filter(r => {
    const q = restSearch.toLowerCase().trim();
    const nameMatch = r.name.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q);
    const zoneMatch = restZoneFilter === 'all' || r.zone_id == restZoneFilter;
    const platMatch = restPlatformFilter === 'all' || r.platform === restPlatformFilter || r.platform === 'Both';
    const sourceMatch = restSourceFilter === 'all' || (restSourceFilter === 'list' ? r.is_seeded : !r.is_seeded);
    return nameMatch && zoneMatch && platMatch && sourceMatch;
  });

  $: filteredReceivers = receivers.filter(rec => {
    const q = recSearch.toLowerCase().trim();
    return rec.name.toLowerCase().includes(q) || (rec.address || '').toLowerCase().includes(q) || (rec.phone || '').toLowerCase().includes(q);
  });

  function copyText(id, text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copiedFieldId = id;
      showToast('Copied to clipboard!');
      setTimeout(() => { if (copiedFieldId === id) copiedFieldId = null; }, 1800);
    });
  }

  // HELPER TO TRIGGER CUSTOM CONFIRM MODAL
  function requestConfirmation(title, message, actionFn, btnText = 'Confirm Action', btnIcon = 'fa-check', isDanger = true) {
    confirmTitle = title;
    confirmMessage = message;
    confirmBtnText = btnText;
    confirmBtnIcon = btnIcon;
    isConfirmDanger = isDanger;
    pendingDeleteAction = actionFn;
    showConfirmModal = true;
  }

  async function executeConfirmedAction() {
    if (isExecutingConfirm) return;
    isExecutingConfirm = true;
    try {
      if (pendingDeleteAction) {
        await pendingDeleteAction();
      }
    } catch (err) {
      console.error('Error executing confirmed action:', err);
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      showConfirmModal = false;
      pendingDeleteAction = null;
      isExecutingConfirm = false;
    }
  }

  // RESTAURANTS CRUD
  function openAddRest() {
    editRestId = null;
    restName = '';
    restPlatform = 'Both';
    restDistance = '2-3 km';
    restAddress = '';
    restZoneId = zones.length > 0 ? zones[0].id : '';
    showRestModal = true;
  }

  function openEditRest(r) {
    if (r.is_seeded) {
      return showToast('Seeded LIST restaurants cannot be edited!', 'error');
    }
    editRestId = r.id;
    restZoneId = r.zone_id;
    restName = r.name;
    restPlatform = r.platform || 'Both';
    restDistance = r.distance || '2-3 km';
    restAddress = r.address || '';
    showRestModal = true;
  }

  async function saveRest() {
    if (!restName.trim()) return showToast('Restaurant name is required', 'error');
    try {
      const url = editRestId ? `/api/restaurants/${editRestId}` : '/api/restaurants';
      const method = editRestId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: restZoneId,
          name: restName,
          platform: restPlatform,
          distance: restDistance,
          address: restAddress
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(editRestId ? 'Restaurant updated!' : 'Restaurant added!');
        showRestModal = false;
        loadAllData();
      } else { showToast(data.error || 'Failed to save', 'error'); }
    } catch (e) { showToast('Error saving restaurant', 'error'); }
  }

  function deleteRest(r) {
    if (r.is_seeded) return showToast('Seeded LIST restaurants cannot be deleted!', 'error');
    requestConfirmation(
      'Delete Restaurant?',
      `Are you sure you want to delete "${r.name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/restaurants/${r.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showToast('Restaurant deleted'); loadAllData(); }
        } catch (e) { showToast('Delete failed', 'error'); }
      }
    );
  }

  // ZONES CRUD
  function openAddZone() {
    editZoneId = null;
    zoneName = '';
    zoneDesc = '';
    showZoneModal = true;
  }

  async function saveZone() {
    if (!zoneName.trim()) return showToast('Zone name is required', 'error');
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: zoneName, description: zoneDesc })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Zone created!');
        showZoneModal = false;
        loadAllData();
      } else { showToast(data.error || 'Failed to create zone', 'error'); }
    } catch (e) { showToast('Error adding zone', 'error'); }
  }

  function deleteZone(z) {
    requestConfirmation(
      'Delete Zone?',
      `Deleting zone "${z.name}" will also delete all associated restaurants! Are you sure?`,
      async () => {
        try {
          const res = await fetch(`/api/zones/${z.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showToast('Zone deleted'); loadAllData(); }
        } catch (e) { showToast('Error deleting zone', 'error'); }
      }
    );
  }

  // RECEIVERS CRUD
  function openAddRec() {
    editRecId = null;
    recName = '';
    recPhone = '';
    recAddress = '';
    showRecModal = true;
  }

  function openEditRec(rec) {
    editRecId = rec.id;
    recName = rec.name;
    recPhone = rec.phone || '';
    recAddress = rec.address;
    showRecModal = true;
  }

  async function saveRec() {
    if (!recName.trim()) return showToast('Receiver name is required', 'error');
    if (!recAddress.trim()) return showToast('Receiver address is required', 'error');
    try {
      const url = editRecId ? `/api/receivers/${editRecId}` : '/api/receivers';
      const method = editRecId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recName, phone: recPhone, address: recAddress })
      });
      const data = await res.json();
      if (data.success) {
        showToast(editRecId ? 'Receiver updated!' : 'Receiver added!');
        showRecModal = false;
        fetchReceivers();
      } else { showToast(data.error || 'Failed to save receiver', 'error'); }
    } catch (e) { showToast('Error saving receiver', 'error'); }
  }

  function deleteRec(rec) {
    requestConfirmation(
      'Delete Receiver?',
      `Are you sure you want to delete receiver "${rec.name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/receivers/${rec.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showToast('Receiver deleted'); fetchReceivers(); }
        } catch (e) { showToast('Delete failed', 'error'); }
      }
    );
  }

  // TIME SLOTS CRUD
  function openAddTimeSlot() {
    editSlotId = null;
    slotName = '';
    slotStartTime = '07:00 AM';
    slotEndTime = '11:00 AM';
    slotIcon = 'fa-clock';
    slotColor = '#3b82f6';
    slotOrder = timeSlots.length + 1;
    showSlotModal = true;
  }

  function openEditTimeSlot(slot) {
    editSlotId = slot.id;
    slotName = slot.slot_name;
    slotStartTime = slot.start_time;
    slotEndTime = slot.end_time;
    slotIcon = slot.icon || 'fa-clock';
    slotColor = slot.color_theme || '#3b82f6';
    slotOrder = slot.display_order || 1;
    showSlotModal = true;
  }

  async function saveTimeSlot() {
    if (!slotName.trim() || !slotStartTime.trim() || !slotEndTime.trim()) {
      return showToast('Slot Name, Start Time, and End Time are required', 'error');
    }
    try {
      const url = editSlotId ? `/api/time-slots/${editSlotId}` : '/api/time-slots';
      const method = editSlotId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_name: slotName,
          start_time: slotStartTime,
          end_time: slotEndTime,
          icon: slotIcon,
          color_theme: slotColor,
          display_order: slotOrder
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(editSlotId ? 'Time slot updated!' : 'Time slot added!');
        showSlotModal = false;
        fetchTimeSlots();
      } else { showToast(data.error || 'Failed to save time slot', 'error'); }
    } catch (e) { showToast('Error saving time slot', 'error'); }
  }

  function deleteTimeSlot(slot) {
    requestConfirmation(
      'Delete Time Slot?',
      `Are you sure you want to delete time slot "${slot.slot_name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/time-slots/${slot.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) { showToast('Time slot deleted'); fetchTimeSlots(); }
        } catch (e) { showToast('Delete failed', 'error'); }
      }
    );
  }

  // EXCEL IMPORT
  function handleFile(e) {
    if (e.target.files.length > 0) {
      importFile = e.target.files[0];
      fileNameText = `Selected: ${importFile.name}`;
    }
  }

  async function uploadExcel() {
    if (!importFile) return showToast('Please select file', 'error');
    if (!importZoneId && !importNewZone.trim()) return showToast('Select or enter zone', 'error');

    const formData = new FormData();
    formData.append('excelFile', importFile);
    formData.append('zone_id', importZoneId);
    formData.append('new_zone_name', importNewZone.trim());

    showToast('Importing Excel list...');
    try {
      const res = await fetch('/api/upload-excel', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        importFile = null;
        fileNameText = '';
        activeTab = 'restaurants';
        loadAllData();
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (e) { showToast('Import error', 'error'); }
  }

  // MOBILE DRAWER STATE
  let isMobileDrawerOpen = false;
  function toggleMobileDrawer() { isMobileDrawerOpen = !isMobileDrawerOpen; }
  function closeMobileDrawer() { isMobileDrawerOpen = false; }
  function selectAdminTab(tab) {
    activeTab = tab;
    isMobileDrawerOpen = false;
    if (tab === 'history') fetchOrderHistory();
  }
</script>

<div class="admin-wrapper">
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
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="btn btn-outline mode-switch-btn" style="text-decoration:none; width:100%;">
        <i class="fa-solid fa-eye"></i> Switch to View Mode
      </a>
    </div>
  </aside>

  <!-- MAIN ADMIN CONTENT AREA -->
  <div class="admin-main">
    <!-- ADMIN TOP HEADER BAR -->
    <header class="admin-header">
      <div class="header-left">
        <button class="mobile-hamburger-btn" on:click={toggleMobileDrawer} title="Open Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <h2 class="page-title">
          {#if activeTab === 'overview'}<i class="fa-solid fa-chart-line"></i> Dashboard Overview
          {:else if activeTab === 'restaurants'}<i class="fa-solid fa-utensils"></i> Restaurant Manager
          {:else if activeTab === 'history'}<i class="fa-solid fa-clock-rotate-left"></i> Order History & Analytics
          {:else if activeTab === 'zones'}<i class="fa-solid fa-map-location-dot"></i> Kolkata Zones Manager
          {:else if activeTab === 'receivers'}<i class="fa-solid fa-users"></i> Receiver Addresses Manager
          {:else if activeTab === 'timeslots'}<i class="fa-solid fa-clock"></i> Time Slot Management
          {:else if activeTab === 'import'}<i class="fa-solid fa-file-excel"></i> Excel / CSV Bulk Importer
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

    <div class="admin-content">
      <!-- TAB 1: OVERVIEW & STATS -->
      {#if activeTab === 'overview'}
        <div class="tab-content-animated">
          <div class="metrics-grid">
            <div class="metric-card card-total">
              <div class="metric-icon"><i class="fa-solid fa-store"></i></div>
              <div class="metric-data">
                <span class="metric-label">Total Restaurants</span>
                <span class="metric-value">
                  {#if isLoadingAllData}
                    <span class="skeleton-shimmer" style="width: 50px; height: 30px; display: inline-block;"></span>
                  {:else}
                    {totalRestaurants}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card card-zones">
              <div class="metric-icon"><i class="fa-solid fa-map-location-dot"></i></div>
              <div class="metric-data">
                <span class="metric-label">Active Zones</span>
                <span class="metric-value">
                  {#if isLoadingAllData}
                    <span class="skeleton-shimmer" style="width: 40px; height: 30px; display: inline-block;"></span>
                  {:else}
                    {totalZones}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
              <div class="metric-icon" style="background:rgba(168,85,247,0.12); color:#a855f7;"><i class="fa-solid fa-users"></i></div>
              <div class="metric-data">
                <span class="metric-label">Saved Receivers</span>
                <span class="metric-value">
                  {#if isLoadingAllData}
                    <span class="skeleton-shimmer" style="width: 45px; height: 30px; display: inline-block;"></span>
                  {:else}
                    {receivers.length}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
              <div class="metric-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;"><i class="fa-solid fa-clock"></i></div>
              <div class="metric-data">
                <span class="metric-label">Time Slots</span>
                <span class="metric-value">
                  {#if isLoadingAllData}
                    <span class="skeleton-shimmer" style="width: 40px; height: 30px; display: inline-block;"></span>
                  {:else}
                    {timeSlots.length}
                  {/if}
                </span>
              </div>
            </div>
          </div>

        <!-- QUICK ACTION CARDS -->
        <div class="quick-cards-grid" style="margin-top:1.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.2rem;">
          <div class="admin-box-card">
            <h3><i class="fa-solid fa-square-plus" style="color:var(--primary-accent)"></i> Quick Add Restaurant</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Add new food joint to any Kolkata zone instantly.</p>
            <button class="btn btn-primary" on:click={openAddRest}><i class="fa-solid fa-plus"></i> Add Restaurant</button>
          </div>

          <div class="admin-box-card">
            <h3><i class="fa-solid fa-clock" style="color:var(--amber-accent)"></i> Manage Time Slots</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Configure Breakfast, Lunch, Snacks, Dinner & Night slots.</p>
            <button class="btn btn-emerald" on:click={() => activeTab = 'timeslots'}><i class="fa-solid fa-gear"></i> Time Slots ({timeSlots.length})</button>
          </div>

          <div class="admin-box-card">
            <h3><i class="fa-solid fa-user-plus" style="color:var(--purple-accent)"></i> Quick Add Receiver</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Save new receiver delivery name, phone & address.</p>
            <button class="btn btn-purple" on:click={openAddRec}><i class="fa-solid fa-plus"></i> Add Receiver</button>
          </div>

          <div class="admin-box-card">
            <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--emerald-accent)"></i> View Order History</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">Check full logs, receivers, time slots & export CSV reports.</p>
            <button class="btn btn-emerald" on:click={() => { activeTab = 'history'; fetchOrderHistory(); }}><i class="fa-solid fa-receipt"></i> Order History ({orderHistoryList.length})</button>
          </div>
        </div>
      </div>
      {/if}

      <!-- TAB: ORDER HISTORY & ANALYTICS -->
      {#if activeTab === 'history'}
        <div class="tab-content-animated">
          <div class="metrics-grid">
            <div class="metric-card card-total">
              <div class="metric-icon"><i class="fa-solid fa-clipboard-list"></i></div>
              <div class="metric-data">
                <span class="metric-label">Total History Records</span>
                <span class="metric-value">
                  {#if isLoadingHistory}
                    <span class="skeleton-shimmer" style="width: 45px; height: 28px; display: inline-block;"></span>
                  {:else}
                    {orderHistoryStats.total_orders}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
              <div class="metric-icon" style="background:rgba(16,185,129,0.12); color:#10b981;"><i class="fa-solid fa-circle-check"></i></div>
              <div class="metric-data">
                <span class="metric-label">Marked as Ordered</span>
                <span class="metric-value">
                  {#if isLoadingHistory}
                    <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
                  {:else}
                    {orderHistoryStats.total_ordered}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
              <div class="metric-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;"><i class="fa-solid fa-hourglass-half"></i></div>
              <div class="metric-data">
                <span class="metric-label">Pending Orders</span>
                <span class="metric-value">
                  {#if isLoadingHistory}
                    <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
                  {:else}
                    {orderHistoryStats.total_pending}
                  {/if}
                </span>
              </div>
            </div>

            <div class="metric-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.2rem; display:flex; align-items:center; gap:1rem;">
              <div class="metric-icon" style="background:rgba(168,85,247,0.12); color:#a855f7;"><i class="fa-solid fa-user-check"></i></div>
              <div class="metric-data">
                <span class="metric-label">Assigned Receivers</span>
                <span class="metric-value">
                  {#if isLoadingHistory}
                    <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
                  {:else}
                    {orderHistoryStats.unique_receivers}
                  {/if}
                </span>
              </div>
            </div>
          </div>

        <div class="admin-toolbar" style="margin-top:1.5rem;">
          <div class="search-box" style="flex:1; min-width:240px;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              placeholder="Search restaurant, receiver, phone or address..." 
              bind:value={historySearchQuery} 
              on:input={fetchOrderHistory} 
            />
          </div>

          <select class="select-filter" bind:value={historyMonthFilter} on:change={fetchOrderHistory}>
            <option value="all">All Months ({availableHistoryMonths.length})</option>
            {#each availableHistoryMonths as m}
              <option value={m}>{m}</option>
            {/each}
          </select>

          <select class="select-filter" bind:value={historyStatusFilter} on:change={fetchOrderHistory}>
            <option value="all">All Statuses</option>
            <option value="Ordered">Ordered Only</option>
            <option value="Pending">Pending Only</option>
          </select>

          <select class="select-filter" bind:value={historyZoneFilter} on:change={fetchOrderHistory}>
            <option value="all">All Zones ({zones.length})</option>
            {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
          </select>

          <select class="select-filter" bind:value={historySlotFilter} on:change={fetchOrderHistory}>
            <option value="all">All Time Slots</option>
            {#each timeSlots as slot}<option value={slot.slot_name}>{slot.slot_name}</option>{/each}
          </select>

          <button class="btn btn-emerald" on:click={exportHistoryToCSV}>
            <i class="fa-solid fa-file-csv"></i> Export CSV
          </button>
        </div>

        <div class="admin-table-wrapper" style="margin-top:1rem;">
          {#if isLoadingHistory}
            <div style="text-align:center; padding:3rem; color:var(--text-muted);">
              <i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem; margin-bottom:0.5rem; display:block;"></i>
              Loading order history...
            </div>
          {:else if orderHistoryList.length === 0}
            <div style="text-align:center; padding:3rem; color:var(--text-muted);">
              <i class="fa-solid fa-receipt" style="font-size:2.5rem; opacity:0.4; margin-bottom:0.75rem; display:block;"></i>
              No order history records found matching your filters.
            </div>
          {:else}
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Month & Order ID</th>
                  <th>Restaurant & Zone</th>
                  <th>Status</th>
                  <th>Time Slot</th>
                  <th>Assigned Receiver</th>
                  <th>Ordered Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each orderHistoryList as h (h.id)}
                  <tr>
                    <td>
                      <span class="badge" style="background:var(--input-bg); border:1px solid var(--border-color); color:var(--text-main); font-weight:700;">{h.month_year}</span>
                      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">#ORD-{h.id}</div>
                    </td>
                    <td>
                      <div style="font-weight:700; font-family:'Outfit', sans-serif;">{h.restaurant_name}</div>
                      <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.25rem; flex-wrap:wrap;">
                        {#if h.zone_name}
                          <span class="zone-pill" style="font-size:0.72rem;">{h.zone_name}</span>
                        {/if}
                        {#if h.restaurant_distance || h.distance}
                          <span style="font-size:0.7rem; color:var(--primary-accent); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:0.12rem 0.45rem; border-radius:10px; font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;">
                            <i class="fa-solid fa-route" style="font-size:0.65rem;"></i> {h.restaurant_distance || h.distance}
                          </span>
                        {/if}
                      </div>
                    </td>
                    <td>
                      {#if h.status === 'Ordered'}
                        <span class="badge badge-ordered" style="background:rgba(16,185,129,0.15); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                          <i class="fa-solid fa-circle-check"></i> Ordered
                        </span>
                      {:else}
                        <span class="badge badge-pending" style="background:rgba(245,158,11,0.15); color:var(--amber-accent); border:1px solid rgba(245,158,11,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                          <i class="fa-solid fa-hourglass-half"></i> Pending
                        </span>
                      {/if}
                    </td>
                    <td>
                      {#if h.time_slot}
                        <span style="font-size:0.8rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:6px; background:rgba(59,130,246,0.12); color:var(--primary-accent); display:inline-flex; align-items:center; gap:0.3rem;">
                          <i class="fa-solid fa-clock"></i> {h.time_slot}
                        </span>
                      {:else}
                        <span style="font-size:0.78rem; color:var(--text-muted);">-</span>
                      {/if}
                    </td>
                    <td>
                      {#if h.receiver_name}
                        <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">{h.receiver_name}</div>
                        {#if h.receiver_phone}
                          <div style="font-size:0.78rem; color:var(--emerald-accent); font-weight:600;"><i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> {h.receiver_phone}</div>
                        {/if}
                        {#if h.receiver_address}
                          <div style="font-size:0.75rem; color:var(--text-muted); max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title={h.receiver_address}>
                            <i class="fa-solid fa-location-dot" style="color:var(--swiggy-color);"></i> {h.receiver_address}
                          </div>
                        {/if}
                      {:else}
                        <span style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">No receiver assigned</span>
                      {/if}
                    </td>
                    <td>
                      {#if h.ordered_at}
                        <div style="font-size:0.8rem; font-weight:600; color:var(--text-main);">{new Date(h.ordered_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted);">{new Date(h.ordered_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                      {:else}
                        <span style="font-size:0.78rem; color:var(--text-muted);">-</span>
                      {/if}
                    </td>
                    <td>
                      <div style="display:flex; gap:0.4rem;">
                        <button class="btn btn-outline" style="padding:0.3rem 0.55rem; font-size:0.75rem;" title="View Order Details" on:click={() => openHistoryDetail(h)}>
                          <i class="fa-solid fa-eye"></i> Details
                        </button>
                        {#if h.status === 'Ordered'}
                          <button class="btn btn-danger-action" style="padding:0.3rem 0.55rem; font-size:0.75rem;" title="Reset Order to Pending" on:click={() => resetHistoryOrderStatus(h)}>
                            <i class="fa-solid fa-rotate-left"></i> Reset
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      </div>
      {/if}

      <!-- TAB 2: RESTAURANTS MANAGER -->
      {#if activeTab === 'restaurants'}
        <div class="admin-toolbar">
          <div class="search-box" style="flex:1; min-width:250px;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" placeholder="Search restaurant or address..." bind:value={restSearch} />
          </div>

          <select class="select-filter" bind:value={restZoneFilter}>
            <option value="all">All Zones ({zones.length})</option>
            {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
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
                <th>Platform</th>
                <th>Address & Copy</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredRestaurants as r (r.id)}
                <tr>
                  <td>#{r.id}</td>
                  <td><strong>{r.name}</strong></td>
                  <td><span class="count-badge"><i class="fa-solid fa-location-dot"></i> {r.zone_name || 'Zone'}</span></td>
                  <td>
                    {#if r.platform === 'Swiggy'}<span class="badge-platform badge-swiggy">Swiggy</span>
                    {:else if r.platform === 'Zomato'}<span class="badge-platform badge-zomato">Zomato</span>
                    {:else}<span class="badge-platform badge-swiggy">Swiggy</span> <span class="badge-platform badge-zomato">Zomato</span>
                    {/if}
                  </td>
                  <td style="max-width:260px;">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; font-size:0.82rem;">{r.address || 'N/A'}</span>
                      <button class="btn-copy-inline" on:click={() => copyText(`tbl-rest-${r.id}`, r.address)} title="Copy Address">
                        {#if copiedFieldId === `tbl-rest-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                      </button>
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
        </div>
      {/if}

      <!-- TAB 3: ZONES MANAGER -->
      {#if activeTab === 'zones'}
        <div class="admin-toolbar" style="justify-content:space-between;">
          <h3>Kolkata Zones List ({zones.length})</h3>
          <button class="btn btn-primary" on:click={openAddZone}><i class="fa-solid fa-plus"></i> Add New Zone</button>
        </div>

        <div class="zones-crud-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem; margin-top:1rem;">
          {#each zones as z}
            <div class="admin-box-card" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="font-size:1.05rem; font-family:'Outfit', sans-serif;"><i class="fa-solid fa-location-dot" style="color:var(--primary-accent)"></i> {z.name}</h4>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">{z.total_restaurants || 0} restaurants registered</p>
              </div>
              <button class="icon-btn icon-btn-danger" on:click={() => deleteZone(z)} title="Delete Zone"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- TAB 4: RECEIVERS MANAGER -->
      {#if activeTab === 'receivers'}
        <div class="admin-toolbar">
          <div class="search-box" style="flex:1;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" placeholder="Search receiver name, phone or address..." bind:value={recSearch} />
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredReceivers as rec (rec.id)}
                <tr>
                  <td>#{rec.id}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                      <strong>{rec.name}</strong>
                      <button class="btn-copy-inline" on:click={() => copyText(`tbl-rec-name-${rec.id}`, rec.name)} title="Copy Name">
                        {#if copiedFieldId === `tbl-rec-name-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                      </button>
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
                  <td style="max-width:320px;">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px; font-size:0.82rem;">{rec.address}</span>
                      <button class="btn-copy-inline" on:click={() => copyText(`tbl-rec-addr-${rec.id}`, rec.address)} title="Copy Address">
                        {#if copiedFieldId === `tbl-rec-addr-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style="display:flex; gap:0.3rem;">
                      <button class="icon-btn" on:click={() => openEditRec(rec)} title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                      <button class="icon-btn icon-btn-danger" on:click={() => deleteRec(rec)} title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- TAB 5: TIME SLOTS MANAGER -->
      {#if activeTab === 'timeslots'}
        <div class="admin-toolbar timeslots-header-row" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-family:'Outfit', sans-serif; font-size:1.25rem;">Daily Food Time Slots ({timeSlots.length})</h3>
            <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.15rem;">Configured ordering time windows (Breakfast, Lunch, Snacks, Dinner, Late Night)</p>
          </div>
          <button class="btn btn-emerald" style="padding:0.4rem 0.8rem; font-size:0.8rem;" on:click={openAddTimeSlot}>
            <i class="fa-solid fa-plus"></i> <span class="desktop-only-txt">Add New Time Slot</span><span class="mobile-only-txt">+ Add</span>
          </button>
        </div>

        <div class="timeslots-grid-compact">
          {#each timeSlots as slot (slot.id)}
            <div class="timeslot-compact-card" style="border-left:4px solid {slot.color_theme || '#3b82f6'};">
              <div class="ts-left">
                <div class="ts-icon-box" style="color:{slot.color_theme || '#3b82f6'};">
                  <i class="fa-solid {slot.icon || 'fa-clock'}"></i>
                </div>
                <div class="ts-info">
                  <div class="ts-title-row">
                    <h4 class="ts-name">{slot.slot_name}</h4>
                    <span class="ts-order-badge">#{slot.display_order}</span>
                  </div>
                  <span class="ts-time-badge" style="color:{slot.color_theme || 'var(--text-main)'};">
                    <i class="fa-regular fa-clock"></i> {slot.start_time} - {slot.end_time}
                  </span>
                </div>
              </div>

              <div class="ts-actions">
                <button class="icon-btn" style="width:32px; height:32px; font-size:0.8rem;" on:click={() => openEditTimeSlot(slot)} title="Edit Slot"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="icon-btn icon-btn-danger" style="width:32px; height:32px; font-size:0.8rem;" on:click={() => deleteTimeSlot(slot)} title="Delete Slot"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- TAB 6: EXCEL IMPORTER -->
      {#if activeTab === 'import'}
        <div class="admin-box-card" style="max-width:600px; margin:1rem auto;">
          <h3><i class="fa-solid fa-file-excel" style="color:var(--emerald-accent)"></i> Bulk Import Restaurants</h3>
          <p style="font-size:0.88rem; color:var(--text-muted); margin-top:0.4rem;">Upload an Excel (.xlsx, .xls) or CSV file to import restaurants automatically.</p>

          <form on:submit|preventDefault={uploadExcel} style="margin-top:1.25rem;">
            <div class="form-group">
              <label>Target Zone (Select Existing)</label>
              <select class="form-control" bind:value={importZoneId}>
                <option value="">-- Select Existing Zone --</option>
                {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
              </select>
            </div>

            <div class="form-group">
              <label>Or Create New Zone Name</label>
              <input type="text" class="form-control" placeholder="e.g. Kolkata-SaltLake" bind:value={importNewZone} />
            </div>

            <div class="form-group">
              <label>Upload File</label>
              <div class="drop-zone">
                <i class="fa-solid fa-cloud-arrow-up drop-icon"></i>
                <p style="font-weight:600; font-size:0.9rem;">Click or Drag Excel File Here</p>
                <input type="file" class="file-input" accept=".xlsx, .xls, .csv" on:change={handleFile} />
              </div>
              {#if fileNameText}<span class="file-name-display">{fileNameText}</span>{/if}
            </div>

            <button type="submit" class="btn btn-emerald" style="width:100%; margin-top:1rem;">
              <i class="fa-solid fa-upload"></i> Start Excel Import
            </button>
          </form>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- MODALS FOR RESTAURANTS, ZONES, RECEIVERS & TIME SLOTS -->
{#if showRestModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-utensils"></i> {editRestId ? 'Edit Restaurant' : 'Add Restaurant'}</h3>
        <button class="btn-close" on:click={() => showRestModal = false}>&times;</button>
      </div>
      <form on:submit|preventDefault={saveRest}>
        <div class="form-group">
          <label>Zone *</label>
          <select class="form-control" bind:value={restZoneId}>
            {#each zones as z}<option value={z.id}>{z.name}</option>{/each}
          </select>
        </div>
        <div class="form-group">
          <label>Restaurant Name *</label>
          <input type="text" class="form-control" bind:value={restName} required />
        </div>
        <div class="form-group">
          <label>Platform</label>
          <select class="form-control" bind:value={restPlatform}>
            <option value="Both">Both (Swiggy & Zomato)</option>
            <option value="Swiggy">Swiggy Only</option>
            <option value="Zomato">Zomato Only</option>
          </select>
        </div>
        <div class="form-group">
          <label>Address / Landmark</label>
          <textarea class="form-control" rows="3" bind:value={restAddress}></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showRestModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Restaurant</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showZoneModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-map-location-dot"></i> Add New Zone</h3>
        <button class="btn-close" on:click={() => showZoneModal = false}>&times;</button>
      </div>
      <form on:submit|preventDefault={saveZone}>
        <div class="form-group">
          <label>Zone Name *</label>
          <input type="text" class="form-control" placeholder="e.g. Kolkata-Howrah" bind:value={zoneName} required />
        </div>
        <div class="form-group">
          <label>Description (Optional)</label>
          <input type="text" class="form-control" bind:value={zoneDesc} />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showZoneModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Zone</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showRecModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-user-plus"></i> {editRecId ? 'Edit Receiver' : 'Add Receiver'}</h3>
        <button class="btn-close" on:click={() => showRecModal = false}>&times;</button>
      </div>
      <form on:submit|preventDefault={saveRec}>
        <div class="form-group">
          <label>Receiver Name / Label *</label>
          <input type="text" class="form-control" bind:value={recName} required />
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input type="text" class="form-control" bind:value={recPhone} />
        </div>
        <div class="form-group">
          <label>Full Address *</label>
          <textarea class="form-control" rows="3" bind:value={recAddress} required></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showRecModal = false}>Cancel</button>
          <button type="submit" class="btn btn-purple">Save Receiver</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showSlotModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-clock" style="color:var(--emerald-accent)"></i> {editSlotId ? 'Edit Time Slot' : 'Add Time Slot'}</h3>
        <button class="btn-close" on:click={() => showSlotModal = false}>&times;</button>
      </div>
      <form on:submit|preventDefault={saveTimeSlot}>
        <div class="form-group">
          <label>Time Slot Name *</label>
          <input type="text" class="form-control" placeholder="e.g. Breakfast, Lunch, Snacks, Dinner" bind:value={slotName} required />
        </div>
        <div class="form-row" style="display:flex; gap:0.75rem;">
          <div class="form-group" style="flex:1;">
            <label>Start Time *</label>
            <input type="text" class="form-control" placeholder="e.g. 07:00 AM" bind:value={slotStartTime} required />
          </div>
          <div class="form-group" style="flex:1;">
            <label>End Time *</label>
            <input type="text" class="form-control" placeholder="e.g. 11:00 AM" bind:value={slotEndTime} required />
          </div>
        </div>
        <div class="form-row" style="display:flex; gap:0.75rem;">
          <div class="form-group" style="flex:1;">
            <label>FontAwesome Icon</label>
            <input type="text" class="form-control" placeholder="e.g. fa-sun, fa-utensils, fa-moon" bind:value={slotIcon} />
          </div>
          <div class="form-group" style="flex:1;">
            <label>Color Theme</label>
            <input type="color" class="form-control" style="height:42px; padding:0.2rem;" bind:value={slotColor} />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showSlotModal = false}>Cancel</button>
          <button type="submit" class="btn btn-emerald">Save Time Slot</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- DESIGNED CUSTOM CONFIRMATION MODAL -->
{#if showConfirmModal}
  <div class="modal-overlay" on:click|self={() => { if (!isExecutingConfirm) showConfirmModal = false; }}>
    <div class="modal-card confirm-modal-card">
      <div class="confirm-icon-wrapper {isConfirmDanger ? 'danger' : 'warning'}">
        <i class="fa-solid {confirmBtnIcon || 'fa-triangle-exclamation'}"></i>
      </div>
      <h3 class="confirm-title">{confirmTitle || 'Are you sure?'}</h3>
      <p class="confirm-message">{confirmMessage}</p>
      <div class="modal-footer" style="justify-content:center; gap:0.85rem; border-top:none; margin-top:1.25rem;">
        <button type="button" class="btn btn-outline" disabled={isExecutingConfirm} on:click={() => showConfirmModal = false}>Cancel</button>
        <button type="button" class="btn {isConfirmDanger ? 'btn-danger-action' : 'btn-purple'}" disabled={isExecutingConfirm} on:click={executeConfirmedAction}>
          {#if isExecutingConfirm}
            <i class="fa-solid fa-spinner fa-spin"></i> Processing...
          {:else}
            <i class="fa-solid {confirmBtnIcon}"></i> {confirmBtnText}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ORDER HISTORY DETAIL MODAL -->
{#if showHistoryDetailModal && selectedHistoryItem}
  <div class="modal-overlay">
    <div class="modal-card" style="max-width:520px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-receipt" style="color:var(--primary-accent);"></i> Order Record #{selectedHistoryItem.id}</h3>
        <button class="btn-close" on:click={() => showHistoryDetailModal = false}>&times;</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:1rem; padding:0.5rem 0;">
        <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Restaurant Details</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="font-size:1.1rem; font-family:'Outfit', sans-serif; margin-bottom:0.25rem;">{selectedHistoryItem.restaurant_name}</h4>
            {#if selectedHistoryItem.restaurant_distance || selectedHistoryItem.distance}
              <span style="font-size:0.75rem; color:var(--primary-accent); background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.25); padding:0.2rem 0.6rem; border-radius:12px; font-weight:700;">
                <i class="fa-solid fa-route"></i> {selectedHistoryItem.restaurant_distance || selectedHistoryItem.distance}
              </span>
            {/if}
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;"><i class="fa-solid fa-location-dot"></i> {selectedHistoryItem.restaurant_address || 'Address not provided'}</p>
          <div style="display:flex; gap:0.5rem;">
            {#if selectedHistoryItem.swiggy_url}
              <a href={selectedHistoryItem.swiggy_url} target="_blank" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:#fc8019; border-color:#fc8019;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Swiggy</a>
            {/if}
            {#if selectedHistoryItem.zomato_url}
              <a href={selectedHistoryItem.zomato_url} target="_blank" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:#cb202d; border-color:#cb202d;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Zomato</a>
            {/if}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Month & Slot</div>
            <div style="font-weight:700; font-size:0.9rem;">{selectedHistoryItem.month_year}</div>
            <div style="font-size:0.8rem; color:var(--primary-accent); font-weight:600; margin-top:0.2rem;"><i class="fa-solid fa-clock"></i> {selectedHistoryItem.time_slot || 'Lunch'}</div>
          </div>

          <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Order Status</div>
            {#if selectedHistoryItem.status === 'Ordered'}
              <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--emerald-accent); font-weight:700; border:1px solid rgba(16,185,129,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-circle-check"></i> Ordered</span>
            {:else}
              <span class="badge" style="background:rgba(245,158,11,0.15); color:var(--amber-accent); font-weight:700; border:1px solid rgba(245,158,11,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-hourglass-half"></i> Pending</span>
            {/if}
          </div>
        </div>

        <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">Assigned Delivery Receiver</div>
          {#if selectedHistoryItem.receiver_name}
            <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">{selectedHistoryItem.receiver_name}</div>
            {#if selectedHistoryItem.receiver_phone}
              <div style="font-size:0.82rem; color:var(--emerald-accent); font-weight:600; margin:0.2rem 0;"><i class="fa-solid fa-phone"></i> {selectedHistoryItem.receiver_phone}</div>
            {/if}
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;"><i class="fa-solid fa-location-dot"></i> {selectedHistoryItem.receiver_address || 'Address not available'}</p>
          {:else}
            <p style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">No receiver was assigned for this order.</p>
          {/if}
        </div>
      </div>

      <div class="modal-footer" style="justify-content:space-between;">
        <button class="btn btn-outline" on:click={() => copyText(`hist-${selectedHistoryItem.id}`, `${selectedHistoryItem.restaurant_name} | ${selectedHistoryItem.month_year} | ${selectedHistoryItem.time_slot} | Receiver: ${selectedHistoryItem.receiver_name || 'None'}`)}>
          <i class="fa-solid fa-copy"></i> Copy Summary
        </button>
        <button class="btn btn-primary" on:click={() => showHistoryDetailModal = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

{#if toastVisible}
  <div class="toast">
    <i class="fa-solid fa-circle-check" style="color:var(--emerald-accent)"></i>
    <span>{toastMessage}</span>
  </div>
{/if}
