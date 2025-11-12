# ComfyUI Workflow Templates

Place exported ComfyUI JSON workflows in this directory and point the worker's environment variables at them.

- generation.json: Lightweight workflow for preview renders. Export from ComfyUI after confirming it runs end-to-end.
- upscale.json: Optional upscale flow if you plan to enable higher-resolution previews.

Keep paths relative to the worker directory; the default .env uses workflows/generation.json and workflows/upscale.json.

If the worker cannot load these files or ComfyUI returns an error, StudioNOVA falls back to mock preview images and the UI will surface the warning.
