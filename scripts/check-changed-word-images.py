"""Verify changed word illustrations; deleted paths are checked by the library validator."""
import json
import sys
from pathlib import Path
from PIL import Image

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for raw in plan["wordImages"]:
    path = Path(raw)
    if not path.is_file():
        continue
    with Image.open(path) as image:
        assert image.format == "WEBP", f"Not WebP: {path}"
        assert getattr(image, "n_frames", 1) == 1, f"Animated word illustration: {path}"
        assert 0 < image.width <= 2048 and 0 < image.height <= 2048, f"Invalid dimensions: {path}"
        image.load()
        lo, hi = image.convert("RGBA").getchannel("A").getextrema()
        assert lo < 255 and hi > 0, f"Missing transparency or visible content: {path}"
print("Changed word illustrations verified")
