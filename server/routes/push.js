import { Router } from 'express';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { PushSubscription } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function setup() {
  if (!configured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@dailylog.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

// POST /api/push/subscribe { subscription: {endpoint, keys:{p256dh,auth}}, kinds? }
router.post('/subscribe', async (req, res) => {
  if (!configured()) return res.status(503).json({ error: 'Push belum dikonfigurasi server (VAPID).' });
  const { subscription, kinds } = req.body || {};
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Subscription tidak valid' });
  }
  const endpoint = String(subscription.endpoint);
  const endpointHash = crypto.createHash('sha1').update(endpoint).digest('hex');
  const [row, created] = await PushSubscription.findOrCreate({
    where: { endpointHash },
    defaults: {
      userId: req.user.id,
      endpoint,
      endpointHash,
      p256dh: String(subscription.keys.p256dh),
      auth: String(subscription.keys.auth),
      kinds: String(kinds || 'reminder,summary'),
    },
  });
  if (!created && row.userId !== req.user.id) {
    row.userId = req.user.id;
    await row.save();
  }
  res.status(201).json({ ok: true });
});

router.delete('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint wajib' });
  const endpointHash = crypto.createHash('sha1').update(String(endpoint)).digest('hex');
  await PushSubscription.destroy({ where: { userId: req.user.id, endpointHash } });
  res.json({ ok: true });
});

router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/test — kirim notifikasi uji ke langganan sendiri
router.post('/test', async (req, res) => {
  if (!setup()) return res.status(503).json({ error: 'Push belum dikonfigurasi server (VAPID).' });
  const subs = await PushSubscription.findAll({ where: { userId: req.user.id } });
  if (!subs.length) return res.status(404).json({ error: 'Belum ada langganan push.' });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'DailyLog', body: 'Notifikasi uji berhasil. Pengingat aktif.' })
      );
      sent += 1;
    } catch (err) {
      if (err.statusCode === 410) await s.destroy();
    }
  }
  res.json({ ok: true, sent });
});

export async function pushToUser(userId, payload, kind = 'reminder') {
  if (!setup()) return 0;
  const subs = await PushSubscription.findAll({ where: { userId } });
  let sent = 0;
  for (const s of subs) {
    if (!String(s.kinds || '').split(',').includes(kind)) continue;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent += 1;
    } catch (err) {
      if (err.statusCode === 410) await s.destroy();
    }
  }
  return sent;
}

export default router;
