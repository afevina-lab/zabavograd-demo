"""Read-only bridge for Python tools; never write the modular source directly."""
import json
import hashlib
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def _modular_requested():
    return ("ZABAVOGRAD_LIBRARY_MODULES" in os.environ
            or (ROOT / "editorial/library-source-mode.json").exists()
            or (ROOT / "outputs/library-modules").exists())

def read_snapshot():
    if _modular_requested():
        result = subprocess.run(
            ["node", str(ROOT / "scripts/library-source.cjs"), "export"],
            cwd=ROOT, check=True, capture_output=True,
        )
        raw = result.stdout
        source = "generated V2 from modules"
    else:
        raw = (ROOT / "outputs/library-v2.json").read_bytes()
        source = "outputs/library-v2.json"
    return json.loads(raw), {
        "path": source,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "canonical_blob_sha": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(),
    }

def read_library():
    return read_snapshot()[0]

def require_legacy_write():
    if _modular_requested():
        raise RuntimeError("Direct V2 write disabled in modular mode; use a checked candidate")
