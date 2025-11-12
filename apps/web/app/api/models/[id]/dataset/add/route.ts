import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists } from "@/lib/dev-user";
import {
  addImageToDataset,
  WorkerRequestError,
} from "@/lib/worker-client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface DatasetBody {
  datasetPath?: string;
  imagePath?: string;
  imageData?: string;
  source?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as DatasetBody;
  const datasetPath = body.datasetPath?.trim();

  if (!datasetPath) {
    return NextResponse.json(
      { detail: "datasetPath is required." },
      { status: 400 }
    );
  }

  await ensureDevUserExists();

  const modelResult = await query("SELECT id FROM models WHERE id = $1", [id]);
  if (!modelResult.rowCount) {
    return NextResponse.json({ detail: "Model not found." }, { status: 404 });
  }

  try {
    const workerResponse = await addImageToDataset({
      modelId: id,
      datasetPath,
      imagePath: body.imagePath ?? undefined,
      imageData: body.imageData ?? undefined,
      source: body.source ?? "comfyui",
    });

    return NextResponse.json({
      status: workerResponse.status,
      dataset_path: workerResponse.dataset_path,
      file_name: workerResponse.file_name,
      count: workerResponse.count,
    });
  } catch (error) {
    if (error instanceof WorkerRequestError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    console.error("[api/models/dataset/add] Unexpected worker error", error);
    return NextResponse.json(
      { detail: "Worker returned an unexpected error while saving the image." },
      { status: 502 }
    );
  }
}
