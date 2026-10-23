import { json } from '@sveltejs/kit';
import { query, verifySession, hashPassword, SESSION_COOKIE, serverError } from '$lib/server/db.js';

const MIN_PASSWORD_LENGTH = 8;

export async function GET({ cookies }) {
  const session = verifySession(cookies.get(SESSION_COOKIE));
  if (!session) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const users = await query('SELECT id, email, role, created_at FROM users ORDER BY id ASC');
    return json({
      success: true,
      users: users.map(u => ({ ...u, is_self: u.email.toLowerCase() === session.email.toLowerCase() }))
    });
  } catch (err) {
    return serverError(err, '/api/admin-users');
  }
}

export async function POST({ request, cookies }) {
  if (!verifySession(cookies.get(SESSION_COOKIE))) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ success: false, error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      return json({ success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing.length > 0) {
      return json({ success: false, error: 'An admin with this email already exists' }, { status: 409 });
    }

    const result = await query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [cleanEmail, hashPassword(password), 'admin']);
    return json({ success: true, id: result[0]?.id, message: 'Admin added successfully' });
  } catch (err) {
    return serverError(err, '/api/admin-users');
  }
}
