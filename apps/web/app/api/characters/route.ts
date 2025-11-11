import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { characterSlug, defaultDatasetPath } from "@/lib/character-utils";

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

  const datasetRoot = process.env.KOHYA_DATASET_ROOT || "datasets";

  const payload = result.rows.map((row) => {
    const slug = characterSlug(row.name, row.token);
    return {
      ...row,
      slug,
      datasetPath: defaultDatasetPath(slug, datasetRoot),
    };
  });

  return NextResponse.json(payload);
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

  const datasetRoot = process.env.KOHYA_DATASET_ROOT || "datasets";
  const character = inserted.rows[0];
  const slug = characterSlug(character.name, character.token);

  return NextResponse.json(
    {
      ...character,
      slug,
      datasetPath: defaultDatasetPath(slug, datasetRoot),
    },
    { status: 201 }
  );
}

