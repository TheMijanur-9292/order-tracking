import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache } from '$lib/server/db.js';

export async function GET() {
  try {
    const cached = getCachedData('receivers');
    if (cached) return json(cached);

    const receivers = await query(`
      SELECT * FROM order_receiver ORDER BY id DESC
    `);
    const resPayload = { success: true, receivers };
    setCachedData('receivers', resPayload, 30000);
    return json(resPayload);
  } catch (err) {
    console.error('Error fetching receivers:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || !name.trim()) {
      return json({ success: false, error: 'Receiver name is required' }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return json({ success: false, error: 'Receiver address is required' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO order_receiver (name, address, phone) VALUES (?, ?, ?)`,
      [name.trim(), address.trim(), (phone || '').trim()]
    );

    invalidateCache('receivers');

    return json({ success: true, id: res[0]?.id, message: 'Receiver added successfully' });
  } catch (err) {
    console.error('Error adding receiver:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
