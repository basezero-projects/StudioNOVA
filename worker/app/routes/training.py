import logging

from fastapi import APIRouter, HTTPException

from ..schemas import TrainLoraRequest
from ..utils.kohya import KohyaError, launch_kohya_training

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["training"])


@router.post("/train-lora")
def train_lora(payload: TrainLoraRequest):
    logger.info("Received train-lora request", extra={"payload": payload.model_dump()})

    try:
        job = launch_kohya_training(payload)
    except KohyaError as exc:
        logger.exception("kohya_ss training launch failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "job_id": job.job_id,
        "status": job.status,
        "log_path": str(job.log_path),
        "output_dir": str(job.output_dir),
        "output_weight": str(job.output_weight),
        "command": job.command,
    }

