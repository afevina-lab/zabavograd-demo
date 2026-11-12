#!/usr/bin/env python3
"""Review-only RuWordNet adapter. Optional build dependency, no runtime use.
Requires explicit synset-to-Zabavograd sense-ID mapping: NEVER match by lemma.
Use an authorized local RuWordNet database; never bundle the database here.
"""
import argparse
import hashlib
import json
from pathlib import Path

RELATIONS = {
    "hypernyms": "is_a",
    "holonyms": "part_of",
    "meronyms": "has_part",
    "classes": "instance_of",
    "antonyms": "antonym",
}
def produce(wn, mapping, entries, db_hash):
    if not isinstance(mapping, list):
        raise ValueError("Expected mapping array")
    known = {e["id"] for e in entries}
    by_synset = {}
    by_local = {}
    for m in mapping:
        sid, eid = m["synset_id"], m["entry_id"]
        if eid not in known:
            raise ValueError("Unknown dictionary entry ID: " + eid)
        if sid in by_synset or eid in by_local:
            raise ValueError("Duplicate or ambiguous sense mapping")
        by_synset[sid], by_local[eid] = eid, sid
    records = []
    seen = set()
    for sid, eid in sorted(by_synset.items()):
        synset = wn.get_synset_by_id(sid)
        if synset is None or str(synset.id) != sid:
            raise ValueError("Unknown source synset " + sid)
        for attr, relation in RELATIONS.items():
            for related in (getattr(synset, attr, None) or []):
                rid = str(related.id)
                target = by_synset.get(rid)
                if not target or target == eid:
                    continue
                k = (sid, attr, rid)
                if k in seen:
                    continue
                seen.add(k)
                records.append({
                    "source": "ruwordnet",
                    "source_record_id": f"{sid}:{attr}:{rid}",
                    "candidate_type": "semantic_relation",
                    "relation_type": relation,
                    "subject_id": eid,
                    "object_id": target,
                    "ruwordnet_subject": sid,
                    "ruwordnet_object": rid,
                    "review_status": "suggested",
                    "usable_for_generation": False,
                })
    return {
        "schema": "linguistic_suggestions_v1",
        "source": "ruwordnet",
        "license": "RuWordNet dataset: publication clearance pending; research-only",
        "source_revision": "local RuWordNet database",
        "dictionary_sha256": db_hash,
        "purpose": "review_only",
        "automatic_changes_to_master": False,
        "records": records,
    }

def discover(wn, entries):
    """Offer sense IDs for manual matching; never select a synset automatically."""
    result = []
    for e in entries:
        lemma = e.get("lemma")
        if not lemma:
            continue
        candidates = []
        for sense in wn.get_senses(lemma) or []:
            synset = sense.synset
            sid = str(synset.id)
            if not any(x["synset_id"] == sid for x in candidates):
                candidates.append({
                    "synset_id": sid,
                    "title": str(synset.title),
                    "source_sense_id": str(sense.id),
                })
        if candidates:
            result.append({"entry_id": e["id"], "lemma": lemma, "meaning": e.get("meaning"),
                           "candidates": candidates, "review_status": "unreviewed"})
    return {"schema": "ruwordnet_mapping_candidates_v1",
            "purpose": "manual_sense_matching_only", "entries": result}

def main():
    parser = argparse.ArgumentParser(description="Generate non-publishable RuWordNet sense-relation proposals")
    parser.add_argument("--mapping", help="JSON list: synset_id, entry_id (required unless --discover)")
    parser.add_argument("--library", default="outputs/library-v2.json")
    parser.add_argument("--output", help="JSON output file")
    parser.add_argument("--database", help="Authorized local RuWordNet SQLite file")
    parser.add_argument("--discover", action="store_true", help="Only prepare possible synset matches for manual review")
    args = parser.parse_args()
    from ruwordnet import RuWordNet
    wn = RuWordNet(filename_or_session=args.database) if args.database else RuWordNet()
    lib_data = Path(args.library).read_bytes()
    entries = json.loads(lib_data)["entries"]
    if args.discover:
        result = discover(wn, entries)
    else:
        if not args.mapping:
            parser.error("--mapping is required unless --discover is used")
        mapping = json.loads(Path(args.mapping).read_text(encoding="utf-8"))
        result = produce(wn, mapping, entries, hashlib.sha256(lib_data).hexdigest())
    dest = Path(args.output or ('.local/linguistic-sources/ruwordnet-mapping-candidates.json' if args.discover else '.local/linguistic-sources/ruwordnet-suggestions.json'))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    count = len(result["entries"]) if args.discover else len(result["records"])
    print(json.dumps({"output": str(dest), "candidates": count, "published": False}, ensure_ascii=False))

if __name__ == "__main__":
    main()
