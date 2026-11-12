#!/usr/bin/env python3
"""Produce unapproved morphological and phonetic proposals for pending V2 words."""
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import pymorphy3

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"outputs/library-v2.json"
OUTPUT=ROOT/"outputs/library-v2-auto-analysis.json"
REPORT=ROOT/"outputs/LIBRARY_V2_AUTO_ANALYSIS.md"
CYR=re.compile(r"^[а-яё]+(?:-[а-яё]+)*$", re.I)
VOWELS=set("аеёиоуыэюя")
SOUND_VOWELS=set("аоуыэи")
PHONEMES={
 "A":"а","O":"о","U":"у","E":"э","Y":"ы","I":"и",
 "B":"б","P":"п","V":"в","F":"ф","G":"г","K":"к",
 "KH":"х","GH":"г","D":"д","T":"т","Z":"з","S":"с",
 "ZH":"ж","SH":"ш","TS":"ц","DZ":"дз","TSH":"ч",
 "DZH":"дж","J":"й","L":"л","M":"м","N":"н","R":"р",
}
COMPLEX={"DZH","DZ","GH"}
morph=pymorphy3.MorphAnalyzer()

def inflect(parse, tags):
 try:
  f=parse.inflect(set(tags))
  return f.word if f else None
 except (ValueError, TypeError):
  return None

def phrase_proposal(text):
 parts=text.lower().split()
 if len(parts)!=2 or not all(CYR.fullmatch(p) for p in parts):
  return {"status":"needs_review","reason":"complex_phrase"}
 adjective=next((x for x in morph.parse(parts[0]) if x.tag.POS=="ADJF"),None)
 noun=next((x for x in morph.parse(parts[1]) if x.tag.POS=="NOUN"),None)
 if adjective is None or noun is None:
  return {"status":"needs_review","reason":"phrase_grammar_not_adjective_noun"}
 cases={
  "nomn_sing":("nomn","sing"),"gent_sing":("gent","sing"),
  "datv_sing":("datv","sing"),"accs_sing":("accs","sing"),
  "ablt_sing":("ablt","sing"),"loct_sing":("loct","sing"),
  "nomn_plur":("nomn","plur"),"gent_plur":("gent","plur"),
  "accs_plur":("accs","plur"),
 }
 forms={}
 gender=noun.tag.gender
 for label,tags in cases.items():
  n=inflect(noun,tags)
  a=inflect(adjective,tags+(gender,) if "sing" in tags and gender else tags)
  forms[label]=(a+" "+n) if a and n else None
 return {
  "status":"candidate_needs_review","analyzer":"pymorphy3",
  "part_of_speech":"ADJF+NOUN","lemma":text.lower(),
  "ambiguous":True,"reason":"phrase_agreement_requires_review",
  "forms":forms,"countability_unverified":True,
 }

def morph_proposal(lemma, entry):
 if not CYR.fullmatch(lemma):
  return phrase_proposal(lemma) if " " in lemma else {"status":"needs_review","reason":"nonlexical"}
 candidates=morph.parse(lemma)
 if not candidates:
  return {"status":"needs_review","reason":"no_parse"}
 original=(entry.get("legacy_source") or {}).get("raw") or {}
 pos_hint=entry.get("part_of_speech") or original.get("part_of_speech")
 expected={"noun":{"NOUN"},"adjective":{"ADJF","ADJS"},"verb":{"VERB","INFN"}}.get(pos_hint)
 if entry.get("kind")=="country":
  expected={"NOUN"}
 matching=[p for p in candidates if not expected or p.tag.POS in expected]
 if expected and not matching:
  return {"status":"needs_review","reason":"declared_part_of_speech_not_found_in_morph_dictionary"}
 canonical=[p for p in matching if p.normal_form==lemma.lower() and (p.tag.POS!="NOUN" or p.tag.case=="nomn")]
 selected=(canonical or matching or candidates)[0]
 alternatives=[
  {"lemma":p.normal_form,"pos":p.tag.POS,"tag":str(p.tag),"score":round(p.score,4)}
  for p in candidates[:4]
 ]
 ambiguous=any(p.normal_form!=selected.normal_form and p.score>=0.12 for p in candidates if p is not selected)
 pos=selected.tag.POS
 result={
  "status":"candidate_needs_review","analyzer":"pymorphy3","lemma":selected.normal_form,
  "part_of_speech":pos,"tag":str(selected.tag),"score":round(selected.score,4),
  "ambiguous":ambiguous,"alternatives":alternatives,"forms":{},
 }
 if pos=="NOUN":
  patterns={
   "nomn_sing":("nomn","sing"),"gent_sing":("gent","sing"),
   "datv_sing":("datv","sing"),"accs_sing":("accs","sing"),
   "ablt_sing":("ablt","sing"),"loct_sing":("loct","sing"),
   "nomn_plur":("nomn","plur"),"gent_plur":("gent","plur"),
   "accs_plur":("accs","plur"),
  }
 elif pos in {"ADJF","ADJS"}:
  patterns={
   "masc_nomn_sing":("masc","nomn","sing"),
   "femn_nomn_sing":("femn","nomn","sing"),
   "neut_nomn_sing":("neut","nomn","sing"),
   "nomn_plur":("nomn","plur"),
  }
 elif pos in {"INFN","VERB"}:
  patterns={
   "present_1sg":("pres","1per","sing"),
   "present_3sg":("pres","3per","sing"),
   "future_3sg":("futr","3per","sing"),
   "past_masc":("past","masc","sing"),
   "past_femn":("past","femn","sing"),
  }
 else:
  patterns={}
  result["ambiguous"]=True
 result["forms"]={k:inflect(selected,v) for k,v in patterns.items()}
 if pos=="NOUN":
  f=result["forms"]
  f.update({"count_1":f["nomn_sing"],"count_2":f["gent_sing"],"count_5":f["gent_plur"]})
  result["countability_unverified"]=True
 return result

