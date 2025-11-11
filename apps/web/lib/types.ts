export type JobStatus = "queued" | "running" | "completed" | "failed";

export type GenerationType = "image" | "video";

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  token: string;
  description?: string | null;
  loraPath?: string | null;
  createdAt: string;
  updatedAt: string;
  slug?: string;
  datasetPath?: string;
  datasetCount?: number;
}

export interface TrainingJob {
  id: string;
  userId: string;
  characterId: string;
  status: JobStatus;
  datasetPath?: string;
  loraOutputPath?: string | null;
  logPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  characterId: string;
  type: GenerationType;
  prompt: string;
  negativePrompt?: string;
  settingsJson: Record<string, unknown>;
  status: JobStatus;
  assetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  userId: string;
  characterId: string;
  type: "image" | "video";
  filePath: string;
  width?: number | null;
  height?: number | null;
  isUpscaled: boolean;
  createdAt: string;
}

