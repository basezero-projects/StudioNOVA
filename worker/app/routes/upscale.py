import logging
from uuid import uuid4

from fastapi import APIRouter

from ..schemas import AssetBase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upscale"])


@router.post("/upscale")
def upscale_asset(payload: AssetBase):
    job_id = str(uuid4())
    logger.info("Received upscale request", extra={"job_id": job_id, "payload": payload.model_dump()})
    return {"job_id": job_id, "status": "queued"}

