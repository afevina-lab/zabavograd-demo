#!/usr/bin/env python3
"""Publish curated Russian adjectives, adverbs, and bidirectional links.
Run on main and gh-pages separately. This operation is idempotent.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def save(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

def letter_map(word):
    result = {}
    for i, char in enumerate(word):
        if not char.isalpha():
            continue
        place = "начало" if i == 0 else "конец" if i == len(word)-1 else "середина"
        result.setdefault(char, []).append({"index": i, "position": place})
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True)
    parser.add_argument("--graph", required=True)
    parser.add_argument("--spec", required=True)
    parser.add_argument("--edges", required=True)
    args = parser.parse_args()
    words, graph, spec, edges = read(args.library), read(args.graph), read(args.spec), read(args.edges)
    assert isinstance(words, list) and graph.get("schema") == "semantic_game_graph_v1"
    by_word = {}
    by_id = {w["id"]: w for w in words}
    assert len(by_id) == len(words), "Duplicate published word IDs"
    for w in words:
        by_word.setdefault(w["label"], []).append(w)
    generated, reused = [], []
    for group in spec["groups"]:
        pos = group["part_of_speech"]
        assert pos in {"adjective", "adverb"}
        path = group["path"]
        for lemma in group["words"]:
            candidates = by_word.get(lemma, [])
            assert len(candidates) <= 1, f"Ambiguous published candidate: {lemma}"
            priority = spec["weight_overrides"].get(lemma, spec["default_priority"])
            assert priority in (10, 20, 30, 50, 70, 100)
            task = "attribute_generation" if pos == "adjective" else "adverb_generation"
            if candidates:
                w = candidates[0]
                assert w.get("partOfSpeech") in (None, pos), f"POS collision: {lemma}"
                w["partOfSpeech"] = pos
                w["taskWeights"] = {**(w.get("taskWeights") or {}), task: priority}
                if path not in w["categories"]:
                    w["categories"].append(path)
                reused.append(lemma)
                continue
            index = len(generated) + 1
            item_id = f"ru-attr-20261109-{index:03d}"
            assert item_id not in by_id, "Attribute ID collision"
            parts = path.split("/")
            w = {
                "id": item_id, "label": lemma, "meaning": spec.get("meaning_overrides", {}).get(lemma),
                "categories": [path], "phonemes": None,
                "topic": parts[0], "subcategory": "/".join(parts[1:]),
                "position": "", "type": None, "opposition": [], "weight": 1,
                "taskWeights": {task: priority}, "generalization": None, "kindOf": [],
                "genusAncestors": [], "images": None, "variants": [],
                "soundTokens": [], "sounds": {}, "letters": letter_map(lemma),
                "phoneticStatus": "pending", "kind": "word", "scope": "general",
                "partOfSpeech": pos, "lexicalEligibleByDefault": False
            }
            words.append(w); generated.append(w)
            by_word[lemma] = [w]; by_id[item_id] = w
    assert len(generated) in (0, 181), f"Unexpected new word count: {len(generated)}"
    if generated:
        assert len(reused) == 5, f"Wrong reused word count: {len(reused)}"
    ids = set(by_id)
    if "by_entry" not in graph:
        raise ValueError("Published graph lacks required two-way index")
    link_ids = {r["id"] for r in graph["relations"]}
    added = []
    for src in edges["edges"]:
        a, b, rid = src["subject_id"], src["object_id"], src["id"]
        if rid in link_ids:
            continue
        if a not in ids or b not in ids:
            continue  # Private V2 may contain records not yet published.
        assert a != b
        rel = {
            "id": rid, "type": src["type"], "subject_id": a, "object_id": b,
            "inverse_type": src["inverse_type"],
            "provenance": {
                "source": "zabavograd_editorial", "authorship": "independent",
                "revision": "v2-attribute-relations-20261109-v1"
            }
        }
        graph["relations"].append(rel)
        link_ids.add(rid)
        added.append(rel)
        graph["by_entry"].setdefault(a, []).append({
            "relation_id": rid, "type": src["type"], "target_id": b,
            "direction": "forward", "inverse_type": src["inverse_type"]
        })
        graph["by_entry"].setdefault(b, []).append({
            "relation_id": rid, "type": src["inverse_type"], "target_id": a,
            "direction": "inverse", "inverse_type": src["type"]
        })
    for items in graph["by_entry"].values():
        items.sort(key=lambda r: (r["type"], r["target_id"], r["relation_id"]))
    graph.setdefault("publication", {})["published_entries"] = len(words)
    graph["publication"]["verified_relation_count"] = len(graph["relations"])
    graph["publication"]["attribute_expansion_20261109"] = {
        "words_added": sum(w["id"].startswith("ru-attr-20261109-") for w in words),
        "adjectives": sum(w.get("partOfSpeech") == "adjective" for w in words),
        "adverbs": sum(w.get("partOfSpeech") == "adverb" for w in words),
        "curated_links": sum(r["id"].startswith("semantic-attribute-20261109-") for r in graph["relations"]),
        "phonetic_candidates_pending": True,
        "full_case_agreement_pending": True,
        "illustrations_expected": False
    }
    assert len({w["id"] for w in words}) == len(words)
    assert len({r["id"] for r in graph["relations"]}) == len(graph["relations"])
    for r in graph["relations"]:
        assert r["subject_id"] in ids and r["object_id"] in ids, f"Unpublished semantic endpoint: {r['id']}"
        assert any(e.get("relation_id") == r["id"] and e.get("target_id") == r["object_id"] and e.get("direction") == "forward" for e in graph["by_entry"].get(r["subject_id"], []))
        assert any(e.get("relation_id") == r["id"] and e.get("target_id") == r["subject_id"] and e.get("direction") == "inverse" for e in graph["by_entry"].get(r["object_id"], []))
    save(args.library, words)
    save(args.graph, graph)
    print(json.dumps({"total_words": len(words), "new_words": len(generated), "reused": reused,
                      "new_edges": len(added), "total_edges": len(graph["relations"]),
                      "adjectives": sum(w.get("partOfSpeech")=="adjective" for w in words),
                      "adverbs": sum(w.get("partOfSpeech")=="adverb" for w in words)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
