#!/usr/bin/env python3
"""Transient lookup; output only candidate edges between existing local IDs."""
import json
import sys
from collections import defaultdict
from pathlib import Path
from ruwordnet import RuWordNet
from library_source import read_snapshot
from unicodedata import normalize

def key(s):
    return normalize("NFC", s).casefold()

def propose(wn, entries):
    groups = defaultdict(list)
    for e in entries:
        if e.get("language") == "ru" and e.get("kind") == "word" and not e.get("same_lexical_meaning_as"):
            groups[key(e["lemma"])].append(e)
    by_synset, synsets = defaultdict(list), {}
    pos_suffix = {"noun": "-N", "verb": "-V", "adjective": "-A"}
    for group in groups.values():
        if len(group) != 1:
            continue
        e = group[0]
        pos = e.get("part_of_speech") or (e.get("legacy_source", {}).get("raw") or {}).get("part_of_speech")
        if pos not in pos_suffix:
            continue
        matches = {str(s.synset.id): s.synset for s in wn.get_senses(e["lemma"]) or []
                   if str(s.synset.id).endswith(pos_suffix[pos])}
        if len(matches) == 1:
            sid, synset = next(iter(matches.items()))
            by_synset[sid].append(e["id"])
            synsets[sid] = synset
    result = {}
    def add(a, b, relation, record):
        if a == b:
            return
        if relation in ("synonym", "antonym"):
            a, b = sorted((a,b))
        if relation == "has_part":
            a, b, relation = b, a, "part_of"
        k = (relation,a,b)
        result.setdefault(k, {"source_record_id":record,"subject_id":a,"object_id":b,"relation_type":relation})
    for sid, ids in sorted(by_synset.items()):
        for a in ids:
            for b in ids:
                add(a,b,"synonym",sid)
        for attr, rel in (("hypernyms","is_a"),("holonyms","part_of"),("meronyms","has_part"),("classes","instance_of"),("antonyms","antonym")):
            for target in getattr(synsets[sid],attr,None) or []:
                tid = str(target.id)
                for a in ids:
                    for b in by_synset.get(tid,[]):
                        add(a,b,rel,sid+":"+attr+":"+tid)
    return list(result.values())

if __name__ == "__main__":
    db, source = read_snapshot()
    rows = propose(RuWordNet(), db["entries"])
    Path(sys.argv[1]).write_text(json.dumps({"source":"ruwordnet","source_revision":"RuWordNet 2.0 (2021)","library_source":{"sha256":source["sha256"]},"records":rows},ensure_ascii=False), encoding="utf-8")
