import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateUser, optionalAuth } from '../authMiddleware';
import { getDbPool, inMemoryStore, saveInMemoryStoreToDisk } from '../db';
import { bookCourierOrder, getVendorCourierCredentials, saveVendorCourierCredentials } from '../services/courierService';
import { deductVendorSmsAndSend, sendSmsNotification } from '../services/smsService';
import { realtimeEvents } from '../services/realtimeEvents';

const router = Router();

/**
 * 1. POST /api/courier/book - 1-Click Courier Booking (Steadfast / Pathao)
 */
router.post('/book', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন আবশ্যক' });

    const {
      orderId,
      provider = 'steadfast',
      recipientName,
      recipientPhone,
      recipientAddress,
      codAmount,
      deliveryNote,
      itemDescription,
    } = req.body;

    if (!orderId || !recipientPhone || !recipientAddress) {
      return res.status(400).json({ error: 'অর্ডার আইডি, কাস্টমারের মোবাইল নম্বর ও ঠিকানা আবশ্যক।' });
    }

    const pool = getDbPool();
    const now = Date.now();

    // 🔒 Enforce SMS balance check: Must have at least 1 SMS balance to send customer the live tracking link
    let vendorSmsBal = 0;
    if (pool) {
      const balRes = await pool.query('SELECT sms_balance FROM users WHERE id = $1', [userId]);
      vendorSmsBal = balRes.rows.length > 0 && balRes.rows[0].sms_balance !== null
        ? Number(balRes.rows[0].sms_balance)
        : 0;
    } else {
      const u = (inMemoryStore.users || []).find((x: any) => x.id === userId);
      vendorSmsBal = u && u.smsBalance !== null && u.smsBalance !== undefined ? Number(u.smsBalance) : 0;
    }

    if (vendorSmsBal < 1 && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'insufficient_sms_balance',
        message: '⚠️ আপনার অ্যাকাউন্টে কোনো এসএমএস ব্যালেন্স নেই (০ টি)! ১-ক্লিক কুরিয়ার বুকিং করতে এবং কাস্টমারকে স্বয়ংক্রিয় ট্র্যাকিং লিংক পাঠাতে অন্তত ১টি এসএমএস ব্যালেন্স প্রয়োজন। অনুগ্রহ করে মেসেজ রিচার্জ করুন।',
        needsSmsRecharge: true,
        smsBalance: 0,
      });
    }

    // Lookup order to get masterOrderId and exact orderNumber
    let orderNum = orderId;
    let masterOrderId: string | null = null;
    let isMaster = false;

    if (pool) {
      const ordChk = await pool.query('SELECT order_number, master_order_id FROM online_orders WHERE id = $1 OR order_number = $1 LIMIT 1', [orderId]);
      if (ordChk.rows.length > 0) {
        orderNum = ordChk.rows[0].order_number;
        masterOrderId = ordChk.rows[0].master_order_id;
      } else {
        const mChk = await pool.query('SELECT order_number FROM marketplace_master_orders WHERE id = $1 OR order_number = $1 LIMIT 1', [orderId]);
        if (mChk.rows.length > 0) {
          orderNum = mChk.rows[0].order_number;
          isMaster = true;
        }
      }
    } else {
      const ord = (inMemoryStore.online_orders || []).find((o: any) => o.id === orderId || o.orderNumber === orderId);
      if (ord) {
        orderNum = ord.orderNumber;
        masterOrderId = ord.masterOrderId;
      }
    }

    // Call 1-Click Courier Booking Service
    const bookingResult = await bookCourierOrder({
      orderId,
      orderNumber: orderNum,
      provider: provider === 'pathao' ? 'pathao' : 'steadfast',
      recipientName: recipientName || 'সম্মানিত গ্রাহক',
      recipientPhone,
      recipientAddress,
      codAmount: Number(codAmount || 0),
      deliveryNote,
      vendorId: userId,
      itemDescription,
    });

    if (!bookingResult.success) {
      return res.status(400).json({ error: bookingResult.message });
    }

    // Persist Courier Booking to Database
    const courierProviderName = bookingResult.provider;
    const trackingCode = bookingResult.trackingCode;

    if (pool) {
      if (isMaster) {
        await pool.query(`
          UPDATE marketplace_master_orders 
          SET courier_name = $1, courier_tracking_code = $2, overall_status = 'shipped', updated_at = $3
          WHERE id = $4 OR order_number = $4
        `, [courierProviderName, trackingCode, now, orderId]);

        await pool.query(`
          UPDATE online_orders 
          SET courier_name = $1, courier_tracking_code = $2, order_status = 'shipped', updated_at = $3
          WHERE master_order_id = $4
        `, [courierProviderName, trackingCode, now, orderId]);
      } else {
        await pool.query(`
          UPDATE online_orders 
          SET courier_name = $1, courier_tracking_code = $2, order_status = 'shipped', updated_at = $3
          WHERE id = $4 OR order_number = $4
        `, [courierProviderName, trackingCode, now, orderId]);

        if (masterOrderId) {
          await pool.query(`
            UPDATE marketplace_master_orders 
            SET courier_name = $1, courier_tracking_code = $2, overall_status = 'shipped', updated_at = $3
            WHERE id = $4 OR order_number = $4
          `, [courierProviderName, trackingCode, now, masterOrderId]);
        }
      }
    } else {
      (inMemoryStore.online_orders || [])
        .filter((o: any) => o.id === orderId || o.orderNumber === orderId || (masterOrderId && o.masterOrderId === masterOrderId))
        .forEach((o: any) => {
          o.courierName = courierProviderName;
          o.courierTrackingCode = trackingCode;
          o.orderStatus = 'shipped';
          o.updatedAt = now;
        });
      if (isMaster || masterOrderId) {
        const mId = isMaster ? orderId : masterOrderId;
        const m = (inMemoryStore.marketplace_master_orders || []).find((x: any) => x.id === mId || x.orderNumber === mId);
        if (m) {
          m.courierName = courierProviderName;
          m.courierTrackingCode = trackingCode;
          m.overallStatus = 'shipped';
          m.updatedAt = now;
        }
      }
      saveInMemoryStoreToDisk();
    }

    // Broadcast Real-time Event
    const realtimePayload = {
      orderId,
      orderNumber: orderNum,
      masterOrderId,
      orderStatus: 'shipped',
      overallStatus: 'shipped',
      courierName: courierProviderName,
      courierTrackingCode: trackingCode,
      trackingUrl: bookingResult.trackingUrl,
      updatedAt: now,
      timestamp: now,
    };
    realtimeEvents.broadcast('marketplace_order_updated', realtimePayload);
    realtimeEvents.broadcast('twing_order_updated', realtimePayload);
    realtimeEvents.broadcast('order_status_updated', realtimePayload);

    // Send Customer Tracking SMS with direct tracking URL & deduct 1 SMS
    const trackingSms = `Twing: প্রিয় ${recipientName}, আপনার অর্ডার #${orderNum} ${courierProviderName}-এ বুক হয়েছে। ট্র্যাকিং কোড: ${trackingCode}। লাইভ পার্সেল ট্র্যাক করুন: ${bookingResult.trackingUrl}`;
    deductVendorSmsAndSend(userId, recipientPhone, trackingSms, {
      smsType: 'order_courier_booked',
      orderNumber: orderNum,
      customerName: recipientName,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 ${bookingResult.provider}-এ সফলভাবে পার্সেল বুক হয়েছে! ট্র্যাকিং কোড: ${trackingCode}`,
      booking: bookingResult,
      printLabel: {
        orderNumber: orderNum,
        recipientName,
        recipientPhone,
        recipientAddress,
        codAmount: bookingResult.codAmount,
        provider: courierProviderName,
        consignmentId: bookingResult.consignmentId,
        trackingCode,
        trackingUrl: bookingResult.trackingUrl,
        bookedAt: now,
      },
    });
  } catch (err: any) {
    console.error('Courier booking error:', err);
    return res.status(500).json({ error: err.message || 'কুরিয়ার বুকিং করতে ব্যর্থ হয়েছে' });
  }
});

/**
 * 2. GET /api/courier/settings - Get vendor courier API credentials
 */
router.get('/settings', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন আবশ্যক' });

    const creds = await getVendorCourierCredentials(userId);
    return res.json({
      hasCustomCredentials: Boolean(creds),
      provider: creds?.provider || 'steadfast',
      steadfastApiKey: creds?.steadfastApiKey ? '••••••••' + creds.steadfastApiKey.slice(-4) : '',
      steadfastSecretKey: creds?.steadfastSecretKey ? '••••••••' + creds.steadfastSecretKey.slice(-4) : '',
      pathaoClientId: creds?.pathaoClientId ? '••••••••' + creds.pathaoClientId.slice(-4) : '',
      pathaoStoreId: creds?.pathaoStoreId || '',
      isPlatformDefaultActive: !creds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. POST /api/courier/settings - Save vendor courier API credentials
 */
router.post('/settings', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন আবশ্যক' });

    const {
      provider = 'steadfast',
      steadfastApiKey,
      steadfastSecretKey,
      pathaoClientId,
      pathaoClientSecret,
      pathaoUsername,
      pathaoPassword,
      pathaoStoreId,
    } = req.body;

    await saveVendorCourierCredentials(userId, {
      provider,
      steadfastApiKey: steadfastApiKey ? String(steadfastApiKey).trim() : undefined,
      steadfastSecretKey: steadfastSecretKey ? String(steadfastSecretKey).trim() : undefined,
      pathaoClientId: pathaoClientId ? String(pathaoClientId).trim() : undefined,
      pathaoClientSecret: pathaoClientSecret ? String(pathaoClientSecret).trim() : undefined,
      pathaoUsername: pathaoUsername ? String(pathaoUsername).trim() : undefined,
      pathaoPassword: pathaoPassword ? String(pathaoPassword).trim() : undefined,
      pathaoStoreId: pathaoStoreId ? String(pathaoStoreId).trim() : undefined,
    });

    return res.json({
      success: true,
      message: '✅ কুরিয়ার এপিআই ক্রেডেনশিয়াল সফলভাবে সংরক্ষিত হয়েছে!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
