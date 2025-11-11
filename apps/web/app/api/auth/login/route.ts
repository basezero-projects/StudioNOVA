import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { applySessionCookie, verifyPassword } from "@/lib/auth";

interface LoginBody {
  email?: string;
  password?: string;
}

const INVALID_MESSAGE = "Invalid email or password.";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as LoginBody;

  if (!payload.email || !payload.password) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();

  const result = await query<{ id: string; email: string; password_hash: string }>(
    `
      SELECT id, email, password_hash
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  const user = result.rows[0];
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 401 });
  }

  const response = NextResponse.json({ id: user.id, email: user.email });
  return await applySessionCookie(response, user.id);
}

