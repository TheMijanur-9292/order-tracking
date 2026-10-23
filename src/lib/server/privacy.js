// Masking helpers for data shown to public (not logged-in) viewers.

// '+91-9876543210' -> '+91-98xxxxxxxx'
export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length >= 2 ? `+91-${local.slice(0, 2)}xxxxxxxx` : '';
}

// Public viewers only see the locality (last few parts, minus state/country), never house/room details
export function areaOnly(address) {
  if (!address) return '';
  const parts = String(address)
    .split(',')
    .map(p => p.trim())
    .filter(p => p && !/^(india|west bengal)$/i.test(p) && !/\d/.test(p));
  return parts.slice(-3).join(', ');
}
