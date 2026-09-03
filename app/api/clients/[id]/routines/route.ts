import { NextRequest, NextResponse } from "next/server";
import { addRoutine, deleteRoutine } from "@/lib/store";
import type { Routine } from "@/lib/types";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { name, benchmarkId, scenarios, source } = body ?? {};
  if (!name || !benchmarkId || !Array.isArray(scenarios) || scenarios.length === 0) {
    return NextResponse.json({ error: "name, benchmarkId, and a non-empty scenarios array are required" }, { status: 400 });
  }
  const validSource: Routine["source"] = source === "auto-progression" ? "auto-progression" : "manual";
  const client = await addRoutine(params.id, { name, benchmarkId, scenarios, source: validSource });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  if (!body?.routineId) return NextResponse.json({ error: "routineId is required" }, { status: 400 });
  const client = await deleteRoutine(params.id, body.routineId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}
