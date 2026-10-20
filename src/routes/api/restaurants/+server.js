import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache, verifySession, serverError, getKolkataMonthYear } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function GET({ url, cookies }) {
  try {
    const sessionToken = cookies.get('zomswi_admin_session');
    const isAdmin = Boolean(sessionToken && verifySession(sessionToken));

    const monthYear = url.searchParams.get('month_year') || getKolkataMonthYear();
    const zone_id = url.searchParams.get('zone_id') || 'all';
    const search = (url.searchParams.get('search') || '').trim();
    const platform = url.searchParams.get('platform') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const includeHidden = isAdmin && url.searchParams.get('include_hidden') === 'true';

    const cacheKey = `rests_${monthYear}_${zone_id}_${platform}_${status}_${search.toLowerCase()}_${isAdmin ? 'adm' : 'pub'}_${includeHidden ? 'allz' : 'visz'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return json(cached);

    let sql = `
      SELECT 
        r.*, 
        z.name as zone_name,
        z.is_visible as zone_is_visible,
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

    if (!includeHidden) {
      sql += ` AND COALESCE(z.is_visible, true) = true`;
    }

    if (zone_id && zone_id !== 'all') {
      sql += ` AND r.zone_id = ?`;
      params.push(zone_id);
    }

    if (search) {
      sql += ` AND (LOWER(r.name) LIKE LOWER(?) OR LOWER(COALESCE(r.address, '')) LIKE LOWER(?) OR LOWER(COALESCE(r.distance, '')) LIKE LOWER(?) OR LOWER(z.name) LIKE LOWER(?))`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
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

    sql += ` ORDER BY r.is_seeded DESC, r.distance ASC, r.id ASC`;

    let restaurants = await query(sql, params);
    if (!isAdmin) {
      restaurants = restaurants.map(r => ({
        ...r,
        platform_used: null,
        notes: null,
        receiver_id: null,
        receiver_name: null,
        receiver_address: null,
        receiver_phone: null
      }));
    }

    const resPayload = { success: true, restaurants };
    setCachedData(cacheKey, resPayload, 15000);
    return json(resPayload);
  } catch (err) {
    return serverError(err, '/api/restaurants');
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
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
      [zone_id, name.trim(), platform || 'Both', distance || 'C. 2-3', address || '', swiggy_url || '', zomato_url || '']
    );

    invalidateCache();
    await broadcastLiveUpdate();

    return json({ success: true, id: result[0]?.id });
  } catch (err) {
    return serverError(err, '/api/restaurants');
  }
}
