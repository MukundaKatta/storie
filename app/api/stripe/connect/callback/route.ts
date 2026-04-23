import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Stripe redirects sellers here after completing (or skipping) onboarding.
// The account_id was already saved when we initiated the flow; nothing to do
// here except send the seller back to their dashboard.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
