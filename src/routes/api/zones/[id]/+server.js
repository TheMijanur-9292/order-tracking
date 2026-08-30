import { json } from '@sveltejs/kit';
import { query, invalidateCache, verifySession } from '$lib/server/db.js';

export async function DELETE({ params, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    await query('DELETE FROM zones WHERE id = ?', [id]);
    invalidateCache();
    return json({ success: true, message: 'Zone deleted successfully' });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
