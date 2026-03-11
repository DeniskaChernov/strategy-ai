const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../db');
const { sendEmail, paymentSuccessEmail } = require('./email');
const { createNotification } = require('./notifications');

// ВАЖНО: этот роут должен получать raw body — настраивается в index.js
// POST /api/webhooks/stripe
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚡ Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`⚡ Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Подписка активирована / обновлена ────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const tierKey = sub.metadata?.tier_key;
        const userEmail = sub.metadata?.user_email;

        if (!userEmail || !tierKey) break;

        const isActive = ['active', 'trialing'].includes(sub.status);
        const isCancelingAtPeriodEnd = sub.cancel_at_period_end === true;

        const validUntil = isActive
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await pool.query(
          `UPDATE users SET
             tier = $1,
             stripe_subscription_id = $2,
             tier_valid_until = $3,
             trial_ends_at = NULL,
             subscription_cancel_at = $4,
             updated_at = now()
           WHERE email = $5`,
          [
            isActive ? tierKey : 'free',
            sub.id,
            validUntil,
            isCancelingAtPeriodEnd ? new Date(sub.current_period_end * 1000).toISOString() : null,
            userEmail,
          ]
        );

        if (isCancelingAtPeriodEnd) {
          const cancelDate = new Date(sub.current_period_end * 1000).toLocaleDateString('ru');
          await createNotification(userEmail, {
            type: 'warning',
            title: 'Подписка будет отменена',
            body: `Ваша подписка ${tierKey} активна до ${cancelDate}. После этого перейдёте на Free.`,
          }).catch(() => {});
        }

        console.log(`✅ User ${userEmail} tier → ${isActive ? tierKey : 'free'}${isCancelingAtPeriodEnd ? ' (canceling)' : ''}`);
        break;
      }

      // ── Подписка отменена ────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userEmail = sub.metadata?.user_email;
        if (!userEmail) break;

        await pool.query(
          `UPDATE users SET tier = 'free', stripe_subscription_id = NULL,
             tier_valid_until = NULL, updated_at = now()
           WHERE email = $1`,
          [userEmail]
        );

        // In-app уведомление
        await createNotification(userEmail, {
          type: 'warning',
          title: 'Подписка отменена',
          body: 'Ваш тариф переведён на Free. Вы можете возобновить подписку в любое время.',
        }).catch(() => {});

        console.log(`✅ User ${userEmail} downgraded to free`);
        break;
      }

      // ── Успешный платёж ──────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription)
          : null;
        if (sub) {
          const userEmail = sub.metadata?.user_email;
          const tierKey = sub.metadata?.tier_key;
          if (userEmail && tierKey) {
            const validUntil = new Date(sub.current_period_end * 1000).toISOString();
            await pool.query(
              `UPDATE users SET tier = $1, tier_valid_until = $2, trial_ends_at = NULL, updated_at = now()
               WHERE email = $3`,
              [tierKey, validUntil, userEmail]
            );

            // Email + in-app уведомление
            const { rows } = await pool.query('SELECT name FROM users WHERE email = $1', [userEmail]);
            const userName = rows[0]?.name || userEmail;
            const amount = invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(0) : '?';
            const tierLabel = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);

            const { subject, html } = paymentSuccessEmail(userName, tierLabel, amount);
            sendEmail({ to: userEmail, subject, html }).catch(() => {});

            await createNotification(userEmail, {
              type: 'success',
              title: `✅ Подписка ${tierLabel} активирована`,
              body: `Оплата $${amount}/мес прошла успешно. Спасибо!`,
            }).catch(() => {});
          }
        }
        break;
      }

      // ── Платёж не прошёл ─────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`⚠️ Payment failed for invoice ${invoice.id}`);
        if (invoice.customer_email) {
          await createNotification(invoice.customer_email, {
            type: 'error',
            title: '⚠️ Ошибка оплаты',
            body: 'Не удалось списать оплату. Проверьте платёжный метод в портале оплаты.',
          }).catch(() => {});
        }
        break;
      }

      // ── Завершение Checkout Session ──────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tierKey = session.metadata?.tier_key;
        const userEmail = session.metadata?.user_email;
        if (session.mode === 'subscription' && userEmail && tierKey) {
          console.log(`✅ Checkout completed: ${userEmail} → ${tierKey}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (dbErr) {
    console.error('❌ DB error in webhook:', dbErr.message);
    // Возвращаем 500 чтобы Stripe повторил доставку события
    return res.status(500).json({ error: 'Internal error processing webhook' });
  }

  res.json({ received: true });
});

module.exports = router;
