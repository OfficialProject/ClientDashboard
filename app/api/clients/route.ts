import { NextRequest, NextResponse } from "next/server";
import { listClients, createClient } from "@/lib/store";

export async function GET() {
  const clients = await listClients();
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
  const client = await createClient({ nickname, steamId, steamName, avatar });
  return NextResponse.json({ client }, { status: 201 });
}
