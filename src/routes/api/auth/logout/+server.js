import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  cookies.delete('zomswi_admin_session', { path: '/' });
  return json({ success: true, message: 'Logged out successfully' });
}
