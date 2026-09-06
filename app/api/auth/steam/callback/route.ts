import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { verifySteamCallback } from "@/lib/steam-openid";
import { getSteamProfile } from "@/lib/steam";

export async function GET(request: NextRequest) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=Sign+in+first,+then+connect+Steam", request.url));
  }

  const steamId64 = await verifySteamCallback(request.nextUrl.searchParams);
  if (!steamId64) {
    return NextResponse.redirect(new URL("/?error=Steam+verification+failed", request.url));
  }

  const profile = await getSteamProfile(steamId64).catch(() => null);

  // "Connect Steam" populates the account owner's own profile/client
  // record - if they already have one (from a prior connect, or added
  // manually before this flow existed), update it in place rather than
  // creating a duplicate.
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", user.id)
    .eq("steam_id", steamId64)
    .maybeSingle();

  let clientId: string;
  if (existing) {
    await supabase
      .from("clients")
      .update({ steam_name: profile?.personaName ?? null, avatar: profile?.avatar ?? null })
      .eq("id", existing.id);
    clientId = existing.id;
  } else {
    const { data: created } = await supabase
      .from("clients")
      .insert({
        owner_id: user.id,
        nickname: profile?.personaName || "Me",
        steam_id: steamId64,
        steam_name: profile?.personaName ?? null,
        avatar: profile?.avatar ?? null,
      })
      .select("id")
      .single();
    clientId = created!.id;
  }

  // Onboarding, not a settings panel you have to go find later - straight
  // into collecting the match-history auth code + starting share code
  // next, same as Refrag/Leetify's connect flow.
  return NextResponse.redirect(new URL(`/onboarding/${clientId}`, request.url));
}
