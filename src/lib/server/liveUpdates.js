import { invalidateCache, bumpDataVersion } from '$lib/server/db.js';

// Call (and await) after every data change: clears this instance's cache and bumps the shared
// data version, which clients poll via /api/version to know when to re-fetch.
export async function broadcastLiveUpdate() {
  invalidateCache();
  try {
    await bumpDataVersion();
  } catch (e) {
    console.error('Failed to bump data version:', e);
  }
}
