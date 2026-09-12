import Stripe from "stripe";

/**
 * サーバー専用 Stripe インスタンス（シングルトン）。
 * stripe@22 では apiVersion を省略すると最新版が使われる。
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
