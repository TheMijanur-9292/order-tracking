import { query, verifySession, SESSION_COOKIE } from '$lib/server/db.js';

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Session cookies are stateless, so check them against the users table once per request:
// a removed admin, or a session issued before the last password change, is dropped here
// before any route sees it.
async function revokeStaleSession(cookies) {
  const payload = verifySession(cookies.get(SESSION_COOKIE));
  if (!payload) return;

  const users = await query('SELECT password_changed_at FROM users WHERE LOWER(email) = LOWER(?)', [payload.email]);
  const changedAt = Number(users[0]?.password_changed_at || 0);
  if (users.length === 0 || (changedAt && Number(payload.iat || 0) < changedAt)) {
    cookies.delete(SESSION_COOKIE, { path: '/' });
  }
}

export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/api/')) {
    try {
      await revokeStaleSession(event.cookies);
    } catch (e) {
      console.error('Session revocation check failed:', e);
    }
  }

  const response = await resolve(event);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    try {
      response.headers.set(name, value);
    } catch (e) {
      // Some responses have immutable headers; skip them
    }
  }
  return response;
}
