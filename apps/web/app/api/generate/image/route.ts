import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { requestGenerateImage } from "@/lib/worker-client";

interface BodySchema {
  modelId?: string;
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
  const modelId = body.modelId?.trim();
  const prompt = body.prompt?.trim();
  const negativePrompt = body.negativePrompt?.trim() ?? "";

  if (!modelId) {
    return NextResponse.json({ error: "modelId is required." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  await ensureDevUserExists();

  const model = await query(
    "SELECT id, lora_path FROM models WHERE id = $1",
    [modelId]
  );
  if (!model.rowCount) {
    return NextResponse.json({ error: "Model not found." }, { status: 404 });
  }

  const workerResponse = await requestGenerateImage({
    modelId,
    prompt,
    negativePrompt,
    loraPath: model.rows[0].lora_path,
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
          model_id,
          type,
          file_path,
          width,
          height,
          is_upscaled
        )
        VALUES ($1, $2, 'image', $3, NULL, NULL, FALSE)
        RETURNING id, user_id, model_id, type, file_path, width, height, is_upscaled, created_at
      `,
      [DEV_USER.id, modelId, imagePath]
    );

    assetId = assetInsert.rows[0]?.id ?? null;
  }

  await query(
    `
      INSERT INTO generation_jobs (
        user_id,
        model_id,
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
      modelId,
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

