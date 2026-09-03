import { NextRequest, NextResponse } from "next/server";
import { addGoal, deleteGoal } from "@/lib/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { benchmarkId, category, subcategory, targetScore } = body ?? {};
  if (!benchmarkId || !category || !subcategory || typeof targetScore !== "number") {
    return NextResponse.json({ error: "benchmarkId, category, subcategory, and targetScore are required" }, { status: 400 });
  }
  const client = await addGoal(params.id, { benchmarkId, category, subcategory, targetScore });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  if (!body?.goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });
  const client = await deleteGoal(params.id, body.goalId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}
