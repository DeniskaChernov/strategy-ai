const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { TIERS } = require('./tiers');

// POST /api/payments/checkout — создать Stripe Checkout Session
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const { tierKey } = req.body;
    if (!TIERS[tierKey] || tierKey === 'free') {
      return res.status(400).json({ error: 'Недопустимый тариф' });
    }

    const tier = TIERS[tierKey];
    if (!tier.stripe_price_id) {
      return res.status(503).json({ error: 'Stripe Price ID не настроен для этого тарифа' });
    }

    // Создаём или находим Stripe Customer
    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: { user_email: req.user.email },
      });
      customerId = customer.id;
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE email = $2',
        [customerId, req.user.email]
      );
    }

    const APP_URL = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${APP_URL}?payment=success&tier=${tierKey}`,
      cancel_url:  `${APP_URL}?payment=cancel`,
      metadata: {
        user_email: req.user.email,
        tier_key: tierKey,
      },
      subscription_data: {
        metadata: { user_email: req.user.email, tier_key: tierKey },
      },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    next(err);
  }
});

// POST /api/payments/portal — Stripe Customer Portal (управление подпиской)
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({ error: 'Нет привязанной подписки' });
    }
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: APP_URL,
    });
    res.json({ portalUrl: session.url });
  } catch (err) { next(err); }
});

// GET /api/payments/status — текущий статус подписки
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT tier, stripe_subscription_id, tier_valid_until FROM users WHERE email = $1',
      [req.user.email]
    );
    const user = rows[0];
    res.json({
      tier: user.tier,
      subscription_id: user.stripe_subscription_id,
      valid_until: user.tier_valid_until,
    });
  } catch (err) { next(err); }
});

// POST /api/payments/cancel — отменить подписку
router.post('/cancel', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT stripe_subscription_id FROM users WHERE email = $1',
      [req.user.email]
    );
    const subId = rows[0]?.stripe_subscription_id;
    if (!subId) return res.status(400).json({ error: 'Нет активной подписки' });

    // Отмена в конце периода
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    res.json({ ok: true, message: 'Подписка будет отменена в конце оплаченного периода' });
  } catch (err) { next(err); }
});

module.exports = router;
