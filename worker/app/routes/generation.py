import logging
import os
from pathlib import Path
import struct
import zlib
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..schemas import ComfyPreviewRequest, GenerationRequest
from ..utils.comfy import ComfyUIError, generate_image_workflow
from ..utils.storage import ensure_output_dir

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generation"])

def _preview_directory() -> Path:
    base = ensure_output_dir(os.getenv("OUTPUT_DIR", "storage/results"))
    directory = Path(base) / "previews"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _write_preview_image(destination: Path, prompt: str) -> None:
    width = 512
    height = 512
    seed = abs(hash(prompt)) % 0xFFFFFF
    base_r = 50 + (seed & 0x7F)
    base_g = 80 + ((seed >> 7) & 0x7F)
    base_b = 110 + ((seed >> 14) & 0x7F)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            r = (base_r + (x * 5 // width)) % 256
            g = (base_g + (y * 5 // height)) % 256
            b = (base_b + ((x + y) * 3 // (width + height))) % 256
            raw.extend((r, g, b))

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), level=6)
    png_data = b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", idat) + _png_chunk(b"IEND", b"")
    destination.write_bytes(png_data)


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
        extra={"model_id": payload.model_id, "prompt": payload.prompt},
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
            _write_preview_image(image_path, payload.prompt)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Failed to write preview placeholder")
            raise HTTPException(status_code=500, detail="Failed to create preview image.") from exc

    return {
        "previews": [
            {
                "id": preview_id,
                "image_path": str(image_path),
                "model_id": payload.model_id,
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
