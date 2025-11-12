import { getApiBaseUrl } from "@/lib/config";
import { loadConfig } from "@/lib/studio-config";

export class WorkerRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkerRequestError";
    this.status = status;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await readBody(response);

  if (!response.ok) {
    let message: string | undefined;

    if (body && typeof body === "object" && !Array.isArray(body)) {
      const detail =
        (body as Record<string, unknown>).detail ??
        (body as Record<string, unknown>).error ??
        (body as Record<string, unknown>).message;
      if (typeof detail === "string" && detail.trim()) {
        message = detail.trim();
      }
    }

    if (!message && typeof body === "string" && body.trim()) {
      message = body.trim();
    }

    throw new WorkerRequestError(
      message ?? `Worker request failed with ${response.status}`,
      response.status
    );
  }

  return body as T;
}

export interface TrainLoraResponse {
  job_id: string | null;
  status: string;
  log_path?: string | null;
  output_dir?: string | null;
  output_weight?: string | null;
  command?: string | null;
  message?: string | null;
  detail?: string | null;
  model_id?: string | null;
  dataset_path?: string | null;
}

export interface GenerateImageResponse {
  job_id: string | null;
  status?: string;
  image_path?: string | null;
  asset_id?: string | null;
}

export interface UpscaleResponse {
  job_id: string | null;
  status: string;
  upscaled_path?: string | null;
}

export interface WorkerJobResponse {
  job_id: string;
  status: string;
  [key: string]: unknown;
}

export interface ComfyPreview {
  id: string;
  image_path: string;
  preview_path?: string | null;
  model_id?: string;
  is_mock?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GenerateComfyResponse {
  previews: ComfyPreview[];
}

export interface DatasetAddResponse {
  status: string;
  dataset_path: string;
  file_name: string;
  count: number;
}

function resolveWorkerBaseUrl(): string {
  const defaultBase = getApiBaseUrl();
  const configured = loadConfig().apiBaseUrl?.trim();
  const base = configured || defaultBase;
  return `${base.replace(/\/$/, "")}/api`;
}

export async function requestTrainLora(payload: {
  modelId: string;
  datasetPath: string;
  baseModel?: string;
  outputDir?: string;
  outputName?: string;
  networkDim?: number;
  maxTrainSteps?: number;
  learningRate?: number;
  additionalArgs?: string[];
}): Promise<TrainLoraResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/train-lora`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: payload.modelId,
      dataset_path: payload.datasetPath,
      base_model: payload.baseModel ?? undefined,
      output_dir: payload.outputDir ?? undefined,
      output_name: payload.outputName ?? payload.modelId,
      network_dim: payload.networkDim ?? 16,
      max_train_steps: payload.maxTrainSteps ?? 300,
      learning_rate: payload.learningRate ?? 0.0001,
      additional_args: payload.additionalArgs ?? [],
    }),
  });
  return handleResponse<TrainLoraResponse>(res);
}

export const trainLora = requestTrainLora;

export async function requestGenerateImage(payload: {
  modelId: string;
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
}): Promise<GenerateImageResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: payload.modelId,
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
  return handleResponse<GenerateImageResponse>(res);
}

export async function requestUpscale(payload: {
  assetId: string;
  imagePath: string;
  modelName?: string;
  tileSize?: number;
  upscaleFactor?: number;
}): Promise<UpscaleResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/upscale`, {
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
  return handleResponse<UpscaleResponse>(res);
}

export async function fetchJob(jobId: string): Promise<WorkerJobResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/jobs/${jobId}`);
  return handleResponse<WorkerJobResponse>(res);
}

export async function generateComfyPreviews(payload: {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number | null;
}): Promise<GenerateComfyResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/generate/comfy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: payload.modelId,
      prompt: payload.prompt,
      negative_prompt: payload.negativePrompt ?? "",
      steps: payload.steps ?? 30,
      cfg_scale: payload.cfgScale ?? 7,
      seed: payload.seed ?? null,
    }),
  });
  return handleResponse<GenerateComfyResponse>(res);
}

export async function addImageToDataset(payload: {
  modelId: string;
  datasetPath: string;
  imagePath?: string;
  imageData?: string;
  source?: string;
}): Promise<DatasetAddResponse> {
  const baseUrl = resolveWorkerBaseUrl();
  const res = await fetch(`${baseUrl}/models/${payload.modelId}/dataset/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: payload.modelId,
      dataset_path: payload.datasetPath,
      image_path: payload.imagePath ?? undefined,
      image_data: payload.imageData ?? undefined,
      source: payload.source ?? "comfyui",
    }),
  });
  return handleResponse<DatasetAddResponse>(res);
}

