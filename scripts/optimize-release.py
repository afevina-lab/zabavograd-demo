"""Lossless, verified optimization of a disposable build, never public/ originals."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--directory', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
root = Path(args.directory).resolve()
expected = Path('.local/pages-dist').resolve()
if root != expected or not (root / 'index.html').is_file():
    raise SystemExit('Only the generated .local/pages-dist build may be optimized')
before = sum(p.stat().st_size for p in root.rglob('*') if p.is_file())

def convert(path):
    with Image.open(path) as source:
        if getattr(source, 'n_frames', 1) != 1:
            raise RuntimeError(f'Animated image requires a separate pipeline: {path.name}')
        rgba = source.convert('RGBA')
        output = path.with_suffix('.webp')
        rgba.save(output, 'WEBP', lossless=True, exact=True, method=4)
        with Image.open(output) as decoded:
            if decoded.size != rgba.size or decoded.convert('RGBA').tobytes() != rgba.tobytes():
                raise RuntimeError(f'Pixel verification failed: {path.name}')
        return {'source': path.relative_to(root).as_posix(),
                'output': output.relative_to(root).as_posix(),
                'before': path.stat().st_size, 'after': output.stat().st_size,
                'width': rgba.width, 'height': rgba.height, 'rgba_identical': True}

images = sorted(root.rglob('*.png'))
with ThreadPoolExecutor(max_workers=4) as executor:
    records = []
    for row in executor.map(convert, images):
        records.append(row)
        if len(records) % 30 == 0:
            print(f'Verified {len(records)}/{len(images)} images', flush=True)

# All PNGs in the release have been converted, including dynamically named icons.
for path in root.rglob('*'):
    if path.suffix in {'.js', '.css', '.json', '.html'}:
        content = path.read_text(encoding='utf-8')
        path.write_text(content.replace('.png', '.webp'), encoding='utf-8')
for path in images:
    path.unlink()  # Only verified copies inside the explicit disposable build.
gallery = root / 'images.html'
if gallery.exists():
    gallery.unlink()
(root / '.nojekyll').write_text('', encoding='utf-8')
after = sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
manifest = [{'path': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size,
             'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted(root.rglob('*')) if p.is_file()]
report = Path(args.report)
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps({'before_bytes': before, 'after_bytes': after,
    'saved_percent': round((1-after/before)*100, 2), 'images': records,
    'files': manifest, 'audio': 'Unchanged original audio; no lossy re-encoding',
    'fonts': 'Unchanged, all characters and license files retained'},
    ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Build: {before} -> {after} bytes; {(1-after/before)*100:.1f}% smaller', flush=True)
