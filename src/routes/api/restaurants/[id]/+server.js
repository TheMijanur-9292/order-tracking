import { json } from '@sveltejs/kit';
import { query, invalidateCache, verifySession } from '$lib/server/db.js';

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
    await query(
      `UPDATE restaurants 
       SET zone_id = ?, name = ?, platform = ?, distance = ?, address = ?, swiggy_url = ?, zomato_url = ?
       WHERE id = ?`,
      [zone_id, name, platform, distance, address, swiggy_url, zomato_url, id]
    );

    invalidateCache();

    return json({ success: true, message: 'Restaurant updated successfully' });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
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

    invalidateCache();

    return json({ success: true, message: 'Restaurant deleted successfully' });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
