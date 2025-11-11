"""
Pydantic schemas for StudioNOVA worker service (Phase 2).

These mirror the TypeScript contracts defined in apps/web/lib/types.ts and
provide a shared language for future request/response validation.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"


class UserBase(BaseModel):
    id: str
    email: str
    created_at: str


class CharacterBase(BaseModel):
    id: str
    user_id: str
    name: str
    token: str
    description: Optional[str] = None
    lora_path: Optional[str] = None
    created_at: str
    updated_at: str


class TrainingJobBase(BaseModel):
    id: str
    user_id: str
    character_id: str
    status: JobStatus
    dataset_path: Optional[str] = None
    lora_output_path: Optional[str] = None
    log_path: Optional[str] = None
    created_at: str
    updated_at: str


class GenerationJobBase(BaseModel):
    id: str
    user_id: str
    character_id: str
    type: GenerationType
    prompt: str
    negative_prompt: Optional[str] = None
    settings_json: Dict[str, Any]
    status: JobStatus
    asset_id: Optional[str] = None
    created_at: str
    updated_at: str


class AssetBase(BaseModel):
    id: str
    user_id: str
    character_id: str
    type: GenerationType
    file_path: str
    width: Optional[int] = None
    height: Optional[int] = None
    is_upscaled: bool = False
    created_at: str


class GenerationRequest(BaseModel):
    character_id: str
    prompt: str
    negative_prompt: Optional[str] = ""
    lora_path: Optional[str] = None
    cfg_scale: float = 7.0
    steps: int = 30
    seed: Optional[int] = None
    sampler: str = "euler"
    scheduler: str = "normal"
    width: int = 1024
    height: int = 1024
    base_model: Optional[str] = None
    metadata: Dict[str, Any] | None = None


class UpscaleRequest(BaseModel):
    asset_id: Optional[str] = None
    image_path: str
    model_name: str = "4x-UltraSharp.pth"
    tile_size: int = 0
    upscale_factor: float = 2.0


class TrainLoraRequest(BaseModel):
    character_id: str
    dataset_path: str
    base_model: Optional[str] = None
    output_dir: Optional[str] = None
    output_name: Optional[str] = None
    network_dim: Optional[int] = 16
    max_train_steps: Optional[int] = 300
    learning_rate: Optional[float] = 1e-4
    additional_args: Optional[List[str]] = None


class ComfyPreviewRequest(BaseModel):
    character_id: str
    prompt: str
    negative_prompt: Optional[str] = ""
    steps: int = 20
    cfg_scale: float = 7.0
    seed: Optional[int] = None

