import { json } from '@sveltejs/kit';
import { verifySession, createSignedSession, sessionCookieOptions, SESSION_COOKIE } from '$lib/server/db.js';

export async function GET({ cookies }) {
  const payload = verifySession(cookies.get(SESSION_COOKIE));

  if (!payload) {
    if (cookies.get(SESSION_COOKIE)) {
      cookies.delete(SESSION_COOKIE, { path: '/' });
    }
    return json({ authenticated: false });
  }

  // Sliding expiry: re-sign so an active admin stays logged in, an idle one expires after 30 days
  cookies.set(SESSION_COOKIE, createSignedSession(payload), sessionCookieOptions());

  return json({
    authenticated: true,
    user: { email: payload.email, role: payload.role || 'admin' }
  });
}
