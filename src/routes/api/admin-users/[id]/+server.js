import { json } from '@sveltejs/kit';
import { query, verifySession, SESSION_COOKIE, serverError } from '$lib/server/db.js';

export async function DELETE({ params, cookies }) {
  const session = verifySession(cookies.get(SESSION_COOKIE));
  if (!session) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const users = await query('SELECT id, email FROM users WHERE id = ?', [params.id]);
    if (users.length === 0) {
      return json({ success: false, error: 'Admin not found' }, { status: 404 });
    }
    if (users[0].email.toLowerCase() === session.email.toLowerCase()) {
      return json({ success: false, error: 'You cannot remove your own account' }, { status: 400 });
    }

    await query('DELETE FROM users WHERE id = ?', [params.id]);
    return json({ success: true, message: 'Admin removed successfully' });
  } catch (err) {
    return serverError(err, '/api/admin-users/[id]');
  }
}
