<script>
  export let timeSlots;
  export let openAddTimeSlot;
  export let openEditTimeSlot;
  export let deleteTimeSlot;
</script>

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
