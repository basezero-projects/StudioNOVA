import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const normalize = (value: string) => value.replace(/\\/g, "/").toLowerCase();

const resolveWorkerRoot = () => {
  let current = path.resolve(process.cwd());
  for (let i = 0; i < 16; i += 1) {
    const candidate = path.resolve(current, "worker");
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.resolve(current, "..");
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(process.cwd(), "..", "worker");
};

const WORKER_ROOT = resolveWorkerRoot();

const ALLOWED_ROOTS = [
  path.resolve(WORKER_ROOT, "storage"),
  path.resolve(WORKER_ROOT, "datasets"),
].map(normalize);

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter." }, { status: 400 });
  }

  if (filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const normalizedPath = path.normalize(filePath);
  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(WORKER_ROOT, normalizedPath);

  const absoluteNormalized = normalize(absolutePath);

  const allowedRoot = ALLOWED_ROOTS.find((root) => absoluteNormalized.startsWith(root));

  if (!allowedRoot) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const data = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
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
