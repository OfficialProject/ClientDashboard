import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { listClients, createClient } from "@/lib/store";

export async function GET() {
  const supabase = await getServerSupabase();
  const clients = await listClients(supabase);
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nickname, steamId, steamName, avatar } = body ?? {};
  if (!steamId || !steamName) {
    return NextResponse.json(
      { error: "steamId and steamName are required" },
      { status: 400 }
    );
  }
  const supabase = await getServerSupabase();
  const client = await createClient(supabase, { nickname, steamId, steamName, avatar });
  return NextResponse.json({ client }, { status: 201 });
}
