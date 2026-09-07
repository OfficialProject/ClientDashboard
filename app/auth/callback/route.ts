import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPostAuthRedirect } from "@/lib/onboarding";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type"); // "recovery" for password-reset links
  const supabase = await getServerSupabase();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Password-reset links land here with type=recovery - send them to set a
  // new password, not through the normal onboarding chain.
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  const redirectTo = await getPostAuthRedirect(supabase);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
