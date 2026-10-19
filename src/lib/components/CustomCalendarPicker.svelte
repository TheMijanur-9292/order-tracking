<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let selectedMonth = '2026-08'; // Format: 'YYYY-MM'

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let pickerYear = 2026;
  let pickerMonthIdx = 7; // 0-indexed (0 = Jan, 7 = Aug)

  const monthNamesFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Parse input prop YYYY-MM
  $: {
    if (selectedMonth && typeof selectedMonth === 'string' && selectedMonth.includes('-')) {
      const parts = selectedMonth.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) {
        pickerYear = y;
        pickerMonthIdx = m;
      }
    }
  }

  function togglePicker() {
    isOpen = !isOpen;
  }

  function closePicker() {
    isOpen = false;
  }

  function changeYear(delta) {
    pickerYear += delta;
  }

  function selectMonth(idx) {
    pickerMonthIdx = idx;
    const formattedM = String(idx + 1).padStart(2, '0');
    const newMonthStr = `${pickerYear}-${formattedM}`;
    selectedMonth = newMonthStr;
    isOpen = false;
    dispatch('change', { month: newMonthStr });
  }

  function setToday() {
    const now = new Date();
    pickerYear = now.getFullYear();
    pickerMonthIdx = now.getMonth();
    const formattedM = String(pickerMonthIdx + 1).padStart(2, '0');
    const newMonthStr = `${pickerYear}-${formattedM}`;
    selectedMonth = newMonthStr;
    isOpen = false;
    dispatch('change', { month: newMonthStr });
  }

  // Click outside listener
  let containerRef;
  function handleOutsideClick(e) {
    if (isOpen && containerRef && !containerRef.contains(e.target)) {
      isOpen = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleOutsideClick);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', handleOutsideClick);
    }
  });

  // Current real month for "Today" badge
  const now = new Date();
  const currentRealYear = now.getFullYear();
  const currentRealMonthIdx = now.getMonth();
</script>

