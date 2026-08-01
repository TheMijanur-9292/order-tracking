import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db.js';

export async function PUT({ params, request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { slot_name, start_time, end_time, icon, color_theme, display_order } = await request.json();
    if (!slot_name || !start_time || !end_time) {
      return json({ success: false, error: 'Slot Name, Start Time, and End Time are required' }, { status: 400 });
    }

    await query(
      `UPDATE time_slots 
       SET slot_name = ?, start_time = ?, end_time = ?, icon = ?, color_theme = ?, display_order = ?
       WHERE id = ?`,
      [
        slot_name.trim(),
        start_time.trim(),
        end_time.trim(),
        icon || 'fa-clock',
        color_theme || '#3b82f6',
        display_order || 1,
        id
      ]
    );

    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE({ params, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }
  try {
    const { id } = params;
    await query('DELETE FROM time_slots WHERE id = ?', [id]);
    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
