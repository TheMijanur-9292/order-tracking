import { json } from '@sveltejs/kit';
import { query, invalidateCache, verifySession, serverError } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function PUT({ params, request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const check = await query('SELECT is_seeded FROM restaurants WHERE id = ?', [id]);
    if (check.length === 0) {
      return json({ success: false, error: 'Restaurant not found' }, { status: 404 });
    }
    if (check[0].is_seeded) {
      return json({ success: false, error: 'Seeded restaurants from original Awign LIST cannot be edited' }, { status: 403 });
    }

    const { zone_id, name, platform, distance, address, swiggy_url, zomato_url } = await request.json();
    if (!name || !String(name).trim()) {
      return json({ success: false, error: 'Restaurant name is required' }, { status: 400 });
    }
    if (!zone_id) {
      return json({ success: false, error: 'Zone is required' }, { status: 400 });
    }
    const zoneCheck = await query('SELECT id FROM zones WHERE id = ?', [zone_id]);
    if (zoneCheck.length === 0) {
      return json({ success: false, error: 'Selected zone does not exist' }, { status: 400 });
    }

    await query(
      `UPDATE restaurants 
       SET zone_id = ?, name = ?, platform = ?, distance = ?, address = ?, swiggy_url = ?, zomato_url = ?
       WHERE id = ?`,
      [zone_id, String(name).trim(), platform || 'Both', distance || 'C. 2-3', address || '', swiggy_url || '', zomato_url || '', id]
    );

    await broadcastLiveUpdate();

    return json({ success: true, message: 'Restaurant updated successfully' });
  } catch (err) {
    return serverError(err, '/api/restaurants/[id]');
  }
}

export async function DELETE({ params, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }
  try {
    const { id } = params;
    const check = await query('SELECT is_seeded FROM restaurants WHERE id = ?', [id]);
    if (check.length === 0) {
      return json({ success: false, error: 'Restaurant not found' }, { status: 404 });
    }
    if (check[0].is_seeded) {
      return json({ success: false, error: 'Seeded restaurants from original Awign LIST cannot be deleted' }, { status: 403 });
    }

    await query('DELETE FROM restaurants WHERE id = ?', [id]);

    await broadcastLiveUpdate();

    return json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (err) {
    return serverError(err, '/api/restaurants/[id]');
  }
}
