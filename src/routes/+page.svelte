<script>
  import { onMount } from 'svelte';
  import { userStore, isAdmin, isLoginModalOpen, logoutUser } from '$lib/authStore.js';
  import CustomCalendarPicker from '$lib/components/CustomCalendarPicker.svelte';

  function getCurrentMonthString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function formatMonthHeader(monthStr) {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Reactive State
  let currentMonth = getCurrentMonthString();
  let currentZoneId = 'all';
  let searchQuery = '';
  let distanceFilter = 'all';
  let statusFilter = 'all';

  // PAGINATION & BATCH PERFORMANCE STATE
  let currentPage = 1;
  let pageSize = 15;

  let zonesData = [];
  let restaurantsData = [];
  let receiversList = [];
  let receiversCount = 0;
  let timeSlotsList = [];

  // Loading State
  let isLoadingData = true;

  // Custom Dropdowns Open States
  let isZoneDropdownOpen = false;
  let isDistanceDropdownOpen = false;
  let isStatusDropdownOpen = false;

  function selectDistance(dist) {
    distanceFilter = dist;
    isDistanceDropdownOpen = false;
    currentPage = 1;
  }

  function selectStatus(st) {
    statusFilter = st;
    isStatusDropdownOpen = false;
    currentPage = 1;
  }

  // Stats
  let totalZones = 0;
  let totalRestaurants = 0;
  let totalOrdered = 0;
  let totalPending = 0;

  // Theme State
  let currentTheme = 'light';

  // Toast
  let toastMessage = '';
  let toastType = 'success';
  let toastVisible = false;

  // Modals
  let showImportModal = false;
  let showRestModal = false;
  let showZonesModal = false;
  let showPlannerModal = false;

  // TODAY'S DISPATCH PLANNER QUEUE
  let plannedRestIds = [];

  // TWO-STEP ORDERING & RECEIVER PICKER MODAL STATE
  let showOrderModal = false;
  let orderModalStep = 'slot'; // 'slot' (Step 1: Choose Time Slot) | 'receiver' (Step 2: Choose Receiver)
  let selectedRestForOrder = null;
  let selectedTimeSlot = null;
  let receiverSearchQuery = '';
  let isAssigningOrder = false;

  // QUICK ADD RECEIVER INSIDE PICKER
  let showQuickAddRec = false;
  let quickRecName = '';
  let quickRecPhone = '';
  let quickRecAddress = '';

  // CUSTOM CONFIRMATION MODAL STATE
  let showConfirmModal = false;
  let confirmTitle = '';
  let confirmMessage = '';
  let pendingActionFn = null;
  let isExecutingConfirm = false;

  // Form State - Restaurants
  let editRestId = null;
  let restZoneId = '';
  let restName = '';
  let restPlatform = 'Both';
  let restDistance = 'C. 2-3';
  let restAddress = '';
  let restSwiggyUrl = '';
  let restZomatoUrl = '';

  let importFile = null;
  let importZoneId = '';
  let importNewZone = '';
  let fileNameText = '';

  let newZoneName = '';
  let newZoneDesc = '';

  // Copy State Tracking
  let copiedFieldId = null;

  function showToast(msg, type = 'success') {
    toastMessage = msg;
    toastType = type;
    toastVisible = true;
    setTimeout(() => {
      toastVisible = false;
    }, 3500);
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

  // LIVE REAL-TIME CLOCK STATE
  let liveTimeStr = '';
  let liveDateStr = '';

  function updateLiveClock() {
    const now = new Date();
    liveTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    liveDateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function silentRefresh() {
    try {
      await Promise.all([fetchZones(), fetchStats(), fetchRestaurants()]);
    } catch (e) {
      console.error('Background sync error:', e);
    }
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    refreshData();

    updateLiveClock();
    const clockInterval = setInterval(updateLiveClock, 1000);

    // Feature 1: Real-time Auto-Sync EventSource
    let sse;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        sse = new EventSource('/api/live-updates');
        sse.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'ORDER_UPDATED') {
              silentRefresh();
            }
          } catch (err) {}
        };
      } catch (e) {}
    }

    // Fallback Background Poll every 10 seconds when tab is active
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoadingData) {
        silentRefresh();
      }
    }, 10000);

    // Close all custom dropdowns on outside click
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.custom-zone-dropdown')) {
        isZoneDropdownOpen = false;
        isDistanceDropdownOpen = false;
        isStatusDropdownOpen = false;
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
      if (sse) sse.close();
      window.removeEventListener('click', handleOutsideClick);
    };
  });

  async function refreshData() {
    isLoadingData = true;
    try {
      await Promise.all([fetchZones(), fetchStats(), fetchRestaurants(), fetchReceivers(), fetchTimeSlots()]);
    } finally {
      isLoadingData = false;
    }
  }

  async function fetchZones() {
    try {
      const res = await fetch(`/api/zones?month_year=${currentMonth}`);
      const data = await res.json();
      if (data.success) {
        zonesData = data.zones;
        if (zonesData.length > 0 && !restZoneId) {
          restZoneId = zonesData[0].id;
        }
      }
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchRestaurants() {
    try {
      const url = `/api/restaurants?month_year=${currentMonth}&zone_id=${currentZoneId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        restaurantsData = data.restaurants;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchReceivers() {
    try {
      const res = await fetch('/api/receivers');
      const data = await res.json();
      if (data.success) {
        receiversList = data.receivers;
        receiversCount = receiversList.length;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTimeSlots() {
    try {
      const res = await fetch('/api/time-slots');
      const data = await res.json();
      if (data.success) {
        timeSlotsList = data.time_slots;
      }
    } catch (err) {
      console.error(err);
    }
  }

  $: availableDistances = Array.from(
    new Set(restaurantsData.map(r => r.distance).filter(Boolean))
  ).sort();

  // Reactive Derived Filters (Zero Lag!)
  $: filteredRestaurants = restaurantsData.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = r.name.toLowerCase().includes(q);
    const addrMatch = (r.address || '').toLowerCase().includes(q);
    const distMatch = (r.distance || '').toLowerCase().includes(q);
    const recMatch = (r.receiver_name || '').toLowerCase().includes(q);
    const slotMatch = (r.time_slot || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || addrMatch || distMatch || recMatch || slotMatch;

    let matchesDist = true;
    if (distanceFilter !== 'all') {
      matchesDist = (r.distance || '').toLowerCase().trim() === distanceFilter.toLowerCase().trim();
    }

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = r.order_status === statusFilter;
    }

    return matchesSearch && matchesDist && matchesStatus;
  });

  // AUTO-RESET TO PAGE 1 ON FILTER / SEARCH CHANGE
  $: {
    searchQuery;
    distanceFilter;
    statusFilter;
    currentZoneId;
    pageSize;
    currentPage = 1;
  }

  $: totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredRestaurants.length / pageSize) || 1;

  $: paginatedRestaurants = pageSize === 'all' 
    ? filteredRestaurants 
    : filteredRestaurants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function getReceiverMatchScore(rec, rest) {
    if (!rec || !rest) return 0;
    const rAddr = (rest.address || '').toLowerCase().trim();
    const recAddr = (rec.address || '').toLowerCase().trim();
    const recName = (rec.name || '').toLowerCase().trim();
    const zName = (rest.zone_name || '').toLowerCase().replace(/^kolkata[-_\s]*/i, '').trim();

    let score = 0;
    if (rAddr && recAddr) {
      const normR = rAddr.replace(/[^a-z0-9]/g, '');
      const normRec = recAddr.replace(/[^a-z0-9]/g, '');
      if (normR && normRec && (normR.includes(normRec.slice(0, 18)) || normRec.includes(normR.slice(0, 18)))) {
        score += 100;
      }
      const pinR = rAddr.match(/\b700\d{3}\b/);
      const pinRec = recAddr.match(/\b700\d{3}\b/);
      if (pinR && pinRec && pinR[0] === pinRec[0]) {
        score += 50;
      }
    }
    if (zName && zName.length >= 3) {
      const zParts = zName.split(/[\s/_-]+/).filter(p => p.length >= 3);
      for (const part of zParts) {
        if (recName.includes(part) || recAddr.includes(part)) {
          score += 30;
        }
      }
    }
    return score;
  }

  $: filteredReceiversForPicker = receiversList
    .filter(rec => {
      const q = receiverSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        rec.name.toLowerCase().includes(q) ||
        (rec.address || '').toLowerCase().includes(q) ||
        (rec.phone || '').toLowerCase().includes(q)
      );
    })
    .map(rec => ({
      ...rec,
      matchScore: getReceiverMatchScore(rec, selectedRestForOrder)
    }))
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));

  $: totalAllCount = zonesData.reduce((acc, z) => acc + parseInt(z.total_restaurants || 0, 10), 0);

  $: selectedZoneObj = zonesData.find(z => z.id == currentZoneId);

  function getGoogleMapsUrl(queryStr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((queryStr || '') + ' Kolkata')}`;
  }

  function copyReceiverFull(rec, keyPrefix = 'recfull') {
    const fullText = `Name: ${rec.name || ''}\nPhone: ${rec.phone || 'N/A'}\nAddress: ${rec.address || ''}`;
    copyText(`${keyPrefix}-${rec.id || rec.name}`, fullText);
  }

  function togglePlanRestaurant(restId) {
    if (plannedRestIds.includes(restId)) {
      plannedRestIds = plannedRestIds.filter(id => id !== restId);
      showToast('Removed from Today\'s Dispatch Plan');
    } else {
      plannedRestIds = [...plannedRestIds, restId];
      showToast('Added to Today\'s Dispatch Plan 📋');
    }
  }

  $: plannedRestaurantsList = restaurantsData.filter(r => plannedRestIds.includes(r.id));

  $: todayOrderedRestaurantsList = restaurantsData.filter(r => {
    if (r.order_status !== 'Ordered' || !r.ordered_at) return false;
    const d = parseOrderDate(r.ordered_at);
    if (!d) return false;
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const orderIST = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return todayIST === orderIST;
  });

  function copyDispatchSheet(mode = 'planned') {
    const list = mode === 'planned' && plannedRestaurantsList.length > 0
      ? plannedRestaurantsList
      : todayOrderedRestaurantsList.length > 0
        ? todayOrderedRestaurantsList
        : filteredRestaurants.slice(0, 20);

    if (list.length === 0) {
      return showToast('No restaurants in list to copy!', 'error');
    }

    const dateHeader = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const lines = [
      `📋 *ZOMSWI KOLKATA DISPATCH SHEET (${dateHeader})*`,
      `Total Listed: ${list.length} Restaurants`,
      `----------------------------------------`
    ];

    list.forEach((r, idx) => {
      const matchedRec = receiversList
        .map(rec => ({ ...rec, score: getReceiverMatchScore(rec, r) }))
        .sort((a, b) => b.score - a.score)[0];

      const recName = r.receiver_name || (matchedRec && matchedRec.score > 0 ? matchedRec.name : 'Receiver');
      const recPhone = r.receiver_phone || (matchedRec && matchedRec.score > 0 ? matchedRec.phone : '');
      const recAddr = r.receiver_address || r.address || '';
      const slotTxt = r.time_slot ? ` [${r.time_slot}]` : '';
      const statusIcon = r.order_status === 'Ordered' ? '✅' : '⏳';

      lines.push(
        `${idx + 1}. ${statusIcon} *${r.name}* (${r.zone_name || 'Kolkata'} | ${r.distance || 'C. 2-3'})${slotTxt}`,
        `   👤 ${recName}${recPhone ? ` (${recPhone})` : ''}`,
        `   📍 ${recAddr}`
      );
    });

    copyText('dispatch-sheet', lines.join('\n'));
  }

  async function selectZone(zId) {
    currentZoneId = zId;
    isZoneDropdownOpen = false;
    isLoadingData = true;
    try {
      await fetchRestaurants();
    } finally {
      isLoadingData = false;
    }
  }

  function handleMonthChange(e) {
    if (e?.detail?.month) {
      currentMonth = e.detail.month;
    } else if (e?.target?.value) {
      currentMonth = e.target.value;
    }
    refreshData();
  }

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 380, behavior: 'smooth' });
      }
    }
  }

  function maskPhoneNumber(phone) {
    if (!phone) return '';
    const str = String(phone).trim();
    if (str.startsWith('+91-')) {
      const rest = str.substring(4);
      if (rest.length >= 2) {
        return `+91-${rest.slice(0, 2)}xxxxxx`;
      }
    } else if (str.startsWith('+91')) {
      const rest = str.substring(3);
      if (rest.length >= 2) {
        return `+91-${rest.slice(0, 2)}xxxxxx`;
      }
    } else if (str.length >= 2) {
      return `${str.slice(0, 2)}xxxxxx`;
    }
    return 'xxxxxx';
  }

  // HELPER TO TRIGGER CUSTOM CONFIRM MODAL
  function requestConfirmation(title, message, actionFn) {
    confirmTitle = title;
    confirmMessage = message;
    pendingActionFn = actionFn;
    showConfirmModal = true;
  }

  async function executeConfirmedAction() {
    if (isExecutingConfirm) return;
    isExecutingConfirm = true;
    try {
      if (pendingActionFn) {
        await pendingActionFn();
      }
    } finally {
      isExecutingConfirm = false;
      showConfirmModal = false;
      pendingActionFn = null;
    }
  }

  // OPEN ORDER WORKFLOW MODAL (STEP 1: SELECT TIME SLOT OR QUICK EDIT EXISTING ORDER)
  function openOrderWorkflowModal(restaurant) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to place or modify orders!', 'error');
      return;
    }
    selectedRestForOrder = restaurant;
    const existingSlot = restaurant.time_slot
      ? timeSlotsList.find(s => s.slot_name === restaurant.time_slot)
      : null;
    selectedTimeSlot = existingSlot || null;
    orderModalStep = 'slot'; // Start at Step 1: Time Slot Selection
    receiverSearchQuery = '';
    showQuickAddRec = false;
    showOrderModal = true;
  }

  // STEP 1 COMPLETE: CHOOSE TIME SLOT & PROCEED TO STEP 2
  function selectTimeSlotStep(slotObj) {
    selectedTimeSlot = slotObj;
    orderModalStep = 'receiver'; // Advance to Step 2: Receiver Assignment
  }

  // STEP 2 COMPLETE: CONFIRM ORDER WITH TIME SLOT & RECEIVER
  async function confirmOrderWithReceiver(receiverObj = null) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to modify orders!', 'error');
      return;
    }
    if (!selectedRestForOrder) return;
    if (isAssigningOrder) return;

    isAssigningOrder = true;

    try {
      const payload = {
        restaurant_id: selectedRestForOrder.id,
        month_year: currentMonth,
        time_slot: selectedTimeSlot ? selectedTimeSlot.slot_name : 'Lunch',
        receiver_id: receiverObj ? receiverObj.id : null,
        receiver_name: receiverObj ? receiverObj.name : null,
        receiver_address: receiverObj ? receiverObj.address : null,
        receiver_phone: receiverObj ? receiverObj.phone : null,
        action: 'assign'
      };

      const res = await fetch('/api/orders/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Marked as ordered (${selectedTimeSlot ? selectedTimeSlot.slot_name : 'Lunch'}) for ${receiverObj ? receiverObj.name : 'Receiver'}!`);
        showOrderModal = false;
        selectedRestForOrder = null;
        selectedTimeSlot = null;
        await Promise.all([refreshData(), fetchReceivers()]);
      } else {
        console.error('API Error updating order:', data.error);
        showToast(data.error || 'Failed to update order status', 'error');
      }
    } catch (err) {
      console.error('Catch Error updating order status:', err);
      showToast(err?.message || 'Error updating order status', 'error');
    } finally {
      isAssigningOrder = false;
    }
  }

  // RESET ORDER TO PENDING WITH CUSTOM MODAL
  function resetOrderStatus(restaurant) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to reset order status!', 'error');
      return;
    }
    requestConfirmation(
      'Reset Order Status?',
      `Reset order status for "${restaurant.name}" back to Pending for ${formatMonthHeader(currentMonth)}?`,
      async () => {
        try {
          const res = await fetch('/api/orders/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: restaurant.id,
              month_year: currentMonth,
              action: 'reset'
            })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Order status reset to Pending');
            await Promise.all([refreshData(), fetchReceivers()]);
          }
        } catch (err) {
          showToast('Error resetting status', 'error');
        }
      }
    );
  }

  // QUICK ADD NEW RECEIVER INSIDE PICKER MODAL
  async function saveQuickReceiver() {
    if (!quickRecName.trim() || !quickRecAddress.trim()) {
      return showToast('Receiver name and address are required', 'error');
    }
    if (isAssigningOrder) return;
    isAssigningOrder = true;

    try {
      const res = await fetch('/api/receivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickRecName,
          address: quickRecAddress,
          phone: quickRecPhone
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('New receiver created!');
        const newRecObj = {
          id: data.id,
          name: quickRecName.trim(),
          address: quickRecAddress.trim(),
          phone: quickRecPhone.trim()
        };
        await fetchReceivers();
        showQuickAddRec = false;
        await confirmOrderWithReceiver(newRecObj);
      } else {
        showToast(data.error || 'Failed to save receiver', 'error');
        isAssigningOrder = false;
      }
    } catch (err) {
      showToast('Error adding receiver', 'error');
      isAssigningOrder = false;
    }
  }

  let searchInputEl;

  function scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function focusSearch() {
    if (searchInputEl) {
      searchInputEl.focus();
      searchInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (typeof document !== 'undefined') {
      const el = document.querySelector('.search-box input');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function scrollToStats() {
    if (typeof document !== 'undefined') {
      const el = document.querySelector('.metrics-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function copyText(fieldKey, text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copiedFieldId = fieldKey;
      showToast('Copied to clipboard!');
      setTimeout(() => {
        if (copiedFieldId === fieldKey) copiedFieldId = null;
      }, 1800);
    }).catch(() => {
      showToast('Failed to copy text', 'error');
    });
  }

  function openAddModal() {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to add restaurants!', 'error');
      return;
    }
    editRestId = null;
    restZoneId = currentZoneId !== 'all' ? currentZoneId : (zonesData[0]?.id || '');
    restName = '';
    restPlatform = 'Both';
    restDistance = 'C. 2-3';
    restAddress = '';
    restSwiggyUrl = '';
    restZomatoUrl = '';
    showRestModal = true;
  }

  function openEditModal(r) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to edit restaurants!', 'error');
      return;
    }
    if (r.is_seeded) {
      return showToast('Seeded LIST restaurants cannot be edited!', 'error');
    }
    editRestId = r.id;
    restZoneId = r.zone_id;
    restName = r.name;
    restPlatform = r.platform || 'Both';
    restDistance = r.distance || 'C. 2-3';
    restAddress = r.address || '';
    restSwiggyUrl = r.swiggy_url || '';
    restZomatoUrl = r.zomato_url || '';
    showRestModal = true;
  }

  async function saveRestaurant() {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to save restaurants!', 'error');
      return;
    }
    if (!restName.trim()) return showToast('Please enter restaurant name', 'error');
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
          address: restAddress,
          swiggy_url: restSwiggyUrl,
          zomato_url: restZomatoUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(editRestId ? 'Restaurant updated!' : 'Restaurant added successfully!');
        showRestModal = false;
        refreshData();
      } else {
        showToast(data.error || 'Failed to save restaurant', 'error');
      }
    } catch (err) {
      showToast('Error saving restaurant', 'error');
    }
  }

  function deleteRestaurant(r) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to delete restaurants!', 'error');
      return;
    }
    if (r.is_seeded) {
      return showToast('Seeded LIST restaurants cannot be deleted!', 'error');
    }
    requestConfirmation(
      'Delete Restaurant?',
      `Are you sure you want to delete "${r.name}"?`,
      async () => {
        try {
          const res = await fetch(`/api/restaurants/${r.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('Restaurant deleted');
            refreshData();
          } else {
            showToast(data.error || 'Failed to delete restaurant', 'error');
          }
        } catch (err) {
          showToast('Failed to delete restaurant', 'error');
        }
      }
    );
  }

  function handleFileSelect(e) {
    if (e.target.files.length > 0) {
      importFile = e.target.files[0];
      fileNameText = `Selected: ${importFile.name}`;
    }
  }

  async function uploadExcel() {
    if (!importFile) return showToast('Please select an Excel or CSV file', 'error');

    const formData = new FormData();
    formData.append('excelFile', importFile);
    formData.append('zone_id', importZoneId);
    formData.append('new_zone_name', importNewZone.trim());

    showToast('Importing Excel list... Please wait');

    try {
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        showImportModal = false;
        importFile = null;
        fileNameText = '';
        refreshData();
      } else {
        showToast(data.error || 'Failed to import Excel', 'error');
      }
    } catch (err) {
      showToast('Error uploading Excel file', 'error');
    }
  }

  function parseOrderDate(isoStr) {
    if (!isoStr) return null;
    if (typeof isoStr === 'string') {
      let s = isoStr.trim();
      // If DB returned UTC timestamp string without timezone suffix, normalize it to UTC ISO string
      if (s.includes('-') && !s.endsWith('Z') && !s.includes('+')) {
        s = s.replace(' ', 'T') + 'Z';
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatTime(isoStr) {
    const d = parseOrderDate(isoStr);
    if (!d) return '';
    const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  }

  function formatFullOrderDate(isoStr, fallbackMonthStr) {
    const d = parseOrderDate(isoStr);
    if (d) {
      const day = parseInt(d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' }), 10);
      const monthFull = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' });
      const year = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
      const weekday = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
      const timeFormatted = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
                     (day === 2 || day === 22) ? 'nd' :
                     (day === 3 || day === 23) ? 'rd' : 'th';
      return `${day}${suffix} ${monthFull}, ${year} (${weekday}) at ${timeFormatted}`;
    }
    if (fallbackMonthStr) {
      const parts = fallbackMonthStr.split('-');
      if (parts.length >= 2) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    return 'Ordered';
  }

  let headerHeight = 104;
</script>

<!-- HEADER NAVBAR -->
<header class="app-header" bind:clientHeight={headerHeight}>
  <div class="header-container">
    <!-- ROW 1: BRAND LOGO + TITLE + RIGHT TOP CONTROLS (THEME & ADMIN LOCK ICON) -->
    <div class="brand">
      <div class="brand-left">
        <div class="brand-icon"><i class="fa-solid fa-utensils"></i></div>
        <h1 class="brand-title">ZOMSWI TRACKER</h1>
      </div>

      <div class="brand-controls">
        <button class="theme-toggle-btn" on:click={toggleTheme} title="Toggle Light/Dark Theme">
          <i class={currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
          <span class="theme-txt-label">{currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {#if $isAdmin}
          <a href="/admin" class="btn-lock-icon admin-active-icon" title="Admin Workspace">
            <i class="fa-solid fa-user-shield"></i>
            <span class="desktop-auth-lbl">Admin Workspace</span>
          </a>
          <button class="btn-lock-icon btn-logout-icon" on:click={logoutUser} title="Logout Admin">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        {:else}
          <button class="btn-lock-icon" on:click={() => isLoginModalOpen.set(true)} title="Admin Login">
            <i class="fa-solid fa-lock"></i>
            <span class="desktop-auth-lbl">Admin Login</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- ROW 2: LIVE CLOCK BADGE & CALENDAR PICKER (EQUAL SIZE & HEIGHT) -->
    <div class="header-widgets-row">
      <!-- LIVE REAL-TIME DATE & CLOCK BADGE -->
      <div class="live-clock-badge" title="Live Kolkata Time & Date">
        <div class="live-clock-icon">
          <i class="fa-regular fa-clock"></i>
        </div>
        <div class="live-clock-text">
          <span class="live-time-val">{liveTimeStr || '16:36:00 PM'}</span>
          <span class="live-date-val">{liveDateStr || 'Sat, 1 Aug 2026'}</span>
        </div>
      </div>

      <!-- DESIGNED CUSTOM INTERACTIVE MONTH & YEAR CALENDAR PICKER -->
      <CustomCalendarPicker 
        bind:selectedMonth={currentMonth} 
        on:change={() => handleMonthChange()} 
      />
    </div>
  </div>
</header>

<!-- MAIN CONTAINER -->
<main class="main-container" style="--header-offset: {(headerHeight || 104) + 8}px;">
  <!-- METRICS GRID -->
  <section class="metrics-grid">
    <div class="metric-card card-zones">
      <div class="metric-icon"><i class="fa-solid fa-map-location-dot"></i></div>
      <div class="metric-data">
        <span class="metric-label">Active Zones</span>
        <span class="metric-value">
          {#if isLoadingData}
            <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
          {:else}
            {totalZones}
          {/if}
        </span>
      </div>
    </div>

    <div class="metric-card card-total">
      <div class="metric-icon"><i class="fa-solid fa-store"></i></div>
      <div class="metric-data">
        <span class="metric-label">Total Restaurants</span>
        <span class="metric-value">
          {#if isLoadingData}
            <span class="skeleton-shimmer" style="width: 50px; height: 28px; display: inline-block;"></span>
          {:else}
            {totalRestaurants}
          {/if}
        </span>
      </div>
    </div>

    <div class="metric-card card-ordered">
      <div class="metric-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div class="metric-data">
        <span class="metric-label">Ordered ({formatMonthHeader(currentMonth)})</span>
        <span class="metric-value">
          {#if isLoadingData}
            <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
          {:else}
            {totalOrdered}
          {/if}
        </span>
      </div>
    </div>

    <div class="metric-card card-pending">
      <div class="metric-icon"><i class="fa-solid fa-clock"></i></div>
      <div class="metric-data">
        <span class="metric-label">Pending</span>
        <span class="metric-value">
          {#if isLoadingData}
            <span class="skeleton-shimmer" style="width: 40px; height: 28px; display: inline-block;"></span>
          {:else}
            {totalPending}
          {/if}
        </span>
      </div>
    </div>
  </section>

  <!-- TOOLBAR & FILTERS -->
  <section class="toolbar">
    <div class="search-box">
      <div class="search-icon-badge">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
      <input 
        type="text" 
        bind:this={searchInputEl}
        placeholder="Search restaurant, receiver name, distance, address..." 
        bind:value={searchQuery} 
      />
      {#if searchQuery}
        <button class="search-clear-btn" on:click={() => searchQuery = ''} title="Clear Search">
          <i class="fa-solid fa-xmark"></i>
        </button>
      {/if}
    </div>

    <div class="filter-group">
      <!-- CUSTOM STYLED ZONE DROPDOWN WITH ICON AND PILL BADGE -->
      <div class="custom-zone-dropdown">
        <button 
          type="button" 
          class="zone-dropdown-trigger {currentZoneId !== 'all' ? 'active-zone' : ''}" 
          on:click|stopPropagation={() => isZoneDropdownOpen = !isZoneDropdownOpen}
        >
          {#if currentZoneId === 'all'}
            <i class="fa-solid fa-globe"></i>
            <span class="zone-name-txt">All Zones</span>
            <span class="tab-badge">{totalAllCount}</span>
          {:else}
            <i class="fa-solid fa-location-dot"></i>
            <span class="zone-name-txt">{selectedZoneObj ? selectedZoneObj.name : 'Zone'}</span>
            <span class="tab-badge">{selectedZoneObj ? (selectedZoneObj.ordered_count || 0) : 0}/{selectedZoneObj ? (selectedZoneObj.total_restaurants || 0) : 0}</span>
          {/if}
          <i class="fa-solid fa-chevron-down arrow-icon"></i>
        </button>

        {#if isZoneDropdownOpen}
          <div class="zone-dropdown-menu">
            <button 
              type="button" 
              class="zone-dropdown-item {currentZoneId === 'all' ? 'selected' : ''}" 
              on:click={() => selectZone('all')}
            >
              <span class="item-left">
                <i class="fa-solid fa-globe"></i>
                <span>All Zones</span>
              </span>
              <span class="tab-badge">{totalAllCount}</span>
            </button>

            {#each zonesData as z}
              {@const zTot = Number(z.total_restaurants || 0)}
              {@const zOrd = Number(z.ordered_count || 0)}
              {@const zPct = zTot > 0 ? Math.round((zOrd / zTot) * 100) : 0}
              <button 
                type="button" 
                class="zone-dropdown-item {currentZoneId == z.id ? 'selected' : ''}" 
                on:click={() => selectZone(z.id)}
              >
                <span class="item-left" style="flex-direction:column; align-items:flex-start; gap:0.2rem; flex:1;">
                  <span style="display:flex; align-items:center; gap:0.45rem;">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>{z.name}</span>
                  </span>
                  <span style="width:100%; height:4px; background:rgba(148,163,184,0.2); border-radius:999px; overflow:hidden; display:block;">
                    <span style="width:{zPct}%; height:100%; background:{zPct === 100 ? '#10b981' : '#f59e0b'}; display:block;"></span>
                  </span>
                </span>
                <span class="tab-badge">{zOrd}/{zTot}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- CUSTOM STYLED DISTANCE DROPDOWN -->
      <div class="custom-zone-dropdown">
        <button 
          type="button" 
          class="zone-dropdown-trigger {distanceFilter !== 'all' ? 'active-zone' : ''}" 
          on:click|stopPropagation={() => {
            isDistanceDropdownOpen = !isDistanceDropdownOpen;
            isZoneDropdownOpen = false;
            isStatusDropdownOpen = false;
          }}
        >
          <i class="fa-solid fa-route"></i>
          <span class="zone-name-txt">{distanceFilter === 'all' ? 'All Distances' : distanceFilter}</span>
          <i class="fa-solid fa-chevron-down arrow-icon"></i>
        </button>

        {#if isDistanceDropdownOpen}
          <div class="zone-dropdown-menu">
            <button 
              type="button" 
              class="zone-dropdown-item {distanceFilter === 'all' ? 'selected' : ''}" 
              on:click={() => selectDistance('all')}
            >
              <span class="item-left">
                <i class="fa-solid fa-layer-group"></i>
                <span>All Distances</span>
              </span>
            </button>

            {#each availableDistances as dist}
              <button 
                type="button" 
                class="zone-dropdown-item {distanceFilter === dist ? 'selected' : ''}" 
                on:click={() => selectDistance(dist)}
              >
                <span class="item-left">
                  <i class="fa-solid fa-route"></i>
                  <span>{dist}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- CUSTOM STYLED STATUS DROPDOWN -->
      <div class="custom-zone-dropdown">
        <button 
          type="button" 
          class="zone-dropdown-trigger {statusFilter !== 'all' ? 'active-zone' : ''}" 
          on:click|stopPropagation={() => {
            isStatusDropdownOpen = !isStatusDropdownOpen;
            isZoneDropdownOpen = false;
            isDistanceDropdownOpen = false;
          }}
        >
          {#if statusFilter === 'all'}
            <i class="fa-solid fa-list-check"></i>
            <span class="zone-name-txt">All Status</span>
          {:else if statusFilter === 'Ordered'}
            <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
            <span class="zone-name-txt">Ordered Only</span>
            <span class="tab-badge">{totalOrdered}</span>
          {:else}
            <i class="fa-solid fa-clock" style="color: #f59e0b;"></i>
            <span class="zone-name-txt">Pending Only</span>
            <span class="tab-badge">{totalPending}</span>
          {/if}
          <i class="fa-solid fa-chevron-down arrow-icon"></i>
        </button>

        {#if isStatusDropdownOpen}
          <div class="zone-dropdown-menu">
            <button 
              type="button" 
              class="zone-dropdown-item {statusFilter === 'all' ? 'selected' : ''}" 
              on:click={() => selectStatus('all')}
            >
              <span class="item-left">
                <i class="fa-solid fa-list-check"></i>
                <span>All Status</span>
              </span>
              <span class="tab-badge">{totalAllCount}</span>
            </button>

            <button 
              type="button" 
              class="zone-dropdown-item {statusFilter === 'Ordered' ? 'selected' : ''}" 
              on:click={() => selectStatus('Ordered')}
            >
              <span class="item-left">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>Ordered Only</span>
              </span>
              <span class="tab-badge">{totalOrdered}</span>
            </button>

            <button 
              type="button" 
              class="zone-dropdown-item {statusFilter === 'Pending' ? 'selected' : ''}" 
              on:click={() => selectStatus('Pending')}
            >
              <span class="item-left">
                <i class="fa-solid fa-clock" style="color: #f59e0b;"></i>
                <span>Pending Only</span>
              </span>
              <span class="tab-badge">{totalPending}</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- SECTION TITLE & CARDS GRID -->
  <section>
    <div class="section-header">
      <h3>
        {currentZoneId === 'all' ? 'Showing All Kolkata Restaurants' : `Zone: ${zonesData.find(z => z.id == currentZoneId)?.name || 'Selected Zone'}`}
      </h3>
      <div class="section-header-actions">
        <button
          type="button"
          class="btn btn-outline section-action-pill"
          style="border-color:rgba(168,85,247,0.4); color:var(--purple-accent);"
          on:click={() => showPlannerModal = true}
          title="Open Today's WhatsApp/Telegram Dispatch Planner"
        >
          <i class="fa-solid fa-clipboard-list"></i> Dispatch Planner
          {#if plannedRestIds.length > 0}
            <span class="tab-badge" style="background:var(--purple-accent); color:#fff; margin-left:0.2rem;">{plannedRestIds.length}</span>
          {:else if todayOrderedRestaurantsList.length > 0}
            <span class="tab-badge" style="background:var(--emerald-accent); color:#fff; margin-left:0.2rem;">{todayOrderedRestaurantsList.length}</span>
          {/if}
        </button>

        <span class="count-badge section-action-pill">
          Showing {paginatedRestaurants.length} of {filteredRestaurants.length}
        </span>

        <select class="select-filter section-action-pill" bind:value={pageSize}>
          <option value={15}>15 per page</option>
          <option value={30}>30 per page</option>
          <option value={60}>60 per page</option>
          <option value="all">Show All</option>
        </select>
      </div>
    </div>

    {#if isLoadingData}
      <!-- SKELETON SHIMMER LOADING GRID -->
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.2rem; margin-top:1.5rem;">
        {#each Array(6) as _}
          <div class="skeleton-card" style="min-height:140px; padding:1.2rem; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; justify-content:space-between;">
              <span class="skeleton-shimmer" style="width: 140px; height: 20px;"></span>
              <span class="skeleton-shimmer" style="width: 60px; height: 20px;"></span>
            </div>
            <span class="skeleton-shimmer" style="width: 200px; height: 16px;"></span>
            <div style="display:flex; justify-content:space-between; margin-top:0.5rem;">
              <span class="skeleton-shimmer" style="width: 100px; height: 32px; border-radius:8px;"></span>
              <span class="skeleton-shimmer" style="width: 90px; height: 32px; border-radius:8px;"></span>
            </div>
          </div>
        {/each}
      </div>
      <div class="loading-wrapper" style="margin-top:1.5rem;">
        <div class="spinner-ring"></div>
        <div class="loading-txt">
          <i class="fa-solid fa-cloud-arrow-down" style="color:var(--swiggy-color)"></i> Fetching Kolkata Restaurants for {formatMonthHeader(currentMonth)}...
        </div>
      </div>
    {:else if filteredRestaurants.length === 0}
      <div class="empty-state">
        <i class="fa-solid fa-store-slash empty-icon"></i>
        <h4>No Restaurants Found</h4>
        <p>Try clearing your search term or switching to another Kolkata Zone for {formatMonthHeader(currentMonth)}.</p>
      </div>
    {:else}
      <!-- RESTAURANT CARDS GRID (PAGINATED & VIRTUALIZED) -->
      <div class="restaurants-grid">
        {#each paginatedRestaurants as r (r.id)}
          <div class="restaurant-card {r.order_status === 'Ordered' ? 'is-ordered' : ''}">
            <div class="card-top">
              <div>
                <h4 class="rest-name">{r.name}</h4>
                <span class="rest-zone">
                  <i class="fa-solid fa-location-dot"></i> {r.zone_name || 'Kolkata Zone'}
                </span>
              </div>
              <div class="tags-right">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <span class="month-card-badge">
                    <i class="fa-regular fa-calendar-days"></i> {formatMonthHeader(currentMonth)}
                  </span>
                  {#if r.is_seeded || r.is_seeded === 1}
                    <span class="badge-source badge-list">
                      <i class="fa-solid fa-list-check"></i> LIST
                    </span>
                  {:else}
                    <span class="badge-source badge-extra">
                      <i class="fa-solid fa-folder-plus"></i> EXTRA
                    </span>
                  {/if}
                </div>
                <span class="distance-tag">
                  <i class="fa-solid fa-route"></i> {r.distance || 'C. 2-3'}
                </span>
              </div>
            </div>

            <div class="card-mid">
              <!-- PROMINENT ORDERED DATE HIGHLIGHT BANNER -->
              {#if r.order_status === 'Ordered'}
                <div class="prominent-ordered-banner">
                  <div class="banner-icon-box">
                    <i class="fa-solid fa-calendar-check"></i>
                  </div>
                  <div class="banner-text">
                    <span class="banner-title">ORDER MARKED DATE</span>
                    <span class="banner-date">{formatFullOrderDate(r.ordered_at, currentMonth)}</span>
                  </div>
                </div>
              {/if}

              <div class="platform-badges" style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                  {#if r.platform === 'Swiggy'}
                    <span class="badge-platform badge-swiggy">Swiggy</span>
                  {:else if r.platform === 'Zomato'}
                    <span class="badge-platform badge-zomato">Zomato</span>
                  {:else}
                    <span class="badge-platform badge-swiggy">Swiggy</span>
                    <span class="badge-platform badge-zomato">Zomato</span>
                  {/if}

                  <!-- ORDERED TIME SLOT BADGE -->
                  {#if r.order_status === 'Ordered' && r.time_slot}
                    <span style="font-size:0.75rem; font-weight:700; color:var(--amber-accent); background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); padding:0.25rem 0.6rem; border-radius:6px; display:inline-flex; align-items:center; gap:0.3rem;">
                      <i class="fa-solid fa-clock"></i> {r.time_slot}
                    </span>
                  {/if}
                </div>

                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <a
                    href={getGoogleMapsUrl(`${r.name} ${r.zone_name || ''}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-outline"
                    style="padding:0.2rem 0.5rem; font-size:0.73rem; border-radius:6px;"
                    title="View Restaurant on Google Maps"
                  >
                    <i class="fa-solid fa-map-location-dot" style="color:var(--primary-accent)"></i> Map
                  </a>
                  <button
                    type="button"
                    class="btn btn-outline"
                    style="padding:0.2rem 0.5rem; font-size:0.73rem; border-radius:6px; {plannedRestIds.includes(r.id) ? 'background:rgba(168,85,247,0.15); border-color:var(--purple-accent); color:var(--purple-accent);' : ''}"
                    on:click={() => togglePlanRestaurant(r.id)}
                    title="Add/Remove from Today's Dispatch Plan"
                  >
                    <i class="fa-solid {plannedRestIds.includes(r.id) ? 'fa-check' : 'fa-plus'}"></i> {plannedRestIds.includes(r.id) ? 'Planned' : 'Plan'}
                  </button>
                </div>
              </div>

              <!-- SINGLE LINE TRUNCATED RESTAURANT ADDRESS + COPY BUTTON -->
              <div class="address-text" title={r.address || 'Kolkata Receiver Address Available'}>
                <i class="fa-solid fa-location-arrow" style="flex-shrink:0;"></i>
                <span class="address-content">{r.address || 'Kolkata Receiver Address Available'}</span>
                <button 
                  class="btn-copy-address" 
                  on:click={() => copyText(`rest-${r.id}`, r.address || 'Kolkata Receiver Address Available')} 
                  title="Copy Receiver Address"
                >
                  {#if copiedFieldId === `rest-${r.id}`}
                    <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>
                  {:else}
                    <i class="fa-regular fa-copy"></i>
                  {/if}
                </button>
              </div>

              <!-- ASSIGNED RECEIVER INFO BADGE (ONLY VISIBLE FOR LOGGED IN ADMIN) -->
              {#if $isAdmin && r.order_status === 'Ordered' && r.receiver_name}
                <div class="rec-assigned-badge" style="background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.3); padding:0.45rem 0.75rem; border-radius:var(--radius-sm); margin-top:0.2rem; font-size:0.82rem; color:var(--text-main);">
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem;">
                    <span style="font-weight:700; color:var(--purple-accent); display:flex; align-items:center; gap:0.4rem;">
                      <i class="fa-solid fa-user-check"></i> {r.receiver_name}
                    </span>
                    <div style="display:flex; align-items:center; gap:0.35rem;">
                      {#if r.receiver_phone}
                        <span style="font-size:0.78rem; font-weight:600; color:var(--emerald-accent);">{$isAdmin ? r.receiver_phone : maskPhoneNumber(r.receiver_phone)}</span>
                      {/if}
                      <button
                        class="btn-copy-inline"
                        on:click={() => copyText(`rfull-${r.id}`, `Name: ${r.receiver_name}\nPhone: ${r.receiver_phone || 'N/A'}\nAddress: ${r.receiver_address || r.address || ''}`)}
                        title="Copy Full Receiver Details (Name + Phone + Address)"
                      >
                        {#if copiedFieldId === `rfull-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-solid fa-copy"></i>{/if}
                      </button>
                    </div>
                  </div>
                  {#if r.receiver_address}
                    <div style="display:flex; align-items:center; gap:0.4rem; margin-top:0.2rem; font-size:0.78rem; color:var(--text-muted);">
                      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">{r.receiver_address}</span>
                      {#if $isAdmin}
                        <button class="btn-copy-inline" on:click={() => copyText(`rrec-${r.id}`, r.receiver_address)} title="Copy Receiver Address">
                          {#if copiedFieldId === `rrec-${r.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                        </button>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            <div class="card-bottom">
              {#if r.order_status === 'Ordered'}
                <span 
                  class="action-toggle-btn btn-status-ordered" 
                  style="cursor: default;"
                >
                  <i class="fa-solid fa-circle-check"></i> Ordered
                </span>
                {#if $isAdmin}
                  <button 
                    class="icon-btn" 
                    on:click={() => openOrderWorkflowModal(r)} 
                    title="Quick Edit Time Slot or Assigned Receiver"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                {/if}
                <button 
                  class="icon-btn icon-btn-danger" 
                  on:click={() => resetOrderStatus(r)} 
                  title="Reset status back to Pending"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              {:else}
                <button 
                  class="action-toggle-btn btn-status-pending" 
                  on:click={() => openOrderWorkflowModal(r)}
                >
                  <i class="fa-solid fa-truck-ramp-box"></i> Mark as Ordered
                </button>
              {/if}

              {#if r.is_seeded || r.is_seeded === 1}
                <span class="locked-badge" title="Original LIST items cannot be edited or deleted">
                  <i class="fa-solid fa-lock"></i> Locked
                </span>
              {:else if $isAdmin}
                <div class="card-admin-actions">
                  <button class="icon-btn" on:click={() => openEditModal(r)} title="Edit Extra Restaurant">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="icon-btn icon-btn-danger" on:click={() => deleteRestaurant(r)} title="Delete Extra Restaurant">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              {:else}
                <span class="locked-badge" title="Login as Admin to edit or delete">
                  <i class="fa-solid fa-lock"></i> Locked
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- PAGINATION CONTROLS BAR -->
      {#if pageSize !== 'all' && totalPages > 1}
        <div class="pagination-bar" style="margin-top:2rem; display:flex; justify-content:center; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <button 
            class="btn btn-outline" 
            style="padding:0.45rem 0.85rem; font-size:0.85rem;"
            disabled={currentPage === 1} 
            on:click={() => goToPage(currentPage - 1)}
          >
            <i class="fa-solid fa-chevron-left"></i> Previous
          </button>

          <div style="display:flex; gap:0.25rem;">
            {#each Array(totalPages) as _, idx}
              {@const pageNum = idx + 1}
              {#if pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)}
                <button 
                  class="btn {currentPage === pageNum ? 'btn-primary' : 'btn-outline'}" 
                  style="padding:0.45rem 0.75rem; font-size:0.85rem; min-width:38px;"
                  on:click={() => goToPage(pageNum)}
                >
                  {pageNum}
                </button>
              {:else if pageNum === currentPage - 3 || pageNum === currentPage + 3}
                <span style="padding:0.45rem 0.3rem; color:var(--text-muted);">...</span>
              {/if}
            {/each}
          </div>

          <button 
            class="btn btn-outline" 
            style="padding:0.45rem 0.85rem; font-size:0.85rem;"
            disabled={currentPage === totalPages} 
            on:click={() => goToPage(currentPage + 1)}
          >
            Next <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      {/if}
    {/if}
  </section>
</main>

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

<!-- TWO-STEP ORDERING & RECEIVER SELECTION MODAL -->
{#if showOrderModal}
  <div class="modal-overlay">
    <div class="modal-card" style="max-width:650px; position:relative;">
      <!-- ANIMATING LOADING OVERLAY FOR ASSIGNING ORDER -->
      {#if isAssigningOrder}
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--modal-bg); opacity: 0.94; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; border-radius: var(--radius-lg); backdrop-filter: blur(4px);">
          <div style="width: 50px; height: 50px; border: 4px solid var(--border-color); border-top-color: var(--purple-accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1.25rem;"></div>
          <p style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.15rem; color: var(--text-main); margin: 0;">Assigning Delivery Receiver...</p>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.35rem;">Please wait while the order is being confirmed.</p>
        </div>
      {/if}

      <div class="modal-header">
        <div>
          <h3 style="font-size:1.2rem; font-family:'Outfit', sans-serif;">
            {#if orderModalStep === 'slot'}
              <i class="fa-solid fa-clock" style="color:var(--amber-accent)"></i> Step 1 of 2: Select Time Slot
            {:else}
              <i class="fa-solid fa-user-check" style="color:var(--purple-accent)"></i> Step 2 of 2: Assign Delivery Receiver
            {/if}
          </h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
            Ordering for: <strong style="color:var(--text-main)">{selectedRestForOrder?.name}</strong> • <span style="color:var(--swiggy-color); font-weight:600;">{selectedRestForOrder?.zone_name || 'Kolkata'}</span> ({formatMonthHeader(currentMonth)})
          </p>
        </div>
        <button class="btn-close" on:click={() => !isAssigningOrder && (showOrderModal = false)} disabled={isAssigningOrder}>&times;</button>
      </div>

      <!-- STEP 1: CHOOSE TIME SLOT -->
      {#if orderModalStep === 'slot'}
        <div style="margin-bottom:1rem;">
          <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
            Select the ordering meal time slot for this restaurant:
          </p>

          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.85rem;">
            {#each timeSlotsList as slot}
              <button 
                type="button" 
                class="btn btn-outline"
                style="padding:1rem; border-radius:var(--radius-md); border-left:4px solid {slot.color_theme || '#3b82f6'}; {selectedTimeSlot?.slot_name === slot.slot_name ? 'background:rgba(245,158,11,0.12); border-color:var(--amber-accent);' : ''} justify-content:flex-start; text-align:left; gap:0.75rem;"
                on:click={() => selectTimeSlotStep(slot)}
              >
                <div style="width:38px; height:38px; border-radius:var(--radius-sm); background:rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; font-size:1.1rem; color:{slot.color_theme || '#3b82f6'}; flex-shrink:0;">
                  <i class="fa-solid {slot.icon || 'fa-clock'}"></i>
                </div>
                <div>
                  <div style="font-weight:700; font-size:0.95rem; color:var(--text-main); font-family:'Outfit', sans-serif;">{slot.slot_name}</div>
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.15rem;">{slot.start_time} - {slot.end_time}</div>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <div class="modal-footer" style="justify-content:flex-end;">
          <button type="button" class="btn btn-outline" on:click={() => showOrderModal = false}>
            Cancel
          </button>
        </div>
      {/if}

      <!-- STEP 2: CHOOSE RECEIVER -->
      {#if orderModalStep === 'receiver'}
        {#if !showQuickAddRec}
          <!-- SELECTED TIME SLOT SUMMARY BANNER -->
          <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:0.65rem 0.9rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; font-weight:700; color:var(--amber-accent); display:flex; align-items:center; gap:0.4rem;">
              <i class="fa-solid {selectedTimeSlot?.icon || 'fa-clock'}"></i> Selected Slot: {selectedTimeSlot?.slot_name} ({selectedTimeSlot?.start_time} - {selectedTimeSlot?.end_time})
            </span>
            <button class="btn btn-outline" style="padding:0.25rem 0.65rem; font-size:0.75rem;" on:click={() => !isAssigningOrder && (orderModalStep = 'slot')} disabled={isAssigningOrder}>
              &larr; Change Slot
            </button>
          </div>

          <!-- SEARCH & RECEIVER LIST -->
          <div class="search-box" style="margin-bottom:1rem;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              placeholder="Search receiver name, phone or address..." 
              bind:value={receiverSearchQuery} 
              disabled={isAssigningOrder}
            />
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">
              SELECT FROM {receiversList.length} SAVED RECEIVERS (AUTO-MATCHED TO ZONE)
            </span>
            <button class="btn btn-outline" style="padding:0.35rem 0.75rem; font-size:0.8rem;" on:click={() => !isAssigningOrder && (showQuickAddRec = true)} disabled={isAssigningOrder}>
              <i class="fa-solid fa-user-plus" style="color:var(--purple-accent)"></i> + Add New Receiver
            </button>
          </div>

          <div class="receiver-picker-scroll" style="max-height:320px; overflow-y:auto; display:flex; flex-direction:column; gap:0.6rem; padding-right:0.3rem;">
            {#if filteredReceiversForPicker.length === 0}
              <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">
                No receivers match "{receiverSearchQuery}".
              </div>
            {:else}
              {#each filteredReceiversForPicker as rec (rec.id)}
                <div 
                  class="picker-rec-item" 
                  style="background:{rec.matchScore >= 50 ? 'rgba(16,185,129,0.08)' : 'var(--input-bg)'}; border:1px solid {rec.matchScore >= 50 ? 'rgba(16,185,129,0.45)' : 'var(--border-color)'}; border-radius:var(--radius-md); padding:0.85rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:var(--transition); {isAssigningOrder ? 'opacity: 0.6; pointer-events: none;' : ''}"
                  on:click={() => !isAssigningOrder && confirmOrderWithReceiver(rec)}
                >
                  <div style="flex:1; min-width:0; padding-right:0.75rem;">
                    <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                      <strong style="font-size:0.95rem; font-family:'Outfit', sans-serif;">{rec.name}</strong>
                      {#if rec.matchScore >= 50}
                        <span style="font-size:0.7rem; font-weight:700; background:rgba(16,185,129,0.18); color:var(--emerald-accent); border:1px solid rgba(16,185,129,0.35); padding:0.12rem 0.45rem; border-radius:999px;">
                          ⚡ Best Match for Zone
                        </span>
                      {/if}
                      {#if rec.phone}
                        <span style="font-size:0.8rem; font-weight:700; color:var(--emerald-accent);">{rec.phone}</span>
                      {/if}
                      {#if Number(rec.today_order_count || 0) > 0}
                        <span style="font-size:0.72rem; font-weight:700; padding:0.12rem 0.45rem; border-radius:999px; background:{Number(rec.today_order_count) >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color:{Number(rec.today_order_count) >= 2 ? '#ef4444' : '#f59e0b'};" title="Orders assigned to this receiver today">
                          ⚠️ {rec.today_order_count} Today
                        </span>
                      {/if}
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:0.25rem;">
                      <i class="fa-solid fa-location-dot" style="color:var(--swiggy-color)"></i> {rec.address}
                    </p>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.4rem; flex-shrink:0;" on:click|stopPropagation>
                    <button
                      type="button"
                      class="btn btn-outline"
                      style="padding:0.4rem 0.6rem; font-size:0.78rem;"
                      on:click={() => copyReceiverFull(rec, 'pickrec')}
                      title="Copy Name + Phone + Address"
                    >
                      {#if copiedFieldId === `pickrec-${rec.id}`}<i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>{:else}<i class="fa-regular fa-copy"></i>{/if}
                    </button>
                    <button
                      type="button"
                      class="btn btn-purple"
                      style="padding:0.45rem 0.85rem; font-size:0.82rem;"
                      disabled={isAssigningOrder}
                      on:click={() => !isAssigningOrder && confirmOrderWithReceiver(rec)}
                    >
                      <i class="fa-solid fa-check"></i> Assign
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>

          <div class="modal-footer" style="justify-content:space-between; align-items:center;">
            <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && confirmOrderWithReceiver(null)} disabled={isAssigningOrder}>
              Mark without Receiver
            </button>
            <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && (showOrderModal = false)} disabled={isAssigningOrder}>
              Cancel
            </button>
          </div>
        {:else}
          <!-- QUICK ADD NEW RECEIVER FORM INSIDE MODAL -->
          <form on:submit|preventDefault={saveQuickReceiver} style="margin-top:0.5rem;">
            <div class="form-group">
              <label>Receiver Name / Label *</label>
              <input type="text" class="form-control" placeholder="e.g. Arif Imtiyaz frnd Jadavpur" bind:value={quickRecName} disabled={isAssigningOrder} required />
            </div>

            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" class="form-control" placeholder="e.g. +91-8617615800" bind:value={quickRecPhone} disabled={isAssigningOrder} />
            </div>

            <div class="form-group">
              <label>Full Delivery Address *</label>
              <textarea class="form-control" rows="3" placeholder="Full address..." bind:value={quickRecAddress} disabled={isAssigningOrder} required></textarea>
            </div>

            <div class="modal-footer" style="justify-content:space-between;">
              <button type="button" class="btn btn-outline" on:click={() => !isAssigningOrder && (showQuickAddRec = false)} disabled={isAssigningOrder}>
                &larr; Back to Receivers List
              </button>
              <button type="submit" class="btn btn-purple" disabled={isAssigningOrder}>
                {#if isAssigningOrder}
                  <i class="fa-solid fa-spinner fa-spin"></i> Saving...
                {:else}
                  <i class="fa-solid fa-check"></i> Save & Assign Receiver
                {/if}
              </button>
            </div>
          </form>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<!-- ADD / EDIT EXTRA RESTAURANT MODAL -->
{#if showRestModal}
  <div class="modal-overlay">
    <div class="modal-card" style="max-width:540px;">
      <div class="modal-header">
        <h3>
          <i class="fa-solid fa-store" style="color:var(--swiggy-color)"></i>
          {editRestId ? 'Edit Extra Restaurant' : 'Add New Restaurant'}
        </h3>
        <button class="btn-close" on:click={() => showRestModal = false}>&times;</button>
      </div>

      <form on:submit|preventDefault={saveRestaurant}>
        <div class="form-group">
          <label>Select Kolkata Zone *</label>
          <select class="form-control" bind:value={restZoneId} required>
            <option value="" disabled>-- Choose Zone --</option>
            {#each zonesData as z}
              <option value={z.id}>{z.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label>Restaurant Name *</label>
          <input type="text" class="form-control" placeholder="e.g. Arsalan Restaurant & Caterer" bind:value={restName} required />
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:0.85rem;">
          <div class="form-group">
            <label>Platform</label>
            <select class="form-control" bind:value={restPlatform}>
              <option value="Both">Both (Swiggy & Zomato)</option>
              <option value="Swiggy">Swiggy Only</option>
              <option value="Zomato">Zomato Only</option>
            </select>
          </div>

          <div class="form-group">
            <label>Distance Tier</label>
            <select class="form-control" bind:value={restDistance}>
              <option value="A. 0-1">A. 0-1 km</option>
              <option value="B. 1-2">B. 1-2 km</option>
              <option value="C. 2-3">C. 2-3 km</option>
              <option value="D. 3-5">D. 3-5 km</option>
              <option value="E. 5-7">E. 5-7 km</option>
              <option value="F. 7+">F. 7+ km</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Receiver / Delivery Address</label>
          <textarea class="form-control" rows="2" placeholder="Delivery receiver address for this zone..." bind:value={restAddress}></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showRestModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">
            <i class="fa-solid fa-check"></i> {editRestId ? 'Update Restaurant' : 'Save Restaurant'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- TODAY'S DISPATCH PLANNER / WHATSAPP SHEET MODAL -->
{#if showPlannerModal}
  <div class="modal-overlay">
    <div class="modal-card" style="max-width:680px;">
      <div class="modal-header">
        <div>
          <h3><i class="fa-solid fa-clipboard-list" style="color:var(--purple-accent)"></i> Today's Dispatch Planner & WhatsApp Sheet</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
            Plan restaurants or copy a 1-click formatted WhatsApp/Telegram dispatch sheet with auto-matched receivers.
          </p>
        </div>
        <button class="btn-close" on:click={() => showPlannerModal = false}>&times;</button>
      </div>

      <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-bottom:1rem;">
        <button type="button" class="btn btn-purple" on:click={() => copyDispatchSheet('planned')}>
          <i class="fa-brands fa-whatsapp"></i> Copy Planned List ({plannedRestaurantsList.length})
        </button>
        <button type="button" class="btn btn-emerald" on:click={() => copyDispatchSheet('today')}>
          <i class="fa-solid fa-copy"></i> Copy Today's Ordered ({todayOrderedRestaurantsList.length})
        </button>
        {#if plannedRestIds.length > 0}
          <button type="button" class="btn btn-outline" on:click={() => { plannedRestIds = []; showToast('Cleared planned queue'); }}>
            <i class="fa-solid fa-trash-can"></i> Clear Plan
          </button>
        {/if}
      </div>

      <div style="max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:0.6rem; padding-right:0.25rem;">
        {#if plannedRestaurantsList.length === 0 && todayOrderedRestaurantsList.length === 0}
          <div style="text-align:center; padding:2rem; color:var(--text-muted); background:var(--input-bg); border-radius:var(--radius-md);">
            <i class="fa-solid fa-clipboard-check" style="font-size:2rem; color:var(--purple-accent); margin-bottom:0.5rem;"></i>
            <p style="font-weight:600; color:var(--text-main);">No restaurants added to Today's Plan yet.</p>
            <p style="font-size:0.82rem; margin-top:0.25rem;">Click the <strong>+ Plan</strong> button on any restaurant card to queue it for today's dispatch sheet!</p>
          </div>
        {:else}
          {#each (plannedRestaurantsList.length > 0 ? plannedRestaurantsList : todayOrderedRestaurantsList) as item, idx (item.id)}
            <div style="background:var(--input-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 0.9rem; display:flex; justify-content:space-between; align-items:center; gap:0.75rem;">
              <div style="min-width:0; flex:1;">
                <div style="display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
                  <span style="font-weight:700; color:var(--purple-accent);">#{idx + 1}</span>
                  <strong style="font-size:0.92rem;">{item.name}</strong>
                  <span class="distance-tag" style="font-size:0.72rem;">{item.zone_name} • {item.distance}</span>
                  {#if item.order_status === 'Ordered'}
                    <span style="font-size:0.72rem; color:var(--emerald-accent); font-weight:700;">✅ Ordered {item.time_slot ? `(${item.time_slot})` : ''}</span>
                  {/if}
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:0.2rem;">
                  📍 {item.receiver_address || item.address}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:0.4rem;">
                {#if item.order_status !== 'Ordered' && $isAdmin}
                  <button type="button" class="btn btn-primary" style="padding:0.35rem 0.65rem; font-size:0.76rem;" on:click={() => { showPlannerModal = false; openOrderWorkflowModal(item); }}>
                    Order Now
                  </button>
                {/if}
                {#if plannedRestIds.includes(item.id)}
                  <button type="button" class="btn btn-outline" style="padding:0.35rem 0.55rem; font-size:0.76rem;" on:click={() => togglePlanRestaurant(item.id)} title="Remove from Plan">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" on:click={() => showPlannerModal = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- IMPORT EXCEL MODAL -->
{#if showImportModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-file-excel" style="color:var(--emerald-accent)"></i> Import Excel Restaurant List</h3>
        <button class="btn-close" on:click={() => showImportModal = false}>&times;</button>
      </div>

      <form on:submit|preventDefault={uploadExcel}>
        <div class="form-group">
          <label>Target Zone (Select Existing or Enter New)</label>
          <select class="form-control" bind:value={importZoneId}>
            <option value="">-- Select Existing Zone --</option>
            {#each zonesData as z}
              <option value={z.id}>{z.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label>Or Create New Zone Name</label>
          <input type="text" class="form-control" placeholder="e.g. Kolkata-SaltLake" bind:value={importNewZone} />
        </div>

        <div class="form-group">
          <label>Upload Excel / CSV File</label>
          <div class="drop-zone">
            <i class="fa-solid fa-cloud-arrow-up drop-icon"></i>
            <p style="font-size:0.9rem; color:var(--text-main); font-weight:600;">Click or Drag Excel File Here</p>
            <p style="font-size:0.78rem; color:var(--text-muted);">Supports .xlsx, .xls, .csv files</p>
            <input type="file" class="file-input" accept=".xlsx, .xls, .csv" on:change={handleFileSelect} />
          </div>
          {#if fileNameText}
            <span class="file-name-display">{fileNameText}</span>
          {/if}
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showImportModal = false}>Cancel</button>
          <button type="submit" class="btn btn-emerald"><i class="fa-solid fa-upload"></i> Upload & Import</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- DESIGNED CUSTOM DELETE CONFIRMATION MODAL -->
{#if showConfirmModal}
  <div class="modal-overlay">
    <div class="modal-card confirm-modal-card">
      <div class="confirm-icon-wrapper danger">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="confirm-title">{confirmTitle || 'Are you sure?'}</h3>
      <p class="confirm-message">{confirmMessage}</p>
      <div class="modal-footer" style="justify-content:center; gap:0.85rem; border-top:none; margin-top:1.25rem;">
        <button class="btn btn-outline" on:click={() => !isExecutingConfirm && (showConfirmModal = false)} disabled={isExecutingConfirm}>Cancel</button>
        <button class="btn btn-danger-action" on:click={executeConfirmedAction} disabled={isExecutingConfirm}>
          {#if isExecutingConfirm}
            <i class="fa-solid fa-spinner fa-spin"></i> Confirming...
          {:else}
            <i class="fa-solid fa-trash-can"></i> Confirm Action
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- TOAST NOTIFICATION -->
{#if toastVisible}
  <div class="toast">
    <i class={toastType === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style="color:var(--emerald-accent)"></i>
    <span>{toastMessage}</span>
  </div>
{/if}
