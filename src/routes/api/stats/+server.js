import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData } from '$lib/server/db.js';

function getCurrentMonthYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET({ url }) {
  try {
    const monthYear = url.searchParams.get('month_year') || getCurrentMonthYear();
    const cacheKey = `stats_${monthYear}`;

    const cached = getCachedData(cacheKey);
    if (cached) {
      return json(cached);
    }

    const [zoneCount, restaurantCount, orderedCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM zones'),
      query('SELECT COUNT(*) as count FROM restaurants'),
      query("SELECT COUNT(*) as count FROM orders WHERE month_year = ? AND status = 'Ordered'", [monthYear])
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
    return json(resPayload);
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
