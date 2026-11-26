"""Read-only bridge for Python tools; never write the modular source directly."""
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read_library():
    if "ZABAVOGRAD_LIBRARY_MODULES" in os.environ:
        result = subprocess.run(
            ["node", str(ROOT / "scripts/library-source.cjs"), "export"],
            cwd=ROOT, check=True, capture_output=True, encoding="utf-8",
        )
        return json.loads(result.stdout)
    return json.loads((ROOT / "outputs/library-v2.json").read_text(encoding="utf-8"))

def require_legacy_write():
    if "ZABAVOGRAD_LIBRARY_MODULES" in os.environ:
        raise RuntimeError("Direct V2 write disabled in modular mode; use a checked candidate")
