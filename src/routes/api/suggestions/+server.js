import { json } from '@sveltejs/kit';
import { query, serverError, getKolkataMonthYear, isAdminRequest } from '$lib/server/db.js';
import { buildSuggestions } from '$lib/server/suggestions.js';

export async function GET({ url, cookies }) {
  if (!isAdminRequest(cookies)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const zoneId = url.searchParams.get('zone_id') || 'all';
    const distance = url.searchParams.get('distance') || 'all';
    const targetMonth = url.searchParams.get('month_year') || getKolkataMonthYear();
    const strategy = url.searchParams.get('strategy') || 'all'; // 'all', 'proven', 'fresh', 'last_month'
    const timeSlot = url.searchParams.get('time_slot') || 'all';
    const platform = url.searchParams.get('platform') || 'all';
    const search = (url.searchParams.get('search') || '').trim();

    // 1. Fetch Restaurants based on Zone & Distance
    let restSql = `
      SELECT 
        r.id,
        r.zone_id,
        r.name,
        r.platform,
        r.distance,
        r.address,
        r.swiggy_url,
        r.zomato_url,
        r.is_seeded,
        r.created_at,
        z.name AS zone_name
      FROM restaurants r
      JOIN zones z ON r.zone_id = z.id
      WHERE COALESCE(z.is_visible, true) = true
    `;
    const restParams = [];

    if (zoneId && zoneId !== 'all') {
      restSql += ` AND r.zone_id = ?`;
      restParams.push(parseInt(zoneId, 10));
    }

    if (distance && distance !== 'all') {
      restSql += ` AND r.distance = ?`;
      restParams.push(distance);
    }

    if (platform && platform !== 'all') {
      restSql += ` AND (r.platform = ? OR r.platform = 'Both')`;
      restParams.push(platform);
    }

    if (search) {
      const qPattern = `%${search}%`;
      restSql += ` AND (LOWER(r.name) LIKE LOWER(?) OR LOWER(COALESCE(r.address, '')) LIKE LOWER(?) OR LOWER(z.name) LIKE LOWER(?))`;
      restParams.push(qPattern, qPattern, qPattern);
    }

    restSql += ` ORDER BY r.name ASC`;

    // 2. Fetch all historical orders from order_history
    const historySql = `
      SELECT 
        id,
        restaurant_id,
        restaurant_name,
        zone_name,
        month_year,
        status,
        platform_used,
        time_slot,
        receiver_id,
        receiver_name,
        receiver_address,
        receiver_phone,
        notes,
        ordered_at,
        created_at
      FROM order_history
      ORDER BY ordered_at DESC NULLS LAST, id DESC
    `;

    // 3. Fetch target month orders from orders table
    const ordersSql = `
      SELECT 
        id,
        restaurant_id,
        month_year,
        status,
        platform_used,
        time_slot,
        receiver_id,
        receiver_name,
        receiver_address,
        receiver_phone,
        ordered_at
      FROM orders
      WHERE month_year = ?
    `;

    // 4. Fetch available distinct distances and months
    const [restaurants, allHistory, currentOrders, allDistancesRes] = await Promise.all([
      query(restSql, restParams),
      query(historySql),
      query(ordersSql, [targetMonth]),
      query(`SELECT DISTINCT distance FROM restaurants WHERE distance IS NOT NULL AND distance != '' ORDER BY distance ASC`)
    ]);

    const { suggestions, topReceivers, prevMonthYear } = buildSuggestions({
      restaurants,
      history: allHistory,
      currentOrders,
      targetMonth,
      timeSlot,
      strategy
    });

    // Summary Statistics
    const totalMatching = suggestions.length;
    const totalProven = suggestions.filter(s => s.history_count > 0).length;
    const totalFresh = suggestions.filter(s => !s.is_ordered_prev_month && !s.is_ordered_target_month).length;
    const totalLastMonth = suggestions.filter(s => s.is_ordered_prev_month).length;
    const totalOrderedThisMonth = suggestions.filter(s => s.is_ordered_target_month).length;
    const totalPendingThisMonth = totalMatching - totalOrderedThisMonth;

    return json({
      success: true,
      stats: {
        total_matching: totalMatching,
        total_proven: totalProven,
        total_fresh: totalFresh,
        total_last_month: totalLastMonth,
        total_ordered_this_month: totalOrderedThisMonth,
        total_pending_this_month: totalPendingThisMonth,
        target_month: targetMonth,
        prev_month: prevMonthYear
      },
      top_receivers: topReceivers,
      available_distances: allDistancesRes.map(d => d.distance),
      suggestions
    });
  } catch (err) {
    console.error('Error in /api/suggestions:', err);
    return serverError(err, '/api/suggestions');
  }
}
