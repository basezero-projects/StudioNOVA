import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { requestTrainLora } from "@/lib/worker-client";

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
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as TrainRequestBody;
  const datasetPath = body.datasetPath?.trim();

  if (!datasetPath) {
    return NextResponse.json(
      { error: "datasetPath is required to start training." },
      { status: 400 }
    );
  }

  await ensureDevUserExists();

  const character = await query("SELECT id FROM characters WHERE id = $1", [id]);
  if (!character.rowCount) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const workerResponse = await requestTrainLora({
    characterId: id,
    datasetPath,
    baseModel: body.baseModel ?? undefined,
    outputDir: body.outputDir ?? undefined,
    outputName: body.outputName ?? undefined,
    networkDim: body.networkDim ?? undefined,
    maxTrainSteps: body.maxTrainSteps ?? undefined,
    learningRate: body.learningRate ?? undefined,
  });

  const workerStatus = workerResponse.status ?? "running";
  const outputPath: string | null =
    workerResponse.output_weight ?? workerResponse.output_dir ?? null;
  const logPath: string | null = workerResponse.log_path ?? null;

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
    [DEV_USER.id, id, workerStatus, datasetPath, outputPath, logPath]
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
    jobId: workerResponse.job_id ?? null,
    status: workerStatus,
    logPath,
    outputDir: workerResponse.output_dir ?? null,
    outputWeight: workerResponse.output_weight ?? null,
  });
}

