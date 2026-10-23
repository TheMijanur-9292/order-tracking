// Masks a phone number for public display: '+91-98xxxxxx' / '98xxxxxx'.
export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const str = String(phone).trim();
  if (str.startsWith('+91-')) {
    const rest = str.substring(4);
    if (rest.length >= 2) {
      return `+91-${rest.slice(0, 2)}xxxxxx`;
    }
  } else if (str.startsWith('+91')) {
    const rest = str.substring(3);
    if (rest.length >= 2) {
      return `+91-${rest.slice(0, 2)}xxxxxx`;
    }
  } else if (str.length >= 2) {
    return `${str.slice(0, 2)}xxxxxx`;
  }
  return 'xxxxxx';
}
