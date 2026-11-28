#!/usr/bin/env python3
"""Only aggregate coverage, no redistribution of source synsets or extracted relations."""
import json
import sys
from pathlib import Path
from collections import Counter
from ruwordnet import RuWordNet
from library_source import read_snapshot

def coverage(wn, entries):
    counts = Counter()
    for e in entries:
        if e.get("language") != "ru" or e.get("kind") != "word":
            continue
        counts["eligible_entries"] += 1
        candidates = {str(s.synset.id) for s in wn.get_senses(e["lemma"]) or []}
        if candidates:
            counts["matched_entries"] += 1
        if len(candidates) > 1:
            counts["ambiguous_entries"] += 1
        if len(candidates) == 1:
            counts["single_candidate_entries"] += 1
    return {k: counts[k] for k in ("eligible_entries", "matched_entries", "ambiguous_entries", "single_candidate_entries")}

if __name__ == "__main__":
    db, source = read_snapshot()
    result = coverage(RuWordNet(), db["entries"])
    result.update(source_sha256=source["sha256"], source="RuWordNet 2.0",
                  status="coverage_only_no_source_records_published")
    Path(sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
