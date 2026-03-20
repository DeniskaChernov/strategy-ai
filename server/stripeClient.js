/** Ленивая инициализация Stripe — сервер не падает без STRIPE_SECRET_KEY */
let _stripe = null;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    _stripe = require('stripe')(key);
  }
  return _stripe;
}

module.exports = { getStripe };
