import logging

from fastapi import APIRouter, HTTPException

from ..schemas import UpscaleRequest
from ..utils.comfy import ComfyUIError, upscale_image_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upscale"])


@router.post("/upscale")
def upscale_asset(payload: UpscaleRequest):
    logger.info("Received upscale request", extra={"payload": payload.model_dump()})

    try:
        result = upscale_image_workflow(
            image_path=payload.image_path,
            model_name=payload.model_name,
            tile_size=payload.tile_size,
            upscale_factor=payload.upscale_factor,
        )
    except ComfyUIError as exc:
        logger.exception("ComfyUI upscale failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "job_id": result.prompt_id,
        "status": result.status,
        "image_path": str(result.image_path),
        "history": result.history,
    }

