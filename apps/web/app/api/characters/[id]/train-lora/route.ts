import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { characterSlug, defaultDatasetPath } from "@/lib/character-utils";
import {
  trainLora,
  WorkerRequestError,
  type TrainLoraResponse,
} from "@/lib/worker-client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TrainRequestBody {
  datasetPath?: string;
  baseModel?: string | null;
  outputDir?: string | null;
  outputName?: string | null;
  networkDim?: number;
  maxTrainSteps?: number;
  learningRate?: number;
  additionalArgs?: string[];
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as TrainRequestBody;
  const datasetPath = body.datasetPath?.trim();

  if (!datasetPath) {
    return NextResponse.json(
      { detail: "datasetPath is required to start training." },
      { status: 400 }
    );
  }

  await ensureDevUserExists();

  const characterResult = await query("SELECT id, name, token FROM characters WHERE id = $1", [
    id,
  ]);

  const characterRow = characterResult.rows[0] ?? null;
  const characterName = characterRow?.name ?? body.outputName ?? id;
  const characterSlugValue = characterSlug(characterRow?.name, characterRow?.token ?? characterName);
  const datasetRoot = process.env.KOHYA_DATASET_ROOT || "datasets";
  const defaultPath = defaultDatasetPath(characterSlugValue, datasetRoot);
  const resolvedDatasetPath = datasetPath || defaultPath;

  let workerResponse: TrainLoraResponse;
  try {
    workerResponse = await trainLora({
      characterId: id,
      datasetPath: resolvedDatasetPath,
      baseModel: body.baseModel ?? undefined,
      outputDir: body.outputDir ?? undefined,
      outputName: body.outputName ?? characterName,
      networkDim: body.networkDim ?? undefined,
      maxTrainSteps: body.maxTrainSteps ?? undefined,
      learningRate: body.learningRate ?? undefined,
      additionalArgs: body.additionalArgs ?? undefined,
    });
  } catch (error) {
    if (error instanceof WorkerRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }

    console.error("[api/train-lora] Unexpected worker error", error);
    return NextResponse.json(
      { detail: "Worker returned an unexpected error. Check training config." },
      { status: 502 }
    );
  }

  const workerStatus = workerResponse.status ?? "queued";
  const outputPath: string | null =
    workerResponse.output_weight ?? workerResponse.output_dir ?? null;
  const logPath: string | null = workerResponse.log_path ?? null;
  const command = workerResponse.command ?? null;
  const message =
    workerResponse.message ?? "Mock LoRA training job queued for character.";

  await query(
    `
      INSERT INTO training_jobs (
        user_id,
        character_id,
        status,
        dataset_path,
        lora_output_path,
        log_path
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [DEV_USER.id, id, workerStatus, resolvedDatasetPath, outputPath, logPath]
  );

  if (outputPath) {
    await query(
      `
        UPDATE characters
        SET lora_path = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [outputPath, id]
    );
  }

  return NextResponse.json({
    status: workerStatus,
    job_id: workerResponse.job_id ?? null,
    message,
    character_id: id,
    log_path: logPath,
    output_dir: workerResponse.output_dir ?? null,
    output_weight: workerResponse.output_weight ?? null,
    command,
    dataset_path: resolvedDatasetPath,
  });
}


