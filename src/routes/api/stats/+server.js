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

    const zoneCount = await query('SELECT COUNT(*) as count FROM zones');
    const restaurantCount = await query('SELECT COUNT(*) as count FROM restaurants');
    const orderedCount = await query(
      "SELECT COUNT(*) as count FROM orders WHERE month_year = ? AND status = 'Ordered'",
      [monthYear]
    );

    const totalRest = parseInt(restaurantCount[0]?.count || 0, 10);
    const totalOrdered = parseInt(orderedCount[0]?.count || 0, 10);
    const totalPending = totalRest - totalOrdered;

    return json({
      success: true,
      month_year: monthYear,
      total_zones: parseInt(zoneCount[0]?.count || 0, 10),
      total_restaurants: totalRest,
      total_ordered: totalOrdered,
      total_pending: totalPending < 0 ? 0 : totalPending
    });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
