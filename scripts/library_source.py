"""Read-only bridge for Python tools; never write the modular source directly."""
import json
import hashlib
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read_snapshot():
    if "ZABAVOGRAD_LIBRARY_MODULES" in os.environ:
        result = subprocess.run(
            ["node", str(ROOT / "scripts/library-source.cjs"), "export"],
            cwd=ROOT, check=True, capture_output=True, encoding="utf-8",
        )
        raw = result.stdout.encode("utf-8")
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
    if "ZABAVOGRAD_LIBRARY_MODULES" in os.environ:
        raise RuntimeError("Direct V2 write disabled in modular mode; use a checked candidate")
