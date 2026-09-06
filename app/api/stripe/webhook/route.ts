import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase/service";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Signature verification failed: ${err instanceof Error ? err.message : err}` }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const ownerId = session.metadata?.owner_id ?? session.client_reference_id;
      if (ownerId && session.customer) {
        await supabase.from("subscriptions").upsert({
          owner_id: ownerId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: (session.subscription as string) ?? null,
          status: "active",
          plan: "pro",
          updated_at: new Date().toISOString(),
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const ownerId = subscription.metadata?.owner_id;
      const status =
        subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : "canceled";
      if (ownerId) {
        await supabase.from("subscriptions").upsert({
          owner_id: ownerId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status,
          plan: status === "canceled" ? "free" : "pro",
          updated_at: new Date().toISOString(),
        });
      }
      break;
    }
    default:
      break; // not every event type needs handling
  }

  return NextResponse.json({ received: true });
}
