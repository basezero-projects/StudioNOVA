const rawBaseUrl =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  process.env.WORKER_URL ||
  "http://localhost:8000";

const normalizedBase = rawBaseUrl.replace(/\/$/, "");
const WORKER_BASE_URL = `${normalizedBase}/api`;

async function handleResponse(response: Response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Worker request failed with ${response.status}`);
  }
  return response.json();
}

export async function requestTrainLora(payload: {
  characterId: string;
  datasetPath: string;
  baseModel?: string;
  outputDir?: string;
  outputName?: string;
  networkDim?: number;
  maxTrainSteps?: number;
  learningRate?: number;
}) {
  const res = await fetch(`${WORKER_BASE_URL}/train-lora`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character_id: payload.characterId,
      dataset_path: payload.datasetPath,
      base_model: payload.baseModel ?? null,
      output_dir: payload.outputDir ?? null,
      output_name: payload.outputName ?? null,
      network_dim: payload.networkDim ?? null,
      max_train_steps: payload.maxTrainSteps ?? null,
      learning_rate: payload.learningRate ?? null,
    }),
  });
  return handleResponse(res);
}

export async function requestGenerateImage(payload: {
  characterId: string;
  prompt: string;
  negativePrompt?: string;
  loraPath?: string | null;
  cfgScale?: number;
  steps?: number;
  seed?: number | null;
  sampler?: string;
  scheduler?: string;
  width?: number;
  height?: number;
  baseModel?: string | null;
}) {
  const res = await fetch(`${WORKER_BASE_URL}/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character_id: payload.characterId,
      prompt: payload.prompt,
      negative_prompt: payload.negativePrompt || "",
      lora_path: payload.loraPath ?? null,
      cfg_scale: payload.cfgScale ?? 7,
      steps: payload.steps ?? 30,
      seed: payload.seed ?? null,
      sampler: payload.sampler ?? "euler",
      scheduler: payload.scheduler ?? "normal",
      width: payload.width ?? 1024,
      height: payload.height ?? 1024,
      base_model: payload.baseModel ?? null,
    }),
  });
  return handleResponse(res);
}

export async function requestUpscale(payload: {
  assetId: string;
  imagePath: string;
  modelName?: string;
  tileSize?: number;
  upscaleFactor?: number;
}) {
  const res = await fetch(`${WORKER_BASE_URL}/upscale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset_id: payload.assetId,
      image_path: payload.imagePath,
      model_name: payload.modelName ?? "4x-UltraSharp.pth",
      tile_size: payload.tileSize ?? 0,
      upscale_factor: payload.upscaleFactor ?? 2.0,
    }),
  });
  return handleResponse(res);
}

export async function fetchJob(jobId: string) {
  const res = await fetch(`${WORKER_BASE_URL}/jobs/${jobId}`);
  return handleResponse(res);
}

