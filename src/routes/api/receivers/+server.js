import { json } from '@sveltejs/kit';
import { query, getCachedData, setCachedData, invalidateCache, verifySession, serverError, isAdminRequest, getKolkataDateString } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length >= 2 ? `+91-${local.slice(0, 2)}xxxxxxxx` : '';
}

// Public viewers only see the locality (last few parts, minus state/country), never house/room details
function areaOnly(address) {
  if (!address) return '';
  const parts = String(address)
    .split(',')
    .map(p => p.trim())
    .filter(p => p && !/^(india|west bengal)$/i.test(p) && !/\d/.test(p));
  return parts.slice(-3).join(', ');
}

export async function GET({ url, cookies }) {
  try {
    const targetMonth = url.searchParams.get('month_year') || '';
    const todayStr = getKolkataDateString();
    // IST calendar day expressed as a UTC range (ordered_at is stored in UTC)
    const dayStartIso = new Date(`${todayStr}T00:00:00+05:30`).toISOString();
    const dayEndIso = new Date(Date.parse(dayStartIso) + 24 * 60 * 60 * 1000).toISOString();
    const isAdmin = isAdminRequest(cookies);
    const cacheKey = `receivers_${targetMonth}_${todayStr}_${isAdmin ? 'adm' : 'pub'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return json(cached);

    let sql;
    let params = [];

    if (targetMonth) {
      sql = `
        SELECT 
          r.id,
          r.name,
          r.address,
          r.phone,
          r.created_at,
          COALESCE(SUM(CASE WHEN h.ordered_at >= ? AND h.ordered_at < ? AND h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS today_order_count,
          COALESCE(SUM(CASE WHEN h.month_year = ? AND h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS month_order_count,
          COALESCE(SUM(CASE WHEN h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS total_order_count
        FROM order_receiver r
        LEFT JOIN order_history h ON (h.receiver_id = r.id OR (h.receiver_id IS NULL AND LOWER(TRIM(h.receiver_name)) = LOWER(TRIM(r.name))))
        GROUP BY r.id, r.name, r.address, r.phone, r.created_at
        ORDER BY month_order_count DESC, total_order_count DESC, r.name ASC
      `;
      params = [dayStartIso, dayEndIso, targetMonth];
    } else {
      sql = `
        SELECT 
          r.id,
          r.name,
          r.address,
          r.phone,
          r.created_at,
          COALESCE(SUM(CASE WHEN h.ordered_at >= ? AND h.ordered_at < ? AND h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS today_order_count,
          0 AS month_order_count,
          COALESCE(SUM(CASE WHEN h.status = 'Ordered' THEN 1 ELSE 0 END), 0) AS total_order_count
        FROM order_receiver r
        LEFT JOIN order_history h ON (h.receiver_id = r.id OR (h.receiver_id IS NULL AND LOWER(TRIM(h.receiver_name)) = LOWER(TRIM(r.name))))
        GROUP BY r.id, r.name, r.address, r.phone, r.created_at
        ORDER BY total_order_count DESC, r.name ASC
      `;
      params = [dayStartIso, dayEndIso];
    }

    const receivers = await query(sql, params);

    // Also fetch distinct available months from history
    const monthsResult = await query(`
      SELECT DISTINCT month_year 
      FROM order_history 
      WHERE month_year IS NOT NULL AND month_year != '' 
      ORDER BY month_year DESC
    `);
    const availableMonths = monthsResult.map(m => m.month_year);

    const payload = { 
      success: true, 
      receivers: receivers.map(r => ({
        ...r,
        phone: isAdmin ? r.phone : maskPhone(r.phone),
        address: isAdmin ? r.address : areaOnly(r.address),
        today_order_count: Number(r.today_order_count || 0),
        month_order_count: Number(r.month_order_count || 0),
        total_order_count: Number(r.total_order_count || 0)
      })),
      available_months: availableMonths,
      selected_month: targetMonth
    };
    setCachedData(cacheKey, payload, 15000);
    return json(payload);
  } catch (err) {
    console.error('Error fetching receivers:', err);
    return serverError(err, '/api/receivers');
  }
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || !name.trim()) {
      return json({ success: false, error: 'Receiver name is required' }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return json({ success: false, error: 'Receiver address is required' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO order_receiver (name, address, phone) VALUES (?, ?, ?)`,
      [name.trim(), address.trim(), (phone || '').trim()]
    );

    await broadcastLiveUpdate();

    return json({ success: true, id: res[0]?.id, message: 'Receiver added successfully' });
  } catch (err) {
    console.error('Error adding receiver:', err);
    return serverError(err, '/api/receivers');
  }
}
