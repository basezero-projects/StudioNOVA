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

export async function requestTrainLora(payload: { characterId: string }) {
  const res = await fetch(`${WORKER_BASE_URL}/train-lora`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: payload.characterId }),
  });
  return handleResponse(res);
}

export async function requestGenerateImage(payload: {
  characterId: string;
  prompt: string;
  negativePrompt?: string;
}) {
  const res = await fetch(`${WORKER_BASE_URL}/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character_id: payload.characterId,
      prompt: payload.prompt,
      negative_prompt: payload.negativePrompt || "",
    }),
  });
  return handleResponse(res);
}

export async function requestUpscale(payload: { assetId: string }) {
  const res = await fetch(`${WORKER_BASE_URL}/upscale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: payload.assetId }),
  });
  return handleResponse(res);
}

export async function fetchJob(jobId: string) {
  const res = await fetch(`${WORKER_BASE_URL}/jobs/${jobId}`);
  return handleResponse(res);
}

