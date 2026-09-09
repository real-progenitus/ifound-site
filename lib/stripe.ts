import Stripe from 'stripe';
import type { ShopEnvironment } from '@/lib/shop-env';

/**
 * Server-side Stripe client for the shop checkout.
 *
 * The site takes payment by creating a Checkout Session and redirecting; it
 * never handles card data, so there is no publishable key and no client-side
 * Stripe here. Fulfillment happens elsewhere: the webhook lives in
 * ifound-functions (functions/src/shop/shopPayment.ts) so that both the website
 * and the mobile app have exactly one path from "paid" to "order recorded".
 *
 * That also means this file needs STRIPE_SECRET_KEY but NOT a webhook secret.
 */
const clients: Partial<Record<ShopEnvironment, Stripe>> = {};

/**
 * The Stripe client for one environment.
 *
 * QA uses STRIPE_SECRET_KEY_QA, the test-mode key the QA cloud functions
 * already use, so a tester's card is never really charged and the resulting
 * events reach stripeShopWebhookQA rather than the live one. That variable is
 * optional: a deployment without it simply cannot serve QA checkouts, which is
 * the right failure.
 */
export function stripe(environment: ShopEnvironment = 'production'): Stripe {
  const existing = clients[environment];
  if (existing) return existing;

  const name = environment === 'qa' ? 'STRIPE_SECRET_KEY_QA' : 'STRIPE_SECRET_KEY';
  const key = process.env[name];
  if (!key) {
    // Surfaced rather than swallowed: scripts/check-prod-env.mjs already
    // refuses a production build without the live key, so reaching here means
    // either an unconfigured local environment or QA without its test key.
    throw new Error(`${name} is not set`);
  }
  const client = new Stripe(key);
  clients[environment] = client;
  return client;
}
