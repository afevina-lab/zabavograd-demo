#!/usr/bin/env python3
"""Run existing analyzers against the canonical snapshot, without editing it."""
import argparse
import importlib.util
import json
from pathlib import Path
from collections import Counter
from library_source import read_snapshot

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def selected(entry, req):
    return (entry.get("language") == "ru" and entry.get("kind") == "word"
            and (req.get("weight") is None or entry.get("selection", {}).get("base_weight") == req["weight"])
            and (req.get("part_of_speech") is None or entry.get("part_of_speech") == req["part_of_speech"])
            and (req.get("category") is None or any(c.get("path") == req["category"] or
                  c.get("path", "").startswith(req["category"] + "/") for c in entry.get("categories", []))))

def run(req, dest):
    db, source = read_snapshot()
    if source["sha256"] != req["source_sha256"]:
        raise ValueError("Stale library fingerprint")
    entries = sorted((e for e in db["entries"] if selected(e, req)),
                     key=lambda e: (-e.get("selection", {}).get("base_weight", 0), e["id"]))
    limit = req.get("limit", 500)
    mode = req["mode"]
    if mode == "extend":
        import pymorphy3
        extender = module("morphology_extension", "extend-morphology-20261123.py")
        morph = pymorphy3.MorphAnalyzer()
        # Select only entries with a genuine missing key; do not consume limit on complete entries.
        chosen = []
        for e in entries:
            p = extender.proposal_for(e)
            if p is None:
                continue
            parse = extender.exact_parse(morph, e, p)
            if parse is None or not isinstance(p.get("forms"), dict):
                continue
            if any(k not in p["forms"] for k in extender.all_forms(parse)):
                chosen.append(e)
            if len(chosen) == limit:
                break
        partial, report = extender.enrich({"entries": chosen, "relations": []}, morph)
        by_id = {e["id"]: e for e in partial["entries"]}
        db["entries"] = [by_id.get(e["id"], e) for e in db["entries"]]
        report["source"] = source
        report["selected"] = len(chosen)
        (dest / "analysis.json").write_text(json.dumps(db, ensure_ascii=False), encoding="utf-8")
        (dest / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return
    analyzer = module("initial_analysis", "analyze-pending-words.py")
    extender = module("morphology_extension", "extend-morphology-20261123.py")
    domain = req.get("domain", "both")
    want_ph = domain in ("both", "phonetics")
    want_mo = domain in ("both", "morphology")
    accentor, transcriber = analyzer.g2p_components() if want_ph else (None, None)
    if want_ph and (accentor is None or transcriber is None):
        raise RuntimeError("Russian G2P failed to initialize; no silent partial run")
    rows = []
    for e in entries:
        ph = want_ph and e.get("phonetic_tags", {}).get("status") == "pending_automatic_analysis"
        mo = want_mo and e.get("morphology", {}).get("status") == "pending_automatic_analysis"
        if not (ph or mo):
            continue
        p = analyzer.morph_proposal(e["lemma"], e) if mo else {"status": "already_filled"}
        if p.get("status") == "candidate_needs_review" and isinstance(p.get("forms"), dict):
            matches = [x for x in analyzer.morph.parse(e["lemma"]) if str(x.tag) == p.get("tag") and x.normal_form == p.get("lemma")]
            if matches:
                for k, v in extender.all_forms(matches[0]).items():
                    if not p["forms"].get(k):
                        p["forms"][k] = v
        rows.append({"id": e["id"], "lemma": e["lemma"], "meaning": e.get("meaning"),
                     "kind": e["kind"], "weight": e.get("selection", {}).get("base_weight"),
                     "phonetic": analyzer.g2p_proposal(e["lemma"], accentor, transcriber) if ph else {"status": "already_filled"},
                     "morphology": p})
        if len(rows) == limit:
            break
    stats = {"selected": len(rows), "g2p_loaded": bool(accentor and transcriber),
             "phonetics": dict(Counter(r["phonetic"]["status"] for r in rows)),
             "morphology": dict(Counter(r["morphology"]["status"] for r in rows))}
    doc = {"schema_version": 1, "status": "DRAFT_ONLY_NOT_APPROVED", "source": source,
           "scope": req, "tools": {"morphology": "pymorphy3", "phonetics": "nsu-ai/russian_g2p"},
           "entries": rows, "stats": stats}
    (dest / "analysis.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    (dest / "report.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("request", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir()
    run(json.loads(args.request.read_text(encoding="utf-8")), args.output)
