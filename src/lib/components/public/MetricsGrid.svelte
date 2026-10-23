<script>
  import { formatMonthHeader } from '$lib/utils/date.js';

  export let isLoadingData;
  export let totalZones;
  export let totalRestaurants;
  export let currentMonth;
  export let totalOrdered;
  export let totalPending;
</script>

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
