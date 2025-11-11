import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const WORKER_OUTPUT_DIR = path.resolve(process.cwd(), "..", "worker");

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter." }, { status: 400 });
  }

  if (filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const absolutePath = path.resolve(WORKER_OUTPUT_DIR, filePath);

  if (!absolutePath.startsWith(WORKER_OUTPUT_DIR)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const data = await fs.readFile(absolutePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}

