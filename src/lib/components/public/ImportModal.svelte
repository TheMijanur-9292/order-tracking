<script>
  export let showImportModal;
  export let uploadExcel;
  export let importZoneId;
  export let zonesData;
  export let importNewZone;
  export let handleFileSelect;
  export let fileNameText;
</script>

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
