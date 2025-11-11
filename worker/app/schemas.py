"""
Pydantic schemas for StudioNOVA worker service (Phase 2).

These mirror the TypeScript contracts defined in apps/web/lib/types.ts and
provide a shared language for future request/response validation.
"""

from enum import Enum
from typing import Any, Dict, Optional

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

