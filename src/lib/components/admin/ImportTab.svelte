<script>
  export let uploadExcel;
  export let importZoneId;
  export let zones;
  export let importNewZone;
  export let handleFile;
  export let fileNameText;
</script>

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
