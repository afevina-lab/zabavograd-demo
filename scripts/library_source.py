"""Read-only bridge for Python tools; the canonical source is always modular."""
import json
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read_snapshot():
    result = subprocess.run(
        ["node", str(ROOT / "scripts/library-source.cjs"), "export"],
        cwd=ROOT, check=True, capture_output=True,
    )
    raw = result.stdout
    return json.loads(raw), {
        "path": "generated V2 from modules",
        "sha256": hashlib.sha256(raw).hexdigest(),
        "canonical_blob_sha": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(),
    }

def read_library():
    return read_snapshot()[0]
