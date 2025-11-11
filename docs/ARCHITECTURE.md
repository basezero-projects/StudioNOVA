# StudioNOVA · System Architecture (v0.01)
**Prepared by:** Wesley Cummins  
**Date:** November 11, 2025  
**Status:** Stable project root  
**Scope:** Defines the core structure, integration points, and workflow between StudioNOVA’s internal app layers and its external engines.

---

## 1. Overview
StudioNOVA is a local-first AI character creation and content engine that enables:
- **Image / Video Generation** via `ComfyUI`
- **LoRA Training** via `kohya_ss`
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

yaml
Copy code

---

## 3. Data Flow

1. **Frontend (Next.js)**  
   - User creates or selects a character.  
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