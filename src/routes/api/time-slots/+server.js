import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache, verifySession, serverError } from '$lib/server/db.js';

export async function GET() {
  try {
    const cached = getCachedData('time_slots');
    if (cached) {
      return json(cached, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
    }

    const slots = await query('SELECT * FROM time_slots ORDER BY display_order ASC, id ASC');
    const resPayload = { success: true, time_slots: slots };
    setCachedData('time_slots', resPayload, 60000);
    return json(resPayload, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (err) {
    return serverError(err, '/api/time-slots');
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { slot_name, start_time, end_time, icon, color_theme, display_order } = await request.json();
    if (!slot_name || !start_time || !end_time) {
      return json({ success: false, error: 'Slot Name, Start Time, and End Time are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO time_slots (slot_name, start_time, end_time, icon, color_theme, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        slot_name.trim(),
        start_time.trim(),
        end_time.trim(),
        icon || 'fa-clock',
        color_theme || '#3b82f6',
        display_order || 1
      ]
    );

    invalidateCache('time_slots');

    return json({ success: true, id: result[0]?.id });
  } catch (err) {
    return serverError(err, '/api/time-slots');
  }
}
