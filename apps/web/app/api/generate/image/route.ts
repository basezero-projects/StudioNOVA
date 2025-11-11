import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { requestGenerateImage } from "@/lib/worker-client";

interface BodySchema {
  characterId?: string;
  prompt?: string;
  negativePrompt?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as BodySchema;
  const characterId = body.characterId?.trim();
  const prompt = body.prompt?.trim();
  const negativePrompt = body.negativePrompt?.trim() ?? "";

  if (!characterId) {
    return NextResponse.json({ error: "characterId is required." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  await ensureDevUserExists();

  const character = await query("SELECT id FROM characters WHERE id = $1", [characterId]);
  if (!character.rowCount) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const workerResponse = await requestGenerateImage({
    characterId,
    prompt,
    negativePrompt,
  });

  const workerStatus = workerResponse.status ?? "queued";

  await query(
    `
      INSERT INTO generation_jobs (
        user_id,
        character_id,
        type,
        prompt,
        negative_prompt,
        settings_json,
        status
      )
      VALUES ($1, $2, 'image', $3, $4, $5::jsonb, $6)
    `,
    [
      DEV_USER.id,
      characterId,
      prompt,
      negativePrompt,
      JSON.stringify({ source: "web:v0.01", guidance: null }),
      workerStatus,
    ]
  );

  return NextResponse.json({
    jobId: workerResponse.job_id ?? null,
    status: workerStatus,
  });
}

