import { json } from '@sveltejs/kit';
import { query, invalidateCache } from '$lib/server/db.js';
import { _broadcastLiveUpdate } from '../live-updates/+server.js';

function getCurrentMonthYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken) {
    return json({ success: false, error: 'Unauthorized. Please login as Admin to modify orders.' }, { status: 401 });
  }

  try {
    const { 
      restaurant_id, 
      month_year, 
      platform_used, 
      time_slot,
      notes, 
      receiver_id, 
      receiver_name, 
      receiver_address, 
      receiver_phone,
      action // 'toggle' | 'assign' | 'reset'
    } = await request.json();
    
    const targetMonthYear = month_year || getCurrentMonthYear();

    const existing = await query(
      'SELECT * FROM orders WHERE restaurant_id = ? AND month_year = ?',
      [restaurant_id, targetMonthYear]
    );

    let newStatus = 'Ordered';

    // Handle Revert / Reset action: Delete order & history completely from database
    const isReset = action === 'reset' || (existing.length > 0 && existing[0].status === 'Ordered' && !receiver_id && action === 'toggle');

    if (isReset) {
      await query('DELETE FROM orders WHERE restaurant_id = ? AND month_year = ?', [restaurant_id, targetMonthYear]);
      await query('DELETE FROM order_history WHERE restaurant_id = ? AND month_year = ?', [restaurant_id, targetMonthYear]);
      _broadcastLiveUpdate();

      return json({ 
        success: true, 
        status: 'Pending', 
        month_year: targetMonthYear,
        time_slot: null,
        receiver_name: null
      });
    }

    let orderId = existing.length > 0 ? existing[0].id : null;

    if (existing.length > 0) {
      const currentOrder = existing[0];
      const hasChanged = 
        currentOrder.status !== 'Ordered' ||
        (platform_used !== undefined && currentOrder.platform_used !== (platform_used || 'Swiggy/Zomato')) ||
        (time_slot !== undefined && currentOrder.time_slot !== (time_slot || 'Lunch')) ||
        (notes !== undefined && (currentOrder.notes || '') !== (notes || '')) ||
        (receiver_id !== undefined && (currentOrder.receiver_id || null) !== (receiver_id || null)) ||
        (receiver_name !== undefined && (currentOrder.receiver_name || null) !== (receiver_name || null)) ||
        (receiver_address !== undefined && (currentOrder.receiver_address || null) !== (receiver_address || null)) ||
        (receiver_phone !== undefined && (currentOrder.receiver_phone || null) !== (receiver_phone || null));

      if (!hasChanged) {
        return json({ 
          success: true, 
          status: 'Ordered', 
          month_year: targetMonthYear,
          time_slot: currentOrder.time_slot || 'Lunch',
          receiver_name: currentOrder.receiver_name || null
        });
      }

      await query(
        `UPDATE orders 
         SET status = 'Ordered', 
             platform_used = ?, 
             time_slot = ?,
             notes = ?, 
             receiver_id = ?, 
             receiver_name = ?, 
             receiver_address = ?, 
             receiver_phone = ?, 
             ordered_at = ?
         WHERE restaurant_id = ? AND month_year = ?`,
        [
          platform_used || existing[0].platform_used || 'Swiggy/Zomato', 
          time_slot || existing[0].time_slot || 'Lunch',
          notes || '', 
          receiver_id || existing[0].receiver_id || null,
          receiver_name || existing[0].receiver_name || null,
          receiver_address || existing[0].receiver_address || null,
          receiver_phone || existing[0].receiver_phone || null,
          new Date().toISOString(),
          restaurant_id, 
          targetMonthYear
        ]
      );
    } else {
      const insRes = await query(
        `INSERT INTO orders (
          restaurant_id, month_year, status, platform_used, time_slot, notes, 
          receiver_id, receiver_name, receiver_address, receiver_phone, ordered_at
        ) VALUES (?, ?, 'Ordered', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          restaurant_id, 
          targetMonthYear, 
          platform_used || 'Swiggy/Zomato', 
          time_slot || 'Lunch',
          notes || '', 
          receiver_id || null,
          receiver_name || null,
          receiver_address || null,
          receiver_phone || null,
          new Date().toISOString()
        ]
      );
      orderId = insRes[0]?.id || null;
    }

    // Insert Log Entry into order_history Table
    try {
      const restInfo = await query(`
        SELECT r.name AS restaurant_name, z.name AS zone_name 
        FROM restaurants r 
        LEFT JOIN zones z ON r.zone_id = z.id 
        WHERE r.id = ?
      `, [restaurant_id]);

      await query(
        `INSERT INTO order_history (
          order_id, restaurant_id, restaurant_name, zone_name, month_year,
          status, platform_used, time_slot, receiver_id, receiver_name,
          receiver_address, receiver_phone, notes, ordered_at
        ) VALUES (?, ?, ?, ?, ?, 'Ordered', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          restaurant_id,
          restInfo[0]?.restaurant_name || 'Restaurant',
          restInfo[0]?.zone_name || 'Kolkata',
          targetMonthYear,
          platform_used || 'Swiggy/Zomato',
          time_slot || 'Lunch',
          receiver_id || null,
          receiver_name || null,
          receiver_address || null,
          receiver_phone || null,
          notes || '',
          new Date().toISOString()
        ]
      );
    } catch (histErr) {
      console.error('Failed to write to order_history:', histErr);
    }

    _broadcastLiveUpdate();

    return json({ 
      success: true, 
      status: 'Ordered', 
      month_year: targetMonthYear,
      time_slot: time_slot || 'Lunch',
      receiver_name: receiver_name || null
    });
  } catch (err) {
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
