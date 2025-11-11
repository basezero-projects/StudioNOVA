StudioNOVA · Build Roadmap (v0.01)

Prepared by: Wesley Cummins
Date: November 11, 2025
Status: Authoritative build sequence for StudioNOVA v0.01
Scope: Practical, dev-style phases for building a local-first AI character studio using ComfyUI + kohya_ss, with a clean web UI and worker service.

StudioNOVA v0.01 =
Local web app to:

Create characters (LoRA-based).

Train LoRA models via kohya_ss.

Generate images from those characters via ComfyUI.

Optionally upscale results.

View & download assets.

No public billing, no marketplace, no multi-tenant hardening yet. That comes later.

Each phase below includes:

Goals

Implementation checklist

How to prompt AI tools for that phase

Do not skip ahead. Each phase assumes the previous is stable.

Phase 0 · Repo & Context Lock-in

Goal: Make sure every tool understands structure & rules before a single line of app logic.

Implementation

Root layout (already done):

/StudioNOVA
  /apps
  /worker
  /docs
  /external
    /ComfyUI
    /kohya_ss
  .gitmodules


Ensure ComfyUI and kohya_ss are git submodules under /external.

Confirm these docs exist & are committed:

/docs/ARCHITECTURE.md

/docs/CURSOR_RULES.md

/docs/ENGINES.md

/docs/StudioNOVA_Build_Roadmap_v0.01.md

Root README.md (stub is fine)

AI Prompt Template

Read /docs/ARCHITECTURE.md, /docs/CURSOR_RULES.md, /docs/ENGINES.md, and /docs/StudioNOVA_Build_Roadmap_v0.01.md. Summarize the constraints. Do not modify anything under /external. Confirm you understand the structure for StudioNOVA v0.01.

No coding until it parrots the rules back correctly.

Phase 1 · Web App Scaffold (UI Shell)

Goal: Production-style Next.js shell so you are not bolting UI onto chaos later.

Implementation

In /apps/web:

Initialize Next.js (App Router) with TypeScript.

Add Tailwind CSS.

Add shadcn/ui with a base theme.

Create routes:

/ (marketing/landing placeholder)

/app (dashboard layout)

/app/characters

/app/generate

/app/gallery

/app/settings

Shared UI:

App layout with sidebar (Characters, Generate, Gallery, Settings).

Top bar with user placeholder & future credits display.

Basic dark theme, responsive.

No real data, just clean skeleton components.

AI Prompt Template

In /apps/web, scaffold a Next.js App Router project with TypeScript, Tailwind, and shadcn/ui. Implement:

Public / landing placeholder.

Auth layout stubs for future.

/app layout with sidebar navigation to Characters, Generate, Gallery, Settings.
Use only mock data. Do not add APIs, DB calls, or new features beyond this phase. Respect /docs/CURSOR_RULES.md.

Phase 2 · Core Types, Config, and Shared Utilities

Goal: Define types and config once, so everything uses the same contracts.

Implementation

In /apps/web and /worker:

Create a shared type spec (you can mirror types manually between TS & Python):

Core concepts:

User

Character

TrainingJob

GenerationJob

Asset

Define an environment config pattern:

Web:

NEXT_PUBLIC_API_BASE_URL

Worker:

COMFYUI_API_URL

KOHYA_ROOT

OUTPUT_DIR

DATABASE_URL (if worker talks to DB)

No real DB writes yet. Just types & config wiring.

AI Prompt Template

Define shared TypeScript interfaces in /apps/web/src/lib/types.ts and equivalent Python Pydantic models in /worker/app/schemas.py for User, Character, TrainingJob, GenerationJob, Asset. Base them on the v0.01 roadmap and ARCHITECTURE.md. Do not add fields that imply features we have not planned.

Phase 3 · Database & Models

Goal: Real schema for jobs, characters, and assets. Still local dev only.

Assumption: Use Postgres (Supabase later is trivial).

Implementation

Create /docs/DB_SCHEMA_v0.01.md (AI can generate) with tables:

users

characters

training_jobs

generation_jobs

assets

Minimum fields (v0.01):

characters:

id, user_id, name, token, description

lora_path (nullable until trained)

created_at, updated_at

training_jobs:

id, user_id, character_id

status (queued, running, completed, failed)

dataset_path

lora_output_path

log_path

created_at, updated_at

generation_jobs:

id, user_id, character_id

type (image)

prompt, negative_prompt, settings_json

status

asset_id (nullable until done)

created_at, updated_at

assets:

id, user_id, character_id

type (image)

file_path, width, height, is_upscaled

created_at

AI Prompt Template

Based on the roadmap, create /docs/DB_SCHEMA_v0.01.md and SQL migration files for a Postgres database under /apps/web/db (or similar) defining users, characters, training_jobs, generation_jobs, and assets. Keep fields minimal and aligned with v0.01. No billing tables yet.

Phase 4 · Auth & Basic User Context

Goal: Users can sign in and own their data. Still local dev.

Implementation

Pick 1 (I’d go Supabase or simple email/password). For v0.01:

Implement simple credentials-based auth:

Registration

Login

Session handling