def g2p_components():
 try:
  import dawg_python
  sys.modules["dawg"]=dawg_python
  from russian_g2p.Accentor import Accentor
  from russian_g2p.Grapheme2Phoneme import Grapheme2Phoneme
  return Accentor(mode="one",use_wiki=False), Grapheme2Phoneme()
 except Exception as exc:
  print("Russian G2P unavailable:",repr(exc),file=sys.stderr)
  return None,None

def phonetic_features(tokens):
 vowels=lambda t: t in SOUND_VOWELS
 n=sum(vowels(t) for t in tokens)
 raw="".join("V" if vowels(t) else "C" for t in tokens)
 runs=list(re.finditer(r"C{2,}",raw))
 max_run=max((len(m.group()) for m in runs),default=0)
 closed=raw.endswith("C")
 markova=None
 if not runs:
  markova=3 if n==1 else (4 if closed else 1) if n==2 else (7 if closed else 2) if n==3 else 14 if n==4 and not closed else None
 elif n==1 and len(runs)==1 and max_run==2:
  markova=11 if runs[0].start()==0 else 12 if runs[0].end()==len(raw) else None
 elif n==2 and len(runs)==1 and max_run==2 and runs[0].start()>0 and runs[0].end()<len(raw):
  markova=6 if closed else 5
 elif n==2 and len(runs)==2 and max_run==2:
  markova=13
 elif n==3 and len(runs)==1 and max_run==2:
  markova=9 if closed else 8
 elif n==3 and len(runs)==2 and max_run==2:
  markova=10
 occurrences=[
  {"sound":t,"index":i,"position":"начало" if i==0 else "конец" if i==len(tokens)-1 else "середина"}
  for i,t in enumerate(tokens)
 ]
 return {
  "markova_type_proposal":markova,
  "markova_status":"candidate_needs_review" if markova else "not_unambiguously_classified",
  "clusters":[tokens[m.start():m.end()] for m in runs],
  "hard_consonants":[t for t in tokens if not vowels(t) and not t.endswith("'") and t!="й"],
  "soft_consonants":[t for t in tokens if not vowels(t) and (t.endswith("'") or t=="й")],
  "occurrences":occurrences,
 }

