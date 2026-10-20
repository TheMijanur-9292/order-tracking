import { json } from '@sveltejs/kit';
import { getDataVersion, serverError } from '$lib/server/db.js';

// Tiny endpoint polled by clients; they only re-fetch the full data when this value changes
export async function GET() {
  try {
    const version = await getDataVersion();
    return json({ success: true, version }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return serverError(err, '/api/version');
  }
}
