#!/usr/bin/env python3
"""Create a high resolution, seamlessly scaled paper background for the neutral theme.
Generated from reproducible pigment/noise fields rather than upscaling the old 1199px picture.
The UI has no animated zoom and the central region stays quiet behind cards.
"""
from pathlib import Path
import numpy as np
from PIL import Image

W, H = 2560, 1440
rng = np.random.default_rng(20261111)

def noise(width, height, strength=1.0):
    ar = rng.uniform(-1, 1, (height, width)).astype(np.float32)
    return np.asarray(Image.fromarray(ar, mode="F").resize((W, H), Image.Resampling.BICUBIC), dtype=np.float32) * strength

x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
xx = x + np.zeros((H, 1), np.float32)
yy = y + np.zeros((1, W), np.float32)
base = np.array([247.5, 244., 235.], np.float32)

blue1 = np.exp(-(((xx - .04) / .37)**2 + ((yy - .06) / .39)**2) * 1.7)
blue2 = np.exp(-(((xx - .96) / .39)**2 + ((yy - .99) / .33)**2) * 1.7)
warm1 = np.exp(-(((xx - 1.01) / .42)**2 + ((yy - .05) / .34)**2) * 1.6)
warm2 = np.exp(-(((xx - .01) / .35)**2 + ((yy - .93) / .38)**2) * 1.7)

large = noise(7, 4) + noise(19, 11, .50)
medium = noise(62, 35, .45) + noise(133, 75, .16)
fine = noise(420, 235, .24)
composite = large * .7 + medium * .4
blue_factor = np.clip((blue1 + blue2) * (.75 + composite * .13), 0, 1.1)
warm_factor = np.clip((warm1 + warm2) * (.8 + composite * .17), 0, 1.1)

paper = np.empty((H, W, 3), np.float32)
blue_rgb = np.array([-16, -6, 1], np.float32)
warm_rgb = np.array([6, 1, -10], np.float32)
ripple = noise(14, 8) * 2.4 + noise(44, 25) * 1.5 + noise(170, 95) * 1.2 + fine * 2
fibers = noise(900, 510) * 1.65
grain = rng.normal(0, .95, (H, W)).astype(np.float32)
texture = ripple + fibers + grain
for channel, strength in enumerate((.85, .92, 1.0)):
    paper[:, :, channel] = base[channel] + blue_factor * blue_rgb[channel] + warm_factor * warm_rgb[channel] + texture * strength

image = Image.fromarray(np.clip(paper, 0, 255).astype(np.uint8), "RGB")
out = Path(__file__).resolve().parents[1] / "assets" / "neutral" / "background-paper-2560.webp"
out.parent.mkdir(parents=True, exist_ok=True)
image.save(out, "WEBP", quality=91, method=6)
assert Image.open(out).size == (2560, 1440)
print(f"Created {out} ({out.stat().st_size} bytes, 2560x1440)")
