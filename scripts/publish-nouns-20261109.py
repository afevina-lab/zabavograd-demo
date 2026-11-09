#!/usr/bin/env python3
"""One-time, idempotent publication of 100 checked nouns to static game library."""
import json
import sys
from pathlib import Path

base_path, compact_path, pretty_path = map(Path, sys.argv[1:4])
base = json.loads(base_path.read_text(encoding="utf-8"))
manifest = json.loads(Path("docs/nouns-20261109.json").read_text(encoding="utf-8"))
assert isinstance(base, list) and len(base) >= 1313, "Unexpected public library baseline"
assert len(manifest["entries"]) == 100
by_id = {row["id"]: row for row in base}
by_label = {row["label"].lower(): row for row in base}
assert len(by_id) == len(base)
assert len(set(x["lemma"] for x in manifest["entries"])) == 100

def letter_map(word):
    letters = [c for c in word.lower() if ("а" <= c <= "я") or c == "ё"]
    result = {}
    for i, letter in enumerate(letters):
        position = "начало" if i == 0 else ("конец" if i == len(letters) - 1 else "середина")
        result.setdefault(letter, []).append({"index": i, "position": position})
    return result

def game_row(entry):
    categories = entry["categories"]
    parts = categories[0].split("/")
    depth = 2 if parts[0] in {"Животный мир", "Растительный мир и грибы", "Еда и напитки", "Человек", "Геометрия"} else 1
    return {
        "id": entry["id"], "label": entry["lemma"], "meaning": entry.get("meaning"),
        "categories": categories, "phonemes": None,
        "topic": "/".join(parts[:depth]), "subcategory": "/".join(parts[depth:]) or None,
        "position": "", "type": None, "opposition": [],
        "weight": entry["base_weight"], "taskWeights": None,
        "generalization": None, "kindOf": [], "genusAncestors": [],
        "images": None, "variants": [], "soundTokens": [], "sounds": {},
        "letters": letter_map(entry["lemma"]), "phoneticStatus": "pending",
        "kind": "word", "scope": "general", "partOfSpeech": "noun",
        "lexicalEligibleByDefault": True
    }

new_count = 0
for item in manifest["entries"]:
    found_id = by_id.get(item["id"])
    found_label = by_label.get(item["lemma"].lower())
    if found_id or found_label:
        assert found_id is found_label, "ID/lemma mismatch for " + item["lemma"]
        continue
    row = game_row(item)
    base.append(row)
    by_id[row["id"]] = row
    by_label[row["label"].lower()] = row
    new_count += 1
assert len(by_id) == len(base)
assert len(base) >= 1413, f"Expected 1413+ public records, got {len(base)}"
compact_path.write_text(json.dumps(base, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
pretty_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Public library: {len(base)} total, {new_count} newly appended nouns")
