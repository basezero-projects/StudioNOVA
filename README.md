## StudioNOVA Monorepo

### Getting Started

1. Install dependencies:
   - `npm install`
   - `cd worker && pip install -r requirements.txt`

2. Environment:
   - Copy `.env.example` to `.env` and adjust values as needed.

3. Run services:
   - Frontend: from repo root run `npm run dev`
   - Backend: from `worker` run `uvicorn app.main:app --reload --port 8000`

