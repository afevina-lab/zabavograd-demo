import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'compare-visual-captures.py'

class VisualComparisonTests(unittest.TestCase):
    def run_comparison(self, changed=None, dimensions=(10, 10), reference=True):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, after, report = root / 'before', root / 'after', root / 'report'
            before.mkdir()
            after.mkdir()
            if reference:
                Image.new('RGB', (10, 10), (100, 100, 100)).save(before / 'screen.png')
            candidate = Image.new('RGB', dimensions, (100, 100, 100))
            if changed:
                candidate.putpixel((0, 0), changed)
            candidate.save(after / 'screen.png')
            result = subprocess.run([sys.executable, str(SCRIPT), str(before), str(after), str(report), '--expected', '1'], capture_output=True, text=True)
            data = json.loads((report / 'comparison.json').read_text()) if (report / 'comparison.json').exists() else None
            return result, data

    def test_identical_images_pass(self):
        result, data = self.run_comparison()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(data['results'][0]['changedPixels'], 0)

    def test_small_channel_noise_is_tolerated(self):
        result, _ = self.run_comparison(changed=(108, 108, 108))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_significant_change_fails(self):
        result, data = self.run_comparison(changed=(255, 0, 0))
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(data['results'][0]['passed'])

    def test_changed_dimensions_fail(self):
        result, data = self.run_comparison(dimensions=(11, 10))
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(data['results'][0]['reason'], 'Different dimensions')

    def test_missing_reference_fails(self):
        result, _ = self.run_comparison(reference=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Missing immutable reference', result.stderr)

if __name__ == '__main__':
    unittest.main()