<div class="calendar-picker-container" bind:this={containerRef}>
  <!-- TRIGGER BUTTON -->
  <button 
    type="button" 
    class="calendar-trigger-btn {isOpen ? 'is-active' : ''}" 
    on:click|stopPropagation={togglePicker}
    title="Click to choose Month & Year"
  >
    <div class="btn-icon-wrapper">
      <i class="fa-regular fa-calendar-days"></i>
    </div>
    <div class="btn-text-content">
      <span class="btn-label">Month</span>
      <span class="btn-value">{monthNamesFull[pickerMonthIdx]} {pickerYear}</span>
    </div>
    <i class="fa-solid fa-chevron-down chevron-icon {isOpen ? 'rotated' : ''}"></i>
  </button>

  <!-- DROPDOWN POPOVER CARD & BACKDROP -->
  {#if isOpen}
    <div class="calendar-backdrop" on:click|stopPropagation={closePicker}>
      <div class="calendar-popover-card" on:click|stopPropagation>
        <!-- POPOVER HEADER: YEAR NAVIGATOR & TODAY -->
        <div class="popover-header">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <button type="button" class="nav-arrow-btn" on:click|stopPropagation={() => changeYear(-1)} title="Previous Year">
              <i class="fa-solid fa-chevron-left"></i>
            </button>

            <span class="current-year-display">{pickerYear}</span>

            <button type="button" class="nav-arrow-btn" on:click|stopPropagation={() => changeYear(1)} title="Next Year">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <button type="button" class="btn-today-quick" on:click|stopPropagation={setToday} title="Jump to Current Month">
            <i class="fa-solid fa-location-crosshairs"></i> Today
          </button>
        </div>

        <!-- MONTHS GRID (12 MONTHS) -->
        <div class="months-grid">
          {#each monthNamesShort as mName, idx}
            {@const isSelected = (pickerMonthIdx === idx && (selectedMonth === `${pickerYear}-${String(idx+1).padStart(2,'0')}`))}
            {@const isCurrentReal = (pickerYear === currentRealYear && idx === currentRealMonthIdx)}
            <button 
              type="button" 
              class="month-grid-item {isSelected ? 'selected' : ''} {isCurrentReal ? 'is-current-real' : ''}" 
              on:click|stopPropagation={() => selectMonth(idx)}
            >
              <span class="m-name">{mName}</span>
              {#if isSelected}
                <i class="fa-solid fa-check check-badge"></i>
              {:else if isCurrentReal}
                <span class="real-dot" title="Current Month"></span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="popover-footer">
          <span class="footer-hint">
            <i class="fa-solid fa-circle-info"></i> Select any month to view stats & history
          </span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .calendar-picker-container {
    position: relative;
    display: inline-block;
  }

  /* TRIGGER BUTTON STYLES */
  .calendar-trigger-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.85rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, rgba(226, 232, 240, 0.8));
    border-radius: 12px;
    color: var(--text-main, #0f172a);
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  }

  .calendar-trigger-btn:hover {
    border-color: var(--primary-accent, #2563eb);
    background: rgba(37, 99, 235, 0.03);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
  }

  .calendar-trigger-btn.is-active {
    border-color: var(--primary-accent, #2563eb);
    background: rgba(37, 99, 235, 0.06);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .btn-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(59, 130, 246, 0.2));
    color: var(--primary-accent, #2563eb);
    font-size: 0.95rem;
  }

  .btn-text-content {
    display: flex;
    flex-direction: column;
    text-align: left;
    line-height: 1.15;
  }

  .btn-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted, #64748b);
  }

  .btn-value {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-main, #0f172a);
  }

  .chevron-icon {
    font-size: 0.75rem;
    color: var(--text-muted, #64748b);
    transition: transform 0.25s ease;
    margin-left: 0.2rem;
  }

  .chevron-icon.rotated {
    transform: rotate(180deg);
    color: var(--primary-accent, #2563eb);
  }

  /* DROPDOWN POPOVER CARD STYLES */
  .calendar-popover-card {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 1000;
    width: 300px;
    padding: 1rem;
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, rgba(226, 232, 240, 0.9));
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(12px);
    animation: calendarScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes calendarScaleIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* POPOVER HEADER */
  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
  }

  .current-year-display {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-main, #0f172a);
    letter-spacing: -0.2px;
  }

  .nav-arrow-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e2e8f0);
    background: var(--input-bg, rgba(0, 0, 0, 0.04));
    color: var(--text-main, #334155);
    cursor: pointer;
    font-size: 0.82rem;
    transition: all 0.15s ease;
  }

  .nav-arrow-btn:hover {
    background: var(--primary-accent, #2563eb);
    color: #ffffff;
    border-color: var(--primary-accent, #2563eb);
  }

  .btn-today-quick {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(37, 99, 235, 0.3);
    background: rgba(37, 99, 235, 0.12);
    color: var(--primary-accent, #3b82f6);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-today-quick:hover {
    background: var(--primary-accent, #2563eb);
    color: #ffffff;
  }

  /* MONTHS GRID */
  .months-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .month-grid-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 0.4rem;
    border-radius: 10px;
    border: 1px solid var(--border-color, #e2e8f0);
    background: var(--input-bg, rgba(0, 0, 0, 0.04));
    color: var(--text-main, #334155);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .month-grid-item:hover {
    border-color: var(--primary-accent, #2563eb);
    background: rgba(37, 99, 235, 0.15);
    color: var(--primary-accent, #2563eb);
    transform: translateY(-1px);
  }

  .month-grid-item.selected {
    background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
    color: #ffffff !important;
    border-color: #2563eb !important;
    font-weight: 700;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
  }

  .check-badge {
    position: absolute;
    top: 4px;
    right: 5px;
    font-size: 0.65rem;
    color: #ffffff;
  }

  .real-dot {
    position: absolute;
    bottom: 5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--emerald-accent, #10b981);
  }

  /* POPOVER FOOTER */
  .popover-footer {
    margin-top: 0.75rem;
    padding-top: 0.6rem;
    border-top: 1px dashed var(--border-color, #e2e8f0);
    text-align: center;
  }

  .footer-hint {
    font-size: 0.72rem;
    color: var(--text-muted, #94a3b8);
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  @media (max-width: 768px) {
    .calendar-backdrop {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(15, 23, 42, 0.5) !important;
      backdrop-filter: blur(6px) !important;
      z-index: 2400 !important;
      padding: 1rem !important;
    }

    .calendar-popover-card {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: 310px !important;
      max-height: 85vh !important;
      overflow-y: auto !important;
      z-index: 2500 !important;
      margin: auto !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
    }
  }
</style>
