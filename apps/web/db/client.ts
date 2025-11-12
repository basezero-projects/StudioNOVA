/**
 * Minimal database helper for StudioNOVA v0.01.
 *
 * When DATABASE_URL is set, we connect to PostgreSQL via `pg`. When missing
 * and AUTH_DISABLED is true, we fall back to an in-memory store so local devs
 * can test flows without running Postgres.
 */

import { Pool, type PoolClient, type QueryResult } from "pg";

import { AUTH_DISABLED } from "@/lib/config";
import { DEV_USER } from "@/lib/dev-constants";

type MemoryUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type MemoryModel = {
  id: string;
  user_id: string;
  name: string;
  token: string;
  description: string | null;
  lora_path: string | null;
  created_at: string;
  updated_at: string;
};

type MemoryTrainingJob = {
  id: string;
  user_id: string;
  model_id: string;
  status: string;
  dataset_path: string | null;
  lora_output_path: string | null;
  log_path: string | null;
  created_at: string;
  updated_at: string;
};

type MemoryGenerationJob = {
  id: string;
  user_id: string;
  model_id: string;
  type: string;
  prompt: string;
  negative_prompt: string | null;
  settings_json: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

type MemoryAsset = {
  id: string;
  user_id: string;
  model_id: string;
  type: string;
  file_path: string;
  width: number | null;
  height: number | null;
  is_upscaled: boolean;
  created_at: string;
};

const connectionString = process.env.DATABASE_URL;
const useMemoryStore = !connectionString && AUTH_DISABLED;

const memoryDb = useMemoryStore
  ? {
      users: [] as MemoryUser[],
      models: [] as MemoryModel[],
      trainingJobs: [] as MemoryTrainingJob[],
      generationJobs: [] as MemoryGenerationJob[],
      assets: [] as MemoryAsset[],
    }
  : null;

if (memoryDb) {
  const now = new Date().toISOString();
  memoryDb.users.push({
    id: DEV_USER.id,
    email: DEV_USER.email,
    password_hash: "",
    created_at: now,
  });
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (useMemoryStore) {
    throw new Error("In-memory DB does not support direct pool access.");
  }

  if (!pool) {
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Configure it in your environment before using the DB client."
      );
    }

    pool = new Pool({ connectionString });
    pool.on("error", (error) => {
      console.error("[db] unexpected error on idle client", error);
    });
  }

  return pool;
}

function makeResult<T>(rows: T[]): QueryResult<T> {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    rows,
    fields: [],
  };
}

