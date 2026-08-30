import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache, verifySession } from '$lib/server/db.js';

function getCurrentMonthYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET({ url }) {
  try {
    const monthYear = url.searchParams.get('month_year') || getCurrentMonthYear();
    const cacheKey = `zones_${monthYear}`;

    const cached = getCachedData(cacheKey);
    if (cached) {
      return json(cached, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
    }

    const zones = await query(`
      SELECT z.*, 
        COUNT(DISTINCT r.id) as total_restaurants,
        COUNT(DISTINCT CASE WHEN o.status = 'Ordered' THEN r.id END) as ordered_count
      FROM zones z
      LEFT JOIN restaurants r ON r.zone_id = z.id
      LEFT JOIN orders o ON o.restaurant_id = r.id AND o.month_year = ?
      GROUP BY z.id, z.name, z.description, z.created_at
      ORDER BY z.id ASC
    `, [monthYear]);

    const resPayload = { success: true, zones };
    setCachedData(cacheKey, resPayload, 30000);
    return json(resPayload, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
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
      'INSERT INTO zones (name, description) VALUES (?, ?)',
      [name.trim(), description || '']
    );

    invalidateCache();

    return json({ success: true, id: result[0]?.id, name: name.trim() });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
