import { json } from '@sveltejs/kit';
import { query, invalidateCache, verifySession, serverError } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function PATCH({ params, request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const isVisible = Boolean(body.is_visible);
    await query('UPDATE zones SET is_visible = ? WHERE id = ?', [isVisible, id]);
    invalidateCache();
    await broadcastLiveUpdate();
    return json({ success: true, id: Number(id), is_visible: isVisible });
  } catch (err) {
    return serverError(err, '/api/zones/[id]');
  }
}

export async function DELETE({ params, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const { id } = params;
    const checkRests = await query('SELECT COUNT(*) as cnt FROM restaurants WHERE zone_id = ?', [id]);
    const restCount = Number(checkRests[0]?.cnt || 0);
    if (restCount > 0) {
      return json(
        {
          success: false,
          error: `এই জোনটিতে ${restCount}টি রেস্তোরাঁ রয়েছে, তাই এটি ডিলিট করা যাবে না। ফ্রন্টএন্ড থেকে লুকাতে চাইলে "Visible / Hidden" বাটন ব্যবহার করুন।`
        },
        { status: 403 }
      );
    }

    await query('DELETE FROM zones WHERE id = ?', [id]);
    invalidateCache();
    await broadcastLiveUpdate();
    return json({ success: true, message: 'Zone deleted successfully' });
  } catch (err) {
    return serverError(err, '/api/zones/[id]');
  }
}
