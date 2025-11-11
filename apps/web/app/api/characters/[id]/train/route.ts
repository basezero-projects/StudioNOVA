import { NextRequest, NextResponse } from "next/server";

import { query } from "@/db/client";
import { ensureDevUserExists, DEV_USER } from "@/lib/dev-user";
import { requestTrainLora } from "@/lib/worker-client";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  await ensureDevUserExists();

  const character = await query("SELECT id FROM characters WHERE id = $1", [id]);
  if (!character.rowCount) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const workerResponse = await requestTrainLora({ characterId: id });
  const workerStatus = workerResponse.status ?? "queued";

  await query(
    `
      INSERT INTO training_jobs (user_id, character_id, status)
      VALUES ($1, $2, $3)
    `,
    [DEV_USER.id, id, workerStatus]
  );

  return NextResponse.json({
    jobId: workerResponse.job_id ?? null,
    status: workerStatus,
  });
}

