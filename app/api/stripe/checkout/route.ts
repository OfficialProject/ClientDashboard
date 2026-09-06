import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStripe, PRO_PRICE_ID } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const stripe = getStripe();
  const origin = request.nextUrl.origin;

  // Reuse an existing Stripe customer if this account already has one
  // (e.g. from a prior canceled subscription) instead of creating a
  // duplicate every time they go through checkout again.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: sub?.stripe_customer_id ?? undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/onboarding/plan?checkout=canceled`,
    client_reference_id: user.id,
    metadata: { owner_id: user.id },
    subscription_data: { metadata: { owner_id: user.id } },
  });

  if (!session.url) return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
  return NextResponse.redirect(session.url);
}
