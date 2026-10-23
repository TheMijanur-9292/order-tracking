import { getReceiverMatchScore } from './receiverMatch.js';

// Public tracker: WhatsApp/Telegram dispatch sheet text for a list of restaurants.
export function buildDispatchSheetText(list, receiversList) {
  const dateHeader = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const lines = [
    `📋 *ZOMSWI KOLKATA DISPATCH SHEET (${dateHeader})*`,
    `Total Listed: ${list.length} Restaurants`,
    `----------------------------------------`
  ];

  list.forEach((r, idx) => {
    const matchedRec = receiversList
      .map(rec => ({ ...rec, score: getReceiverMatchScore(rec, r) }))
      .sort((a, b) => b.score - a.score)[0];

    const recName = r.receiver_name || (matchedRec && matchedRec.score > 0 ? matchedRec.name : 'Receiver');
    const recPhone = r.receiver_phone || (matchedRec && matchedRec.score > 0 ? matchedRec.phone : '');
    const recAddr = r.receiver_address || r.address || '';
    const slotTxt = r.time_slot ? ` [${r.time_slot}]` : '';
    const statusIcon = r.order_status === 'Ordered' ? '✅' : '⏳';

    lines.push(
      `${idx + 1}. ${statusIcon} *${r.name}* (${r.zone_name || 'Kolkata'} | ${r.distance || 'C. 2-3'})${slotTxt}`,
      `   👤 ${recName}${recPhone ? ` (${recPhone})` : ''}`,
      `   📍 ${recAddr}`
    );
  });

  return lines.join('\n');
}

// Admin suggestions: formatted dispatch details for one suggested restaurant.
export function buildDispatchText(item, topReceiverSuggestions) {
  const recName = item.latest_history?.receiver_name || (topReceiverSuggestions[0]?.name) || 'Not Assigned';
  const recPhone = item.latest_history?.receiver_phone || (topReceiverSuggestions[0]?.phone) || 'N/A';
  const recAddr = item.latest_history?.receiver_address || (topReceiverSuggestions[0]?.address) || 'N/A';
  
  const text = `🍽️ RESTAURANT: ${item.name}
📍 ZONE: ${item.zone_name} | DISTANCE: ${item.distance}
🏢 ADDRESS: ${item.address || 'Kolkata'}
🛵 PLATFORM: ${item.platform}
🕒 TIME SLOT: ${item.latest_history?.time_slot || 'Lunch'}
👤 RECEIVER: ${recName} (${recPhone})
📦 DELIVERY ADDRESS: ${recAddr}
${item.swiggy_url ? `🔗 SWIGGY: ${item.swiggy_url}` : ''}
${item.zomato_url ? `🔗 ZOMATO: ${item.zomato_url}` : ''}`.trim();

  return text;
}
