import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";

function validateCharacterPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : null;

  if (!name) {
    return { error: "Name is required." };
  }

  if (!token) {
    return { error: "Trigger token is required." };
  }

  return { name, token, description };
}

export async function GET() {
  await ensureDevUserExists();

  const result = await query(
    `
      SELECT id, user_id, name, token, description, lora_path, created_at, updated_at
      FROM characters
      ORDER BY created_at DESC
    `
  );

  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = validateCharacterPayload(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await ensureDevUserExists();

  const inserted = await query(
    `
      INSERT INTO characters (user_id, name, token, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, name, token, description, lora_path, created_at, updated_at
    `,
    [DEV_USER.id, parsed.name, parsed.token, parsed.description]
  );

  return NextResponse.json(inserted.rows[0], { status: 201 });
}