Protect /app/* routes.

Attach user_id to all operations.

AI Prompt Template

Implement basic credential auth in /apps/web:

/login, /register

Protect /app/* routes.

Provide a useCurrentUser hook.
Persist users in the existing users table from DB_SCHEMA_v0.01. No OAuth, no roles, no billing.

Phase 5 · Worker Service Scaffold

Goal: Dedicated service that will talk to engines. No real engine calls yet.

Implementation

In /worker:

Create a FastAPI app with:

POST /train-lora

POST /generate-image

POST /upscale

GET /jobs/{job_id}

For now:

Validate incoming payloads with Pydantic.

Log payload.

Return mocked job IDs and statuses.

No ComfyUI, no kohya_ss integration yet.

AI Prompt Template

In /worker, scaffold a FastAPI service with endpoints:

POST /train-lora

POST /generate-image

POST /upscale

GET /jobs/{job_id}
Use schemas from schemas.py, but stub all implementations (no engine calls yet). Add a simple in-memory store for jobs for now.

Phase 6 · Connect Web App to Worker (Job Orchestration)

Goal: Web UI triggers jobs through worker. Still mocked but wired.

Implementation

In /apps/web:

Add API utilities for calling worker:

createTrainingJob

createGenerationJob

getJobStatus

Update:

/app/characters:

Form: create character (name, token, desc).

Button: “Train model” → calls POST /train-lora.

/app/generate:

Select character.

Prompt.

Button: “Generate image” → calls POST /generate-image.

/app/gallery:

List assets (use mock or DB if wired).

AI Prompt Template

Wire /apps/web to the /worker service:

Add a typed API client for train-lora, generate-image, getJobStatus.

Update Characters page to create characters and trigger a training job.

Update Generate page to send generation jobs.
Use the existing DB schema for persisting characters and jobs if available; if not, simulate persistence in Phase 6 only.

Phase 7 · Real ComfyUI Integration (Image Gen + Upscale)

Goal: Stop faking it. Use ComfyUI for real images and upscaling.

Implementation

In /worker:

Read COMFYUI_API_URL from env.

Implement generate-image:

Build a payload targeting a specific ComfyUI workflow.

Include:

base model

LoRA path (if character has one)

prompt / negative prompt

sampler, steps, cfg, seed

Poll ComfyUI (or use prompt ID) until complete.

Save image file to OUTPUT_DIR.

Return path/URL.

Implement upscale:

Call a ComfyUI workflow with Real-ESRGAN or SD x4 node.

Output higher-res image.

In /apps/web:

Show real thumbnails from returned URLs.

Mark assets as “upscaled” when applicable.

AI Prompt Template

In /worker, replace the stub of POST /generate-image and POST /upscale with real calls to ComfyUI:

Use COMFYUI_API_URL from env.

Assume an existing workflow that accepts prompt, negative_prompt, lora_path, and returns an image.

Save outputs to OUTPUT_DIR and return a file path.
Do not modify anything in /external/comfyui.

Phase 8 · Real kohya_ss Integration (LoRA Training)

Goal: Training jobs create real LoRAs usable in Phase 7.

Implementation

In /worker:

Implement POST /train-lora:

Accept: character_id, dataset location, training settings.

Use subprocess.run to call python train_network.py under external/kohya_ss.

On success:

Store LoRA file in a known directory.

Update character with lora_path.

On failure:

Capture logs.

Mark job as failed.

Simple dataset assumption for v0.01:

Dataset path preconfigured or manually placed.

Later you can add an upload pipeline.

In /apps/web:

Training job status:

Queued / Running / Completed / Failed.

Once complete:

Character displays “Model trained” badge.

AI Prompt Template

Implement the real train-lora handler in /worker:

Use subprocess.run to call train_network.py inside external/kohya_ss.

Accept basic params (dataset path, output path, steps, lr).

On success, update the corresponding TrainingJob and Character with lora_path.

On failure, store logs.
Do not edit kohya_ss source.

Phase 9 · UX Polish & Minimum Safety

Goal: StudioNOVA v0.01 feels like an actual product, not a science fair.

Implementation

Add loading states, toasts, and clean error messages.

Validate:

Prompt not empty.

Character selected before generation.

Add minimal safety copy:

Text in character creation: confirms user has rights to images and is not training on real people without consent.

Clean up layout:

Consistent spacing, typography, neutral brand style.

AI Prompt Template

In /apps/web, improve UX:

Add consistent loading states for all async calls.

Add toast notifications for success/failure.

Add form validation for character creation and generation.

Add a short notice in character creation about responsible use.
No new features outside UX and messaging.

Phase 10 · Local Run Script & Docs

Goal: One command to run the stack locally and clear docs so Future You remembers what You did.

Implementation

docker-compose.yml (optional for now) or a scripts/local-dev.md with:

Start Postgres.

Start ComfyUI.

Start worker.

Start Next.js app.

Update README.md:

What StudioNOVA v0.01 does.

How to set up env vars.

How to run locally.

AI Prompt Template

Create a simple local dev guide in /docs/LOCAL_DEV_v0.01.md that explains how to:

Start Postgres

Start ComfyUI

Start the worker

Start the web app
Also update README.md with a short description of StudioNOVA and a link to the docs.