def g2p_proposal(lemma,accentor,transcriber):
 if not CYR.fullmatch(lemma):
  return {"status":"needs_review","reason":"multiword_or_nonlexical"}
 if not (set(lemma.lower()) & VOWELS):
  return {"status":"needs_review","reason":"no_vowel"}
 if accentor is None or transcriber is None:
  return {"status":"not_processed","reason":"g2p_unavailable"}
 try:
  accent=accentor.do_accents([[lemma.lower()]])[0][0]
 except Exception as exc:
  return {"status":"needs_review","reason":"accent_error","detail":str(exc)[:140]}
 if accent.count("+")!=1:
  return {"status":"needs_review","reason":"unknown_or_ambiguous_stress"}
 stress_syllable=sum(ch in VOWELS for ch in accent[:accent.index("+")])
 if stress_syllable<1:
  return {"status":"needs_review","reason":"invalid_stress"}
 try:
  raw=transcriber.word_to_phonemes(accent)
  if not raw:
   return {"status":"needs_review","reason":"empty_g2p"}
  tokens=[]
  stressed=[]
  unknown=[]
  for ph in raw:
   symbol=str(ph).upper()
   if symbol=="SIL":
    continue
   flagged=symbol.endswith("0")
   core=symbol[:-1] if flagged else symbol
   base="щ" if symbol=="SH0" else PHONEMES.get(core)
   if base is None or core in COMPLEX:
    unknown.append(symbol)
    continue
   vowel=base in SOUND_VOWELS
   if flagged and not vowel and core!="J":
    base+="'"
   if flagged and vowel:
    stressed.append(len(tokens))
   tokens.append(base)
  if unknown:
   return {"status":"needs_review","reason":"complex_or_unknown_phoneme_symbols",
           "accented":accent,"raw_phonemes":raw,"symbols":unknown}
  return {
   "status":"candidate_needs_review","analyzer":"nsu-ai/russian_g2p",
   "accented":accent,"stress_syllable":stress_syllable,
   "sound_tokens":tokens,"raw_phonemes":raw,
   "stressed_token_indices":stressed,
   "syllables":sum(t in SOUND_VOWELS for t in tokens),
   "stressed_vowel":tokens[stressed[0]] if len(stressed)==1 else None,
   **phonetic_features(tokens),
   "note":"Automatic G2P proposal; allowed for practice when a specific sound is reliably aligned with the same letter, by author decision; not methodically validated",
  }
 except Exception as exc:
  return {"status":"needs_review","reason":"g2p_error","detail":str(exc)[:140]}

def run():
 data=json.loads(SOURCE.read_text(encoding="utf-8"))
 accentor,transcriber=g2p_components()
 proposals=[]
 for entry in data["entries"]:
  pending_ph=(entry.get("phonetic_tags") or {}).get("status") in ("pending_automatic_analysis","automatic_candidate_needs_review")
  pending_mo=(entry.get("morphology") or {}).get("status") in ("pending_automatic_analysis","automatic_candidate_needs_review")
  if not(pending_ph or pending_mo):
   continue
  word=entry["lemma"]
  proposals.append({
   "id":entry["id"],"lemma":word,"meaning":entry.get("meaning"),
   "weight":(entry.get("selection") or {}).get("base_weight"),"kind":entry.get("kind"),
   "phonetic":g2p_proposal(word,accentor,transcriber) if pending_ph else {"status":"already_filled"},
   "morphology":morph_proposal(word,entry) if pending_mo else {"status":"already_filled"},
  })
 counts={
  "total_words":len(data["entries"]),"pending_entries":len(proposals),
  "phonetics":dict(Counter(x["phonetic"]["status"] for x in proposals)),
  "morphology":dict(Counter(x["morphology"]["status"] for x in proposals)),
  "g2p_loaded":bool(accentor and transcriber),
 }
 out={
  "schema_version":1,"generated_at":datetime.now(timezone.utc).isoformat(timespec="seconds"),
  "source":"outputs/library-v2.json","status":"DRAFT_ONLY_NOT_APPROVED",
  "tools":{"morphology":"pymorphy3","phonetics":"nsu-ai/russian_g2p"},
  "note":"Draft morphology needs review; draft G2P is used in automatic tasks only for unambiguously letter-aligned target phonemes, by author decision. V2 source is unchanged.",
  "stats":counts,"entries":proposals,
 }
 OUTPUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 lines=[
  "# Автоматический анализ слов — черновик для проверки",
  "","Результаты НЕ перенесены в утверждённые фонетические и морфологические поля.",
  "","## Результат","",
  "- Всего записей: "+str(counts["total_words"]),
  "- Записей с недостающими сведениями: "+str(counts["pending_entries"]),
  "- Фонетика: "+str(counts["phonetics"]),
  "- Морфология: "+str(counts["morphology"]),
  "- Russian G2P подключился: "+("да" if counts["g2p_loaded"] else "нет"),
  "","## Ограничения",
  "","Нужна проверка ударения, омографов, исчисляемости, грамматических вариантов и реальных звуков.",
  "Одно слово без контекста может разбираться несколькими способами.",
  "По решению автора G2P-разборы используются для автоматизации только при совпадении звука с исходной буквой; автоматическая разметка может содержать ошибки.",
  "","Машинный результат: outputs/library-v2-auto-analysis.json.",
  "","## Примеры","",
 ]
 for row in proposals:
  if row["lemma"] in {"бабушка","кошка","морж","заяц","дом","цифра","коза","кролик","яблоко","слон"}:
   lines.append("- "+row["lemma"]+": "+json.dumps({"phonetic":row["phonetic"],"morphology":row["morphology"]},ensure_ascii=False))
 REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
 print(json.dumps(counts,ensure_ascii=False,indent=2))

if __name__=="__main__":
 run()
