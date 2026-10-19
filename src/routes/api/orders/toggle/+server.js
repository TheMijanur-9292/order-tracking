import { json } from '@sveltejs/kit';
import { invalidateCache, verifySession, serverError, getKolkataMonthYear, transaction } from '$lib/server/db.js';
import { broadcastLiveUpdate } from '$lib/server/liveUpdates.js';

export async function POST({ request, cookies }) {
  const sessionToken = cookies.get('zomswi_admin_session');
  if (!sessionToken || !verifySession(sessionToken)) {
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

    const targetMonthYear = month_year || getKolkataMonthYear();

    // All reads/writes for one toggle run in a single transaction so orders and order_history never diverge
    const result = await transaction(async (tx) => {
      const existing = await tx(
        'SELECT * FROM orders WHERE restaurant_id = ? AND month_year = ?',
        [restaurant_id, targetMonthYear]
      );

      // Handle Revert / Reset action: remove the active order, keep the history row as an audit trail
      const isReset = action === 'reset' || (existing.length > 0 && existing[0].status === 'Ordered' && !receiver_id && action === 'toggle');

      if (isReset) {
        await tx('DELETE FROM orders WHERE restaurant_id = ? AND month_year = ?', [restaurant_id, targetMonthYear]);
        await tx(
          "UPDATE order_history SET status = 'Cancelled' WHERE restaurant_id = ? AND month_year = ?",
          [restaurant_id, targetMonthYear]
        );
        return { changed: true, status: 'Pending', time_slot: null, receiver_name: null };
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
          return {
            changed: false,
            status: 'Ordered',
            time_slot: currentOrder.time_slot || 'Lunch',
            receiver_name: currentOrder.receiver_name || null
          };
        }

        await tx(
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
        const insRes = await tx(
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

      // Insert / Refresh Log Entry in order_history Table
      const restInfo = await tx(`
        SELECT r.name AS restaurant_name, z.name AS zone_name
        FROM restaurants r
        LEFT JOIN zones z ON r.zone_id = z.id
        WHERE r.id = ?
      `, [restaurant_id]);

      // Replace any existing history entry for this restaurant & month to prevent duplicate rows on edits
      await tx(
        'DELETE FROM order_history WHERE restaurant_id = ? AND month_year = ?',
        [restaurant_id, targetMonthYear]
      );

      await tx(
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

      return { changed: true, status: 'Ordered', time_slot: time_slot || 'Lunch', receiver_name: receiver_name || null };
    });

    if (result.changed) {
      invalidateCache();
      broadcastLiveUpdate();
    }

    return json({
      success: true,
      status: result.status,
      month_year: targetMonthYear,
      time_slot: result.time_slot,
      receiver_name: result.receiver_name
    });
  } catch (err) {
    return serverError(err, '/api/orders/toggle');
  }
}
