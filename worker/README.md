# StudioNOVA Worker (v0.01)

To run locally:

```bash
cd worker
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Environment variables:

- `COMFYUI_API_URL` – base URL of the ComfyUI REST API (default `http://localhost:8188`).
- `COMFYUI_WORKFLOW_PATH` – path to a JSON workflow template for text/image generation. The template must contain placeholders such as `{{prompt}}`, `{{negative_prompt}}`, etc.
- `COMFYUI_UPSCALE_WORKFLOW_PATH` – path to a JSON workflow template for upscaling jobs (placeholders like `{{image_path}}`, `{{model_name}}`).
- `OUTPUT_DIR` – directory where generated assets are stored (default `storage/results`).
- Optional tuning: `COMFYUI_POLL_INTERVAL`, `COMFYUI_POLL_TIMEOUT`.

