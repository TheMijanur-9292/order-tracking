// Google Maps search link for a place in Kolkata.
export function getGoogleMapsUrl(queryStr) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((queryStr || '') + ' Kolkata')}`;
}
