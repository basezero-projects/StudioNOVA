import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { modelSlug, defaultDatasetPath } from "@/lib/model-utils";

const DATASET_ROOT = process.env.KOHYA_DATASET_ROOT || "datasets";

async function countDatasetItems(datasetPath: string): Promise<number> {
  try {
    const absolutePath = path.isAbsolute(datasetPath)
      ? datasetPath
      : path.join(process.cwd(), datasetPath);
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

function validateModelPayload(payload: Record<string, unknown>) {
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
      FROM models
      ORDER BY created_at DESC
    `
  );

  const payload = await Promise.all(
    result.rows.map(async (row) => {
      const slug = modelSlug(row.name, row.token);
      const datasetPath = defaultDatasetPath(slug, DATASET_ROOT);
      const datasetCount = await countDatasetItems(datasetPath);
      return {
        ...row,
        slug,
        datasetPath,
        datasetCount,
      };
    })
  );

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = validateModelPayload(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await ensureDevUserExists();

  const inserted = await query(
    `
      INSERT INTO models (user_id, name, token, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, name, token, description, lora_path, created_at, updated_at
    `,
    [DEV_USER.id, parsed.name, parsed.token, parsed.description]
  );

  const model = inserted.rows[0];
  const slug = modelSlug(model.name, model.token);

  return NextResponse.json(
    {
      ...model,
      slug,
      datasetPath: defaultDatasetPath(slug, DATASET_ROOT),
      datasetCount: 0,
    },
    { status: 201 }
  );
}

