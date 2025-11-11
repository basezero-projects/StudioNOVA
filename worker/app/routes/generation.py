import base64
import logging
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..schemas import ComfyPreviewRequest, GenerationRequest
from ..utils.comfy import ComfyUIError, generate_image_workflow
from ..utils.storage import ensure_output_dir

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generation"])

PREVIEW_PLACEHOLDER = (
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAJ0lEQVR4nO3BMQEAAADCoPdPbQ43oAAAAAAAAAAA"
    "AACwOgGFAAGX4UBQAAAAAASUVORK5CYII="
)


def _preview_directory() -> Path:
    base = ensure_output_dir(os.getenv("OUTPUT_DIR", "storage/results"))
    directory = Path(base) / "previews"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _write_preview_image(destination: Path) -> None:
    destination.write_bytes(base64.b64decode(PREVIEW_PLACEHOLDER))


@router.post("/generate-image")
def generate_image(payload: GenerationRequest):
    logger.info("Received generate-image request", extra={"payload": payload.model_dump()})

    try:
        result = generate_image_workflow(
            prompt=payload.prompt,
            negative_prompt=payload.negative_prompt or "",
            lora_path=payload.lora_path,
            cfg_scale=payload.cfg_scale,
            steps=payload.steps,
            seed=payload.seed,
            sampler=payload.sampler,
            scheduler=payload.scheduler,
            width=payload.width,
            height=payload.height,
            base_model=payload.base_model,
        )
    except ComfyUIError as exc:
        logger.exception("ComfyUI generation failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "job_id": result.prompt_id,
        "status": result.status,
        "image_path": str(result.image_path),
        "history": result.history,
    }


@router.post("/generate/comfy")
def generate_comfy_preview(payload: ComfyPreviewRequest):
    logger.info(
        "Received comfy preview request",
        extra={"character_id": payload.character_id, "prompt": payload.prompt},
    )

    preview_dir = _preview_directory()
    preview_id = uuid4().hex
    image_path: Path | None = None
    is_mock = True

    if os.getenv("COMFYUI_API_URL"):
        try:
            result = generate_image_workflow(
                prompt=payload.prompt,
                negative_prompt=payload.negative_prompt or "",
                lora_path=None,
                cfg_scale=payload.cfg_scale,
                steps=payload.steps,
                seed=payload.seed,
                sampler="euler",
                scheduler="normal",
                width=512,
                height=512,
                base_model=None,
            )
            image_path = Path(result.image_path)
            is_mock = False
        except ComfyUIError:
            logger.warning(
                "ComfyUI preview generation failed; falling back to mock image",
                exc_info=True,
            )

    if image_path is None:
        image_path = preview_dir / f"{preview_id}.png"
        try:
            _write_preview_image(image_path)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Failed to write preview placeholder")
            raise HTTPException(status_code=500, detail="Failed to create preview image.") from exc

    return {
        "previews": [
            {
                "id": preview_id,
                "image_path": str(image_path),
                "character_id": payload.character_id,
                "is_mock": is_mock,
                "metadata": {
                    "prompt": payload.prompt,
                    "negative_prompt": payload.negative_prompt,
                    "steps": payload.steps,
                    "cfg_scale": payload.cfg_scale,
                    "seed": payload.seed,
                },
            }
        ]
    }
