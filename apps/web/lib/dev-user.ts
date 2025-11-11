import { query } from "@/db/client";
import { DEV_USER } from "@/lib/dev-constants";

/**
 * Ensures the development user exists in the database to satisfy foreign key
 * constraints when AUTH_DISABLED is enabled.
 */
export async function ensureDevUserExists() {
  const existing = await query<{ id: string }>("SELECT id FROM users WHERE id = $1", [
    DEV_USER.id,
  ]);

  if (existing.rowCount && existing.rowCount > 0) {
    return existing.rows[0];
  }

  const inserted = await query<{ id: string }>(
    `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, '')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `,
    [DEV_USER.id, DEV_USER.email]
  );

  return inserted.rows[0] ?? { id: DEV_USER.id };
}

export { DEV_USER } from "@/lib/dev-constants";
