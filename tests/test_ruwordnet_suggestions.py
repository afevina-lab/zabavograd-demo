"""Build-only RuWordNet adapter unit tests: no external database is needed."""
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "scripts" / "ruwordnet-suggestions.py"
spec = importlib.util.spec_from_file_location("rwn_adapter", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Synset:
    def __init__(self, sid, title):
        self.id, self.title = sid, title
        self.hypernyms = []
        self.holonyms = []
        self.meronyms = []
        self.classes = []
        self.antonyms = []

class FakeWordNet:
    def __init__(self):
        self.apple = Synset("10-N", "ЯБЛОКО")
        self.fruit = Synset("20-N", "ФРУКТ")
        self.apple.hypernyms.append(self.fruit)
        self.lookup = {"10-N": self.apple, "20-N": self.fruit}
    def get_synset_by_id(self, sid):
        return self.lookup.get(sid)

class TestRuWordNet(unittest.TestCase):
    def setUp(self):
        self.words=[{"id":"apple","lemma":"яблоко"},{"id":"fruit","lemma":"фрукт"}]
        self.mapping=[{"entry_id":"apple","synset_id":"10-N"},{"entry_id":"fruit","synset_id":"20-N"}]
        self.wn=FakeWordNet()
    def test_review_only_and_exact_ids(self):
        out=module.produce(self.wn,self.mapping,self.words,"fingerprint")
        self.assertEqual(len(out["records"]),1)
        self.assertEqual(out["records"][0]["relation_type"],"is_a")
        self.assertFalse(out["records"][0]["usable_for_generation"])
        self.assertEqual(out["records"][0]["subject_id"],"apple")
    def test_no_guess_without_mapping(self):
        self.assertEqual(module.produce(self.wn,[],self.words,"hash")["records"],[])
    def test_reject_ambiguous_local_mapping(self):
        mapping=self.mapping+[{"entry_id":"fruit","synset_id":"30-N"}]
        with self.assertRaisesRegex(ValueError,"ambiguous"):
            module.produce(self.wn,mapping,self.words,"hash")
    def test_missing_synset_fails_closed(self):
        with self.assertRaisesRegex(ValueError,"Unknown source synset"):
            module.produce(self.wn,[{"entry_id":"apple","synset_id":"999-N"}],self.words,"hash")
if __name__=="__main__":
    unittest.main()
