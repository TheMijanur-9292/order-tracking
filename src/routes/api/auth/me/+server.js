import { json } from '@sveltejs/kit';

export async function GET({ cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');

  if (!sessionToken) {
    return json({ authenticated: false });
  }

  try {
    const payload = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'));
    if (payload && payload.email) {
      // Refresh/extend session cookie for another 10 years
      cookies.set('zomswi_admin_session', sessionToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24 * 365 * 10
      });

      return json({
        authenticated: true,
        user: { email: payload.email, role: payload.role || 'admin' }
      });
    }
  } catch (err) {
    // invalid token format
  }

  return json({ authenticated: false });
}
