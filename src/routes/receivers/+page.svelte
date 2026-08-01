<script>
  import { onMount } from 'svelte';
  import { userStore, isAdmin, isLoginModalOpen, logoutUser } from '$lib/authStore.js';

  let receiversData = [];
  let searchQuery = '';
  let isLoading = true;

  // Theme State
  let currentTheme = 'light';

  // Toast
  let toastMessage = '';
  let toastType = 'success';
  let toastVisible = false;

  // Add/Edit Modal
  let showAddEditModal = false;
  let editId = null;
  let name = '';
  let address = '';
  let phone = '';

  // CUSTOM CONFIRMATION DELETE MODAL STATE
  let showConfirmDeleteModal = false;
  let pendingDeleteReceiver = null;

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

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    fetchReceivers();
  });

  async function fetchReceivers() {
    isLoading = true;
    try {
      const res = await fetch('/api/receivers');
      const data = await res.json();
      if (data.success) {
        receiversData = data.receivers;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  $: filteredReceivers = receiversData.filter(rec => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      rec.name.toLowerCase().includes(q) ||
      (rec.address || '').toLowerCase().includes(q) ||
      (rec.phone || '').toLowerCase().includes(q)
    );
  });

  function maskPhoneNumber(p) {
    if (!p) return '';
    const str = String(p).trim();
    if (str.startsWith('+91-')) {
      const rest = str.substring(4);
      if (rest.length >= 2) return `+91-${rest.slice(0, 2)}xxxxxx`;
    } else if (str.startsWith('+91')) {
      const rest = str.substring(3);
      if (rest.length >= 2) return `+91-${rest.slice(0, 2)}xxxxxx`;
    } else if (str.length >= 2) {
      return `${str.slice(0, 2)}xxxxxx`;
    }
    return 'xxxxxx';
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
      showToast('Admin login required to add receivers!', 'error');
      return;
    }
    editId = null;
    name = '';
    address = '';
    phone = '';
    showAddEditModal = true;
  }

  function openEditModal(rec) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to edit receivers!', 'error');
      return;
    }
    editId = rec.id;
    name = rec.name;
    address = rec.address;
    phone = rec.phone || '';
    showAddEditModal = true;
  }

  async function saveReceiver() {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to save receivers!', 'error');
      return;
    }
    if (!name.trim()) return showToast('Receiver name is required', 'error');
    if (!address.trim()) return showToast('Receiver address is required', 'error');

    try {
      const url = editId ? `/api/receivers/${editId}` : '/api/receivers';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone })
      });
      const data = await res.json();
      if (data.success) {
        showToast(editId ? 'Receiver updated successfully!' : 'Receiver added successfully!');
        showAddEditModal = false;
        fetchReceivers();
      } else {
        showToast(data.error || 'Failed to save receiver', 'error');
      }
    } catch (err) {
      showToast('Error saving receiver', 'error');
    }
  }

  // TRIGGER CUSTOM DESIGNED DELETE MODAL
  function triggerDelete(rec) {
    if (!$isAdmin) {
      isLoginModalOpen.set(true);
      showToast('Admin login required to delete receivers!', 'error');
      return;
    }
    pendingDeleteReceiver = rec;
    showConfirmDeleteModal = true;
  }

  async function confirmExecuteDelete() {
    if (!pendingDeleteReceiver) return;
    try {
      const res = await fetch(`/api/receivers/${pendingDeleteReceiver.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Receiver deleted successfully');
        showConfirmDeleteModal = false;
        pendingDeleteReceiver = null;
        fetchReceivers();
      } else {
        showToast(data.error || 'Failed to delete receiver', 'error');
      }
    } catch (err) {
      showToast('Error deleting receiver', 'error');
    }
  }
</script>

<!-- HEADER NAVBAR -->
<header class="app-header">
  <div class="header-container">
    <div class="brand">
      <a href="/" class="btn btn-outline" style="text-decoration:none;">
        <i class="fa-solid fa-arrow-left"></i> Back to Tracker
      </a>
      <div>
        <h1 class="brand-title">Saved Order Receivers</h1>
        <p class="brand-subtitle">Manage all receiver names, phone numbers, and delivery addresses</p>
      </div>
    </div>

    <div class="header-actions">
      {#if $isAdmin}
        <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; color:var(--primary-accent); font-weight:700; padding:0.3rem 0.65rem; border-radius:20px; background:rgba(37,99,235,0.1); border:1px solid rgba(37,99,235,0.25);">
          <i class="fa-solid fa-user-shield"></i>
          <span>Admin: {$userStore?.email}</span>
        </div>

        <button class="btn btn-outline" style="padding:0.35rem 0.75rem; font-size:0.8rem;" on:click={logoutUser}>
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      {:else}
        <button class="btn btn-primary" style="padding:0.35rem 0.75rem; font-size:0.8rem;" on:click={() => isLoginModalOpen.set(true)}>
          <i class="fa-solid fa-lock"></i> Admin Login
        </button>
      {/if}

      <button class="theme-toggle-btn" on:click={toggleTheme}>
        <i class={currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
        <span>{currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      {#if $isAdmin}
        <button class="btn btn-purple" on:click={openAddModal}>
          <i class="fa-solid fa-user-plus"></i> Add New Receiver
        </button>
      {/if}
    </div>
  </div>
</header>

<!-- MAIN CONTAINER -->
<main class="main-container">
  <!-- SEARCH BAR & METRICS -->
  <section class="toolbar" style="margin-bottom: 0.5rem;">
    <div class="search-box" style="flex:1;">
      <i class="fa-solid fa-magnifying-glass search-icon"></i>
      <input 
        type="text" 
        placeholder="Filter receivers by name, phone or address..." 
        bind:value={searchQuery} 
      />
    </div>

    <div class="count-badge" style="font-size:0.95rem; font-weight:700; padding:0.6rem 1.2rem;">
      <i class="fa-solid fa-users" style="color:var(--purple-accent)"></i> {filteredReceivers.length} of {receiversData.length} Receivers Listed
    </div>
  </section>

  <!-- RECEIVERS GRID PAGE -->
  {#if isLoading}
    <div class="loading-wrapper">
      <div class="spinner-ring" style="border-top-color:var(--purple-accent);"></div>
      <div class="loading-txt">
        <i class="fa-solid fa-users" style="color:var(--purple-accent)"></i> Loading Saved Receiver Addresses...
      </div>
    </div>
  {:else if filteredReceivers.length === 0}
    <div class="empty-state">
      <i class="fa-solid fa-user-slash empty-icon"></i>
      <h4>No Receivers Found</h4>
      <p>Try clearing your search term or add a new receiver address.</p>
    </div>
  {:else}
    <section class="receivers-page-grid">
      {#each filteredReceivers as rec (rec.id)}
        <div class="receiver-card page-card">
          <!-- RECEIVER NAME & ACTIONS -->
          <div class="rec-row rec-header">
            <span class="rec-name" style="font-size:1.05rem;">
              <i class="fa-solid fa-user" style="color:var(--primary-accent)"></i> {rec.name}
            </span>

            <div class="rec-actions">
              <button 
                class="btn-copy-inline" 
                on:click={() => copyText(`rec-name-${rec.id}`, rec.name)} 
                title="Copy Name"
              >
                {#if copiedFieldId === `rec-name-${rec.id}`}
                  <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>
                {:else}
                  <i class="fa-regular fa-copy"></i>
                {/if}
              </button>

              {#if $isAdmin}
                <button class="icon-btn" on:click={() => openEditModal(rec)} title="Edit Receiver">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-btn icon-btn-danger" on:click={() => triggerDelete(rec)} title="Delete Receiver">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              {/if}
            </div>
          </div>

          <!-- PHONE NUMBER WITH COPY BUTTON -->
          <div class="rec-row" style="margin-top:0.3rem;">
            <span class="rec-phone" style="font-size:0.9rem;">
              <i class="fa-solid fa-phone" style="color:var(--emerald-accent)"></i> {$isAdmin ? (rec.phone || 'N/A') : maskPhoneNumber(rec.phone)}
            </span>
            {#if $isAdmin && rec.phone}
              <button 
                class="btn-copy-inline" 
                on:click={() => copyText(`rec-phone-${rec.id}`, rec.phone)} 
                title="Copy Phone"
              >
                {#if copiedFieldId === `rec-phone-${rec.id}`}
                  <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>
                {:else}
                  <i class="fa-regular fa-copy"></i>
                {/if}
              </button>
            {/if}
          </div>

          <!-- FULL ADDRESS WITH COPY BUTTON -->
          <div class="rec-row rec-address-box" style="margin-top:0.4rem; padding:0.6rem 0.8rem;">
            <span class="rec-address" style="font-size:0.85rem;">
              <i class="fa-solid fa-location-dot" style="color:var(--swiggy-color)"></i> {rec.address}
            </span>
            {#if $isAdmin}
              <button 
                class="btn-copy-inline" 
                on:click={() => copyText(`rec-addr-${rec.id}`, rec.address)} 
                title="Copy Address"
              >
                {#if copiedFieldId === `rec-addr-${rec.id}`}
                  <i class="fa-solid fa-check" style="color:var(--emerald-accent)"></i>
                {:else}
                  <i class="fa-regular fa-copy"></i>
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </section>
  {/if}
</main>

<!-- ADD / EDIT RECEIVER MODAL -->
{#if showAddEditModal}
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <h3>
          <i class="fa-solid {editId ? 'fa-user-pen' : 'fa-user-plus'}" style="color:#a855f7"></i>
          {editId ? 'Edit Receiver Details' : 'Add New Receiver'}
        </h3>
        <button class="btn-close" on:click={() => showAddEditModal = false}>&times;</button>
      </div>

      <form on:submit|preventDefault={saveReceiver}>
        <div class="form-group">
          <label>Receiver Name / Label *</label>
          <input type="text" class="form-control" placeholder="e.g. Arif Imtiyaz frnd Jadavpur" bind:value={name} required />
        </div>

        <div class="form-group">
          <label>Phone Number</label>
          <input type="text" class="form-control" placeholder="e.g. +91-8617615800" bind:value={phone} />
        </div>

        <div class="form-group">
          <label>Full Delivery Address *</label>
          <textarea class="form-control" rows="3" placeholder="Full address with landmark..." bind:value={address} required></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" on:click={() => showAddEditModal = false}>Cancel</button>
          <button type="submit" class="btn btn-purple"><i class="fa-solid fa-floppy-disk"></i> Save Receiver</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- DESIGNED CUSTOM DELETE CONFIRMATION MODAL -->
{#if showConfirmDeleteModal}
  <div class="modal-overlay">
    <div class="modal-card confirm-modal-card">
      <div class="confirm-icon-wrapper danger">
        <i class="fa-solid fa-trash-can"></i>
      </div>
      <h3 class="confirm-title">Delete Receiver?</h3>
      <p class="confirm-message">
        Are you sure you want to delete <strong>"{pendingDeleteReceiver?.name}"</strong>? This action cannot be undone.
      </p>
      <div class="modal-footer" style="justify-content:center; gap:0.85rem; border-top:none; margin-top:1.25rem;">
        <button class="btn btn-outline" on:click={() => showConfirmDeleteModal = false}>Cancel</button>
        <button class="btn btn-danger-action" on:click={confirmExecuteDelete}>
          <i class="fa-solid fa-trash-can"></i> Delete Receiver
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
