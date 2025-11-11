import logging
from uuid import uuid4

from fastapi import APIRouter

from ..schemas import GenerationJobBase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["generation"])


@router.post("/generate-image")
def generate_image(payload: GenerationJobBase):
    job_id = str(uuid4())
    logger.info("Received generate-image request", extra={"job_id": job_id, "payload": payload.model_dump()})
    return {"job_id": job_id, "status": "queued"}

