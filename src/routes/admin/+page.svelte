<script>
  import { onMount } from 'svelte';
  import { isAdmin, isLoginModalOpen, authLoading } from '$lib/authStore.js';
  import AdminAccountPanel from '$lib/components/admin/AdminAccountPanel.svelte';
  import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
  import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
  import OverviewTab from '$lib/components/admin/OverviewTab.svelte';
  import SuggestionsTab from '$lib/components/admin/SuggestionsTab.svelte';
  import HistoryTab from '$lib/components/admin/HistoryTab.svelte';
  import RestaurantsTab from '$lib/components/admin/RestaurantsTab.svelte';
  import ZonesTab from '$lib/components/admin/ZonesTab.svelte';
  import ReceiversTab from '$lib/components/admin/ReceiversTab.svelte';
  import TimeSlotsTab from '$lib/components/admin/TimeSlotsTab.svelte';
  import ImportTab from '$lib/components/admin/ImportTab.svelte';
  import RestaurantModal from '$lib/components/admin/RestaurantModal.svelte';
  import ZoneModal from '$lib/components/admin/ZoneModal.svelte';
  import ReceiverModal from '$lib/components/admin/ReceiverModal.svelte';
  import TimeSlotModal from '$lib/components/admin/TimeSlotModal.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import HistoryDetailModal from '$lib/components/admin/HistoryDetailModal.svelte';
  import QuickOrderModal from '$lib/components/admin/QuickOrderModal.svelte';
  import AdminBottomNav from '$lib/components/admin/AdminBottomNav.svelte';
  import { getCurrentMonthString } from '$lib/utils/date.js';
  import { setDocumentTheme, getSavedTheme, saveTheme, getNextTheme } from '$lib/utils/theme.js';
  import { buildDispatchText } from '$lib/utils/dispatch.js';
  import { buildOrderHistoryCsv, triggerDownload } from '$lib/utils/csv.js';

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
  let availableDistances = ['A. 0-1', 'B. 1-2', 'C. 2-3', 'D. 3-5', 'E. 5-7', 'F. 7+'];
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
    setDocumentTheme(theme);
  }

  function toggleTheme() {
    const newTheme = getNextTheme(currentTheme);
    applyTheme(newTheme);
    saveTheme(newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`);
  }

  // Global Loading State
  let isLoadingAllData = true;

  onMount(() => {
    const savedTheme = getSavedTheme();
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
    const csvContent = buildOrderHistoryCsv(orderHistoryList);
    const encodedUri = encodeURI(csvContent);
    triggerDownload(encodedUri, `Order_History_${new Date().toISOString().slice(0, 10)}.csv`);
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
    quickOrderSlot = suggSlotFilter !== 'all' ? suggSlotFilter : (item.latest_history?.time_slot || 'Lunch');
    quickOrderPlatform = (item.platform === 'Both' || !item.platform) ? 'Swiggy' : item.platform;
    
    if (item.latest_history?.receiver_name) {
      quickOrderReceiverName = item.latest_history.receiver_name;
      quickOrderReceiverPhone = item.latest_history.receiver_phone || '';
      quickOrderReceiverAddress = item.latest_history.receiver_address || '';
      const matchedRec =
        receivers.find(r => item.latest_history.receiver_id && r.id === item.latest_history.receiver_id) ||
        receivers.find(r => r.name === quickOrderReceiverName);
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
    const text = buildDispatchText(item, topReceiverSuggestions);

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

  // Pagination state (page sizes and the filtered/paginated lists live in the tab components)
  let suggPage = 1;
  let restPage = 1;
  let historyPage = 1;
  let zonePage = 1;
  let recPage = 1;

  let zoneSearch = '';
  let zoneVisibilityFilter = 'all'; // 'all' | 'visible' | 'hidden'

  $: visibleZones = zones.filter(z => z.is_visible !== false && z.is_visible !== 0);
  $: hiddenZonesCount = zones.length - visibleZones.length;

  // Auto-reset page to 1 when filters change
  $: if (restSearch !== undefined || restZoneFilter !== undefined || restDistanceFilter !== undefined || restPlatformFilter !== undefined || restSourceFilter !== undefined) restPage = 1;
  $: if (historyMonthFilter !== undefined || historyStatusFilter !== undefined || historyZoneFilter !== undefined || historySlotFilter !== undefined || historySearchQuery !== undefined) historyPage = 1;
  $: if (suggZoneFilter !== undefined || suggDistanceFilter !== undefined || suggMonthFilter !== undefined || suggStrategyFilter !== undefined || suggSlotFilter !== undefined || suggPlatformFilter !== undefined || suggSearchQuery !== undefined) suggPage = 1;
  $: if (recSearch !== undefined) recPage = 1;
  $: if (zoneSearch !== undefined || zoneVisibilityFilter !== undefined) zonePage = 1;

  function copyText(id, text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copiedFieldId = id;
      showToast('Copied to clipboard!');
      setTimeout(() => { if (copiedFieldId === id) copiedFieldId = null; }, 1800);
    }).catch(() => {
      showToast('Could not copy - please copy manually', 'error');
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
    recName = rec.name || '';
    recPhone = rec.phone || '';
    recAddress = rec.address || '';
    showRecModal = true;
  }

  async function saveRec() {
    if (!(recName || '').trim()) return showToast('Receiver name is required', 'error');
    if (!(recAddress || '').trim()) return showToast('Receiver address is required', 'error');
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
  <AdminSidebar
    {isMobileDrawerOpen}
    {closeMobileDrawer}
    {activeTab}
    {selectAdminTab}
    {isLoadingAllData}
    {restaurants}
    {orderHistoryList}
    {zones}
    {receivers}
    {timeSlots}
  />

  <!-- MAIN ADMIN CONTENT AREA -->
  <div class="admin-main">
    <AdminHeader
      {toggleMobileDrawer}
      {activeTab}
      {toggleTheme}
      {currentTheme}
    />

    <div class="admin-content">
      <!-- TAB 1: OVERVIEW & STATS -->
      {#if activeTab === 'overview'}
        <OverviewTab
          {isLoadingAllData}
          {totalRestaurants}
          {totalZones}
          {receivers}
          {timeSlots}
          {selectAdminTab}
          {openAddRest}
          bind:activeTab
          {openAddRec}
          {fetchOrderHistory}
          {orderHistoryList}
        />
      {/if}

      <!-- TAB: SMART ORDER SUGGESTIONS -->
      {#if activeTab === 'suggestions'}
        <SuggestionsTab
          {isLoadingSuggestions}
          {suggestionsStats}
          bind:suggMonthFilter
          bind:suggZoneFilter
          {fetchSuggestions}
          {visibleZones}
          bind:suggSlotFilter
          {timeSlots}
          bind:suggSearchQuery
          bind:suggDistanceFilter
          {selectSuggestionDistance}
          {availableDistances}
          bind:suggStrategyFilter
          {selectSuggestionStrategy}
          {topReceiverSuggestions}
          {applyTopReceiver}
          {suggestionsList}
          {copyDispatchText}
          {openQuickOrder}
          bind:suggPage
        />
      {/if}

      <!-- TAB: ORDER HISTORY & ANALYTICS -->
      {#if activeTab === 'history'}
        <HistoryTab
          {isLoadingHistory}
          {orderHistoryStats}
          bind:historySearchQuery
          {fetchOrderHistory}
          bind:historyMonthFilter
          {availableHistoryMonths}
          bind:historyStatusFilter
          bind:historyZoneFilter
          {zones}
          bind:historySlotFilter
          {timeSlots}
          {exportHistoryToCSV}
          {orderHistoryList}
          {openHistoryDetail}
          {resetHistoryOrderStatus}
          bind:historyPage
        />
      {/if}

      <!-- TAB 2: RESTAURANTS MANAGER -->
      {#if activeTab === 'restaurants'}
        <RestaurantsTab
          {restaurants}
          bind:restSearch
          bind:restZoneFilter
          bind:restDistanceFilter
          bind:restPlatformFilter
          bind:restSourceFilter
          {visibleZones}
          {openAddRest}
          {copyText}
          {copiedFieldId}
          {openEditRest}
          {deleteRest}
          bind:restPage
        />
      {/if}

      <!-- TAB 3: ZONES MANAGER -->
      {#if activeTab === 'zones'}
        <ZonesTab
          {zones}
          {visibleZones}
          {hiddenZonesCount}
          {bulkSetZoneVisibility}
          {openAddZone}
          bind:zoneSearch
          bind:zoneVisibilityFilter
          {toggleZoneVisibility}
          {deleteZone}
          bind:zonePage
        />
      {/if}

      <!-- TAB 4: RECEIVERS MANAGER -->
      {#if activeTab === 'receivers'}
        <ReceiversTab
          {receivers}
          bind:recSearch
          bind:receiverMonthFilter
          {fetchReceivers}
          {currentMonth}
          {availableReceiverMonths}
          {openAddRec}
          {copyText}
          {copiedFieldId}
          {openEditRec}
          {deleteRec}
          bind:recPage
        />
      {/if}

      <!-- TAB 5: TIME SLOTS MANAGER -->
      {#if activeTab === 'timeslots'}
        <TimeSlotsTab
          {timeSlots}
          {openAddTimeSlot}
          {openEditTimeSlot}
          {deleteTimeSlot}
        />
      {/if}

      <!-- TAB 6: EXCEL IMPORTER -->
      {#if activeTab === 'import'}
        <ImportTab
          {uploadExcel}
          bind:importZoneId
          {zones}
          bind:importNewZone
          {handleFile}
          {fileNameText}
        />
      {/if}

      <!-- TAB 7: ACCOUNT & ADMIN USERS -->
      {#if activeTab === 'account'}
        <AdminAccountPanel notify={showToast} />
      {/if}
    </div>
  </div>
</div>

<!-- MODALS FOR RESTAURANTS, ZONES, RECEIVERS & TIME SLOTS -->
{#if showRestModal}
  <RestaurantModal
    {editRestId}
    bind:showRestModal
    {saveRest}
    bind:restZoneId
    {zones}
    bind:restName
    bind:restPlatform
    bind:restDistance
    bind:restAddress
  />
{/if}

{#if showZoneModal}
  <ZoneModal
    bind:showZoneModal
    {saveZone}
    bind:zoneName
    bind:zoneDesc
  />
{/if}

{#if showRecModal}
  <ReceiverModal
    {editRecId}
    bind:showRecModal
    {saveRec}
    bind:recName
    bind:recPhone
    bind:recAddress
  />
{/if}

{#if showSlotModal}
  <TimeSlotModal
    {editSlotId}
    bind:showSlotModal
    {saveTimeSlot}
    bind:slotName
    bind:slotStartTime
    bind:slotEndTime
    bind:slotIcon
    bind:slotColor
  />
{/if}

<!-- DESIGNED CUSTOM CONFIRMATION MODAL -->
{#if showConfirmModal}
  <ConfirmModal
    bind:showConfirmModal
    {isExecutingConfirm}
    {isConfirmDanger}
    {confirmBtnIcon}
    {confirmTitle}
    {confirmMessage}
    {confirmBtnText}
    {executeConfirmedAction}
  />
{/if}

<!-- ORDER HISTORY DETAIL MODAL -->
{#if showHistoryDetailModal && selectedHistoryItem}
  <HistoryDetailModal
    {selectedHistoryItem}
    bind:showHistoryDetailModal
    {copyText}
  />
{/if}

<!-- QUICK ORDER MODAL FROM SUGGESTIONS -->
{#if showQuickOrderModal && quickOrderRestaurant}
  <QuickOrderModal
    bind:showQuickOrderModal
    {submitQuickOrder}
    {quickOrderRestaurant}
    bind:quickOrderMonth
    bind:quickOrderSlot
    {timeSlots}
    bind:quickOrderPlatform
    {handleQuickReceiverSelect}
    bind:quickOrderReceiverId
    {receivers}
    bind:quickOrderReceiverName
    bind:quickOrderReceiverPhone
    bind:quickOrderReceiverAddress
    bind:quickOrderNotes
    {isSubmittingQuickOrder}
  />
{/if}

<AdminBottomNav {activeTab} {selectAdminTab} />

{#if toastVisible}
  <div class="toast">
    <i class={toastType === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style="color:{toastType === 'success' ? 'var(--emerald-accent)' : 'var(--danger-accent)'}"></i>
    <span>{toastMessage}</span>
  </div>
{/if}
