import { json } from '@sveltejs/kit';
import { query, verifyPassword } from '$lib/server/db.js';

export async function POST({ request, cookies }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const users = await query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);

    if (!users || users.length === 0) {
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const user = users[0];
    const isValid = verifyPassword(password, user.password_hash);

    if (!isValid) {
      return json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Set permanent admin session cookie (10 years)
    const sessionToken = Buffer.from(JSON.stringify({ email: user.email, role: user.role, time: Date.now() })).toString('base64');
    cookies.set('zomswi_admin_session', sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // works on localhost HTTP
      maxAge: 60 * 60 * 24 * 365 * 10 // 10 years (Permanent until manual logout)
    });

    return json({
      success: true,
      message: 'Logged in successfully as Admin',
      user: { email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    return json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
