ChatGPT said:

Finally, someone asking for documentation before building chaos.
Below are your three starter docs—drop them straight into /docs/.
They’re versioned for StudioNOVA v0.01 and tuned for use with Cursor so it behaves like an adult instead of hallucinating your project into a blender.

📘 /docs/ARCHITECTURE.md
# StudioNOVA · System Architecture (v0.01)
**Prepared by:** Wesley Cummins  
**Date:** November 11, 2025  
**Status:** Stable project root  
**Scope:** Defines the core structure, integration points, and workflow between StudioNOVA’s internal app layers and its external engines.

---

## 1. Overview
StudioNOVA is a local-first AI model creation and content engine that enables:
- **LoRA Training** via `kohya_ss`
- **Image / Video Generation** via `ComfyUI`
- **Built-in Upscaling** (Real-ESRGAN + SD x4)
- **Web UI & Worker API** for orchestration and future commercialization

---

## 2. Folder Layout



/StudioNOVA
├─ apps/ → Next.js web interface (dashboard, studio, billing)
├─ worker/ → Python/FastAPI worker controlling engines
├─ docs/ → Project documentation
├─ external/ → External open-source engines
│ ├─ comfyui/ → Generation / video engine
│ └─ kohya_ss/ → LoRA training engine
├─ docker-compose.yml → Unified local environment (planned)
└─ README.md


---

## 3. Data Flow

1. **Frontend (Next.js)**  
   - User creates or selects a model.  
   - Submits a generation or training request.  

2. **Backend (Next.js API Routes)**  
   - Validates request, writes job record to database.  
   - Sends job payload to **Worker API**.

3. **Worker Service (Python)**  
   - Receives payloads: `/train-lora`, `/generate-image`, `/generate-video`, `/upscale`.  
   - Interacts with ComfyUI & kohya_ss via REST or CLI.  
   - Pushes progress updates and final asset URLs back to DB.

4. **Storage & Delivery**  
   - Local file storage or Supabase / S3 bucket.  
   - Web app displays results with job status updates.

---

## 4. Integration Boundaries

| Layer | Language | Responsibility | Talk-To |
|-------|-----------|----------------|---------|
| `apps/web` | TypeScript / Next.js | UI + Auth + Billing | Worker API |
| `worker` | Python / FastAPI | Job execution & engine control | ComfyUI + kohya_ss |
| `external/comfyui` | Python | Generation engine | Worker |
| `external/kohya_ss` | Python | Training engine | Worker |

---

## 5. Key Principles
- **Isolation:** External engines are never modified directly.  
- **Determinism:** All job requests include model hash + LoRA ID for reproducibility.  
- **Security:** No remote uploads of sensitive data without encryption.  
- **Scalability:** Each engine can be containerized and run on a separate GPU.

---

## 6. Future Add-Ons
- Video post-processing pipeline (CogVideoX / AnimateDiff)
- Automated dataset cleanup
- Stripe billing & usage credits
- Audit / content safety system

---

⚙️ /docs/CURSOR_RULES.md
# StudioNOVA · Cursor Development Rules (v0.01)

## Purpose
Defines how Cursor must interact with this repository to prevent it from rewriting external tools or bloating scope.

---

## Directories Cursor May Edit
| Directory | Purpose |
|------------|----------|
| `/apps` | Next.js frontend + API routes |
| `/worker` | Python worker logic |
| `/docs` | Documentation |
| `/docker-compose.yml`, `/README.md` | Project metadata |

---

## Directories Cursor Must Ignore
| Directory | Rule |
|------------|------|
| `/external/comfyui` | **Do not modify.** Treat as black-box REST API. |
| `/external/kohya_ss` | **Do not modify.** Treat as CLI training tool. |
| `/node_modules`, `/venv`, `/dist` | Ignore. |

---

## Integration Behavior
1. All engine interactions occur through `/apps/worker` endpoints.  
2. Cursor should **generate typed API clients** in `apps/web` for these endpoints.  
3. No new dependencies without explicit instruction.  
4. Maintain a `CHANGELOG.md` (future) for every edit to `/worker` logic.

---

## Prompt Discipline
When prompting Cursor:
- Always specify which directory the file should live in.  
- Reference this doc so Cursor uses the existing structure.  
- Never allow Cursor to invent new services or rename directories.

---

## Example Command References
- **ComfyUI API Call:** `POST http://localhost:8188/api/prompt`  
- **kohya_ss Training:** `python train_network.py --dataset_dir=… --output_dir=…`

---

Cursor’s job is to **implement, not reinvent.**