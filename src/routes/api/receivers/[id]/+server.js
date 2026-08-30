import { json } from '@sveltejs/kit';
import { query, invalidateCache, verifySession } from '$lib/server/db.js';

export async function PUT({ params, request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || !name.trim()) {
      return json({ success: false, error: 'Receiver name is required' }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return json({ success: false, error: 'Receiver address is required' }, { status: 400 });
    }

    await query(
      `UPDATE order_receiver SET name = ?, address = ?, phone = ? WHERE id = ?`,
      [name.trim(), address.trim(), (phone || '').trim(), id]
    );

    invalidateCache();

    return json({ success: true, message: 'Receiver updated successfully' });
  } catch (err) {
    console.error('Error updating receiver:', err);
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
    await query(`DELETE FROM order_receiver WHERE id = ?`, [id]);
    invalidateCache();
    return json({ success: true, message: 'Receiver deleted successfully' });
  } catch (err) {
    console.error('Error deleting receiver:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
