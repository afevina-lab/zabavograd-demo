#!/usr/bin/env python3
"""Expand exact pymorphy3 forms and admit only the existing safe subset."""
import importlib.util
import json
import sys
from pathlib import Path
import pymorphy3

src, dest, report = map(Path, sys.argv[1:])
spec=importlib.util.spec_from_file_location("extension", Path(__file__).with_name("extend-morphology-20261123.py"))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
if pymorphy3.__version__ != "2.0.6":
    raise RuntimeError("Wrong morphology analyzer version")
original=json.loads(src.read_text(encoding="utf-8"))
morph=pymorphy3.MorphAnalyzer()
db, expansion=m.enrich(original,morph)
ids=[e["id"] for e in db["entries"] if m.safe_forms(e,morph)[0]]
stats={"changed":0,"forms":0}
for e in db["entries"]:
    if e["id"] not in ids:
        continue
    forms, reason=m.safe_forms(e,morph)
    if not forms:
        raise RuntimeError("Safe form subset changed")
    e["morphology"]["data"]["approved_form_subset"]={"revision":m.SAFE_REVISION,"status":"machine_checked","usable_for_generation":True,"source":"pymorphy3_2.0.6_exact_lemma","review_method":"exact_pymorphy3_paradigm_matching","human_reviewed":False,"automatic_counting_allowed":False,"forms":forms}
    stats["changed"]+=1
    stats["forms"]+=len(forms)
dest.write_text(json.dumps(db,ensure_ascii=False),encoding="utf-8")
report.write_text(json.dumps({"expansion":expansion["statistics"],"approved":stats,"ids":ids},ensure_ascii=False),encoding="utf-8")
