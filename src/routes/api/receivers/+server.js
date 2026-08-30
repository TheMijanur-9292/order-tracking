import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache } from '$lib/server/db.js';

export async function GET({ url }) {
  try {
    const targetMonth = url.searchParams.get('month_year') || '';

    let sql;
    let params = [];

    if (targetMonth) {
      sql = `
        SELECT 
          r.id,
          r.name,
          r.address,
          r.phone,
          r.created_at,
          COALESCE(SUM(CASE WHEN h.month_year = ? AND h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS month_order_count,
          COALESCE(SUM(CASE WHEN h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS total_order_count
        FROM order_receiver r
        LEFT JOIN order_history h ON (h.receiver_id = r.id OR LOWER(TRIM(h.receiver_name)) = LOWER(TRIM(r.name)))
        GROUP BY r.id, r.name, r.address, r.phone, r.created_at
        ORDER BY month_order_count DESC, total_order_count DESC, r.name ASC
      `;
      params = [targetMonth];
    } else {
      sql = `
        SELECT 
          r.id,
          r.name,
          r.address,
          r.phone,
          r.created_at,
          0 AS month_order_count,
          COALESCE(SUM(CASE WHEN h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS total_order_count
        FROM order_receiver r
        LEFT JOIN order_history h ON (h.receiver_id = r.id OR LOWER(TRIM(h.receiver_name)) = LOWER(TRIM(r.name)))
        GROUP BY r.id, r.name, r.address, r.phone, r.created_at
        ORDER BY total_order_count DESC, r.name ASC
      `;
    }

    const receivers = await query(sql, params);

    // Also fetch distinct available months from history
    const monthsResult = await query(`
      SELECT DISTINCT month_year 
      FROM order_history 
      WHERE month_year IS NOT NULL AND month_year != '' 
      ORDER BY month_year DESC
    `);
    const availableMonths = monthsResult.map(m => m.month_year);

    return json({ 
      success: true, 
      receivers: receivers.map(r => ({
        ...r,
        month_order_count: Number(r.month_order_count || 0),
        total_order_count: Number(r.total_order_count || 0)
      })),
      available_months: availableMonths,
      selected_month: targetMonth
    });
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
