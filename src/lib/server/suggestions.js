// Smart order suggestions: repeat last month's orders.
// For the selected zone + distance (+ time slot), find which restaurants were ordered in the previous
// month and for which receiver, so the same orders can be placed again this month. Restaurants without
// such an order are shown as "Fresh". Cancelled history rows are ignored everywhere.

// '2026-09' -> '2026-08', '2026-01' -> '2025-12'
export function getPreviousMonth(monthYear) {
  const [y, m] = String(monthYear).split('-').map(Number);
  if (!y || !m) return '';
  const prev = new Date(y, m - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function countReceivers(rows) {
  const counts = new Map();
  for (const h of rows) {
    if (!h.receiver_name || !h.receiver_name.trim()) continue;
    const key = h.receiver_id ? `id:${h.receiver_id}` : `name:${h.receiver_name.trim().toLowerCase()}`;
    if (!counts.has(key)) {
      counts.set(key, {
        id: h.receiver_id,
        name: h.receiver_name,
        phone: h.receiver_phone || '',
        address: h.receiver_address || '',
        count: 0,
        zone_name: h.zone_name
      });
    }
    counts.get(key).count++;
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
}

/**
 * @param {object} input
 * @param {Array} input.restaurants   restaurants already filtered by zone / distance / platform / search
 * @param {Array} input.history       order_history rows (any order)
 * @param {Array} input.currentOrders orders rows for the target month
 * @param {string} input.targetMonth  'YYYY-MM'
 * @param {string} [input.timeSlot]   slot name or 'all'
 * @param {string} [input.strategy]   'all' | 'proven' | 'fresh' | 'last_month' | 'pending_target'
 */
export function buildSuggestions({ restaurants, history, currentOrders, targetMonth, timeSlot = 'all', strategy = 'all' }) {
  const prevMonthYear = getPreviousMonth(targetMonth);
  const slotMatches = (h) => timeSlot === 'all' || (h.time_slot || 'Lunch') === timeSlot;

  // Newest first, so the first match per restaurant is the latest one
  // (ordered_at is a Date from Postgres and an ISO string from SQLite)
  const timeOf = (h) => (h.ordered_at ? new Date(h.ordered_at).getTime() || 0 : 0);
  const orderedHistory = history
    .filter(h => h.status === 'Ordered')
    .sort((a, b) => timeOf(b) - timeOf(a));

  const historyMap = new Map();
  for (const h of orderedHistory) {
    if (!historyMap.has(h.restaurant_id)) historyMap.set(h.restaurant_id, []);
    historyMap.get(h.restaurant_id).push(h);
  }

  const currentOrderMap = new Map();
  for (const o of currentOrders) {
    currentOrderMap.set(o.restaurant_id, o);
  }

  // Top receivers: who received last month's orders for these restaurants in this slot
  // (falls back to all-time orders for these restaurants if last month has none)
  const matchingRestIds = new Set(restaurants.map(r => r.id));
  const historyForMatching = orderedHistory.filter(h => matchingRestIds.has(h.restaurant_id) && slotMatches(h));
  let topReceivers = countReceivers(historyForMatching.filter(h => h.month_year === prevMonthYear));
  if (topReceivers.length === 0) {
    topReceivers = countReceivers(historyForMatching);
  }

  let suggestions = restaurants.map(r => {
    const orderedList = historyMap.get(r.id) || [];
    const currentOrder = currentOrderMap.get(r.id);

    const totalHistoryOrders = orderedList.length;
    const distinctMonthsOrdered = new Set(orderedList.map(h => h.month_year)).size;
    const isOrderedInTargetMonth = currentOrder?.status === 'Ordered';

    // The order to repeat: last month, same time slot
    const lastMonthOrder = orderedList.find(h => h.month_year === prevMonthYear && slotMatches(h)) || null;
    const isOrderedInPrevMonth = Boolean(lastMonthOrder);
    // What to show on the card / prefill in Quick Order: last month's order, else the most recent one
    const shownHistory = lastMonthOrder || orderedList[0] || null;

    let score;
    let recommendationTag;
    let tagType;
    let reason;
    const slotLabel = timeSlot !== 'all' ? ` ${timeSlot}` : '';

    if (isOrderedInTargetMonth) {
      score = -100;
      recommendationTag = `✅ Done for ${targetMonth}`;
      tagType = 'ordered';
      reason = `Already ordered in ${targetMonth}${currentOrder.receiver_name ? ` for ${currentOrder.receiver_name}` : ''}`;
    } else if (lastMonthOrder) {
      score = 100;
      recommendationTag = `⚡ Repeat${slotLabel} from ${prevMonthYear}`;
      tagType = 'gold';
      reason = `Ordered in ${prevMonthYear} (${lastMonthOrder.time_slot || 'Lunch'})${lastMonthOrder.receiver_name ? ` for ${lastMonthOrder.receiver_name}` : ''} - repeat this month`;
    } else {
      score = 50;
      recommendationTag = '🆕 Fresh';
      tagType = 'blue';
      reason = `No${slotLabel} order here in ${prevMonthYear}`;
    }

    return {
      ...r,
      history_count: totalHistoryOrders,
      distinct_months_count: distinctMonthsOrdered,
      is_ordered_target_month: isOrderedInTargetMonth,
      is_ordered_prev_month: isOrderedInPrevMonth,
      latest_history: shownHistory ? {
        month_year: shownHistory.month_year,
        time_slot: shownHistory.time_slot,
        platform_used: shownHistory.platform_used,
        receiver_id: shownHistory.receiver_id,
        receiver_name: shownHistory.receiver_name,
        receiver_phone: shownHistory.receiver_phone,
        receiver_address: shownHistory.receiver_address,
        ordered_at: shownHistory.ordered_at
      } : null,
      current_target_order: currentOrder || null,
      ai_score: score,
      recommendation_tag: recommendationTag,
      tag_type: tagType,
      recommendation_reason: reason
    };
  });

  if (strategy === 'proven') {
    suggestions = suggestions.filter(s => s.history_count > 0);
  } else if (strategy === 'fresh') {
    suggestions = suggestions.filter(s => !s.is_ordered_prev_month && !s.is_ordered_target_month);
  } else if (strategy === 'last_month') {
    suggestions = suggestions.filter(s => s.is_ordered_prev_month);
  } else if (strategy === 'pending_target') {
    suggestions = suggestions.filter(s => !s.is_ordered_target_month);
  }

  // Order: last month's repeats first (grouped by receiver), then Fresh, then already done this month
  suggestions.sort((a, b) => {
    if (b.ai_score !== a.ai_score) return b.ai_score - a.ai_score;
    if (a.is_ordered_prev_month && b.is_ordered_prev_month) {
      const byReceiver = (a.latest_history?.receiver_name || '').localeCompare(b.latest_history?.receiver_name || '');
      if (byReceiver !== 0) return byReceiver;
    }
    return a.name.localeCompare(b.name);
  });

  return { suggestions, topReceivers, prevMonthYear };
}
