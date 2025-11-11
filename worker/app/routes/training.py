import logging
from uuid import uuid4

from fastapi import APIRouter

from ..schemas import TrainingJobBase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["training"])


@router.post("/train-lora")
def train_lora(payload: TrainingJobBase):
    job_id = str(uuid4())
    logger.info("Received train-lora request", extra={"job_id": job_id, "payload": payload.model_dump()})
    return {"job_id": job_id, "status": "queued"}

