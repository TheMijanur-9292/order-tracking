import { json } from '@sveltejs/kit';
import { query, serverError, getKolkataMonthYear, isAdminRequest } from '$lib/server/db.js';

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

    // Build Maps for O(1) Lookups
    // Map: restaurant_id -> Array of history items
    const historyMap = new Map();
    for (const h of allHistory) {
      if (!historyMap.has(h.restaurant_id)) {
        historyMap.set(h.restaurant_id, []);
      }
      historyMap.get(h.restaurant_id).push(h);
    }

    // Map: restaurant_id -> current month order
    const currentOrderMap = new Map();
    for (const o of currentOrders) {
      currentOrderMap.set(o.restaurant_id, o);
    }

    // Determine previous month string (e.g., target '2026-09' -> '2026-08')
    let prevMonthYear = '';
    try {
      const [y, m] = targetMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    } catch (e) {
      prevMonthYear = '';
    }

    // Calculate Zone-specific top receiver suggestions (contextual to selected zone)
    const matchingRestIdsInZone = new Set(restaurants.map(r => r.id));
    const zoneReceiverCounts = new Map();
    
    // If a zone is selected, prioritize receivers who took orders in that specific zone
    const relevantHistory = (zoneId && zoneId !== 'all') 
      ? allHistory.filter(h => matchingRestIdsInZone.has(h.restaurant_id))
      : allHistory;

    const targetHistoryForReceivers = relevantHistory.length > 0 ? relevantHistory : allHistory;

    for (const h of targetHistoryForReceivers) {
      if (h.receiver_name && h.receiver_name.trim()) {
        const key = `${h.receiver_name}__${h.receiver_phone || ''}__${h.receiver_address || ''}`;
        if (!zoneReceiverCounts.has(key)) {
          zoneReceiverCounts.set(key, {
            id: h.receiver_id,
            name: h.receiver_name,
            phone: h.receiver_phone || '',
            address: h.receiver_address || '',
            count: 0,
            zone_name: h.zone_name
          });
        }
        zoneReceiverCounts.get(key).count++;
      }
    }

    const topReceivers = Array.from(zoneReceiverCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Process each restaurant with smart scoring & recommendation metadata
    let suggestions = restaurants.map(r => {
      const historyList = historyMap.get(r.id) || [];
      const currentOrder = currentOrderMap.get(r.id);
      
      const totalHistoryOrders = historyList.filter(h => h.status === 'Ordered').length;
      const latestHistory = historyList[0] || null;

      const isOrderedInTargetMonth = currentOrder?.status === 'Ordered';
      const isOrderedInPrevMonth = historyList.some(h => h.month_year === prevMonthYear && h.status === 'Ordered');

      // Calculate distinct months ordered
      const distinctMonthsOrdered = new Set(
        historyList.filter(h => h.status === 'Ordered').map(h => h.month_year)
      ).size;

      // Smart recommendation tags & score calculation
      let score = 50; // Base score
      let recommendationTag = 'Available';
      let tagType = 'neutral'; // 'gold', 'emerald', 'blue', 'purple', 'neutral'
      let reason = 'Ready for order';

      if (isOrderedInTargetMonth) {
        score -= 100; // Deprioritize if already ordered this target month
        recommendationTag = `Ordered in ${targetMonth}`;
        tagType = 'ordered';
        reason = `Already completed for ${targetMonth}`;
      } else {
        if (totalHistoryOrders > 0) {
          score += totalHistoryOrders * 20;
          score += distinctMonthsOrdered * 15;
          if (isOrderedInPrevMonth) {
            score += 35;
            recommendationTag = `⚡ Last Month Pick (${prevMonthYear})`;
            tagType = 'gold';
            reason = `Ordered last month (${prevMonthYear}) with reliable history`;
          } else {
            recommendationTag = `🏆 Frequent Choice (${totalHistoryOrders}x Orders)`;
            tagType = 'emerald';
            reason = `Successfully ordered ${totalHistoryOrders} times across ${distinctMonthsOrdered} months`;
          }
        } else {
          score += 15;
          recommendationTag = `🆕 Fresh Discovery`;
          tagType = 'blue';
          reason = `Not yet ordered - great for menu variety`;
        }

        // Time slot affinity bonus
        if (timeSlot !== 'all' && latestHistory?.time_slot === timeSlot) {
          score += 25;
          recommendationTag = `🕒 Top ${timeSlot} Choice`;
          tagType = 'purple';
        }
      }

      return {
        ...r,
        history_count: totalHistoryOrders,
        distinct_months_count: distinctMonthsOrdered,
        is_ordered_target_month: isOrderedInTargetMonth,
        is_ordered_prev_month: isOrderedInPrevMonth,
        latest_history: latestHistory ? {
          month_year: latestHistory.month_year,
          time_slot: latestHistory.time_slot,
          platform_used: latestHistory.platform_used,
          receiver_name: latestHistory.receiver_name,
          receiver_phone: latestHistory.receiver_phone,
          receiver_address: latestHistory.receiver_address,
          ordered_at: latestHistory.ordered_at
        } : null,
        current_target_order: currentOrder || null,
        ai_score: score,
        recommendation_tag: recommendationTag,
        tag_type: tagType,
        recommendation_reason: reason
      };
    });

    // Apply Strategy Filter
    if (strategy === 'proven') {
      suggestions = suggestions.filter(s => s.history_count > 0);
    } else if (strategy === 'fresh') {
      suggestions = suggestions.filter(s => s.history_count === 0 && !s.is_ordered_target_month);
    } else if (strategy === 'last_month') {
      suggestions = suggestions.filter(s => s.is_ordered_prev_month);
    } else if (strategy === 'pending_target') {
      suggestions = suggestions.filter(s => !s.is_ordered_target_month);
    }

    // Apply Time Slot Filter if specified
    if (timeSlot && timeSlot !== 'all') {
      suggestions = suggestions.filter(s => {
        if (!s.latest_history) return true; // Keep fresh joints
        return s.latest_history.time_slot === timeSlot || s.latest_history.time_slot === null;
      });
    }

    // Sort by AI Score descending, then history_count, then name
    suggestions.sort((a, b) => {
      if (b.ai_score !== a.ai_score) return b.ai_score - a.ai_score;
      if (b.history_count !== a.history_count) return b.history_count - a.history_count;
      return a.name.localeCompare(b.name);
    });

    // Summary Statistics
    const totalMatching = suggestions.length;
    const totalProven = suggestions.filter(s => s.history_count > 0).length;
    const totalFresh = suggestions.filter(s => s.history_count === 0).length;
    const totalOrderedThisMonth = suggestions.filter(s => s.is_ordered_target_month).length;
    const totalPendingThisMonth = totalMatching - totalOrderedThisMonth;

    return json({
      success: true,
      stats: {
        total_matching: totalMatching,
        total_proven: totalProven,
        total_fresh: totalFresh,
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
