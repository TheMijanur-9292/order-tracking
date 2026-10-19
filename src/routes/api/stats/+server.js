import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, serverError, getKolkataMonthYear } from '$lib/server/db.js';

export async function GET({ url }) {
  try {
    const monthYear = url.searchParams.get('month_year') || getKolkataMonthYear();
    const cacheKey = `stats_${monthYear}`;

    const cached = getCachedData(cacheKey);
    if (cached) {
      return json(cached, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } });
    }

    const [zoneCount, restaurantCount, orderedCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM zones WHERE COALESCE(is_visible, true) = true'),
      query('SELECT COUNT(*) as count FROM restaurants r JOIN zones z ON r.zone_id = z.id WHERE COALESCE(z.is_visible, true) = true'),
      query("SELECT COUNT(*) as count FROM orders o JOIN restaurants r ON o.restaurant_id = r.id JOIN zones z ON r.zone_id = z.id WHERE o.month_year = ? AND o.status = 'Ordered' AND COALESCE(z.is_visible, true) = true", [monthYear])
    ]);

    const totalRest = parseInt(restaurantCount[0]?.count || 0, 10);
    const totalOrdered = parseInt(orderedCount[0]?.count || 0, 10);
    const totalPending = totalRest - totalOrdered;

    const resPayload = {
      success: true,
      month_year: monthYear,
      total_zones: parseInt(zoneCount[0]?.count || 0, 10),
      total_restaurants: totalRest,
      total_ordered: totalOrdered,
      total_pending: totalPending < 0 ? 0 : totalPending
    };

    setCachedData(cacheKey, resPayload, 15000);
    return json(resPayload, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } });
  } catch (err) {
    return serverError(err, '/api/stats');
  }
}
