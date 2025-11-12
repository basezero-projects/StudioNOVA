import base64
import os
import shutil
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.storage import ensure_output_dir

router = APIRouter(prefix="/api", tags=["datasets"])

DATASET_ROOT_ENV_KEYS = ("KOHYA_DATASET_ROOT", "DATASET_ROOT")
PLACEHOLDER_IMAGE = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMA"
    "ASsJTYQAAAAASUVORK5CYII="
)


def _dataset_root() -> Path:
    for key in DATASET_ROOT_ENV_KEYS:
        value = os.getenv(key)
        if value:
            return Path(value).expanduser()
    return Path("datasets").expanduser()


def _ensure_dataset_dir(dataset_path: str) -> Path:
    root = _dataset_root().resolve()
    ensure_output_dir(str(root))

    if dataset_path:
        target = Path(dataset_path).expanduser().resolve()
    else:
        target = root

    try:
        target.relative_to(root)
    except ValueError as exc:  # pragma: no cover - safety guard
        raise HTTPException(
            status_code=400, detail="Dataset path must be inside the configured dataset root."
        ) from exc

    target.mkdir(parents=True, exist_ok=True)
    return target


def _write_placeholder_image(destination: Path) -> None:
    destination.write_bytes(base64.b64decode(PLACEHOLDER_IMAGE))


def _copy_or_create_image(image_path: str | None, destination: Path) -> None:
    if image_path:
        source = Path(image_path).expanduser()
        if source.exists() and source.is_file():
            shutil.copyfile(str(source), str(destination))
            return
    _write_placeholder_image(destination)


def _count_dataset_items(directory: Path) -> int:
    return sum(1 for item in directory.iterdir() if item.is_file())


class DatasetAddRequest(BaseModel):
    model_id: str
    dataset_path: str
    image_path: str | None = None
    image_data: str | None = None
    source: Literal["comfyui", "manual", "other"] | None = None


@router.get("/datasets")
def list_datasets():
    root = _dataset_root()
    if not root.exists() or not root.is_dir():
        return {"root": str(root), "folders": []}

    folders = []
    for path in sorted(root.iterdir()):
        if path.is_dir():
            folders.append({"name": path.name, "count": _count_dataset_items(path)})
    return {"root": str(root), "folders": folders}


@router.post("/models/{model_id}/dataset/add")
def add_dataset_image(model_id: str, body: DatasetAddRequest):
    if body.model_id and body.model_id != model_id:
        raise HTTPException(status_code=400, detail="model_id mismatch.")

    dataset_dir = _ensure_dataset_dir(body.dataset_path or "")

    filename = f"{model_id}-{uuid4().hex}.png"
    destination = dataset_dir / filename

    if body.image_data:
        try:
            destination.write_bytes(base64.b64decode(body.image_data))
        except (ValueError, base64.binascii.Error) as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.") from exc
    else:
        _copy_or_create_image(body.image_path, destination)

    count = _count_dataset_items(dataset_dir)

    return {
        "status": "saved",
        "dataset_path": str(dataset_dir),
        "file_name": filename,
        "count": count,
    }

