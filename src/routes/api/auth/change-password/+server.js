import { json } from '@sveltejs/kit';
import {
  query,
  verifySession,
  verifyPassword,
  hashPassword,
  createSignedSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  serverError
} from '$lib/server/db.js';

const MIN_PASSWORD_LENGTH = 8;

export async function POST({ request, cookies }) {
  const session = verifySession(cookies.get(SESSION_COOKIE));
  if (!session) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { current_password, new_password } = await request.json();
    if (!current_password || !new_password) {
      return json({ success: false, error: 'Current and new password are required' }, { status: 400 });
    }
    if (String(new_password).length < MIN_PASSWORD_LENGTH) {
      return json({ success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    const users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [session.email]);
    const user = users[0];
    if (!user || !verifyPassword(current_password, user.password_hash)) {
      return json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    // Sessions issued before this moment (other devices, a leaked cookie) stop working; see hooks.server.js
    await query('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?', [hashPassword(new_password), Date.now(), user.id]);
    cookies.set(SESSION_COOKIE, createSignedSession(user), sessionCookieOptions());

    return json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    return serverError(err, '/api/auth/change-password');
  }
}
