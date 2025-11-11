/**
 * Minimal Postgres client helper for StudioNOVA v0.01.
 *
 * Depends on the `pg` package (installed as part of Phase 3) and expects
 * `DATABASE_URL` to be defined in the environment. Future phases can build
 * higher-level repositories on top of this shared helper.
 */

import { Pool, type PoolClient, type QueryResult } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

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

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
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

