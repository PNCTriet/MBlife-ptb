import { NextResponse } from "next/server";
import type { Honorific, LiveState } from "@/lib/types";
import {
  getServerLiveState,
  setServerLiveState,
} from "@/lib/server-live-state";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getServerLiveState());
}

export async function POST(request: Request) {
  let body: Partial<LiveState>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next: LiveState = {
    id: 1,
    employee_id: body.employee_id ?? null,
    employee_name: body.employee_name ?? null,
    days: typeof body.days === "number" ? body.days : null,
    title: (body.title as Honorific | null) ?? null,
    wish: body.wish ?? null,
    triggered_at: body.triggered_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(setServerLiveState(next));
}