async function memoryQuery<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  if (!memoryDb) {
    throw new Error("Memory database unavailable.");
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  const now = new Date().toISOString();

  switch (true) {
    case normalized.startsWith("SELECT id FROM users WHERE id = $1"): {
      const [id] = params as [string];
      const user = memoryDb.users.find((row) => row.id === id);
      return makeResult(user ? [{ id: user.id } as T] : []);
    }
    case normalized.startsWith("INSERT INTO users"): {
      const [id, email] = params as [string, string];
      const existing = memoryDb.users.find((row) => row.id === id || row.email === email);
      if (!existing) {
        memoryDb.users.push({
          id,
          email,
          password_hash: "",
          created_at: now,
        });
      }
      return makeResult([{ id } as T]);
    }
    case normalized.startsWith("SELECT id, email FROM users WHERE id = $1"): {
      const [id] = params as [string];
      const user = memoryDb.users.find((row) => row.id === id);
      return makeResult(user ? [{ id: user.id, email: user.email } as T] : []);
    }
    case normalized.startsWith("INSERT INTO models"): {
      const [userId, name, token, description] = params as [string, string, string, string | null];
      const model: MemoryModel = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        token,
        description,
        lora_path: null,
        created_at: now,
        updated_at: now,
      };
      memoryDb.models.unshift(model);
      return makeResult([model as T]);
    }
    case normalized.startsWith(
      "SELECT id, user_id, name, token, description, lora_path, created_at, updated_at FROM models ORDER BY created_at DESC"
    ): {
      const rows = [...memoryDb.models].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return makeResult(rows as unknown as T[]);
    }
    case normalized.startsWith(
      "SELECT id, user_id, name, token FROM models ORDER BY created_at DESC"
    ): {
      const rows = [...memoryDb.models].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return makeResult(rows as unknown as T[]);
    }
    case normalized.startsWith("SELECT id FROM models WHERE id = $1"): {
      const [id] = params as [string];
      const model = memoryDb.models.find((row) => row.id === id);
      return makeResult(model ? [{ id: model.id } as T] : []);
    }
    case normalized.startsWith("SELECT id, name FROM models WHERE id = $1"): {
      const [id] = params as [string];
      const model = memoryDb.models.find((row) => row.id === id);
      return makeResult(model ? [{ id: model.id, name: model.name } as T] : []);
    }
    case normalized.startsWith("SELECT id, name, token FROM models WHERE id = $1"): {
      const [id] = params as [string];
      const model = memoryDb.models.find((row) => row.id === id);
      return makeResult(
        model ? [{ id: model.id, name: model.name, token: model.token } as T] : []
      );
    }
    case normalized.startsWith(
      "INSERT INTO training_jobs (user_id, model_id, status, dataset_path, lora_output_path, log_path) VALUES"
    ): {
      const [userId, modelId, status, datasetPath, loraOutputPath, logPath] = params as [
        string,
        string,
        string,
        string | null,
        string | null,
        string | null,
      ];
      memoryDb.trainingJobs.push({
        id: crypto.randomUUID(),
        user_id: userId,
        model_id: modelId,
        status,
        dataset_path: datasetPath,
        lora_output_path: loraOutputPath,
        log_path: logPath,
        created_at: now,
        updated_at: now,
      });
      return makeResult([]);
    }
    case normalized.startsWith(
      "INSERT INTO training_jobs (user_id, model_id, status) VALUES"
    ): {
      const [userId, modelId, status] = params as [string, string, string];
      memoryDb.trainingJobs.push({
        id: crypto.randomUUID(),
        user_id: userId,
        model_id: modelId,
        status,
        dataset_path: null,
        lora_output_path: null,
        log_path: null,
        created_at: now,
        updated_at: now,
      });
      return makeResult([]);
    }
    case normalized.startsWith("INSERT INTO generation_jobs "): {
      const [userId, modelId, prompt, negativePrompt, settingsJson, status] = params as [
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      memoryDb.generationJobs.push({
        id: crypto.randomUUID(),
        user_id: userId,
        model_id: modelId,
        type: "image",
        prompt,
        negative_prompt: negativePrompt,
        settings_json: JSON.parse(settingsJson),
        status,
        created_at: now,
        updated_at: now,
      });
      return makeResult([]);
    }
    case normalized.startsWith("INSERT INTO assets"): {
      const [userId, modelId, filePath] = params as [string, string, string];
      const asset: MemoryAsset = {
        id: crypto.randomUUID(),
        user_id: userId,
        model_id: modelId,
        type: "image",
        file_path: filePath,
        width: null,
        height: null,
        is_upscaled: false,
        created_at: now,
      };
      memoryDb.assets.unshift(asset);
      return makeResult([asset as T]);
    }
    case normalized.startsWith(
      "SELECT id, user_id, model_id, type, file_path, width, height, is_upscaled, created_at FROM assets ORDER BY created_at DESC"
    ): {
      const assets = [...memoryDb.assets].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return makeResult(assets as unknown as T[]);
    }
    case normalized.startsWith(
      "SELECT id, model_id, file_path, is_upscaled FROM assets WHERE id = $1"
    ): {
      const [id] = params as [string];
      const asset = memoryDb.assets.find((row) => row.id === id);
      return makeResult(asset ? [{ id: asset.id, model_id: asset.model_id, file_path: asset.file_path, is_upscaled: asset.is_upscaled } as T] : []);
    }
    case normalized.startsWith(
      "UPDATE assets SET file_path = $1, is_upscaled = TRUE WHERE id = $2 RETURNING id, user_id, model_id, type, file_path, width, height, is_upscaled, created_at"
    ): {
      const [filePath, id] = params as [string, string];
      const asset = memoryDb.assets.find((row) => row.id === id);
      if (!asset) {
        return makeResult([]);
      }
      asset.file_path = filePath;
      asset.is_upscaled = true;
      return makeResult([asset as T]);
    }
    case normalized.startsWith("UPDATE models SET lora_path = $1, updated_at = NOW() WHERE id = $2"): {
      const [loraPath, id] = params as [string | null, string];
      const model = memoryDb.models.find((row) => row.id === id);
      if (model) {
        model.lora_path = loraPath;
        model.updated_at = now;
        return makeResult([model as unknown as T]);
      }
      return makeResult([]);
    }
    default: {
      throw new Error(`Memory DB does not support query: ${text}`);
    }
  }
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  if (useMemoryStore) {
    return memoryQuery<T>(text, params);
  }

  const client = await getPool().connect();

  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (useMemoryStore) {
    const client = {
      query: memoryQuery,
      release: () => undefined,
    } as unknown as PoolClient;
    return handler(client);
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

