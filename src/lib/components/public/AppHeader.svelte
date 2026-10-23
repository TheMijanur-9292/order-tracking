<script>
  import { onMount } from 'svelte';
  import { isAdmin, isLoginModalOpen, logoutUser } from '$lib/authStore.js';
  import CustomCalendarPicker from '$lib/components/CustomCalendarPicker.svelte';

  export let headerHeight;
  export let toggleTheme;
  export let currentTheme;
  export let currentMonth;
  export let handleMonthChange;

  // LIVE REAL-TIME CLOCK STATE
  let liveTimeStr = '';
  let liveDateStr = '';

  function updateLiveClock() {
    const now = new Date();
    liveTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    liveDateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  onMount(() => {
    updateLiveClock();
    const clockInterval = setInterval(updateLiveClock, 1000);
    return () => {
      clearInterval(clockInterval);
    };
  });
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
