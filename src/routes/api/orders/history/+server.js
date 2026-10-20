import { json } from '@sveltejs/kit';
import { query, serverError, isAdminRequest } from '$lib/server/db.js';

export async function GET({ url, cookies }) {
  if (!isAdminRequest(cookies)) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin.' }, { status: 401 });
  }

  try {
    const monthYear = url.searchParams.get('month_year') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const zoneId = url.searchParams.get('zone_id') || 'all';
    const timeSlot = url.searchParams.get('time_slot') || 'all';
    const search = (url.searchParams.get('search') || '').trim();

    let sql = `
      SELECT 
        h.id,
        h.order_id,
        h.restaurant_id,
        h.restaurant_name,
        h.zone_name,
        h.month_year,
        h.status,
        h.platform_used,
        h.time_slot,
        h.receiver_id,
        h.receiver_name,
        h.receiver_address,
        h.receiver_phone,
        h.notes,
        h.ordered_at,
        h.created_at,
        r.address AS restaurant_address,
        r.platform AS restaurant_platform,
        r.distance AS restaurant_distance,
        r.swiggy_url,
        r.zomato_url,
        r.zone_id
      FROM order_history h
      LEFT JOIN restaurants r ON h.restaurant_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (monthYear && monthYear !== 'all') {
      sql += ` AND h.month_year = ?`;
      params.push(monthYear);
    }

    if (status && status !== 'all') {
      sql += ` AND h.status = ?`;
      params.push(status);
    }

    if (zoneId && zoneId !== 'all') {
      sql += ` AND r.zone_id = ?`;
      params.push(zoneId);
    }

    if (timeSlot && timeSlot !== 'all') {
      sql += ` AND h.time_slot = ?`;
      params.push(timeSlot);
    }

    if (search) {
      const qPattern = `%${search}%`;
      sql += ` AND (
        LOWER(COALESCE(h.restaurant_name, '')) LIKE LOWER(?) OR 
        LOWER(COALESCE(h.receiver_name, '')) LIKE LOWER(?) OR 
        LOWER(COALESCE(h.receiver_phone, '')) LIKE LOWER(?) OR 
        LOWER(COALESCE(h.receiver_address, '')) LIKE LOWER(?) OR 
        LOWER(COALESCE(h.notes, '')) LIKE LOWER(?) OR
        LOWER(COALESCE(h.zone_name, '')) LIKE LOWER(?)
      )`;
      params.push(qPattern, qPattern, qPattern, qPattern, qPattern, qPattern);
    }

    sql += ` ORDER BY h.ordered_at DESC NULLS LAST, h.created_at DESC`;

    const [history, availableMonthsRes] = await Promise.all([
      query(sql, params),
      query(`SELECT DISTINCT month_year FROM order_history ORDER BY month_year DESC`)
    ]);

    // Calculate aggregated summary statistics
    const totalCancelled = history.filter(item => item.status === 'Cancelled').length;
    const totalOrders = history.length - totalCancelled;
    const totalOrdered = history.filter(item => item.status === 'Ordered').length;
    const totalPending = history.filter(item => item.status === 'Pending').length;
    
    // Unique receivers assigned
    const uniqueReceivers = new Set(
      history
        .filter(item => item.receiver_name && item.receiver_name.trim())
        .map(item => item.receiver_name.trim())
    ).size;

    const availableMonths = availableMonthsRes.map(m => m.month_year);

    return json({
      success: true,
      stats: {
        total_orders: totalOrders,
        total_ordered: totalOrdered,
        total_pending: totalPending,
        total_cancelled: totalCancelled,
        unique_receivers: uniqueReceivers
      },
      available_months: availableMonths,
      history
    });
  } catch (err) {
    console.error('Error fetching order_history from database:', err);
    return serverError(err, '/api/orders/history');
  }
}
