import logging

from fastapi import APIRouter, HTTPException

from ..schemas import GenerationRequest
from ..utils.comfy import ComfyUIError, generate_image_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generation"])


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

