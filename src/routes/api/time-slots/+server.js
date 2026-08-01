import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db.js';

export async function GET() {
  try {
    const slots = await query('SELECT * FROM time_slots ORDER BY display_order ASC, id ASC');
    return json({ success: true, time_slots: slots });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
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

    return json({ success: true, id: result[0]?.id });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
