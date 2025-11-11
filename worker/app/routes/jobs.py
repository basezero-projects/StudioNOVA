import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["jobs"])


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    logger.info("Job status requested", extra={"job_id": job_id})
    return {"job_id": job_id, "status": "mocked"}

