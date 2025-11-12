import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { modelSlug, defaultDatasetPath } from "@/lib/model-utils";
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

  await ensureDevUserExists();

  const modelResult = await query("SELECT id, name, token FROM models WHERE id = $1", [id]);

  const modelRow = modelResult.rows[0] ?? null;
  const datasetRoot = process.env.KOHYA_DATASET_ROOT || "datasets";
  const fallbackName = body.outputName ?? modelRow?.name ?? id;
  const slug = modelSlug(modelRow?.name ?? fallbackName, modelRow?.token ?? fallbackName);
  const defaultPath = defaultDatasetPath(slug, datasetRoot);
  const resolvedDatasetPath = datasetPath || defaultPath;

  if (!modelRow && !datasetPath) {
    return NextResponse.json({ detail: "Model not found." }, { status: 404 });
  }

  let workerResponse: TrainLoraResponse;
  try {
    workerResponse = await trainLora({
      modelId: id,
      datasetPath: resolvedDatasetPath,
      baseModel: body.baseModel ?? undefined,
      outputDir: body.outputDir ?? undefined,
      outputName: body.outputName ?? modelRow?.name ?? id,
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
    workerResponse.message ?? "Mock LoRA training job queued for model.";

  await query(
    `
      INSERT INTO training_jobs (
        user_id,
        model_id,
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
        UPDATE models
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
    model_id: id,
    log_path: logPath,
    output_dir: workerResponse.output_dir ?? null,
    output_weight: workerResponse.output_weight ?? null,
    command,
    dataset_path: resolvedDatasetPath,
  });
}


