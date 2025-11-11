import { NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists } from "@/lib/dev-user";

export async function GET() {
  await ensureDevUserExists();

  const result = await query(
    `
      SELECT
        id,
        user_id,
        character_id,
        type,
        file_path,
        width,
        height,
        is_upscaled,
        created_at
      FROM assets
      ORDER BY created_at DESC
    `
  );

  return NextResponse.json(result.rows);
}

