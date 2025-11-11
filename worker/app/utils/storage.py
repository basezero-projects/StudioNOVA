import os
from typing import Final

DEFAULT_OUTPUT_DIR: Final[str] = "storage/results"


def ensure_output_dir(base_path: str = DEFAULT_OUTPUT_DIR) -> str:
    absolute = os.path.abspath(base_path)
    os.makedirs(absolute, exist_ok=True)
    return absolute

