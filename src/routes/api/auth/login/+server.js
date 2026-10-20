import { json } from '@sveltejs/kit';
import {
  query,
  verifyPassword,
  passwordNeedsRehash,
  hashPassword,
  createSignedSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  serverError,
  isLoginLockedOut,
  recordLoginFailure,
  clearLoginFailures
} from '$lib/server/db.js';

export async function POST({ request, cookies, getClientAddress }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    let ip = 'unknown';
    try {
      ip = getClientAddress();
    } catch (e) {}
    const limitKey = `${ip}|${String(email).trim().toLowerCase()}`.slice(0, 400);

    if (await isLoginLockedOut(limitKey)) {
      return json({ success: false, error: 'Too many failed attempts. Please try again in 15 minutes.' }, { status: 429 });
    }

    const users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    const user = users && users[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      await recordLoginFailure(limitKey);
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    await clearLoginFailures(limitKey);

    // Upgrade legacy / weaker password hashes transparently
    if (passwordNeedsRehash(user.password_hash)) {
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), user.id]);
    }

    const sessionToken = createSignedSession(user);
    cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());

    return json({
      success: true,
      message: 'Logged in successfully as Admin',
      user: { email: user.email, role: user.role }
    });
  } catch (err) {
    return serverError(err, 'Login error');
  }
}
