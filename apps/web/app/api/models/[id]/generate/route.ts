import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import {
  generateComfyPreviews,
  WorkerRequestError,
} from "@/lib/worker-client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GenerateBody {
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number | null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as GenerateBody;

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ detail: "prompt is required." }, { status: 400 });
  }

  const negativePrompt = body.negativePrompt?.trim() ?? "";
  const seed =
    typeof body.seed === "number" || body.seed === null ? body.seed : null;

  await ensureDevUserExists();

  let modelExists = false;
  try {
    const modelResult = await query("SELECT id FROM models WHERE id = $1", [id]);
    modelExists = modelResult.rowCount > 0;
  } catch (error) {
    console.warn("[api/models/generate] Model lookup skipped due to query error", error);
  }

  let workerResponse;
  try {
    workerResponse = await generateComfyPreviews({
      modelId: id,
      prompt,
      negativePrompt,
      steps: body.steps,
      cfgScale: body.cfgScale,
      seed,
    });
  } catch (error) {
    if (error instanceof WorkerRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    console.error("[api/models/generate] Unexpected worker error", error);
    return NextResponse.json(
      { detail: "Worker returned an unexpected error. Check ComfyUI configuration." },
      { status: 502 }
    );
  }

  const previews =
    workerResponse.previews?.map((preview) => ({
      id: preview.id,
      imagePath: preview.image_path,
      previewUrl: `/api/assets/file?path=${encodeURIComponent(preview.image_path)}`,
      isMock: Boolean(preview.is_mock),
    })) ?? [];

  const workerStatus = previews.length > 0 ? "completed" : "failed";

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
      VALUES ($1, $2, 'image', $3, $4, $5::jsonb, $6, NULL)
    `,
    [
      DEV_USER.id,
      id,
      prompt,
      negativePrompt,
      JSON.stringify({
        source: "web:v0.01",
        mode: "preview",
        cfgScale: body.cfgScale ?? 7,
        steps: body.steps ?? 20,
        seed,
      }),
      workerStatus,
    ]
  );

  return NextResponse.json({
    previews,
    modelExists,
  });
}
