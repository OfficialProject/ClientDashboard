import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClient, updateClient, deleteClient, addNote } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await getServerSupabase();
  const client = await getClient(supabase, params.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const supabase = await getServerSupabase();

  if (typeof body?.note === "string" && body.note.trim()) {
    const client = await addNote(supabase, params.id, body.note.trim());
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ client });
  }

  const allowed = [
    "nickname",
    "premierRating",
    "faceitLevel",
    "faceitElo",
    "assignedBenchmarkId",
    "steamAuthCode",
    "lastKnownShareCode",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  const client = await updateClient(supabase, params.id, patch);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await getServerSupabase();
  await deleteClient(supabase, params.id);
  return NextResponse.json({ ok: true });
}
