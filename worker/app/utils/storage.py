import os
from typing import Final

DEFAULT_OUTPUT_DIR: Final[str] = "storage/results"


def ensure_output_dir(base_path: str = DEFAULT_OUTPUT_DIR) -> str:
    os.makedirs(base_path, exist_ok=True)
    return base_path

