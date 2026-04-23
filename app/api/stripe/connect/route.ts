import { NextResponse } from "next/server";
import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase isn't configured." }, { status: 503 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe isn't configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, stripe_account_id")
    .eq("owner_id", user.id)
    .single();

  if (!store) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const stripe = getStripe();
  const origin = new URL(request.url).origin;

  // Create a new Express account if the seller doesn't have one yet.
  let accountId = store.stripe_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;

    // Persist the account ID immediately so we can reference it later.
    const service = createServiceClient();
    await service
      .from("stores")
      .update({ stripe_account_id: accountId })
      .eq("id", store.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect`,
    return_url: `${origin}/api/stripe/connect/callback`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(accountLink.url);
}
