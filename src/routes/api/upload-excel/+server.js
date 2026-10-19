import { json } from '@sveltejs/kit';
import * as xlsx from 'xlsx';
import { query, invalidateCache, verifySession, serverError } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('excelFile');
    let zone_id = formData.get('zone_id');
    const new_zone_name = formData.get('new_zone_name');

    if (!file) {
      return json({ success: false, error: 'No Excel file provided' }, { status: 400 });
    }

    if (new_zone_name && new_zone_name.trim()) {
      const zName = new_zone_name.trim();
      const existingZone = await query('SELECT id FROM zones WHERE name = ?', [zName]);
      if (existingZone.length > 0) {
        zone_id = existingZone[0].id;
      } else {
        const added = await query('INSERT INTO zones (name, description) VALUES (?, ?)', [zName, 'Imported from Awign Excel']);
        zone_id = added[0]?.id;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return json({ success: false, error: 'Excel file is empty' }, { status: 400 });
    }

    // Cache zone name -> id lookups for multi-zone sheets
    const zoneCache = new Map();
    const allZones = await query('SELECT id, name FROM zones');
    for (const z of allZones) {
      zoneCache.set(z.name.trim().toLowerCase(), z.id);
    }

    // Existing (zone, name) pairs so re-uploading the same sheet does not create duplicates
    const existingRests = await query('SELECT zone_id, name FROM restaurants');
    const seenKeys = new Set(existingRests.map(r => `${r.zone_id}|${String(r.name).trim().toLowerCase()}`));
    let skippedDuplicates = 0;

    const parsedRows = [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const zoneKey = keys.find(k => /zone\s*name|^zone$/i.test(k));
      const nameKey =
        keys.find(k => /rest\s*name|restaurant|outlet|hotel/i.test(k) && k !== zoneKey) ||
        keys.find(k => /name/i.test(k) && k !== zoneKey) ||
        keys[0];
      const name = String(row[nameKey] || '').trim();

      if (!name) continue;

      let rowZoneId = zone_id;
      if (!rowZoneId && zoneKey && String(row[zoneKey] || '').trim()) {
        const zName = String(row[zoneKey]).trim();
        const zLower = zName.toLowerCase();
        if (zoneCache.has(zLower)) {
          rowZoneId = zoneCache.get(zLower);
        } else {
          const added = await query('INSERT INTO zones (name, description) VALUES (?, ?)', [zName, 'Imported from Sheet']);
          rowZoneId = added[0]?.id;
          zoneCache.set(zLower, rowZoneId);
        }
      }

      if (!rowZoneId) continue;

      const platformKey = keys.find(k => /platform|app|source/i.test(k));
      let platform = platformKey ? String(row[platformKey]).trim() : 'Both';
      if (/swiggy/i.test(platform) && /zomato/i.test(platform)) platform = 'Both';
      else if (/swiggy/i.test(platform)) platform = 'Swiggy';
      else if (/zomato/i.test(platform)) platform = 'Zomato';
      else platform = 'Both';

      const distanceKey = keys.find(k => /distance|km|range/i.test(k));
      const distance = distanceKey ? String(row[distanceKey]).trim() : 'A. 0-1';

      const addressKey = keys.find(k => /address|location|receiver/i.test(k));
      const address = addressKey ? String(row[addressKey]).trim() : '';

      const swiggyKey = keys.find(k => /swiggy_url|swiggy link/i.test(k));
      const swiggy_url = swiggyKey ? String(row[swiggyKey]).trim() : '';

      const zomatoKey = keys.find(k => /zomato_url|zomato link/i.test(k));
      const zomato_url = zomatoKey ? String(row[zomatoKey]).trim() : '';

      const dupKey = `${rowZoneId}|${name.toLowerCase()}`;
      if (seenKeys.has(dupKey)) {
        skippedDuplicates++;
        continue;
      }
      seenKeys.add(dupKey);

      parsedRows.push([rowZoneId, name, platform, distance, address, swiggy_url, zomato_url]);
    }

    if (parsedRows.length === 0) {
      if (skippedDuplicates > 0) {
        invalidateCache();
        broadcastLiveUpdate();
        return json({
          success: true,
          message: `No new restaurants: all ${skippedDuplicates} rows already exist.`,
          count: 0,
          skipped: skippedDuplicates
        });
      }
      return json({ success: false, error: 'No valid restaurant rows or zones found in file' }, { status: 400 });
    }

    // High-performance batch insertion in chunks of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const chunk = parsedRows.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, false)').join(', ');
      const flatParams = chunk.flat();
      await query(
        `INSERT INTO restaurants (zone_id, name, platform, distance, address, swiggy_url, zomato_url, is_seeded)
         VALUES ${placeholders}`,
        flatParams
      );
    }

    invalidateCache();
    broadcastLiveUpdate();

    const skippedNote = skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : '';
    return json({
      success: true,
      message: `Successfully imported ${parsedRows.length} extra restaurants into zone!${skippedNote}`,
      count: parsedRows.length,
      skipped: skippedDuplicates
    });
  } catch (err) {
    return serverError(err, '/api/upload-excel');
  }
}
