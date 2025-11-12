import logging
from typing import Final, Tuple

from fastapi import APIRouter, HTTPException

from ..schemas import TrainLoraRequest
from ..utils.kohya import (
    DEFAULT_BASE_MODEL,
    KOHYA_ROOT,
    KohyaError,
    launch_kohya_training,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["training"])

CONFIG_ERROR_HINTS: Final = (
    "base model not found",
    "no base model specified",
    "kohya_path directory not found",
)
RUNTIME_ERROR_HINTS: Final = ("failed to start kohya_ss",)
DATASET_ERROR_HINTS: Final = ("dataset path does not exist",)
SUCCESS_MESSAGE: Final = "Mock LoRA training job queued for model."


def _resolve_error(message: str) -> Tuple[int, str]:
    lowered = message.lower()

    if any(hint in lowered for hint in DATASET_ERROR_HINTS):
        return 400, message

    if any(hint in lowered for hint in CONFIG_ERROR_HINTS):
        return 400, "Kohya_ss not configured. Update settings before training."

    if any(hint in lowered for hint in RUNTIME_ERROR_HINTS):
        return 502, "Failed to launch training process."

    return 400, message


def _sanitized_request(payload: TrainLoraRequest) -> TrainLoraRequest:
    trimmed_dataset = payload.dataset_path.strip()
    if not trimmed_dataset:
        raise HTTPException(status_code=400, detail="Dataset path is required.")

    return payload.model_copy(update={"dataset_path": trimmed_dataset})


@router.post("/train-lora")
def train_lora(payload: TrainLoraRequest):
    logger.info("Received train-lora request", extra={"payload": payload.model_dump()})

    request_data = _sanitized_request(payload)

    base_model_reference = request_data.base_model or DEFAULT_BASE_MODEL

    if not KOHYA_ROOT.exists() or not base_model_reference:
        raise HTTPException(
            status_code=400,
            detail="Kohya_ss not configured. Update settings before training.",
        )

    try:
        job = launch_kohya_training(request_data)
    except KohyaError as exc:
        message = str(exc)
        status_code, detail = _resolve_error(message)
        logger.exception(
            "kohya_ss training launch failed",
            extra={"model_id": request_data.model_id},
        )
        raise HTTPException(status_code=status_code, detail=detail) from exc

    logger.info(
        "Queued kohya_ss training job",
        extra={"job_id": job.job_id, "model_id": request_data.model_id},
    )

    return {
        "job_id": job.job_id,
        "status": "queued",
        "message": SUCCESS_MESSAGE,
        "log_path": str(job.log_path),
        "output_dir": str(job.output_dir),
        "output_weight": str(job.output_weight),
        "command": " ".join(job.command),
        "model_id": request_data.model_id,
        "dataset_path": request_data.dataset_path,
    }

