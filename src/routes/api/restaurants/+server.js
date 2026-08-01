import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db.js';

function getCurrentMonthYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET({ url }) {
  try {
    const monthYear = url.searchParams.get('month_year') || getCurrentMonthYear();
    const zone_id = url.searchParams.get('zone_id');
    const search = url.searchParams.get('search');
    const platform = url.searchParams.get('platform');
    const status = url.searchParams.get('status');

    let sql = `
      SELECT 
        r.*, 
        z.name as zone_name,
        COALESCE(o.status, 'Pending') as order_status,
        o.platform_used,
        o.time_slot,
        o.notes,
        o.receiver_id,
        o.receiver_name,
        o.receiver_address,
        o.receiver_phone,
        o.ordered_at
      FROM restaurants r
      JOIN zones z ON r.zone_id = z.id
      LEFT JOIN orders o ON o.restaurant_id = r.id AND o.month_year = ?
      WHERE 1=1
    `;
    const params = [monthYear];

    if (zone_id && zone_id !== 'all') {
      sql += ` AND r.zone_id = ?`;
      params.push(zone_id);
    }

    if (search && search.trim()) {
      sql += ` AND (r.name LIKE ? OR r.address LIKE ? OR r.distance LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (platform && platform !== 'all') {
      sql += ` AND (r.platform = ? OR r.platform = 'Both')`;
      params.push(platform);
    }

    if (status && status !== 'all') {
      if (status === 'Ordered') {
        sql += ` AND o.status = 'Ordered'`;
      } else if (status === 'Pending') {
        sql += ` AND (o.status IS NULL OR o.status = 'Pending')`;
      }
    }

    sql += ` ORDER BY r.is_seeded DESC, r.name ASC`;

    const restaurants = await query(sql, params);
    return json({ success: true, restaurants });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin to add restaurants.' }, { status: 401 });
  }

  try {
    const { zone_id, name, platform, distance, address, swiggy_url, zomato_url } = await request.json();
    if (!name || !zone_id) {
      return json({ success: false, error: 'Restaurant name and Zone are required' }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO restaurants (zone_id, name, platform, distance, address, swiggy_url, zomato_url, is_seeded)
       VALUES (?, ?, ?, ?, ?, ?, ?, false)`,
      [zone_id, name.trim(), platform || 'Both', distance || '2-3 km', address || '', swiggy_url || '', zomato_url || '']
    );
    return json({ success: true, id: result[0]?.id });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
