// Date / month helpers shared by the tracker pages.

// Current month as 'YYYY-MM' (local time).
export function getCurrentMonthString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 'YYYY-MM' -> 'Aug 2026'. Public tracker variant: returns '' for an empty value.
export function formatMonthHeader(monthStr) {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Admin variant of formatMonthHeader: returns 'All Months' for an empty value or 'all'.
export function formatAdminMonthHeader(monthStr) {
  if (!monthStr || monthStr === 'all') return 'All Months';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Parses an order timestamp from the DB (UTC strings without a timezone suffix are treated as UTC).
export function parseOrderDate(isoStr) {
  if (!isoStr) return null;
  if (typeof isoStr === 'string') {
    let s = isoStr.trim();
    // If DB returned UTC timestamp string without timezone suffix, normalize it to UTC ISO string
    if (s.includes('-') && !s.endsWith('Z') && !s.includes('+')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

// 'D Mon, hh:mm AM' in Kolkata time (currently unused by the pages).
export function formatTime(isoStr) {
  const d = parseOrderDate(isoStr);
  if (!d) return '';
  const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr}, ${timeStr}`;
}

// '5th August, 2026 (Wed) at 03:20 PM' in Kolkata time, falling back to the month name.
export function formatFullOrderDate(isoStr, fallbackMonthStr) {
  const d = parseOrderDate(isoStr);
  if (d) {
    const day = parseInt(d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' }), 10);
    const monthFull = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' });
    const year = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const weekday = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const timeFormatted = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
                   (day === 2 || day === 22) ? 'nd' :
                   (day === 3 || day === 23) ? 'rd' : 'th';
    return `${day}${suffix} ${monthFull}, ${year} (${weekday}) at ${timeFormatted}`;
  }
  if (fallbackMonthStr) {
    const parts = fallbackMonthStr.split('-');
    if (parts.length >= 2) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  return 'Ordered';
}
