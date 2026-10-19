import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache, verifySession, serverError, getKolkataMonthYear } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function GET({ url }) {
  try {
    const monthYear = url.searchParams.get('month_year') || getKolkataMonthYear();
    const includeHidden = url.searchParams.get('include_hidden') === 'true';
    const cacheKey = `zones_${monthYear}_${includeHidden ? 'all' : 'vis'}`;

    const cached = getCachedData(cacheKey);
    if (cached) {
      return json(cached, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
    }

    const whereClause = includeHidden ? '' : 'WHERE COALESCE(z.is_visible, true) = true';

    const rawZones = await query(`
      SELECT z.*, 
        COUNT(DISTINCT r.id) as total_restaurants,
        COUNT(DISTINCT CASE WHEN o.status = 'Ordered' THEN r.id END) as ordered_count
      FROM zones z
      LEFT JOIN restaurants r ON r.zone_id = z.id
      LEFT JOIN orders o ON o.restaurant_id = r.id AND o.month_year = ?
      ${whereClause}
      GROUP BY z.id, z.name, z.description, z.is_visible, z.created_at
      ORDER BY z.id ASC
    `, [monthYear]);

    const zones = rawZones.map(z => ({
      ...z,
      total_restaurants: Number(z.total_restaurants || 0),
      ordered_count: Number(z.ordered_count || 0)
    }));

    const resPayload = { success: true, zones };
    setCachedData(cacheKey, resPayload, 30000);
    return json(resPayload, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (err) {
    return serverError(err, '/api/zones');
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { name, description } = await request.json();
    if (!name || !name.trim()) {
      return json({ success: false, error: 'Zone name is required' }, { status: 400 });
    }
    const result = await query(
      'INSERT INTO zones (name, description, is_visible) VALUES (?, ?, true)',
      [name.trim(), description || '']
    );

    invalidateCache();
    broadcastLiveUpdate();

    return json({ success: true, id: result[0]?.id, name: name.trim() });
  } catch (err) {
    return serverError(err, '/api/zones');
  }
}

export async function PATCH({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { is_visible } = await request.json();
    await query('UPDATE zones SET is_visible = ?', [Boolean(is_visible)]);
    invalidateCache();
    broadcastLiveUpdate();
    return json({ success: true, is_visible: Boolean(is_visible) });
  } catch (err) {
    return serverError(err, '/api/zones');
  }
}
