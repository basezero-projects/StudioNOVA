import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists } from "@/lib/dev-user";
import { requestUpscale } from "@/lib/worker-client";

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  await ensureDevUserExists();

  const assetResult = await query(
    `
      SELECT id, character_id, file_path, is_upscaled
      FROM assets
      WHERE id = $1
    `,
    [params.id]
  );

  if (!assetResult.rowCount) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const asset = assetResult.rows[0] as {
    id: string;
    character_id: string;
    file_path: string;
    is_upscaled: boolean;
  };

  const body = (await request.json().catch(() => ({}))) as {
    modelName?: string;
    tileSize?: number;
    upscaleFactor?: number;
  };

  const workerResponse = await requestUpscale({
    assetId: asset.id,
    imagePath: asset.file_path,
    modelName: body.modelName,
    tileSize: body.tileSize,
    upscaleFactor: body.upscaleFactor,
  });

  const newPath: string | null = workerResponse.image_path ?? null;
  const workerStatus = workerResponse.status ?? "completed";

  let updatedAsset = asset;
  if (newPath) {
    const update = await query(
      `
        UPDATE assets
        SET file_path = $1,
            is_upscaled = TRUE
        WHERE id = $2
        RETURNING id, user_id, character_id, type, file_path, width, height, is_upscaled, created_at
      `,
      [newPath, asset.id]
    );
    updatedAsset = update.rows[0];
  }

  return NextResponse.json({
    jobId: workerResponse.job_id ?? null,
    status: workerStatus,
    imagePath: newPath,
    asset: updatedAsset,
  });
}

