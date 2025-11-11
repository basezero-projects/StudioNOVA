import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { requestGenerateImage } from "@/lib/worker-client";

interface BodySchema {
  characterId?: string;
  prompt?: string;
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
  seed?: number | null;
  sampler?: string;
  scheduler?: string;
  width?: number;
  height?: number;
  baseModel?: string | null;
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

  const character = await query(
    "SELECT id, lora_path FROM characters WHERE id = $1",
    [characterId]
  );
  if (!character.rowCount) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const workerResponse = await requestGenerateImage({
    characterId,
    prompt,
    negativePrompt,
    loraPath: character.rows[0].lora_path,
    cfgScale: body.cfgScale,
    steps: body.steps,
    seed: body.seed ?? null,
    sampler: body.sampler,
    scheduler: body.scheduler,
    width: body.width,
    height: body.height,
    baseModel: body.baseModel,
  });

  const workerStatus = workerResponse.status ?? "queued";
  const imagePath: string | null = workerResponse.image_path ?? null;

  let assetId: string | null = null;
  if (imagePath) {
    const assetInsert = await query(
      `
        INSERT INTO assets (
          user_id,
          character_id,
          type,
          file_path,
          width,
          height,
          is_upscaled
        )
        VALUES ($1, $2, 'image', $3, NULL, NULL, FALSE)
        RETURNING id, user_id, character_id, type, file_path, width, height, is_upscaled, created_at
      `,
      [DEV_USER.id, characterId, imagePath]
    );

    assetId = assetInsert.rows[0]?.id ?? null;
  }

  await query(
    `
      INSERT INTO generation_jobs (
        user_id,
        character_id,
        type,
        prompt,
        negative_prompt,
        settings_json,
        status,
        asset_id
      )
      VALUES ($1, $2, 'image', $3, $4, $5::jsonb, $6, $7)
    `,
    [
      DEV_USER.id,
      characterId,
      prompt,
      negativePrompt,
      JSON.stringify({
        source: "web:v0.01",
        cfgScale: body.cfgScale ?? 7,
        steps: body.steps ?? 30,
        seed: body.seed ?? null,
        sampler: body.sampler ?? "euler",
      }),
      workerStatus,
      assetId,
    ]
  );

  return NextResponse.json({
    jobId: workerResponse.job_id ?? null,
    status: workerStatus,
    imagePath,
    assetId,
  });
}

