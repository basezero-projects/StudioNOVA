import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { applySessionCookie, hashPassword } from "@/lib/auth";

interface RegisterBody {
  email?: string;
  password?: string;
}

function validatePayload(payload: RegisterBody): { email: string; password: string } | string {
  if (!payload.email || !payload.password) {
    return "Email and password are required.";
  }

  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();

  if (!email.includes("@") || email.length < 5) {
    return "Provide a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return { email, password };
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as RegisterBody;
  const parsed = validatePayload(payload);

  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { email, password } = parsed;

  const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rowCount && existing.rowCount > 0) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const inserted = await query<{ id: string; email: string }>(
    `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
    `,
    [email, passwordHash]
  );

  const user = inserted.rows[0];
  const response = NextResponse.json({ id: user.id, email: user.email });

  return await applySessionCookie(response, user.id);
}

