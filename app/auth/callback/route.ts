import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await getServerSupabase();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // First-time signup, no profile yet - chain straight into Connect Steam
  // instead of dropping them on an empty roster. Already-onboarded users
  // (have a client row) skip straight to the roster.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (!count) {
      return NextResponse.redirect(new URL("/api/auth/steam/login", request.url));
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
