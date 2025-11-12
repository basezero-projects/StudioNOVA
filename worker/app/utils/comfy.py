import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import requests
from requests import Response

from .storage import DEFAULT_OUTPUT_DIR, ensure_output_dir

logger = logging.getLogger(__name__)


class ComfyUIError(RuntimeError):
    """Raised when communication with ComfyUI fails."""


COMFYUI_API_URL = os.getenv("COMFYUI_API_URL", "http://localhost:8188").rstrip("/")
COMFYUI_POLL_INTERVAL = float(os.getenv("COMFYUI_POLL_INTERVAL", "2.0"))
COMFYUI_POLL_TIMEOUT = float(os.getenv("COMFYUI_POLL_TIMEOUT", "180"))
COMFYUI_BASE_MODEL = os.getenv("COMFYUI_BASE_MODEL", "sd_xl_base_1.0.safetensors")
OUTPUT_DIR = Path(
    ensure_output_dir(os.getenv("OUTPUT_DIR", DEFAULT_OUTPUT_DIR))
)

GENERATION_WORKFLOW_PATH = os.getenv("COMFYUI_WORKFLOW_PATH")
UPSCALE_WORKFLOW_PATH = os.getenv("COMFYUI_UPSCALE_WORKFLOW_PATH")


@dataclass
class ComfyResult:
    prompt_id: str
    status: str
    image_path: Path
    history: Dict[str, Any]


def _load_workflow(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        raise ComfyUIError(
            "ComfyUI workflow template not configured. "
            "Set COMFYUI_WORKFLOW_PATH (for generation) or COMFYUI_UPSCALE_WORKFLOW_PATH."
        )

    template_path = Path(path)
    if not template_path.exists():
        raise ComfyUIError(f"Workflow template file not found: {template_path}")

    try:
        with template_path.open("r", encoding="utf-8") as fp:
            return json.load(fp)
    except json.JSONDecodeError as exc:
        raise ComfyUIError(f"Invalid JSON in workflow template: {template_path}") from exc


def _replace_placeholders(data: Any, replacements: Dict[str, Any]) -> Any:
    if isinstance(data, dict):
        return {key: _replace_placeholders(value, replacements) for key, value in data.items()}
    if isinstance(data, list):
        return [_replace_placeholders(item, replacements) for item in data]
    if isinstance(data, str):
        result = data
        for key, value in replacements.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in result:
                replacement = "" if value is None else str(value)
                result = result.replace(placeholder, replacement)
        return result
    return data


def _submit_workflow(workflow: Dict[str, Any]) -> str:
    client_id = str(uuid4())
    url = f"{COMFYUI_API_URL}/api/prompt"

    response = requests.post(
        url,
        json={"prompt": workflow, "client_id": client_id},
        timeout=30,
    )
    _raise_for_status(response, "submit workflow")

    payload = response.json()
    prompt_id = payload.get("prompt_id") or payload.get("id")
    if not prompt_id:
        raise ComfyUIError("ComfyUI did not return a prompt_id.")
    return prompt_id


def _poll_history(prompt_id: str) -> Dict[str, Any]:
    url = f"{COMFYUI_API_URL}/api/history/{prompt_id}"
    deadline = time.time() + COMFYUI_POLL_TIMEOUT

    while True:
        response = requests.get(url, timeout=30)
        _raise_for_status(response, "poll workflow history")
        history = response.json()

        prompt_history = history.get(prompt_id)
        if prompt_history is None:
            # History key sometimes omitted until processing starts.
            if time.time() > deadline:
                raise ComfyUIError("ComfyUI did not provide history for this prompt.")
        else:
            status = prompt_history.get("status", {})
            if status.get("status") == "completed":
                return prompt_history
            if status.get("status") == "error":
                raise ComfyUIError(status.get("error", "ComfyUI reported an error."))

        if time.time() > deadline:
            raise ComfyUIError("Timed out waiting for ComfyUI to complete the workflow.")

        time.sleep(COMFYUI_POLL_INTERVAL)


def _find_image(history: Dict[str, Any]) -> Dict[str, Any]:
    outputs: Dict[str, Any] = history.get("outputs", {})

    for node_output in outputs.values():
        images = node_output.get("images")
        if not images:
            continue
        # Return the first image descriptor.
        return images[0]

    raise ComfyUIError("No images were returned by the workflow.")


def _download_image(image_meta: Dict[str, Any]) -> Path:
    filename = image_meta.get("filename")
    subfolder = image_meta.get("subfolder", "")
    image_type = image_meta.get("type", "output")

    if not filename:
        raise ComfyUIError("Image metadata missing filename.")

    params = {
        "filename": filename,
        "subfolder": subfolder,
        "type": image_type,
    }
    url = f"{COMFYUI_API_URL}/view"

    response = requests.get(url, params=params, timeout=30)
    _raise_for_status(response, "download generated image")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_DIR / f"{int(time.time())}_{filename}"
    destination.write_bytes(response.content)
    return destination


def _raise_for_status(response: Response, context: str) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        detail = response.text
        raise ComfyUIError(f"Failed to {context}: {detail}") from exc


def generate_image_workflow(
    prompt: str,
    negative_prompt: str = "",
    *,
    lora_path: Optional[str] = None,
    cfg_scale: float = 7.0,
    steps: int = 30,
    seed: Optional[int] = None,
    sampler: str = "euler",
    scheduler: str = "normal",
    width: int = 1024,
    height: int = 1024,
    base_model: Optional[str] = None,
) -> ComfyResult:
    workflow = _load_workflow(GENERATION_WORKFLOW_PATH)

    base_model_value = base_model or COMFYUI_BASE_MODEL
    if not base_model_value:
        raise ComfyUIError(
            "COMFYUI_BASE_MODEL is not configured. Update your worker environment to point to a valid checkpoint filename."
        )

    replacements = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "lora_path": lora_path or "",
        "cfg_scale": cfg_scale,
        "steps": steps,
        "seed": seed or int(time.time()),
        "sampler": sampler,
        "scheduler": scheduler,
        "width": width,
        "height": height,
        "base_model": base_model_value,
    }

    prepared_workflow = _replace_placeholders(workflow, replacements)

    prompt_id = _submit_workflow(prepared_workflow)
    logger.info("Submitted ComfyUI generation prompt %s", prompt_id)

    history = _poll_history(prompt_id)
    image_meta = _find_image(history)
    output_path = _download_image(image_meta)

    logger.info("Saved generated image to %s", output_path)
    return ComfyResult(
        prompt_id=prompt_id,
        status="completed",
        image_path=output_path,
        history=history,
    )


def upscale_image_workflow(
    image_path: str,
    *,
    model_name: str = "4x-UltraSharp.pth",
    tile_size: int = 0,
    upscale_factor: float = 2.0,
) -> ComfyResult:
    workflow = _load_workflow(UPSCALE_WORKFLOW_PATH)

    replacements = {
        "image_path": image_path,
        "model_name": model_name,
        "tile_size": tile_size,
        "upscale_factor": upscale_factor,
    }

    prepared_workflow = _replace_placeholders(workflow, replacements)

    prompt_id = _submit_workflow(prepared_workflow)
    logger.info("Submitted ComfyUI upscale prompt %s", prompt_id)

    history = _poll_history(prompt_id)
    image_meta = _find_image(history)
    output_path = _download_image(image_meta)

    logger.info("Saved upscaled image to %s", output_path)
    return ComfyResult(
        prompt_id=prompt_id,
        status="completed",
        image_path=output_path,
        history=history,
    )

