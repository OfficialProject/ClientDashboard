import { NextRequest, NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/steam-openid";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const returnTo = `${origin}/api/auth/steam/callback`;
  const loginUrl = buildSteamLoginUrl(returnTo, origin);
  return NextResponse.redirect(loginUrl);
}
