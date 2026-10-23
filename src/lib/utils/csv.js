// Admin order history -> CSV data URI (not yet URI-encoded).
export function buildOrderHistoryCsv(orderHistoryList) {
  const headers = ['Order ID', 'Month', 'Restaurant', 'Zone', 'Status', 'Time Slot', 'Platform', 'Receiver Name', 'Receiver Phone', 'Receiver Address', 'Ordered At'];
  const rows = orderHistoryList.map(h => [
    h.id,
    `"${h.month_year}"`,
    `"${(h.restaurant_name || '').replace(/"/g, '""')}"`,
    `"${(h.zone_name || '').replace(/"/g, '""')}"`,
    `"${h.status}"`,
    `"${h.time_slot || 'Lunch'}"`,
    `"${h.platform_used || 'Swiggy/Zomato'}"`,
    `"${(h.receiver_name || 'N/A').replace(/"/g, '""')}"`,
    `"${(h.receiver_phone || 'N/A').replace(/"/g, '""')}"`,
    `"${(h.receiver_address || 'N/A').replace(/"/g, '""')}"`,
    `"${h.ordered_at ? new Date(h.ordered_at).toLocaleString('en-IN') : 'Pending'}"`
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csvContent;
}

// Triggers a browser download of href (e.g. an encoded data URI) as filename.
export function triggerDownload(href, filename) {
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
