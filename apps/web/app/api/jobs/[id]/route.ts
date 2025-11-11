import { NextResponse } from "next/server";

import { fetchJob } from "@/lib/worker-client";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const result = await fetchJob(params.id);
  return NextResponse.json(result);
}

