# StudioNOVA · Database Schema (v0.01)

StudioNOVA v0.01 uses PostgreSQL as the source of truth for user accounts, models, job orchestration, and generated assets. The schema below is purpose-built for the initial local-first release and intentionally keeps the surface area minimal—no billing, multi-tenant hardening, or audit trails yet.

---

## users

| Column        | Type        | Constraints                                                    |
| ------------- | ----------- | -------------------------------------------------------------- |
| id            | uuid        | Primary key, `DEFAULT gen_random_uuid()`                       |
| email         | text        | `NOT NULL`, `UNIQUE`                                           |
| password_hash | text        | `NOT NULL`                                                     |
| created_at    | timestamptz | `NOT NULL`, `DEFAULT now()`                                    |

**Relationships**

- Referenced by `models.user_id`, `training_jobs.user_id`, `generation_jobs.user_id`, and `assets.user_id`.

---

## models

| Column      | Type        | Constraints                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------- |
| id          | uuid        | Primary key, `DEFAULT gen_random_uuid()`                                              |
| user_id     | uuid        | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE`                                   |
| name        | text        | `NOT NULL`                                                                            |
| token       | text        | `NOT NULL`                                                                            |
| description | text        | Nullable                                                                              |
| lora_path   | text        | Nullable (populated when training completes)                                          |
| created_at  | timestamptz | `NOT NULL`, `DEFAULT now()`                                                           |
| updated_at  | timestamptz | `NOT NULL`, `DEFAULT now()`                                                           |

**Relationships**

- Referenced by `training_jobs.model_id`, `generation_jobs.model_id`, and `assets.model_id`.

---

## training_jobs

| Column           | Type        | Constraints                                                                                                 |
| ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| id               | uuid        | Primary key, `DEFAULT gen_random_uuid()`                                                                    |
| user_id          | uuid        | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE`                                                        |
| model_id         | uuid        | `NOT NULL`, `REFERENCES models(id) ON DELETE CASCADE`                                                       |
| status           | text        | `NOT NULL`; constrained at DB level to one of `queued`, `running`, `completed`, `failed`                    |
| dataset_path     | text        | Nullable                                                                                                    |
| lora_output_path | text        | Nullable                                                                                                    |
| log_path         | text        | Nullable                                                                                                    |
| created_at       | timestamptz | `NOT NULL`, `DEFAULT now()`                                                                                 |
| updated_at       | timestamptz | `NOT NULL`, `DEFAULT now()`                                                                                 |

**Relationships**

- Links a user to a model-specific training execution. Results feed back into `models.lora_path`.

---

## generation_jobs

| Column          | Type        | Constraints                                                                                                      |
| --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| id              | uuid        | Primary key, `DEFAULT gen_random_uuid()`                                                                         |
| user_id         | uuid        | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE`                                                             |
| model_id        | uuid        | `NOT NULL`, `REFERENCES models(id) ON DELETE CASCADE`                                                            |
| type            | text        | `NOT NULL`; constrained at DB level to `image` or `video`                                                        |
| prompt          | text        | `NOT NULL`                                                                                                       |
| negative_prompt | text        | Nullable                                                                                                         |
| settings_json   | jsonb       | `NOT NULL`, `DEFAULT '{}'::jsonb`                                                                                |
| status          | text        | `NOT NULL`; constrained at DB level to `queued`, `running`, `completed`, or `failed`                             |
| asset_id        | uuid        | Nullable, `REFERENCES assets(id)`                                                                                |
| created_at      | timestamptz | `NOT NULL`, `DEFAULT now()`                                                                                      |
| updated_at      | timestamptz | `NOT NULL`, `DEFAULT now()`                                                                                      |

**Relationships**

- Optional link to `assets.id` once generation completes.
- Shares the same status semantics as `training_jobs`.

---

## assets

| Column      | Type        | Constraints                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------- |
| id          | uuid        | Primary key, `DEFAULT gen_random_uuid()`                                              |
| user_id     | uuid        | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE`                                   |
| model_id    | uuid        | `NOT NULL`, `REFERENCES models(id) ON DELETE CASCADE`                                  |
| type        | text        | `NOT NULL`; constrained at DB level to `image` or `video`                             |
| file_path   | text        | `NOT NULL`                                                                            |
| width       | integer     | Nullable                                                                              |
| height      | integer     | Nullable                                                                              |
| is_upscaled | boolean     | `NOT NULL`, `DEFAULT false`                                                           |
| created_at  | timestamptz | `NOT NULL`, `DEFAULT now()`                                                           |

**Relationships**

- Can be linked from `generation_jobs.asset_id`.
- Scoped to the owning user and model.

---

### Notes & Future Considerations

- Application layers enforce additional validation (e.g., ensuring `token` uniqueness per user, dataset folder validation).
- Later phases may add audit tables, billing/credits, or shared asset visibility. Those are intentionally excluded from v0.01.

