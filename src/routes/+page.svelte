<script>
  import { onMount } from 'svelte';
  import { isAdmin, isLoginModalOpen } from '$lib/authStore.js';
  import AppHeader from '$lib/components/public/AppHeader.svelte';
  import MetricsGrid from '$lib/components/public/MetricsGrid.svelte';
  import FiltersToolbar from '$lib/components/public/FiltersToolbar.svelte';
  import RestaurantsSection from '$lib/components/public/RestaurantsSection.svelte';
  import MobileBottomNav from '$lib/components/public/MobileBottomNav.svelte';
  import OrderWorkflowModal from '$lib/components/public/OrderWorkflowModal.svelte';
  import RestaurantFormModal from '$lib/components/public/RestaurantFormModal.svelte';
  import DispatchPlannerModal from '$lib/components/public/DispatchPlannerModal.svelte';
  import ImportModal from '$lib/components/public/ImportModal.svelte';
  import ConfirmModal from '$lib/components/public/ConfirmModal.svelte';
  import { getCurrentMonthString, formatMonthHeader, parseOrderDate } from '$lib/utils/date.js';
  import { setDocumentTheme, getSavedTheme, saveTheme, getNextTheme } from '$lib/utils/theme.js';
  import { getReceiverMatchScore } from '$lib/utils/receiverMatch.js';
  import { buildDispatchSheetText } from '$lib/utils/dispatch.js';

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
    setDocumentTheme(theme);
  }

  function toggleTheme() {
    const newTheme = getNextTheme(currentTheme);
    applyTheme(newTheme);
    saveTheme(newTheme);
    showToast(`Switched to ${newTheme.toUpperCase()} mode`);
  }

  async function silentRefresh() {
    try {
      await Promise.all([fetchZones(), fetchStats(), fetchRestaurants()]);
    } catch (e) {
      console.error('Background sync error:', e);
    }
  }

  onMount(() => {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    refreshData();

    // Live sync: every 10 seconds (while the tab is visible) check the cheap data version
    // and only re-fetch the full lists when something actually changed
    let lastDataVersion = null;
    const checkDataVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        const data = await res.json();
        if (!data.success) return;
        if (lastDataVersion !== null && data.version !== lastDataVersion) {
          silentRefresh();
        }
        lastDataVersion = data.version;
      } catch (e) {}
    };
    checkDataVersion();
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoadingData) {
        checkDataVersion();
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
      clearInterval(pollInterval);
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

    copyText('dispatch-sheet', buildDispatchSheetText(list, receiversList));
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

  let headerHeight = 104;
</script>

<AppHeader
  bind:headerHeight
  {toggleTheme}
  {currentTheme}
  bind:currentMonth
  {handleMonthChange}
/>

<!-- MAIN CONTAINER -->
<main class="main-container" style="--header-offset: {(headerHeight || 104) + 8}px;">
  <MetricsGrid
    {isLoadingData}
    {totalZones}
    {totalRestaurants}
    {currentMonth}
    {totalOrdered}
    {totalPending}
  />

  <FiltersToolbar
    bind:searchInputEl
    bind:searchQuery
    {currentZoneId}
    bind:isZoneDropdownOpen
    {totalAllCount}
    {selectedZoneObj}
    {selectZone}
    {zonesData}
    {distanceFilter}
    bind:isDistanceDropdownOpen
    bind:isStatusDropdownOpen
    {selectDistance}
    {availableDistances}
    {statusFilter}
    {totalOrdered}
    {totalPending}
    {selectStatus}
  />

  <RestaurantsSection
    {currentZoneId}
    {zonesData}
    bind:showPlannerModal
    {plannedRestIds}
    {todayOrderedRestaurantsList}
    {paginatedRestaurants}
    {filteredRestaurants}
    bind:pageSize
    {isLoadingData}
    {currentMonth}
    {copiedFieldId}
    {togglePlanRestaurant}
    {copyText}
    {openOrderWorkflowModal}
    {resetOrderStatus}
    {openEditModal}
    {deleteRestaurant}
    {currentPage}
    {totalPages}
    {goToPage}
  />
</main>

<MobileBottomNav
  {scrollToTop}
  {openAddModal}
  bind:showImportModal
  {focusSearch}
  {scrollToStats}
/>

<!-- TWO-STEP ORDERING & RECEIVER SELECTION MODAL -->
{#if showOrderModal}
  <OrderWorkflowModal
    {isAssigningOrder}
    bind:orderModalStep
    {selectedRestForOrder}
    {currentMonth}
    bind:showOrderModal
    {timeSlotsList}
    {selectedTimeSlot}
    {selectTimeSlotStep}
    bind:receiverSearchQuery
    {receiversList}
    bind:showQuickAddRec
    {filteredReceiversForPicker}
    {confirmOrderWithReceiver}
    {copyReceiverFull}
    {copiedFieldId}
    {saveQuickReceiver}
    bind:quickRecName
    bind:quickRecPhone
    bind:quickRecAddress
  />
{/if}

<!-- ADD / EDIT EXTRA RESTAURANT MODAL -->
{#if showRestModal}
  <RestaurantFormModal
    {editRestId}
    bind:showRestModal
    {saveRestaurant}
    bind:restZoneId
    {zonesData}
    bind:restName
    bind:restPlatform
    bind:restDistance
    bind:restAddress
  />
{/if}

<!-- TODAY'S DISPATCH PLANNER / WHATSAPP SHEET MODAL -->
{#if showPlannerModal}
  <DispatchPlannerModal
    bind:showPlannerModal
    {copyDispatchSheet}
    {plannedRestaurantsList}
    {todayOrderedRestaurantsList}
    bind:plannedRestIds
    {showToast}
    {openOrderWorkflowModal}
    {togglePlanRestaurant}
  />
{/if}

<!-- IMPORT EXCEL MODAL -->
{#if showImportModal}
  <ImportModal
    bind:showImportModal
    {uploadExcel}
    bind:importZoneId
    {zonesData}
    bind:importNewZone
    {handleFileSelect}
    {fileNameText}
  />
{/if}

<!-- DESIGNED CUSTOM DELETE CONFIRMATION MODAL -->
{#if showConfirmModal}
  <ConfirmModal
    {confirmTitle}
    {confirmMessage}
    {isExecutingConfirm}
    bind:showConfirmModal
    {executeConfirmedAction}
  />
{/if}

<!-- TOAST NOTIFICATION -->
{#if toastVisible}
  <div class="toast">
    <i class={toastType === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style="color:{toastType === 'success' ? 'var(--emerald-accent)' : 'var(--danger-accent)'}"></i>
    <span>{toastMessage}</span>
  </div>
{/if}
