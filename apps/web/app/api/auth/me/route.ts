import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { AUTH_DISABLED } from "@/lib/config";
import { DEV_USER, getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (AUTH_DISABLED && userId === DEV_USER.id) {
    // Local dev mode: return a fake user without touching the database.
    return NextResponse.json(DEV_USER);
  }

  const result = await query<{ id: string; email: string }>(
    "SELECT id, email FROM users WHERE id = $1",
    [userId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json(result.rows[0]);
}

