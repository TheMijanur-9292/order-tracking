<script>
  import { onMount } from 'svelte';
  import { userStore, isAdmin, isLoginModalOpen, authLoading, logoutUser } from '$lib/authStore.js';


  function getCurrentMonthString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function formatMonthHeader(monthStr) {
    if (!monthStr || monthStr === 'all') return 'All Months';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  let currentMonth = getCurrentMonthString();

  // Active Admin Sidebar Tab: 'overview' | 'suggestions' | 'restaurants' | 'zones' | 'receivers' | 'timeslots' | 'history' | 'import'
  let activeTab = 'overview';

  // SMART ORDER SUGGESTIONS MODULE STATE
  let suggestionsList = [];
  let suggestionsStats = {
    total_matching: 0,
    total_proven: 0,
    total_fresh: 0,
    total_ordered_this_month: 0,
    total_pending_this_month: 0,
    target_month: '',
    prev_month: ''
  };
  let availableDistances = ['A. 0-1', 'B. 1-2', 'C. 2-3', 'D. 3-5', 'E. 5-7'];
  let topReceiverSuggestions = [];
  let suggZoneFilter = 'all';
  let suggDistanceFilter = 'all';
  let suggMonthFilter = getCurrentMonthString();
  let suggStrategyFilter = 'all'; // 'all', 'proven', 'fresh', 'last_month'
  let suggSlotFilter = 'all';
  let suggPlatformFilter = 'all';
  let suggSearchQuery = '';
  let isLoadingSuggestions = false;

  // Quick Order Modal from Suggestions
  let showQuickOrderModal = false;
  let quickOrderRestaurant = null;
  let quickOrderMonth = getCurrentMonthString();
  let quickOrderSlot = 'Lunch';
  let quickOrderPlatform = 'Swiggy';
  let quickOrderReceiverId = '';
  let quickOrderReceiverName = '';
  let quickOrderReceiverPhone = '';
  let quickOrderReceiverAddress = '';
  let quickOrderNotes = '';
  let isSubmittingQuickOrder = false;

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

  // Search & Filter
  let restSearch = '';
  let restZoneFilter = 'all';
  let restDistanceFilter = 'all';
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

  // Set of tabs loaded for instant 0ms switching
  let loadedTabs = new Set();

  async function loadAllData() {
    isLoadingAllData = true;
    try {
      // Stage 1: Load core stats, zones and restaurants immediately for sub-100ms render
      await Promise.all([fetchZones(), fetchRestaurants(), fetchTimeSlots(), fetchStats()]);
      loadedTabs.add('overview');
      loadedTabs.add('restaurants');
      loadedTabs.add('zones');
      loadedTabs.add('timeslots');
    } catch (e) {
      console.error(e);
    } finally {
      isLoadingAllData = false;
    }

    // Stage 2: Background prefetch suggestions, receivers & history silently
    setTimeout(() => {
      fetchSuggestions().then(() => loadedTabs.add('suggestions')).catch(() => {});
      fetchReceivers().then(() => loadedTabs.add('receivers')).catch(() => {});
      fetchOrderHistory().then(() => loadedTabs.add('history')).catch(() => {});
    }, 150);
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

  // SMART ORDER SUGGESTIONS HANDLERS
  async function fetchSuggestions() {
    isLoadingSuggestions = true;
    try {
      const params = new URLSearchParams({
        zone_id: suggZoneFilter,
        distance: suggDistanceFilter,
        month_year: suggMonthFilter,
        strategy: suggStrategyFilter,
        time_slot: suggSlotFilter,
        platform: suggPlatformFilter,
        search: suggSearchQuery
      });
      const res = await fetch(`/api/suggestions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        suggestionsList = data.suggestions || [];
        suggestionsStats = data.stats || suggestionsStats;
        topReceiverSuggestions = data.top_receivers || [];
        if (data.available_distances?.length) {
          availableDistances = data.available_distances;
        }
      } else {
        showToast(data.error || 'Failed to load suggestions', 'error');
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      isLoadingSuggestions = false;
    }
  }

  function selectSuggestionDistance(dist) {
    suggDistanceFilter = dist;
    fetchSuggestions();
  }

  function selectSuggestionStrategy(strat) {
    suggStrategyFilter = strat;
    fetchSuggestions();
  }

  function openQuickOrder(item) {
    quickOrderRestaurant = item;
    quickOrderMonth = suggMonthFilter || currentMonth;
    quickOrderSlot = item.latest_history?.time_slot || 'Lunch';
    quickOrderPlatform = (item.platform === 'Both' || !item.platform) ? 'Swiggy' : item.platform;
    
    if (item.latest_history?.receiver_name) {
      quickOrderReceiverName = item.latest_history.receiver_name;
      quickOrderReceiverPhone = item.latest_history.receiver_phone || '';
      quickOrderReceiverAddress = item.latest_history.receiver_address || '';
      const matchedRec = receivers.find(r => r.name === quickOrderReceiverName);
      quickOrderReceiverId = matchedRec ? String(matchedRec.id) : '';
    } else if (topReceiverSuggestions.length > 0) {
      const topRec = topReceiverSuggestions[0];
      quickOrderReceiverName = topRec.name;
      quickOrderReceiverPhone = topRec.phone || '';
      quickOrderReceiverAddress = topRec.address || '';
      quickOrderReceiverId = topRec.id ? String(topRec.id) : '';
    } else {
      quickOrderReceiverId = '';
      quickOrderReceiverName = '';
      quickOrderReceiverPhone = '';
      quickOrderReceiverAddress = '';
    }
    quickOrderNotes = '';
    showQuickOrderModal = true;
  }

  function handleQuickReceiverSelect(e) {
    const rId = e.target.value;
    quickOrderReceiverId = rId;
    if (rId) {
      const selected = receivers.find(r => String(r.id) === String(rId));
      if (selected) {
        quickOrderReceiverName = selected.name;
        quickOrderReceiverPhone = selected.phone || '';
        quickOrderReceiverAddress = selected.address || '';
      }
    } else {
      quickOrderReceiverName = '';
      quickOrderReceiverPhone = '';
      quickOrderReceiverAddress = '';
    }
  }

  function applyTopReceiver(rec) {
    quickOrderReceiverId = rec.id ? String(rec.id) : '';
    quickOrderReceiverName = rec.name;
    quickOrderReceiverPhone = rec.phone || '';
    quickOrderReceiverAddress = rec.address || '';
    showToast(`Selected receiver: ${rec.name}`);
  }

  async function submitQuickOrder() {
    if (!quickOrderRestaurant) return;
    isSubmittingQuickOrder = true;
    try {
      const res = await fetch('/api/orders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: quickOrderRestaurant.id,
          month_year: quickOrderMonth,
          platform_used: quickOrderPlatform,
          time_slot: quickOrderSlot,
          notes: quickOrderNotes,
          receiver_id: quickOrderReceiverId ? parseInt(quickOrderReceiverId, 10) : null,
          receiver_name: quickOrderReceiverName,
          receiver_phone: quickOrderReceiverPhone,
          receiver_address: quickOrderReceiverAddress,
          action: 'toggle'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Ordered: ${quickOrderRestaurant.name} for ${quickOrderMonth}!`);
        showQuickOrderModal = false;
        await Promise.all([fetchSuggestions(), loadAllData()]);
      } else {
        showToast(data.error || 'Failed to place order', 'error');
      }
    } catch (e) {
      showToast('Error placing order', 'error');
    } finally {
      isSubmittingQuickOrder = false;
    }
  }

  function copyDispatchText(item) {
    const recName = item.latest_history?.receiver_name || (topReceiverSuggestions[0]?.name) || 'Not Assigned';
    const recPhone = item.latest_history?.receiver_phone || (topReceiverSuggestions[0]?.phone) || 'N/A';
    const recAddr = item.latest_history?.receiver_address || (topReceiverSuggestions[0]?.address) || 'N/A';
    
    const text = `🍽️ RESTAURANT: ${item.name}
📍 ZONE: ${item.zone_name} | DISTANCE: ${item.distance}
🏢 ADDRESS: ${item.address || 'Kolkata'}
🛵 PLATFORM: ${item.platform}
🕒 TIME SLOT: ${item.latest_history?.time_slot || 'Lunch'}
👤 RECEIVER: ${recName} (${recPhone})
📦 DELIVERY ADDRESS: ${recAddr}
${item.swiggy_url ? `🔗 SWIGGY: ${item.swiggy_url}` : ''}
${item.zomato_url ? `🔗 ZOMATO: ${item.zomato_url}` : ''}`.trim();

    copyText(`sugg-dispatch-${item.id}`, text);
    showToast('Copied full dispatch details to clipboard!');
  }

  async function fetchZones() {
    try {
      const res = await fetch(`/api/zones?month_year=${currentMonth}&include_hidden=true`);
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

  let receiverMonthFilter = currentMonth;
  let availableReceiverMonths = [];

  async function fetchReceivers() {
    try {
      const url = receiverMonthFilter && receiverMonthFilter !== 'all' 
        ? `/api/receivers?month_year=${receiverMonthFilter}` 
        : `/api/receivers`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        receivers = data.receivers;
        if (data.available_months && data.available_months.length > 0) {
          availableReceiverMonths = data.available_months;
        }
      }
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

  // Reactive Derived Lists & Smart Pagination (15 items per page, 30 for zones)
  const PAGE_SIZE = 15;
  const ZONE_PAGE_SIZE = 30;

  let suggPage = 1;
  let restPage = 1;
  let historyPage = 1;
  let zonePage = 1;
  let recPage = 1;

  let zoneSearch = '';
  let zoneVisibilityFilter = 'all'; // 'all' | 'visible' | 'hidden'

  $: visibleZones = zones.filter(z => z.is_visible !== false && z.is_visible !== 0);
  $: hiddenZonesCount = zones.length - visibleZones.length;

  $: filteredZones = zones.filter(z => {
    const q = zoneSearch.toLowerCase().trim();
    const nameMatch = !q || z.name.toLowerCase().includes(q);
    const isVis = z.is_visible !== false && z.is_visible !== 0;
    const visMatch = zoneVisibilityFilter === 'all' || (zoneVisibilityFilter === 'visible' ? isVis : !isVis);
    return nameMatch && visMatch;
  });

  $: filteredRestaurants = restaurants.filter(r => {
    const q = restSearch.toLowerCase().trim();
    const nameMatch = r.name.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q);
    const zoneMatch = restZoneFilter === 'all' || r.zone_id == restZoneFilter;
    const distMatch = restDistanceFilter === 'all' || (r.distance || '').toLowerCase().trim() === restDistanceFilter.toLowerCase().trim() || (r.distance || '').includes(restDistanceFilter);
    const platMatch = restPlatformFilter === 'all' || r.platform === restPlatformFilter || r.platform === 'Both';
    const sourceMatch = restSourceFilter === 'all' || (restSourceFilter === 'list' ? r.is_seeded : !r.is_seeded);
    return nameMatch && zoneMatch && distMatch && platMatch && sourceMatch;
  });

  $: filteredReceivers = receivers.filter(rec => {
    const q = recSearch.toLowerCase().trim();
    return rec.name.toLowerCase().includes(q) || (rec.address || '').toLowerCase().includes(q) || (rec.phone || '').toLowerCase().includes(q);
  });

  // Reactive Paginated Slices
  $: suggTotalPages = Math.ceil(suggestionsList.length / PAGE_SIZE) || 1;
  $: paginatedSuggestions = suggestionsList.slice((suggPage - 1) * PAGE_SIZE, suggPage * PAGE_SIZE);

  $: restTotalPages = Math.ceil(filteredRestaurants.length / PAGE_SIZE) || 1;
  $: paginatedRestaurants = filteredRestaurants.slice((restPage - 1) * PAGE_SIZE, restPage * PAGE_SIZE);

  $: historyTotalPages = Math.ceil(orderHistoryList.length / PAGE_SIZE) || 1;
  $: paginatedHistory = orderHistoryList.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  $: zoneTotalPages = Math.ceil(filteredZones.length / ZONE_PAGE_SIZE) || 1;
  $: paginatedZones = filteredZones.slice((zonePage - 1) * ZONE_PAGE_SIZE, zonePage * ZONE_PAGE_SIZE);

  $: recTotalPages = Math.ceil(filteredReceivers.length / PAGE_SIZE) || 1;
  $: paginatedReceivers = filteredReceivers.slice((recPage - 1) * PAGE_SIZE, recPage * PAGE_SIZE);

  // Auto-reset page to 1 when filters change
  $: if (restSearch !== undefined || restZoneFilter !== undefined || restPlatformFilter !== undefined || restSourceFilter !== undefined) restPage = 1;
  $: if (historyMonthFilter !== undefined || historyStatusFilter !== undefined || historyZoneFilter !== undefined || historySlotFilter !== undefined || historySearchQuery !== undefined) historyPage = 1;
  $: if (suggZoneFilter !== undefined || suggDistanceFilter !== undefined || suggMonthFilter !== undefined || suggStrategyFilter !== undefined || suggSlotFilter !== undefined || suggPlatformFilter !== undefined || suggSearchQuery !== undefined) suggPage = 1;
  $: if (recSearch !== undefined) recPage = 1;
  $: if (zoneSearch !== undefined || zoneVisibilityFilter !== undefined) zonePage = 1;

  function getPageList(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

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
    restDistance = 'C. 2-3';
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
    restDistance = r.distance || 'C. 2-3';
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

  async function toggleZoneVisibility(z) {
    const currentVis = z.is_visible !== false && z.is_visible !== 0;
    const newVis = !currentVis;
    // Optimistic UI update
    zones = zones.map(item => item.id === z.id ? { ...item, is_visible: newVis } : item);
    try {
      const res = await fetch(`/api/zones/${z.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: newVis })
      });
      const data = await res.json();
      if (data.success) {
        showToast(newVis ? `👁️ "${z.name}" is now Visible on frontend` : `🙈 "${z.name}" is now Hidden from frontend`);
        await Promise.all([fetchRestaurants(), fetchStats(), fetchSuggestions()]);
      } else {
        // Revert on error
        zones = zones.map(item => item.id === z.id ? { ...item, is_visible: currentVis } : item);
        showToast(data.error || 'Failed to update visibility', 'error');
      }
    } catch (e) {
      zones = zones.map(item => item.id === z.id ? { ...item, is_visible: currentVis } : item);
      showToast('Error updating zone visibility', 'error');
    }
  }

  async function bulkSetZoneVisibility(makeVisible) {
    zones = zones.map(item => ({ ...item, is_visible: makeVisible }));
    try {
      const res = await fetch('/api/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: makeVisible })
      });
      const data = await res.json();
      if (data.success) {
        showToast(makeVisible ? '👁️ All zones are now Visible!' : '🙈 All zones are now Hidden!');
        await Promise.all([fetchZones(), fetchRestaurants(), fetchStats(), fetchSuggestions()]);
      } else {
        await fetchZones();
        showToast(data.error || 'Failed to update zones', 'error');
      }
    } catch (e) {
      await fetchZones();
      showToast('Error updating zones visibility', 'error');
    }
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
    if (typeof document !== 'undefined') {
      const mainEl = document.querySelector('.admin-main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Instant switch! Fetch on demand if tab hasn't completed background prefetch yet
    if (tab === 'history' && !loadedTabs.has('history')) {
      fetchOrderHistory().then(() => loadedTabs.add('history'));
    } else if (tab === 'suggestions' && !loadedTabs.has('suggestions')) {
      fetchSuggestions().then(() => loadedTabs.add('suggestions'));
    } else if (tab === 'receivers' && !loadedTabs.has('receivers')) {
      fetchReceivers().then(() => loadedTabs.add('receivers'));
    }
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
          {:else if activeTab === 'suggestions'}<i class="fa-solid fa-wand-magic-sparkles" style="color:#ec4899;"></i> Smart Order Suggestions
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
          <div class="admin-box-card" style="border-color: rgba(236, 72, 153, 0.35); background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(139, 92, 246, 0.05));">
            <h3><i class="fa-solid fa-wand-magic-sparkles" style="color:#ec4899;"></i> Smart Order Suggestion</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0 1rem 0;">AI suggestions based on Zone & Distance from previous months' history.</p>
            <button class="btn btn-purple" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); border:none;" on:click={() => selectAdminTab('suggestions')}><i class="fa-solid fa-sparkles"></i> Open Suggestions</button>
          </div>

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

      <!-- TAB: SMART ORDER SUGGESTIONS -->
      {#if activeTab === 'suggestions'}
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
                  <i class="fa-solid fa-bolt" style="color:#10b981;"></i> Last Month Picks
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
            <option value="Cancelled">Cancelled Only</option>
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
                {#each paginatedHistory as h (h.id)}
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
                      {:else if h.status === 'Cancelled'}
                        <span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-weight:700; font-size:0.78rem;">
                          <i class="fa-solid fa-ban"></i> Cancelled
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

            <!-- HISTORY PAGINATION BAR -->
            {#if historyTotalPages > 1}
              <div class="pagination-wrapper">
                <div class="pagination-info">
                  Showing <strong>{(historyPage - 1) * PAGE_SIZE + 1}</strong> - <strong>{Math.min(historyPage * PAGE_SIZE, orderHistoryList.length)}</strong> of <strong>{orderHistoryList.length}</strong> orders
                </div>
                <div class="pagination-controls">
                  <button 
                    class="pagination-btn" 
                    disabled={historyPage === 1} 
                    on:click={() => { historyPage--; }} 
                    title="Previous Page"
                  >
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  {#each getPageList(historyPage, historyTotalPages) as p}
                    {#if p === '...'}
                      <span class="pagination-ellipsis">...</span>
                    {:else}
                      <button 
                        class="pagination-btn {historyPage === p ? 'active' : ''}" 
                        on:click={() => { historyPage = p; }}
                      >
                        {p}
                      </button>
                    {/if}
                  {/each}
                  <button 
                    class="pagination-btn" 
                    disabled={historyPage === historyTotalPages} 
                    on:click={() => { historyPage++; }} 
                    title="Next Page"
                  >
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            {/if}
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
      {/if}

      <!-- TAB 3: ZONES MANAGER -->
      {#if activeTab === 'zones'}
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
      {/if}

      <!-- TAB 4: RECEIVERS MANAGER -->
      {#if activeTab === 'receivers'}
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
      {/if}

      <!-- TAB 5: TIME SLOTS MANAGER -->
      {#if activeTab === 'timeslots'}
        <div class="timeslots-header-box">
          <div>
            <h3>Daily Food Time Slots ({timeSlots.length})</h3>
            <p>Configured ordering time windows (Breakfast, Lunch, Snacks, Dinner, Late Night)</p>
          </div>
          <button class="btn btn-emerald" on:click={openAddTimeSlot}>
            <i class="fa-solid fa-plus"></i> Add Time Slot
          </button>
        </div>

        <div class="timeslots-grid">
          {#each timeSlots as slot (slot.id)}
            <div class="timeslot-card" style="border-left: 5px solid {slot.color_theme || '#3b82f6'};">
              <div class="ts-left-content">
                <div class="ts-icon-avatar" style="color: {slot.color_theme || '#3b82f6'};">
                  <i class="fa-solid {slot.icon || 'fa-clock'}"></i>
                </div>
                <div class="ts-meta-info">
                  <div class="ts-header-title">
                    <h4 class="ts-title-text">{slot.slot_name}</h4>
                    <span class="ts-order-num">#{slot.display_order}</span>
                  </div>
                  <span class="ts-time-pill" style="color: {slot.color_theme || 'var(--text-main)'};">
                    <i class="fa-regular fa-clock"></i> {slot.start_time} - {slot.end_time}
                  </span>
                </div>
              </div>

              <div class="ts-actions-group">
                <button class="icon-btn" on:click={() => openEditTimeSlot(slot)} title="Edit Slot">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-btn icon-btn-danger" on:click={() => deleteTimeSlot(slot)} title="Delete Slot">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
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
          <label>Distance *</label>
          <select class="form-control" bind:value={restDistance}>
            <option value="A. 0-1">A. 0-1</option>
            <option value="B. 1-2">B. 1-2</option>
            <option value="C. 2-3">C. 2-3</option>
            <option value="D. 3-5">D. 3-5</option>
            <option value="E. 5-7">E. 5-7</option>
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
            {:else if selectedHistoryItem.status === 'Cancelled'}
              <span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; font-weight:700; border:1px solid rgba(239,68,68,0.3); padding:0.3rem 0.65rem; border-radius:20px; font-size:0.8rem;"><i class="fa-solid fa-ban"></i> Cancelled</span>
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

<!-- QUICK ORDER MODAL FROM SUGGESTIONS -->
{#if showQuickOrderModal && quickOrderRestaurant}
  <div class="modal-overlay" on:click|self={() => showQuickOrderModal = false}>
    <div class="modal-card" style="max-width:540px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-paper-plane" style="color:var(--primary-accent);"></i> Place Order / Mark Completed</h3>
        <button class="btn-close" on:click={() => showQuickOrderModal = false}>&times;</button>
      </div>

      <form on:submit|preventDefault={submitQuickOrder}>
        <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <h4 style="font-size:1.15rem; font-family:'Outfit', sans-serif; margin:0;">{quickOrderRestaurant.name}</h4>
              {#if quickOrderRestaurant.is_seeded || quickOrderRestaurant.is_seeded === 1 || quickOrderRestaurant.is_seeded === true}
                <span class="badge-source badge-list"><i class="fa-solid fa-list-check"></i> LIST</span>
              {:else}
                <span class="badge-source badge-extra"><i class="fa-solid fa-folder-plus"></i> EXTRA</span>
              {/if}
            </div>
            <span class="sugg-dist-pill"><i class="fa-solid fa-route"></i> {quickOrderRestaurant.distance}</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.35rem 0 0 0;"><i class="fa-solid fa-map-pin"></i> {quickOrderRestaurant.zone_name} • {quickOrderRestaurant.address || 'Kolkata'}</p>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
          <div class="form-group">
            <label>Target Month *</label>
            <input type="month" class="form-control" bind:value={quickOrderMonth} required />
          </div>

          <div class="form-group">
            <label>Time Slot *</label>
            <select class="form-control" bind:value={quickOrderSlot} required>
              {#each timeSlots as slot}
                <option value={slot.slot_name}>{slot.slot_name} ({slot.start_time} - {slot.end_time})</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Platform Used</label>
          <select class="form-control" bind:value={quickOrderPlatform}>
            <option value="Swiggy">Swiggy</option>
            <option value="Zomato">Zomato</option>
            <option value="Swiggy/Zomato">Swiggy/Zomato (Both)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Select Saved Receiver (Auto-fills details)</label>
          <select class="form-control" on:change={handleQuickReceiverSelect} bind:value={quickOrderReceiverId}>
            <option value="">-- Choose or Enter Manually --</option>
            {#each receivers as rec}
              <option value={String(rec.id)}>{rec.name} {rec.phone ? `(${rec.phone})` : ''}</option>
            {/each}
          </select>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
          <div class="form-group">
            <label>Receiver Name</label>
            <input type="text" class="form-control" placeholder="e.g. Syed-Jadavpur" bind:value={quickOrderReceiverName} />
          </div>
          <div class="form-group">
            <label>Receiver Phone</label>
            <input type="text" class="form-control" placeholder="e.g. +91 8101222684" bind:value={quickOrderReceiverPhone} />
          </div>
        </div>

        <div class="form-group">
          <label>Delivery Address</label>
          <textarea class="form-control" rows="2" placeholder="Full delivery drop address..." bind:value={quickOrderReceiverAddress}></textarea>
        </div>

        <div class="form-group">
          <label>Order Notes / Reference (Optional)</label>
          <input type="text" class="form-control" placeholder="e.g. Awign Order #1042" bind:value={quickOrderNotes} />
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showQuickOrderModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary" disabled={isSubmittingQuickOrder}>
            {#if isSubmittingQuickOrder}
              <i class="fa-solid fa-spinner fa-spin"></i> Saving...
            {:else}
              <i class="fa-solid fa-check"></i> Confirm & Mark Ordered
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

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

{#if toastVisible}
  <div class="toast">
    <i class="fa-solid fa-circle-check" style="color:var(--emerald-accent)"></i>
    <span>{toastMessage}</span>
  </div>
{/if}
