import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  cached = new Stripe(key);
  return cached;
}

/** The one paid plan created via the Stripe MCP during onboarding buildout - $12/mo, "Pro". Add more price IDs here if/when more tiers exist. */
export const PRO_PRICE_ID = "price_1UCgEKFfwyrtB0vidu4dFcEs";
