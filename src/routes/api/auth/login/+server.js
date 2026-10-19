import { json } from '@sveltejs/kit';
import {
  query,
  verifyPassword,
  passwordNeedsRehash,
  hashPassword,
  createSignedSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  serverError
} from '$lib/server/db.js';

// Best-effort in-memory brute-force protection (per server instance)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map();

function isLockedOut(key) {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(key) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.first > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count++;
  }
}

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
    const limitKey = `${ip}|${String(email).trim().toLowerCase()}`;

    if (isLockedOut(limitKey)) {
      return json({ success: false, error: 'Too many failed attempts. Please try again in 15 minutes.' }, { status: 429 });
    }

    const users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    const user = users && users[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      recordFailure(limitKey);
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    failedAttempts.delete(limitKey);

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
