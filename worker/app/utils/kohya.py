import logging
import os
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, IO, List, Optional
from uuid import uuid4

from ..schemas import TrainLoraRequest
from .storage import ensure_output_dir

logger = logging.getLogger(__name__)


class KohyaError(RuntimeError):
    """Raised when kohya_ss training fails or is misconfigured."""


KOHYA_ROOT = Path(os.getenv("KOHYA_PATH", "external/kohya_ss")).resolve()
PYTHON_EXECUTABLE = os.getenv("KOHYA_PYTHON") or sys.executable or "python"
DEFAULT_OUTPUT_ROOT = Path(
    ensure_output_dir(os.getenv("KOHYA_OUTPUT_DIR", "storage/lora"))
)
DEFAULT_DATASET_ROOT = os.getenv("KOHYA_DATASET_ROOT")
DEFAULT_BASE_MODEL = os.getenv("KOHYA_BASE_MODEL")


@dataclass
class KohyaJob:
    job_id: str
    command: List[str]
    process: subprocess.Popen
    log_path: Path
    log_handle: Optional[IO[str]] = field(default=None, repr=False)
    output_dir: Path
    output_weight: Path
    status: str = "running"
    created_at: float = field(default_factory=time.time)


_jobs: Dict[str, KohyaJob] = {}
_jobs_lock = threading.Lock()


def _resolve_dataset_path(dataset_path: str) -> Path:
    path = Path(dataset_path).expanduser()
    if not path.is_absolute() and DEFAULT_DATASET_ROOT:
        path = Path(DEFAULT_DATASET_ROOT).expanduser() / path
    path = path.resolve()
    if not path.exists():
        raise KohyaError(f"Dataset path does not exist: {path}")
    return path


def _resolve_output_dir(character_id: str, output_dir: Optional[str]) -> Path:
    if output_dir:
        directory = Path(output_dir).expanduser()
    else:
        directory = DEFAULT_OUTPUT_ROOT / character_id
    return Path(ensure_output_dir(str(directory)))


def _resolve_base_model(requested: Optional[str]) -> str:
    model = requested or DEFAULT_BASE_MODEL
    if not model:
        raise KohyaError(
            "No base model specified. Provide baseModel in the request or set KOHYA_BASE_MODEL."
        )
    model_path = Path(model).expanduser()
    if not model_path.is_absolute():
        model_path = (KOHYA_ROOT / model_path).resolve()
    if not model_path.exists():
        raise KohyaError(f"Base model not found: {model_path}")
    return str(model_path)


def _watch_job(job: KohyaJob) -> None:
    logger.info("Monitoring kohya_ss job %s", job.job_id)
    return_code = job.process.wait()
    if job.log_handle:
        try:
            job.log_handle.close()
        except Exception:  # pragma: no cover - best effort
            logger.debug("Failed to close log file for job %s", job.job_id, exc_info=True)
        job.log_handle = None
    job.status = "completed" if return_code == 0 else "failed"
    logger.info(
        "kohya_ss job %s finished with code %s",
        job.job_id,
        return_code,
    )


def launch_kohya_training(request: TrainLoraRequest) -> KohyaJob:
    if not KOHYA_ROOT.exists():
        raise KohyaError(f"KOHYA_PATH directory not found: {KOHYA_ROOT}")

    dataset_path = _resolve_dataset_path(request.dataset_path)
    output_dir = _resolve_output_dir(request.character_id, request.output_dir)
    output_name = request.output_name or request.character_id
    output_weight = output_dir / f"{output_name}.safetensors"
    log_path = output_dir / f"train_{output_name}_{int(time.time())}.log"

    base_model = _resolve_base_model(request.base_model)

    network_dim = request.network_dim or 16
    max_train_steps = request.max_train_steps or 300
    learning_rate = request.learning_rate or 1e-4

    command: List[str] = [
        PYTHON_EXECUTABLE,
        "train_network.py",
        f"--pretrained_model_name_or_path={base_model}",
        f"--train_data_dir={dataset_path}",
        f"--output_dir={output_dir}",
        f"--output_name={output_name}",
        f"--max_train_steps={max_train_steps}",
        f"--network_dim={network_dim}",
        f"--learning_rate={learning_rate}",
        "--optimizer_type=adamw8bit",
        "--enable_bucket",
        "--save_model_as=safetensors",
    ]

    additional_args = request.additional_args or []
    command.extend(additional_args)

    logger.info("Launching kohya_ss with command: %s", " ".join(command))

    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_file = open(log_path, "w", encoding="utf-8")

    try:
        process = subprocess.Popen(
            command,
            cwd=KOHYA_ROOT,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError as exc:
        log_file.close()
        raise KohyaError(
            "Failed to start kohya_ss. Ensure dependencies are installed."
        ) from exc

    job_id = str(uuid4())
    job = KohyaJob(
        job_id=job_id,
        command=command,
        process=process,
        log_path=log_path,
        log_handle=log_file,
        output_dir=output_dir,
        output_weight=output_weight,
    )

    with _jobs_lock:
        _jobs[job_id] = job

    watcher = threading.Thread(target=_watch_job, args=(job,), daemon=True)
    watcher.start()

    return job


def get_kohya_job(job_id: str) -> Optional[KohyaJob]:
    with _jobs_lock:
        return _jobs.get(job_id)


