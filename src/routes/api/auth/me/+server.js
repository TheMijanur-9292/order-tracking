import { json } from '@sveltejs/kit';
import { verifySession, createSignedSession } from '$lib/server/db.js';

export async function GET({ cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');

  if (!sessionToken) {
    return json({ authenticated: false });
  }

  try {
    const payload = verifySession(sessionToken);
    if (payload && payload.email) {
      // Re-sign/extend session cookie with new HMAC signature
      const newSignedToken = createSignedSession(payload);
      cookies.set('zomswi_admin_session', newSignedToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365 * 10
      });

      return json({
        authenticated: true,
        user: { email: payload.email, role: payload.role || 'admin' }
      });
    }
  } catch (err) {
    // invalid token
  }

  return json({ authenticated: false });
}
