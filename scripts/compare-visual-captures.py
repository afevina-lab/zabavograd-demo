"""Compare reproducible captures. Never update the reference automatically."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance

parser = argparse.ArgumentParser()
parser.add_argument('before', type=Path)
parser.add_argument('after', type=Path)
parser.add_argument('report', type=Path)
parser.add_argument('--expected', type=int, default=25)
parser.add_argument('--pixel-tolerance', type=int, default=16)
parser.add_argument('--max-changed-ratio', type=float, default=0.001)
args = parser.parse_args()
args.report.mkdir(parents=True, exist_ok=True)
files = sorted(args.after.glob('*.png'))
if len(files) != args.expected:
    raise SystemExit(f'Expected {args.expected} screenshots, got {len(files)}')
results = []
for candidate in files:
    reference = args.before / candidate.name
    if not reference.is_file():
        raise SystemExit(f'Missing immutable reference: {reference.name}')
    before = Image.open(reference).convert('RGB')
    after = Image.open(candidate).convert('RGB')
    if before.size != after.size:
        results.append({'file': candidate.name, 'passed': False, 'reason': 'Different dimensions'})
        continue
    delta = ImageChops.difference(before, after)
    channels = delta.split()
    greatest = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    mask = greatest.point(lambda v: 255 if v > args.pixel_tolerance else 0)
    changed = mask.histogram()[255]
    ratio = changed / (before.width * before.height)
    passed = ratio <= args.max_changed_ratio
    results.append({'file': candidate.name, 'passed': passed, 'exactMatch': delta.getbbox() is None, 'maxChannelDifference': greatest.getextrema()[1], 'changedPixels': changed, 'changedRatio': ratio})
    if not passed:
        before.save(args.report / ('before-' + candidate.name))
        after.save(args.report / ('after-' + candidate.name))
        highlighted = ImageEnhance.Brightness(before).enhance(0.35)
        highlighted.paste(Image.new('RGB', before.size, '#ff315a'), mask=mask)
        highlighted.save(args.report / ('diff-' + candidate.name))
(args.report / 'comparison.json').write_text(json.dumps({'pixelTolerance': args.pixel_tolerance, 'maxChangedRatio': args.max_changed_ratio, 'results': results}, indent=2), encoding='utf-8')
failed = [r for r in results if not r['passed']]
print(json.dumps({'screenshots': len(results), 'failed': len(failed), 'exactMatches': sum(r.get('exactMatch', False) for r in results), 'largestChangedRatio': max(r.get('changedRatio', 1) for r in results)}))
if failed:
    raise SystemExit('Visual differences need review; reference was not changed')
